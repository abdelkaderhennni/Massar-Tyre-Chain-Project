package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

// ── Structs ───────────────────────────────────────────────────────────────────

// TyreType — نوع الإطار مع الكمية الإجمالية والمتاحة في المستودع المركزي
type TyreType struct {
	ID         string `json:"ID"`
	Brand      string `json:"Brand"`
	Model      string `json:"Model"`
	TotalQty   int    `json:"TotalQty"`   // إجمالي الكمية المُنشأة
	CentralQty int    `json:"CentralQty"` // المتبقي في المستودع المركزي
	CreatedAt  string `json:"CreatedAt"`
}

// TyreBatch — شحنة إطارات تتنقل عبر سلسلة التوريد
// المفتاح في world state: "BATCH_{id}"
//
// دورة حياة الـ Status:
//   CREATED
//   → IN_TRANSIT_WILAYA      (بعد الإرسال من المركزي)
//   → AT_WILAYA_DEPOT        (بعد تأكيد الاستلام من الولائي خلال 7 أيام)
//   → EXPIRED_WILAYA         (إذا انقضت 7 أيام بدون تأكيد)
//   → IN_TRANSIT_GAS_STATION (بعد الإرسال من الولائي)
//   → AT_GAS_STATION         (بعد تأكيد الاستلام من المحطة خلال 7 أيام)
//   → EXPIRED_GAS            (إذا انقضت 7 أيام بدون تأكيد)
//   → SOLD                   (بعد اكتمال البيع)
type TyreBatch struct {
	ID             string `json:"ID"`
	TyreTypeID     string `json:"TyreTypeID"`
	Brand          string `json:"Brand"`
	Model          string `json:"Model"`
	Quantity       int    `json:"Quantity"`
	SoldQuantity   int    `json:"SoldQuantity"`  // [جديد] إجمالي المباع جزئياً
	WilayaCode     string `json:"WilayaCode"`
	WilayaName     string `json:"WilayaName"`
	GasStationID   string `json:"GasStationID"`
	GasStationName string `json:"GasStationName"`
	Owner          string `json:"Owner"`
	Location       string `json:"Location"`
	Status         string `json:"Status"`
	SentAt         string `json:"SentAt"`
	SentToGasAt    string `json:"SentToGasAt"`   // [جديد] وقت الإرسال إلى المحطة
	ExpiredAt      string `json:"ExpiredAt"`      // [جديد] وقت انتهاء الصلاحية إن وُجد
	ExpiredReason  string `json:"ExpiredReason"`  // [جديد] سبب الرفض
}

// ClientPurchase — سجل شراء العميل لمنع التكرار خلال 4 أشهر
// المفتاح في world state: "CLIENT_{vehicleCard}"
type ClientPurchase struct {
	VehicleCard  string `json:"VehicleCard"`
	ClientName   string `json:"ClientName"`
	LastPurchase string `json:"LastPurchase"` // RFC3339
	TotalBought  int    `json:"TotalBought"`
}

// SaleRecord — سجل مستقل لكل عملية بيع (حتى الجزئية)
// المفتاح في world state: "SALE_{batchID}_{txID[:8]}"
type SaleRecord struct {
	ID          string `json:"ID"`
	BatchID     string `json:"BatchID"`
	ClientName  string `json:"ClientName"`
	VehicleCard string `json:"VehicleCard"`
	Quantity    int    `json:"Quantity"`
	SoldAt      string `json:"SoldAt"`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const (
	CentralMSP  = "CentralMSP"
	RegionalMSP = "RegionalMSP"
	GasMSP      = "GasMSP"

	// مهلة تأكيد الاستلام: 7 أيام
	transitDeadlineHours = 7 * 24 * time.Hour
	// مهلة منع إعادة الشراء: 4 أشهر (تقريباً 120 يوماً)
	repurchaseDeadlineDays = 120
)

// ── Helpers ───────────────────────────────────────────────────────────────────

func getCallerMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	id, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller MSP ID: %v", err)
	}
	return id, nil
}

func requireMSP(ctx contractapi.TransactionContextInterface, allowed string) error {
	mspID, err := getCallerMSP(ctx)
	if err != nil {
		return err
	}
	if mspID != allowed {
		return fmt.Errorf("access denied: caller is '%s', required '%s'", mspID, allowed)
	}
	return nil
}

// getTxTime — يجلب وقت المعاملة الموحّد (يمنع Endorsement Mismatch)
func getTxTime(ctx contractapi.TransactionContextInterface) (time.Time, string, error) {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return time.Time{}, "", fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	t := time.Unix(ts.Seconds, int64(ts.Nanos)).UTC()
	return t, t.Format(time.RFC3339), nil
}

// ── InitLedger ────────────────────────────────────────────────────────────────

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	tyreTypes := []TyreType{
		{ID: "TT001", Brand: "Michelin", Model: "Pilot Sport 4", TotalQty: 500, CentralQty: 500, CreatedAt: "2025-01-01T00:00:00Z"},
		{ID: "TT002", Brand: "Bridgestone", Model: "Turanza T005", TotalQty: 300, CentralQty: 300, CreatedAt: "2025-01-01T00:00:00Z"},
		{ID: "TT003", Brand: "Continental", Model: "PremiumContact 6", TotalQty: 400, CentralQty: 400, CreatedAt: "2025-01-01T00:00:00Z"},
	}
	for _, tt := range tyreTypes {
		data, err := json.Marshal(tt)
		if err != nil {
			return err
		}
		if err := ctx.GetStub().PutState("TYRETYPE_"+tt.ID, data); err != nil {
			return fmt.Errorf("failed to put tyre type: %v", err)
		}
	}
	return nil
}

// ── CreateTyreType — CENTRAL ONLY ────────────────────────────────────────────

func (s *SmartContract) CreateTyreType(ctx contractapi.TransactionContextInterface, id string, brand string, model string, quantityStr string) error {
	if err := requireMSP(ctx, CentralMSP); err != nil {
		return err
	}

	existing, err := ctx.GetStub().GetState("TYRETYPE_" + id)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("tyre type %s already exists", id)
	}

	_, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	qty := 0
	fmt.Sscanf(quantityStr, "%d", &qty)
	if qty <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}

	tt := TyreType{
		ID:         id,
		Brand:      brand,
		Model:      model,
		TotalQty:   qty,
		CentralQty: qty,
		CreatedAt:  now,
	}

	data, err := json.Marshal(tt)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("TYRETYPE_"+id, data)
}

// ── GetTyreType ───────────────────────────────────────────────────────────────

func (s *SmartContract) GetTyreType(ctx contractapi.TransactionContextInterface, id string) (*TyreType, error) {
	data, err := ctx.GetStub().GetState("TYRETYPE_" + id)
	if err != nil {
		return nil, fmt.Errorf("failed to read: %v", err)
	}
	if data == nil {
		return nil, fmt.Errorf("tyre type %s does not exist", id)
	}
	var tt TyreType
	if err := json.Unmarshal(data, &tt); err != nil {
		return nil, err
	}
	return &tt, nil
}

// ── GetAllTyreTypes ───────────────────────────────────────────────────────────

func (s *SmartContract) GetAllTyreTypes(ctx contractapi.TransactionContextInterface) ([]*TyreType, error) {
	iterator, err := ctx.GetStub().GetStateByRange("TYRETYPE_", "TYRETYPE_~")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var types []*TyreType
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var tt TyreType
		if err := json.Unmarshal(result.Value, &tt); err != nil {
			return nil, err
		}
		types = append(types, &tt)
	}
	return types, nil
}

// ── SendBatchToWilaya — CENTRAL ONLY ─────────────────────────────────────────
// يُنشئ شحنة جديدة باتجاه المستودع الولائي.
// يبدأ عداد 7 أيام — إذا لم يُؤكَّد الاستلام خلالها تُرفض الشحنة.

func (s *SmartContract) SendBatchToWilaya(ctx contractapi.TransactionContextInterface, batchID string, tyreTypeID string, quantityStr string, wilayaCode string, wilayaName string) error {
	if err := requireMSP(ctx, CentralMSP); err != nil {
		return err
	}

	existingBatch, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return err
	}
	if existingBatch != nil {
		return fmt.Errorf("batch %s already exists", batchID)
	}

	tt, err := s.GetTyreType(ctx, tyreTypeID)
	if err != nil {
		return err
	}

	qty := 0
	fmt.Sscanf(quantityStr, "%d", &qty)
	if qty <= 0 || qty > tt.CentralQty {
		return fmt.Errorf("invalid quantity or insufficient stock: requested %d, available %d", qty, tt.CentralQty)
	}

	tt.CentralQty -= qty
	ttData, _ := json.Marshal(tt)
	ctx.GetStub().PutState("TYRETYPE_"+tt.ID, ttData)

	_, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	batch := TyreBatch{
		ID:         "BATCH_" + batchID,
		TyreTypeID: tyreTypeID,
		Brand:      tt.Brand,
		Model:      tt.Model,
		Quantity:   qty,
		WilayaCode: wilayaCode,
		WilayaName: wilayaName,
		Owner:      wilayaName,
		Location:   fmt.Sprintf("In Transit to %s", wilayaName),
		Status:     "IN_TRANSIT_WILAYA",
		SentAt:     now,
	}

	batchData, _ := json.Marshal(batch)
	return ctx.GetStub().PutState("BATCH_"+batchID, batchData)
}

// ── ReadBatch ─────────────────────────────────────────────────────────────────

func (s *SmartContract) ReadBatch(ctx contractapi.TransactionContextInterface, batchID string) (*TyreBatch, error) {
	data, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read: %v", err)
	}
	if data == nil {
		return nil, fmt.Errorf("batch %s does not exist", batchID)
	}
	var batch TyreBatch
	if err := json.Unmarshal(data, &batch); err != nil {
		return nil, err
	}
	return &batch, nil
}

// ── ConfirmArrivalWilaya — REGIONAL ONLY ─────────────────────────────────────
// يتحقق أن الشحنة لا تزال في حالة IN_TRANSIT_WILAYA وأن المهلة (7 أيام) لم تنقضِ.
// إذا انقضت المهلة: يُسجَّل الرفض ويُعاد المخزون إلى المركزي.

func (s *SmartContract) ConfirmArrivalWilaya(ctx contractapi.TransactionContextInterface, batchID string) error {
	if err := requireMSP(ctx, RegionalMSP); err != nil {
		return err
	}

	batch, err := s.ReadBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "IN_TRANSIT_WILAYA" {
		return fmt.Errorf("batch %s is not in transit to wilaya (current status: %s)", batchID, batch.Status)
	}

	txTime, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	sentAt, err := time.Parse(time.RFC3339, batch.SentAt)
	if err != nil {
		return fmt.Errorf("invalid SentAt timestamp: %v", err)
	}

	// ── تحقق من انتهاء المهلة ──────────────────────────────────────────────────
	if txTime.Sub(sentAt) > transitDeadlineHours {
		// انقضت المهلة: سجّل الرفض وأعد المخزون
		batch.Status = "EXPIRED_WILAYA"
		batch.ExpiredAt = now
		batch.ExpiredReason = fmt.Sprintf(
			"Shipment not confirmed within 7 days. Sent: %s, Deadline passed: %s",
			batch.SentAt,
			sentAt.Add(transitDeadlineHours).Format(time.RFC3339),
		)

		// إعادة الكمية إلى المستودع المركزي
		tt, ttErr := s.GetTyreType(ctx, batch.TyreTypeID)
		if ttErr == nil {
			tt.CentralQty += batch.Quantity
			ttData, _ := json.Marshal(tt)
			ctx.GetStub().PutState("TYRETYPE_"+tt.ID, ttData)
		}

		data, _ := json.Marshal(batch)
		if err := ctx.GetStub().PutState("BATCH_"+batchID, data); err != nil {
			return err
		}
		return fmt.Errorf("deadline exceeded: shipment rejected and inventory returned to central depot")
	}

	// ── تأكيد الاستلام ضمن المهلة ─────────────────────────────────────────────
	batch.Location = fmt.Sprintf("Depot %s", batch.WilayaName)
	batch.Status = "AT_WILAYA_DEPOT"

	data, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("BATCH_"+batchID, data)
}

// ── SendBatchToGasStation — REGIONAL ONLY ────────────────────────────────────
// يُرسل كمية من مستودع الولاية إلى محطة الوقود.
// يبدأ عداد 7 أيام — إذا لم تُؤكَّد خلالها تُرفض.

func (s *SmartContract) SendBatchToGasStation(ctx contractapi.TransactionContextInterface, batchID string, stationID string, stationName string, quantityStr string) error {
	if err := requireMSP(ctx, RegionalMSP); err != nil {
		return err
	}

	batch, err := s.ReadBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "AT_WILAYA_DEPOT" {
		return fmt.Errorf("batch %s must be AT_WILAYA_DEPOT to send to gas station (current: %s)", batchID, batch.Status)
	}

	qty := 0
	fmt.Sscanf(quantityStr, "%d", &qty)
	if qty <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}
	if qty > batch.Quantity {
		return fmt.Errorf("not enough stock: requested %d, available %d", qty, batch.Quantity)
	}

	_, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	batch.GasStationID = stationID
	batch.GasStationName = stationName
	batch.Owner = stationName
	batch.Location = fmt.Sprintf("In Transit to %s", stationName)
	batch.Status = "IN_TRANSIT_GAS_STATION"
	batch.Quantity = qty
	batch.SentToGasAt = now // [جديد] وقت الإرسال إلى المحطة

	data, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("BATCH_"+batchID, data)
}

// ── ConfirmArrivalGasStation — GAS ONLY ──────────────────────────────────────
// يتحقق أن المهلة (7 أيام من SentToGasAt) لم تنقضِ.
// إذا انقضت: يُسجَّل الرفض ويُعاد المخزون للولاية (Quantity يرجع، Status → EXPIRED_GAS).

func (s *SmartContract) ConfirmArrivalGasStation(ctx contractapi.TransactionContextInterface, batchID string) error {
	if err := requireMSP(ctx, GasMSP); err != nil {
		return err
	}

	batch, err := s.ReadBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "IN_TRANSIT_GAS_STATION" {
		return fmt.Errorf("batch %s is not in transit to gas station (current status: %s)", batchID, batch.Status)
	}

	txTime, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	sentToGasAt, err := time.Parse(time.RFC3339, batch.SentToGasAt)
	if err != nil {
		return fmt.Errorf("invalid SentToGasAt timestamp: %v", err)
	}

	// ── تحقق من انتهاء المهلة ──────────────────────────────────────────────────
	if txTime.Sub(sentToGasAt) > transitDeadlineHours {
		batch.Status = "EXPIRED_GAS"
		batch.ExpiredAt = now
		batch.ExpiredReason = fmt.Sprintf(
			"Shipment to gas station not confirmed within 7 days. Sent: %s, Deadline: %s",
			batch.SentToGasAt,
			sentToGasAt.Add(transitDeadlineHours).Format(time.RFC3339),
		)
		// الكمية ترجع للولاية: نعيد الـ Status إلى AT_WILAYA_DEPOT ونصفّر معلومات المحطة
		batch.GasStationID = ""
		batch.GasStationName = ""
		batch.Location = fmt.Sprintf("Returned to Depot %s", batch.WilayaName)
		// ملاحظة: الـ Status هو EXPIRED_GAS، الـ frontend يعرض ذلك وتتدخل الإدارة

		data, _ := json.Marshal(batch)
		if err := ctx.GetStub().PutState("BATCH_"+batchID, data); err != nil {
			return err
		}
		return fmt.Errorf("deadline exceeded: gas station shipment rejected, batch returned to wilaya depot")
	}

	// ── تأكيد الاستلام ضمن المهلة ─────────────────────────────────────────────
	batch.Location = batch.GasStationName
	batch.Status = "AT_GAS_STATION"

	data, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("BATCH_"+batchID, data)
}

// ── SellBatch — GAS ONLY ─────────────────────────────────────────────────────
// يُنفّذ عملية بيع مع:
//   1. التحقق من عدم شراء العميل خلال آخر 4 أشهر
//   2. تسجيل SaleRecord مستقل لكل عملية
//   3. تحديث SoldQuantity في الـ batch
//   4. تغيير Status إلى SOLD فقط إذا نفدت الكمية كلياً

func (s *SmartContract) SellBatch(ctx contractapi.TransactionContextInterface, batchID string, client string, vehicleCard string, quantityStr string) error {
	if err := requireMSP(ctx, GasMSP); err != nil {
		return err
	}

	batch, err := s.ReadBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "AT_GAS_STATION" {
		return fmt.Errorf("batch %s is not at a gas station (current status: %s)", batchID, batch.Status)
	}

	qty := 0
	fmt.Sscanf(quantityStr, "%d", &qty)
if qty <= 0 || qty > 2 {
    return fmt.Errorf("invalid quantity: maximum 2 tyres per sale, requested %d", qty)
}
if qty > batch.Quantity {
    return fmt.Errorf("insufficient stock: requested %d, available %d", qty, batch.Quantity)
}
	// ── 1. التحقق من سجل العميل (4 أشهر) ────────────────────────────────────
	clientKey := "CLIENT_" + vehicleCard
	existingClient, err := ctx.GetStub().GetState(clientKey)
	if err != nil {
		return fmt.Errorf("failed to read client record: %v", err)
	}

	txTime, now, err := getTxTime(ctx)
	if err != nil {
		return err
	}

	if existingClient != nil {
		var record ClientPurchase
		if err := json.Unmarshal(existingClient, &record); err != nil {
			return fmt.Errorf("failed to parse client record: %v", err)
		}

		lastPurchase, err := time.Parse(time.RFC3339, record.LastPurchase)
		if err != nil {
			return fmt.Errorf("invalid LastPurchase timestamp: %v", err)
		}

		daysPassed := txTime.Sub(lastPurchase).Hours() / 24
		if daysPassed < repurchaseDeadlineDays {
			daysRemaining := repurchaseDeadlineDays - int(daysPassed)
			nextEligible := lastPurchase.AddDate(0, 0, repurchaseDeadlineDays).Format("2006-01-02")
			return fmt.Errorf(
				"client %s (vehicle: %s) purchased on %s. Cannot repurchase for %d more day(s). Eligible again from: %s",
				client, vehicleCard, record.LastPurchase, daysRemaining, nextEligible,
			)
		}
	}

	// ── 2. تسجيل SaleRecord مستقل ────────────────────────────────────────────
	txID := ctx.GetStub().GetTxID()
	saleID := fmt.Sprintf("SALE_%s_%s", batchID, txID[:8])

	sale := SaleRecord{
		ID:          saleID,
		BatchID:     "BATCH_" + batchID,
		ClientName:  client,
		VehicleCard: vehicleCard,
		Quantity:    qty,
		SoldAt:      now,
	}
	saleData, err := json.Marshal(sale)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(saleID, saleData); err != nil {
		return err
	}

	// ── 3. تحديث أو إنشاء سجل العميل ────────────────────────────────────────
	totalBought := qty
	if existingClient != nil {
		var prev ClientPurchase
		json.Unmarshal(existingClient, &prev)
		totalBought += prev.TotalBought
	}

	clientRecord := ClientPurchase{
		VehicleCard:  vehicleCard,
		ClientName:   client,
		LastPurchase: now,
		TotalBought:  totalBought,
	}
	clientData, err := json.Marshal(clientRecord)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(clientKey, clientData); err != nil {
		return err
	}

	// ── 4. تحديث الـ batch ────────────────────────────────────────────────────
	batch.Quantity -= qty
	batch.SoldQuantity += qty

	if batch.Quantity == 0 {
		batch.Status = "SOLD"
		batch.Owner = client
		batch.Location = "Client"
	}

	data, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("BATCH_"+batchID, data)
}

// ── CheckClientEligibility — ALL ORGS (evaluate only) ────────────────────────
// يُستخدم من الـ backend للتحقق المسبق قبل فتح نافذة البيع (لا يُعدِّل الـ state).

func (s *SmartContract) CheckClientEligibility(ctx contractapi.TransactionContextInterface, vehicleCard string) (string, error) {
	clientKey := "CLIENT_" + vehicleCard
	existing, err := ctx.GetStub().GetState(clientKey)
	if err != nil {
		return "", err
	}

	type EligibilityResult struct {
		VehicleCard    string `json:"vehicleCard"`
		Eligible       bool   `json:"eligible"`
		LastPurchase   string `json:"lastPurchase,omitempty"`
		DaysRemaining  int    `json:"daysRemaining,omitempty"`
		EligibleFrom   string `json:"eligibleFrom,omitempty"`
		TotalBought    int    `json:"totalBought,omitempty"`
	}

	if existing == nil {
		result := EligibilityResult{VehicleCard: vehicleCard, Eligible: true}
		data, _ := json.Marshal(result)
		return string(data), nil
	}

	var record ClientPurchase
	if err := json.Unmarshal(existing, &record); err != nil {
		return "", err
	}

	txTime, _, err := getTxTime(ctx)
	if err != nil {
		return "", err
	}

	lastPurchase, err := time.Parse(time.RFC3339, record.LastPurchase)
	if err != nil {
		return "", err
	}

	daysPassed := txTime.Sub(lastPurchase).Hours() / 24
	daysRemaining := repurchaseDeadlineDays - int(daysPassed)
	eligible := daysRemaining <= 0
	if daysRemaining < 0 {
		daysRemaining = 0
	}

	result := EligibilityResult{
		VehicleCard:   vehicleCard,
		Eligible:      eligible,
		LastPurchase:  record.LastPurchase,
		DaysRemaining: daysRemaining,
		EligibleFrom:  lastPurchase.AddDate(0, 0, repurchaseDeadlineDays).Format("2006-01-02"),
		TotalBought:   record.TotalBought,
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

// ── GetAllBatches — ALL ORGS ──────────────────────────────────────────────────

func (s *SmartContract) GetAllBatches(ctx contractapi.TransactionContextInterface) ([]*TyreBatch, error) {
	iterator, err := ctx.GetStub().GetStateByRange("BATCH_", "BATCH_~")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var batches []*TyreBatch
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var batch TyreBatch
		if err := json.Unmarshal(result.Value, &batch); err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}
	return batches, nil
}

// ── GetBatchesByWilaya ────────────────────────────────────────────────────────

func (s *SmartContract) GetBatchesByWilaya(ctx contractapi.TransactionContextInterface, wilayaCode string) ([]*TyreBatch, error) {
	iterator, err := ctx.GetStub().GetStateByRange("BATCH_", "BATCH_~")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var batches []*TyreBatch
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var batch TyreBatch
		if err := json.Unmarshal(result.Value, &batch); err != nil {
			return nil, err
		}
		if batch.WilayaCode == wilayaCode {
			batches = append(batches, &batch)
		}
	}
	return batches, nil
}

// ── GetBatchesByGasStation ────────────────────────────────────────────────────

func (s *SmartContract) GetBatchesByGasStation(ctx contractapi.TransactionContextInterface, stationID string) ([]*TyreBatch, error) {
	iterator, err := ctx.GetStub().GetStateByRange("BATCH_", "BATCH_~")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var batches []*TyreBatch
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var batch TyreBatch
		if err := json.Unmarshal(result.Value, &batch); err != nil {
			return nil, err
		}
		if batch.GasStationID == stationID {
			batches = append(batches, &batch)
		}
	}
	return batches, nil
}

// ── GetBatchHistory ───────────────────────────────────────────────────────────

func (s *SmartContract) GetBatchHistory(ctx contractapi.TransactionContextInterface, batchID string) ([]string, error) {
	iterator, err := ctx.GetStub().GetHistoryForKey("BATCH_" + batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer iterator.Close()

	var history []string
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		history = append(history, string(response.Value))
	}
	return history, nil
}

// ── GetClientRecord — للاطلاع على سجل عميل معين ─────────────────────────────

func (s *SmartContract) GetClientRecord(ctx contractapi.TransactionContextInterface, vehicleCard string) (*ClientPurchase, error) {
	data, err := ctx.GetStub().GetState("CLIENT_" + vehicleCard)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("no purchase record found for vehicle card %s", vehicleCard)
	}
	var record ClientPurchase
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

// ── GetAllSales — لعرض جميع عمليات البيع ─────────────────────────────────────

func (s *SmartContract) GetAllSales(ctx contractapi.TransactionContextInterface) ([]*SaleRecord, error) {
	iterator, err := ctx.GetStub().GetStateByRange("SALE_", "SALE_~")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var sales []*SaleRecord
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var sale SaleRecord
		if err := json.Unmarshal(result.Value, &sale); err != nil {
			return nil, err
		}
		sales = append(sales, &sale)
	}
	return sales, nil
}
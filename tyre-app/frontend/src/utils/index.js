// src/utils/index.js

export function groupTyreTypes(types) {
  const grouped = new Map();
  types.forEach(tt => {
    const brand = cleanValue(tt.Brand, 'Unknown brand');
    const model = cleanValue(tt.Model, 'Unknown model');
    const key = `${brand}|${model}`.toLowerCase();
    const existing = grouped.get(key) || {
      groupKey: key,
      primaryId: tt.ID,
      brand,
      model,
      totalQty: 0,
      centralQty: 0,
      createdAt: tt.CreatedAt,
      items: [],
      size: extractTyreSize(`${brand} ${model}`),
      category: getTyreCategory(`${brand} ${model}`),
    };
    existing.items.push(tt);
    existing.totalQty += Number(tt.TotalQty || 0);
    existing.centralQty += Number(tt.CentralQty || 0);
    if (!existing.createdAt || tt.CreatedAt < existing.createdAt) existing.createdAt = tt.CreatedAt;
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
}

export function groupBatchesAsProducts(batchList) {
  const grouped = new Map();
  batchList.forEach(batch => {
    const brand = cleanValue(batch.Brand, 'Unknown brand');
    const model = cleanValue(batch.Model, 'Unknown model');
    const key = `${brand}|${model}`.toLowerCase();
    const existing = grouped.get(key) || {
      groupKey: key,
      primaryId: batch.TyreTypeID || batch.ID,
      brand,
      model,
      totalQty: 0,
      centralQty: 0,
      createdAt: batch.SentAt,
      items: [],
      size: extractTyreSize(`${brand} ${model}`),
      category: getTyreCategory(`${brand} ${model}`),
    };
    existing.items.push(batch);
    existing.totalQty += Number(batch.Quantity || 0);
    existing.centralQty += Number(batch.Quantity || 0);
    if (!existing.createdAt || batch.SentAt < existing.createdAt) existing.createdAt = batch.SentAt;
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
}

export function cleanValue(value, fallback) {
  return String(value || '').trim() || fallback;
}

export function getTyreCategory(text) {
  if (/c\b|van|vanc|cargo|106|107|108|109|110|111|112|114|115|116|120|121/i.test(text)) {
    return 'Commercial tyre';
  }
  if (/sport|premium|contact|fr|xl|zr|pc|sc/i.test(text)) {
    return 'Passenger performance tyre';
  }
  return 'Passenger tyre';
}

export function generateTyreTypeId(brand, model, existingTypes) {
  const prefix = `${brand.slice(0, 3)}${model.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`.toUpperCase();
  const base = prefix || 'TYRE';
  let counter = existingTypes.length + 1;
  let candidate = `${base}${String(counter).padStart(3, '0')}`;
  const existingIds = new Set(existingTypes.map(item => item.ID));
  while (existingIds.has(candidate)) {
    counter += 1;
    candidate = `${base}${String(counter).padStart(3, '0')}`;
  }
  return candidate;
}

export function getStockLevel(product) {
  if (product.centralQty <= 0) return { key: 'out', label: 'Out of stock' };
  const pct = product.totalQty > 0 ? product.centralQty / product.totalQty : 0;
  if (product.centralQty <= 20 || pct <= 0.2) return { key: 'low', label: 'Low stock' };
  return { key: 'healthy', label: 'Healthy stock' };
}

export function getStatusStep(status) {
  const order = ['IN_TRANSIT_WILAYA', 'AT_WILAYA_DEPOT', 'IN_TRANSIT_GAS_STATION', 'AT_GAS_STATION', 'SOLD'];
  const index = order.indexOf(status);
  return index === -1 ? 0 : index + 1;
}

export function extractTyreSize(text) {
  const patterns = [
    /\b\d{3}\/\d{2}R\d{2}\b/i,
    /\bR\d{2}\s+\d{3}\/\d{2}\b/i,
    /\b\d{3}\/\d{2}\s+R\d{2}\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].toUpperCase().replace(/\s+/g, ' ');
  }
  return 'Standard size';
}

export function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

// في نهاية الملف بعد formatDate

export function calcSold(batches) {
  return batches.reduce((sum, b) => sum + (b.SoldQuantity || 0), 0);
}

export function getTransitDeadlineInfo(sentAtStr) {
  if (!sentAtStr) return null;
  const sentAt   = new Date(sentAtStr);
  const deadline = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now      = new Date();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  const daysLeft  = hoursLeft / 24;
  return {
    deadline:  deadline.toLocaleDateString('fr-DZ'),
    daysLeft:  Math.max(0, Math.ceil(daysLeft)),
    hoursLeft: Math.max(0, Math.ceil(hoursLeft)),
    expired:   hoursLeft <= 0,
    urgent:    hoursLeft > 0 && hoursLeft <= 48,
  };
}
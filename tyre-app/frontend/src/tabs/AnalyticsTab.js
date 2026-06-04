// src/tabs/AnalyticsTab.js
import React, { useMemo, useState } from 'react';
import { DonutChart } from '../components/Charts';

// ── Report definitions per org ────────────────────────────────────────────────
const REPORTS_BY_ORG = {
  central: [
    { id: 'overview',        label: 'Overview' },
    { id: 'wilayas',         label: 'Wilayas ranking' },
    { id: 'wilaya-detail',   label: 'Wilaya details' },
    { id: 'station-detail',  label: 'Gas station details' },
  ],
  regional: [
    { id: 'overview',        label: 'Overview' },
    { id: 'station-detail',  label: 'Gas station details' },
  ],
  gas: [
    { id: 'overview',        label: 'Overview' },
  ],
};

const METRICS = [
  { id: 'stock', label: 'Current stock' },
  { id: 'sold',  label: 'Sold tyres' },
];

const STATUS_PALETTE = {
  available: '#1D63ED',
  transit:   '#0DB7ED',
  regional:  '#1D63ED',
  gas:       '#0DB7ED',
  sold:      '#1D63ED',
};

const BRAND_COLORS = ['#1D63ED', '#0DB7ED', '#60A5FA', '#93C5FD', '#2563EB', '#38BDF8', '#6B7280'];

// ── Main export ───────────────────────────────────────────────────────────────
// Props:
//   central  → batches, tyreTypes, allGasStations, wilayas, users, org
//   regional → batches, allGasStations, wilayas (single), org, user
//   gas      → batches, org, user
export function AnalyticsTab({ batches = [], tyreTypes = [], allGasStations = [], wilayas = [], users = [], org = 'central', user = null }) {
  const REPORTS = REPORTS_BY_ORG[org] || REPORTS_BY_ORG.central;
  const [report, setReport]               = useState(REPORTS[0].id);
  const [rankingMetric, setRankingMetric] = useState('stock');

  // ── Filter data to the right scope ─────────────────────────────────────────
  const scopedBatches = useMemo(() => {
    if (org === 'regional' && user?.wilaya?.code) {
      return batches.filter(b => String(b.WilayaCode || '') === String(user.wilaya.code));
    }
    if (org === 'gas' && user?.gasStation?.id) {
      return batches.filter(b => String(b.GasStationID || '') === String(user.gasStation.id));
    }
    return batches;
  }, [batches, org, user]);

  const scopedStations = useMemo(() => {
    if (org === 'regional' && user?.wilaya?.code) {
      return allGasStations.filter(s => String(s.wilayaCode || '') === String(user.wilaya.code));
    }
    if (org === 'gas' && user?.gasStation?.id) {
      return allGasStations.filter(s => String(s.id || '') === String(user.gasStation.id));
    }
    return allGasStations;
  }, [allGasStations, org, user]);

  const scopedWilayas = useMemo(() => {
    if (org === 'regional' && user?.wilaya) {
      return [{ code: String(user.wilaya.code), name: user.wilaya.name }];
    }
    return wilayas;
  }, [wilayas, org, user]);

  // ── Build analytics from scoped data ───────────────────────────────────────
  const analytics = useMemo(() => buildAnalytics({
    batches:         scopedBatches,
    tyreTypes:       org === 'central' ? tyreTypes : [],
    allGasStations:  scopedStations,
    wilayas:         scopedWilayas,
    users:           org === 'central' ? users : [],
    org,
    user,
  }), [scopedBatches, tyreTypes, scopedStations, scopedWilayas, users, org, user]);

  const [selectedWilaya, setSelectedWilaya] = useState(scopedWilayas?.[0]?.code || '');
  const [selectedStation, setSelectedStation] = useState('');

  const wilaya = analytics.wilayas.find(w => String(w.code) === String(selectedWilaya)) || analytics.wilayas[0];
  const stationsForWilaya = wilaya ? analytics.stations.filter(s => String(s.wilayaCode) === String(wilaya.code)) : analytics.stations;
  const station = analytics.stations.find(s => String(s.id) === String(selectedStation))
    || stationsForWilaya[0]
    || analytics.stations[0];

  function handleWilayaChange(code) {
    setSelectedWilaya(code);
    const next = analytics.stations.find(s => String(s.wilayaCode) === String(code));
    setSelectedStation(next?.id || '');
  }

  // ── Scope-aware header subtitle ────────────────────────────────────────────
  const scopeLabel = org === 'central'
    ? 'National distribution network'
    : org === 'regional'
    ? `Wilaya ${user?.wilaya?.code} — ${user?.wilaya?.name}`
    : user?.gasStation?.name || 'Gas Station';

  return (
    <div className="an-root analytics-workspace">
      <div className="analytics-header">
        <div>
          <span className="an-section-label">Analytics center</span>
          <h2>Operational intelligence</h2>
          <p>{scopeLabel}</p>
        </div>
        <div className="analytics-report-picker">
          {REPORTS.map(item => (
            <button
              key={item.id}
              className={report === item.id ? 'active' : ''}
              onClick={() => setReport(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {report === 'overview' && (
        <OverviewReport analytics={analytics} org={org} user={user} />
      )}

      {report === 'wilayas' && org === 'central' && (
        <WilayasRankingReport analytics={analytics} rankingMetric={rankingMetric} setRankingMetric={setRankingMetric} />
      )}

      {report === 'wilaya-detail' && org === 'central' && (
        <WilayaDetailReport
          analytics={analytics}
          wilaya={wilaya}
          selectedWilaya={selectedWilaya}
          onWilayaChange={handleWilayaChange}
        />
      )}

      {report === 'station-detail' && (
        <StationDetailReport
          analytics={analytics}
          wilaya={wilaya}
          station={station}
          stationsForWilaya={org === 'gas' ? analytics.stations : stationsForWilaya}
          selectedWilaya={selectedWilaya}
          selectedStation={selectedStation || station?.id || ''}
          onWilayaChange={handleWilayaChange}
          onStationChange={setSelectedStation}
          // للـ regional/gas نخفي الـ wilaya selector
          hideWilayaSelect={org !== 'central'}
        />
      )}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
// يتكيّف حسب الـ org: central يعرض كل شيء، regional يعرض بيانات الولاية، gas يعرض بيانات المحطة
function OverviewReport({ analytics, org, user }) {
  // KPIs حسب نوع الحساب
  const kpis = org === 'central'
    ? [
        { label: 'Registered tyres',  value: analytics.totals.registered },
        { label: 'Central stock',     value: analytics.totals.centralStock },
        { label: 'Field stock',       value: analytics.totals.currentStock },
        { label: 'Sold tyres',        value: analytics.totals.sold },
        { label: 'Active wilayas',    value: analytics.wilayas.filter(w => w.totalStock > 0 || w.sold > 0).length },
        { label: 'Gas stations',      value: analytics.stations.length },
      ]
    : org === 'regional'
    ? [
        { label: 'Depot stock',       value: analytics.totals.atWilaya },
        { label: 'In transit to depot', value: analytics.totals.inTransitWilaya },
        { label: 'At gas stations',   value: analytics.totals.atGas },
        { label: 'Sold tyres',        value: analytics.totals.sold },
        { label: 'Gas stations',      value: analytics.stations.length },
        { label: 'Total batches',     value: analytics.totals.batchCount },
      ]
    : [
        { label: 'Remaining stock',   value: analytics.totals.remaining },
        { label: 'Incoming',          value: analytics.totals.incoming },
        { label: 'Sold tyres',        value: analytics.totals.sold },
        { label: 'Total batches',     value: analytics.totals.batchCount },
      ];

  return (
    <>
      <KpiGrid items={kpis} />

      <div className="analytics-donut-grid">
        <DonutPanel
          title="Inventory distribution"
          subtitle={org === 'gas' ? `Tyre status at ${user?.gasStation?.name || 'this station'}` : 'Status of all tyres across the chain'}
          label={formatNumber(analytics.totals.chainTotal)}
          sublabel="Tyres tracked"
          segments={analytics.inventorySegments}
        />
        <DonutPanel
          title="Tyres by Brand"
          subtitle="Tyre distribution by brand"
          label={formatNumber(analytics.totals.chainTotal)}
          sublabel="Tracked"
          segments={analytics.brandSegments}
        />
      </div>

      {org === 'central' && (
        <div className="analytics-grid two">
          <Panel title="Top active wilayas" subtitle="Highest stock and sales activity">
            <RankList items={analytics.wilayas.slice(0, 8)} valueKey="activity" empty="No wilaya activity yet" />
          </Panel>
          <Panel title="Operational summary" subtitle="Key chain status values">
            <DistributionList items={analytics.inventorySegments} total={analytics.totals.chainTotal} />
          </Panel>
        </div>
      )}

      {org === 'regional' && analytics.stations.length > 0 && (
        <Panel title="Gas stations in this wilaya" subtitle="Sales and stock per station">
          <div className="wilaya-bars">
            {analytics.stations.map(s => (
              <HorizontalBar key={s.id} label={s.name} value={s.sold} max={Math.max(...analytics.stations.map(x => x.sold), 1)} />
            ))}
          </div>
        </Panel>
      )}

      {org === 'gas' && analytics.stations[0] && (
        <div className="analytics-grid two">
          <Panel title="Stock by brand" subtitle="Remaining tyres at this station">
            <RankList items={analytics.stations[0].brandStock} valueKey="value" empty="No stock data" />
          </Panel>
          <Panel title="Operational summary" subtitle="Key status values">
            <DistributionList items={analytics.inventorySegments} total={analytics.totals.chainTotal} />
          </Panel>
        </div>
      )}
    </>
  );
}

// ── Wilayas ranking (central only) ───────────────────────────────────────────
function WilayasRankingReport({ analytics, rankingMetric, setRankingMetric }) {
  const ranked = [...analytics.wilayas].sort((a, b) => {
    const key = rankingMetric === 'sold' ? 'sold' : 'totalStock';
    return b[key] - a[key];
  });
  const max = Math.max(...ranked.map(w => rankingMetric === 'sold' ? w.sold : w.totalStock), 1);

  return (
    <Panel
      title="Wilayas ranking"
      subtitle="Compare all wilayas by current tyre ownership or sold tyres"
      actions={(
        <select value={rankingMetric} onChange={e => setRankingMetric(e.target.value)} className="analytics-select">
          {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      )}
    >
      <div className="wilaya-bars giant">
        {ranked.map(w => {
          const value = rankingMetric === 'sold' ? w.sold : w.totalStock;
          return <HorizontalBar key={w.code} label={`${w.code} - ${w.name}`} value={value} max={max} />;
        })}
      </div>
    </Panel>
  );
}

// ── Wilaya detail (central only) ──────────────────────────────────────────────
function WilayaDetailReport({ analytics, wilaya, selectedWilaya, onWilayaChange }) {
  if (!wilaya) return <EmptyState text="No wilaya data available" />;
  const stationMax = Math.max(...wilaya.stations.map(s => s.sold), 1);

  return (
    <>
      <Panel
        title="Wilaya details"
        subtitle="Select a wilaya to inspect sales, stock, stations, and managers"
        actions={<WilayaSelect wilayas={analytics.wilayas} value={selectedWilaya || wilaya.code} onChange={onWilayaChange} />}
      >
        <KpiGrid compact items={[
          { label: 'Sold tyres',      value: wilaya.sold },
          { label: 'Current stock',   value: wilaya.totalStock },
          { label: 'Gas stations',    value: wilaya.stationCount },
          { label: 'Inbound batches', value: wilaya.batchCount },
        ]} />
      </Panel>

      <div className="analytics-donut-grid">
        <DonutPanel
          title="Inventory distribution"
          subtitle={`Tyre status inside ${wilaya.name}`}
          label={formatNumber(wilaya.statusTotal)}
          sublabel="Wilaya tyres"
          segments={wilaya.inventorySegments}
        />
        <DonutPanel
          title="Tyres by Brand"
          subtitle={`Brand distribution inside ${wilaya.name}`}
          label={formatNumber(wilaya.brandTotal)}
          sublabel="Tyres"
          segments={wilaya.brandSegments}
        />
      </div>

      <div className="analytics-grid two">
        <Panel title="Top gas stations by sales" subtitle={`Sales ranking inside ${wilaya.name}`}>
          {wilaya.stations.length > 0
            ? <div className="wilaya-bars">{wilaya.stations.map(s => <HorizontalBar key={s.id} label={s.name} value={s.sold} max={stationMax} />)}</div>
            : <EmptyState text="No gas stations found for this wilaya" />}
        </Panel>
        <Panel title="Wilaya managers" subtitle="User accounts assigned to this wilaya">
          <PeopleList people={wilaya.managers} empty="No managers registered for this wilaya" />
        </Panel>
      </div>
    </>
  );
}

// ── Station detail ────────────────────────────────────────────────────────────
function StationDetailReport({ analytics, wilaya, station, stationsForWilaya, selectedWilaya, selectedStation, onWilayaChange, onStationChange, hideWilayaSelect }) {
  if (!station) return <EmptyState text="No station data available" />;

  return (
    <>
      <Panel
        title="Gas station details"
        subtitle={hideWilayaSelect ? `Details for ${station.name}` : 'Choose a wilaya, then inspect one gas station'}
        actions={(
          <div className="analytics-actions-row">
            {!hideWilayaSelect && (
              <WilayaSelect wilayas={analytics.wilayas} value={selectedWilaya || wilaya?.code || ''} onChange={onWilayaChange} />
            )}
            {stationsForWilaya.length > 1 && (
              <select value={selectedStation} onChange={e => onStationChange(e.target.value)} className="analytics-select">
                {stationsForWilaya.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        )}
      >
        <KpiGrid compact items={[
          { label: 'Sold tyres',              value: station.sold },
          { label: 'Remaining tyres',         value: station.remaining },
          { label: 'Days since last shipment', value: station.daysSinceLastShipment ?? 'N/A' },
          { label: 'Sales rate / day',         value: station.salesPerDay.toFixed(2) },
        ]} />
      </Panel>

      <div className="analytics-donut-grid">
        <DonutPanel
          title="Inventory distribution"
          subtitle={`Tyre status at ${station.name}`}
          label={formatNumber(station.statusTotal)}
          sublabel="Station tyres"
          segments={station.inventorySegments}
        />
        <DonutPanel
          title="Tyres by Brand"
          subtitle={`Brand distribution at ${station.name}`}
          label={formatNumber(station.brandTotal)}
          sublabel="Tyres"
          segments={station.brandSegments}
        />
      </div>

      <div className="analytics-grid two">
        <Panel title="Station inventory by brand" subtitle="Remaining tyres currently at this station">
          <RankList items={station.brandStock} valueKey="value" empty="No remaining stock at this station" />
        </Panel>
        <Panel title="Station managers" subtitle="User accounts assigned to this gas station">
          <PeopleList people={station.managers} empty="No managers registered for this station" />
        </Panel>
      </div>
    </>
  );
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function DonutPanel({ title, subtitle, label, sublabel, segments }) {
  const visible = segments.filter(s => s.value > 0);
  const chartSegments = visible.length > 0 ? visible : [{ label: 'No data', value: 1, color: '#e4e9f3', pct: 100 }];
  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="analytics-donut-panel">
        <DonutChart segments={chartSegments} size={190} stroke={28} label={visible.length > 0 ? label : '0'} sublabel={sublabel} />
        <div className="analytics-donut-legend">
          {(visible.length > 0 ? visible : segments).map(item => (
            <div className="analytics-donut-legend-row" key={item.label}>
              <span style={{ background: item.color }} />
              <strong>{item.label}</strong>
              <em>{formatNumber(item.value)}</em>
              <small>{item.pct ? `${item.pct.toFixed(1)}%` : '0%'}</small>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function KpiGrid({ items, compact = false }) {
  return (
    <div className={compact ? 'analytics-kpis compact' : 'analytics-kpis'}>
      {items.map(item => (
        <div className="analytics-kpi" key={item.label}>
          <span>{item.label}</span>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        {actions && <div className="analytics-panel-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function WilayaSelect({ wilayas, value, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} className="analytics-select">
      {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
    </select>
  );
}

function HorizontalBar({ label, value, max }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="analytics-hbar">
      <div className="analytics-hbar-meta"><span>{label}</span><strong>{formatNumber(value)}</strong></div>
      <div className="analytics-hbar-track"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function DistributionList({ items, total }) {
  return (
    <div className="analytics-distribution">
      {items.map(item => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div className="analytics-dist-row" key={item.label}>
            <div><span style={{ background: item.color }} /><strong>{item.label}</strong></div>
            <em>{formatNumber(item.value)}</em>
            <div className="analytics-hbar-track"><span style={{ width: `${Math.max(2, pct)}%`, background: item.color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function RankList({ items, valueKey, empty }) {
  if (!items || items.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="analytics-rank-list">
      {items.map((item, i) => (
        <div className="analytics-rank-item" key={item.id || item.code || item.label || i}>
          <span>{String(i + 1).padStart(2, '0')}</span>
          <strong>{item.name || item.label}</strong>
          <em>{formatNumber(item[valueKey])}</em>
        </div>
      ))}
    </div>
  );
}

function PeopleList({ people, empty }) {
  if (!people || people.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="analytics-people">
      {people.map(person => (
        <div className="analytics-person" key={person.username}>
          <div>{getInitials(person)}</div>
          <section>
            <strong>{getPersonName(person)}</strong>
            <span>{person.position || person.username}</span>
            {person.email && <small>{person.email}</small>}
          </section>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="analytics-empty">{text}</div>;
}

// ── Data builder ──────────────────────────────────────────────────────────────
function buildAnalytics({ batches = [], tyreTypes = [], allGasStations = [], wilayas = [], users = [], org, user }) {
  const normalizedWilayas = wilayas.map(w => ({ code: String(w.code), name: w.name || `Wilaya ${w.code}` }));
  const stations = allGasStations.map(s => buildStation(s, batches, users));

  const centralStock = tyreTypes.reduce((sum, t) => sum + (Number(t.CentralQty) || 0), 0);
  const registered   = tyreTypes.reduce((sum, t) => sum + (Number(t.TotalQty)   || 0), 0);

  const inTransitWilaya = batches.filter(b => b.Status === 'IN_TRANSIT_WILAYA').reduce((sum, b) => sum + currentQty(b), 0);
  const inTransitGas    = batches.filter(b => b.Status === 'IN_TRANSIT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
  const inTransit       = inTransitWilaya + inTransitGas;
  const atWilaya        = batches.filter(b => b.Status === 'AT_WILAYA_DEPOT').reduce((sum, b) => sum + currentQty(b), 0);
  const atGas           = batches.filter(b => b.Status === 'AT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
  const sold            = batches.reduce((sum, b) => sum + soldQty(b), 0);
  const remaining       = atGas;
  const incoming        = inTransitGas;

  const wilayaRows = normalizedWilayas.map(w => {
    const wb       = batches.filter(b => String(b.WilayaCode || '') === String(w.code));
    const ws       = stations.filter(s => String(s.wilayaCode || '') === String(w.code));
    const managers = users.filter(u => isRegionalUser(u) && String(u.wilayaCode || '') === String(w.code));
    const rTransit = wb.filter(b => b.Status === 'IN_TRANSIT_WILAYA').reduce((sum, b) => sum + currentQty(b), 0);
    const gTransit = wb.filter(b => b.Status === 'IN_TRANSIT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
    const rStock   = wb.filter(b => b.Status === 'AT_WILAYA_DEPOT').reduce((sum, b) => sum + currentQty(b), 0);
    const gStock   = wb.filter(b => b.Status === 'AT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
    const total    = rTransit + gTransit + rStock + gStock;
    const wSold    = wb.reduce((sum, b) => sum + soldQty(b), 0);
    const brandSeg = makeBrandSegments(brandTotalsFromBatches(wb));
    const invSeg   = makeInventorySegments({ available: total, transit: rTransit + gTransit, regional: rStock, gas: gStock, sold: wSold });
    return {
      ...w,
      batches: wb, batchCount: wb.length,
      totalStock: total, sold: wSold, activity: total + wSold,
      stationCount: ws.length, managers,
      stations: ws.sort((a, b) => b.sold - a.sold),
      inventorySegments: invSeg, statusTotal: segmentTotal(invSeg),
      brandSegments: brandSeg,   brandTotal:  segmentTotal(brandSeg),
    };
  }).sort((a, b) => (b.totalStock + b.sold) - (a.totalStock + a.sold));

  // brand segments: for gas org use batches directly
  const brandSegments = org === 'central'
    ? makeBrandSegments(brandTotalsFromTyreTypes(tyreTypes))
    : makeBrandSegments(brandTotalsFromBatches(batches));

  const inventorySegments = makeInventorySegments({
    available: org === 'central' ? centralStock : (org === 'gas' ? remaining : atWilaya),
    transit:   inTransit,
    regional:  org === 'central' ? atWilaya : 0,
    gas:       org === 'central' ? atGas    : (org === 'gas' ? 0 : atGas),
    sold,
  });

  return {
    totals: {
      registered, centralStock,
      currentStock: inTransit + atWilaya + atGas,
      inTransit, inTransitWilaya, inTransitGas,
      atWilaya, atGas, sold,
      remaining, incoming,
      chainTotal: segmentTotal(inventorySegments),
      batchCount: batches.length,
    },
    inventorySegments,
    brandSegments,
    distribution: inventorySegments,
    wilayas: wilayaRows,
    stations: stations.sort((a, b) => b.sold - a.sold),
  };
}

function buildStation(station, batches, users) {
  const sb = batches.filter(b => String(b.GasStationID || '') === String(station.id));
  const sold        = sb.reduce((sum, b) => sum + soldQty(b), 0);
  const remaining   = sb.filter(b => b.Status === 'AT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
  const incoming    = sb.filter(b => b.Status === 'IN_TRANSIT_GAS_STATION').reduce((sum, b) => sum + currentQty(b), 0);
  const lastShip    = latestDate(sb.map(b => b.SentAt));
  const firstShip   = earliestDate(sb.map(b => b.SentAt));
  const daysSince   = lastShip  ? Math.max(0, Math.floor((Date.now() - lastShip.getTime()) / 86400000)) : null;
  const activeDays  = firstShip ? Math.max(1, Math.ceil((Date.now() - firstShip.getTime()) / 86400000)) : 1;
  const managers    = users.filter(u => isGasUser(u) && String(u.gasStationId || '') === String(station.id));
  const brandMap    = {};
  sb.forEach(b => { const br = b.Brand || 'Unknown'; brandMap[br] = (brandMap[br] || 0) + currentQty(b) + soldQty(b); });
  const invSeg   = makeInventorySegments({ available: remaining, transit: incoming, regional: 0, gas: 0, sold });
  const brandSeg = makeBrandSegments(brandMap);
  return {
    ...station,
    id:         station.id,
    name:       station.name || 'Unnamed station',
    wilayaCode: String(station.wilayaCode || station.WilayaCode || ''),
    sold, remaining,
    batches: sb, daysSinceLastShipment: daysSince,
    salesPerDay: sold / activeDays, managers,
    brandStock: Object.entries(brandMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    inventorySegments: invSeg, statusTotal: segmentTotal(invSeg),
    brandSegments: brandSeg,   brandTotal:  segmentTotal(brandSeg),
  };
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function makeInventorySegments(v) {
  return withPercentages([
    { label: 'Available',         value: v.available || 0, color: STATUS_PALETTE.available },
    { label: 'In Transit',        value: v.transit   || 0, color: STATUS_PALETTE.transit   },
    { label: 'At Regional Depot', value: v.regional  || 0, color: STATUS_PALETTE.regional  },
    { label: 'At Gas Station',    value: v.gas       || 0, color: STATUS_PALETTE.gas       },
    { label: 'Sold',              value: v.sold      || 0, color: STATUS_PALETTE.sold      },
  ]);
}

function makeBrandSegments(map) {
  return withPercentages(
    Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: BRAND_COLORS[i % BRAND_COLORS.length] }))
  );
}

function withPercentages(segments) {
  const total = segmentTotal(segments);
  return segments.map(s => ({ ...s, pct: total > 0 ? (s.value / total) * 100 : 0 }));
}

function segmentTotal(segments) {
  return segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
}

function brandTotalsFromTyreTypes(types) {
  return types.reduce((acc, t) => { const b = t.Brand || 'Unknown'; acc[b] = (acc[b] || 0) + (Number(t.TotalQty) || 0); return acc; }, {});
}

function brandTotalsFromBatches(batches) {
  return batches.reduce((acc, b) => { const br = b.Brand || 'Unknown'; acc[br] = (acc[br] || 0) + currentQty(b) + soldQty(b); return acc; }, {});
}

function currentQty(b) { return Number(b.Quantity ?? b.quantity ?? 0) || 0; }

function soldQty(b) {
  if (b.Status !== 'SOLD') return Number(b.SoldQuantity ?? b.soldQuantity ?? 0) || 0;
  return Number(b.SoldQuantity ?? b.soldQuantity ?? b.Quantity ?? b.quantity ?? 0) || 0;
}

function isRegionalUser(u) { return Number(u.role) === 2 || u.role === 'regional' || u.org === 'regional'; }
function isGasUser(u)      { return Number(u.role) === 3 || u.role === 'gas'      || u.org === 'gas';      }

function getPersonName(p) { return (`${p.firstName || ''} ${p.lastName || ''}`).trim() || p.username || 'Unnamed user'; }
function getInitials(p)   { return getPersonName(p).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function earliestDate(vals) {
  const d = vals.map(v => new Date(v)).filter(d => !isNaN(d));
  return d.length ? new Date(Math.min(...d)) : null;
}

function latestDate(vals) {
  const d = vals.map(v => new Date(v)).filter(d => !isNaN(d));
  return d.length ? new Date(Math.max(...d)) : null;
}

function formatNumber(v) {
  if (typeof v === 'string') return v;
  return Number(v || 0).toLocaleString();
}

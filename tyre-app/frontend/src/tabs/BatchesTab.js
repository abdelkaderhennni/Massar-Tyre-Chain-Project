// src/tabs/BatchesTab.js
import React, { useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { BatchRow } from '../components/BatchRow';
import { calcSold } from '../utils';

export function BatchesTab({ loading, batches, org, inTransit, atDepot, openBatch, setModal, setForm, user }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const soldQty      = calcSold(batches);
  const expiredCount = batches.filter(b =>
    b.Status === 'EXPIRED_WILAYA' || b.Status === 'EXPIRED_GAS'
  ).length;
  const statusOptions = useMemo(() => (
    Array.from(new Set(batches.map(b => b.Status).filter(Boolean))).sort()
  ), [batches]);
  const filteredBatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return batches.filter(batch => {
      const statusMatch = statusFilter === 'all' || batch.Status === statusFilter;
      const text = [
        batch.ID,
        batch.Brand,
        batch.Model,
        batch.Status,
        batch.WilayaName,
        batch.GasStationName,
      ].filter(Boolean).join(' ').toLowerCase();
      return statusMatch && (!term || text.includes(term));
    });
  }, [batches, query, statusFilter]);

  return (
    <>
      <div className="transactions-hero page-hero-light">
        <div>
          <span className="section-eyebrow">Operations ledger</span>
          <h2>Transactions History</h2>
          <p>Track every shipment, depot transfer, gas station movement, sale, and exception in one clean history view.</p>
        </div>
      </div>

      <div className="stats-row">
        <StatCard icon="transit" tone="blue" value={inTransit}    label="In Transit" />
        <StatCard icon="stock" tone="cyan" value={atDepot}      label="At Depots" />
        <StatCard icon="sold" tone="blue" value={soldQty}      label="Tyres Sold" />
        <StatCard icon="types" tone="cyan" value={expiredCount} label="Rejected" urgent={expiredCount > 0} />
      </div>

      <div className="catalog-toolbar transactions-toolbar">
        <div>
          <span className="section-eyebrow">Transaction management</span>
          <h2>History records</h2>
        </div>
        <div className="catalog-tools">
          <label className="catalog-search">
            <span aria-hidden="true">Search</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search batch, brand, wilaya, station..."
            />
          </label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="batch-list transactions-list">
        {loading
          ? <div className="loading">Loading shipments...</div>
          : filteredBatches.length === 0
          ? <div className="empty">No transactions found.</div>
          : filteredBatches.map(b => (
              <BatchRow
                key={b.ID}
                batch={b}
                org={org}
                onView={() => openBatch(b)}
                onAction={type => {
                  setModal({ type, batchId: b.ID.replace('BATCH_', '') });
                  setForm({ wilayaCode: user.wilaya?.code });
                }}
              />
            ))}
      </div>
    </>
  );
}

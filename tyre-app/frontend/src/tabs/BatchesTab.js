// src/tabs/BatchesTab.js
import React from 'react';
import { StatCard } from '../components/StatCard';
import { BatchRow } from '../components/BatchRow';
import { calcSold } from '../utils';

export function BatchesTab({ loading, batches, org, inTransit, atDepot, openBatch, setModal, setForm, user }) {
  const soldQty      = calcSold(batches);
  const expiredCount = batches.filter(b =>
    b.Status === 'EXPIRED_WILAYA' || b.Status === 'EXPIRED_GAS'
  ).length;

  return (
    <>
      <div className="stats-row">
        <StatCard value={inTransit}    label="In Transit" />
        <StatCard value={atDepot}      label="At Depots" />
        <StatCard value={soldQty}      label="Tyres Sold" />
        <StatCard value={expiredCount} label="Rejected" urgent={expiredCount > 0} />
        <StatCard value={batches.reduce((s, b) => s + (b.Quantity || 0), 0)} label="Total Tyres" />
      </div>
      <div className="section-title">Shipment Batches</div>
      <div className="batch-list">
        {loading
          ? <div className="loading">Loading shipments...</div>
          : batches.length === 0
          ? <div className="empty">No batches found.</div>
          : batches.map(b => (
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
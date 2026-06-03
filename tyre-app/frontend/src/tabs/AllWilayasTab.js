// src/tabs/AllWilayasTab.js
import React from 'react';
import { BatchRow } from '../components/BatchRow';

export function AllWilayasTab({ loading, batchesByWilaya, openBatch }) {
  return (
    <div className="all-wilayas-view">
      {loading ? <div className="loading">Loading all wilayas...</div>
        : Object.keys(batchesByWilaya).length === 0
          ? <div className="empty">No batches sent to any wilaya yet.</div>
          : Object.entries(batchesByWilaya).sort(([a], [b]) => a.localeCompare(b)).map(([code, data]) => (
            <div className="wilaya-section" key={code}>
              <div className="wilaya-section-header">
                <span className="wilaya-badge">W{code}</span>
                <span className="wilaya-section-name">{data.name}</span>
                <span className="wilaya-count">
                  {data.batches.length} batches / {data.batches.reduce((s, b) => s + (b.Quantity || 0), 0)} tyres
                </span>
              </div>
              <div className="batch-list">
                {data.batches.map(b => (
                  <BatchRow key={b.ID} batch={b} org="view-only" onView={() => openBatch(b)} onAction={() => {}} />
                ))}
              </div>
            </div>
          ))}
    </div>
  );
}

// src/tabs/AllWilayasTab.js
import React, { useMemo, useState } from 'react';
import { BatchRow } from '../components/BatchRow';

export function AllWilayasTab({ loading, batchesByWilaya, openBatch }) {
  const wilayaEntries = useMemo(() => (
    Object.entries(batchesByWilaya).sort(([a], [b]) => a.localeCompare(b))
  ), [batchesByWilaya]);
  const [selectedCode, setSelectedCode] = useState('');
  const selectedEntry = selectedCode
    ? wilayaEntries.find(([code]) => code === selectedCode)
    : null;

  return (
    <div className="all-wilayas-view">
      {loading ? <div className="loading">Loading all wilayas...</div>
        : Object.keys(batchesByWilaya).length === 0
          ? <div className="empty">No batches sent to any wilaya yet.</div>
          : (
            <>
              <div className="wilayas-hero page-hero-light">
                <div>
                  <span className="section-eyebrow">Wilaya network</span>
                  <h2>Wilaya Overview</h2>
                  <p>Select a wilaya card to inspect only its related transactions and stock movement history.</p>
                </div>
              </div>

              <div className="wilaya-card-grid">
                {wilayaEntries.map(([code, data]) => {
                  const totalTyres = data.batches.reduce((s, b) => s + (b.Quantity || 0), 0);
                  const activeCount = data.batches.filter(b => b.Status !== 'SOLD').length;
                  const isSelected = selectedCode === code;
                  return (
                    <button
                      key={code}
                      className={`wilaya-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedCode(isSelected ? '' : code)}
                    >
                      <span className="wilaya-card-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>
                      </span>
                      <span className="wilaya-card-code">W{code}</span>
                      <strong>{data.name}</strong>
                      <span className="wilaya-card-meta">{data.batches.length} transactions</span>
                      <span className="wilaya-card-stats">
                        <em>{totalTyres} tyres</em>
                        <em>{activeCount > 0 ? 'Active' : 'Settled'}</em>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="wilaya-detail-panel">
                {selectedEntry ? (
                  <>
                    <div className="wilaya-section-header">
                      <span className="wilaya-badge">W{selectedEntry[0]}</span>
                      <span className="wilaya-section-name">{selectedEntry[1].name}</span>
                      <span className="wilaya-count">
                        {selectedEntry[1].batches.length} transactions / {selectedEntry[1].batches.reduce((s, b) => s + (b.Quantity || 0), 0)} tyres
                      </span>
                      <button className="btn-view" onClick={() => setSelectedCode('')}>Close</button>
                    </div>
                    <div className="batch-list transactions-list">
                      {selectedEntry[1].batches.map(b => (
                        <BatchRow key={b.ID} batch={b} org="view-only" onView={() => openBatch(b)} onAction={() => {}} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="wilaya-detail-empty">
                    Choose a wilaya card to open its focused transaction history.
                  </div>
                )}
              </div>
            </>
          )}
    </div>
  );
}

// src/components/BatchDetail.js
import React from 'react';
import { STATUS_COLORS } from '../constants';

export function BatchDetail({ batch, history, loading, onBack }) {
  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>Back</button>
      <div className="detail-grid">
        <div className="detail-card">
          <h3>Batch Information</h3>
          <div className="detail-rows">
            {[
              ['Batch ID', batch.ID],
              ['Brand', batch.Brand],
              ['Model', batch.Model],
              ['Quantity', `${batch.Quantity} units`],
              ['Status', batch.Status],
              ['Wilaya', batch.WilayaName ? `${batch.WilayaCode} - ${batch.WilayaName}` : '-'],
              ['Gas Station', batch.GasStationName || '-'],
              ['Owner', batch.Owner],
              ['Location', batch.Location],
              ['Sent At', batch.SentAt],
            ].map(([k, v]) => (
              <div className="detail-row" key={k}>
                <span className="detail-key">{k}</span>
                <span className="detail-val">
                  {k === 'Status'
                    ? <span className="status-badge" style={{ background: `${STATUS_COLORS[v] || '#666'}22`, color: STATUS_COLORS[v] || '#666', border: `1px solid ${STATUS_COLORS[v] || '#666'}44` }}>{v?.replace(/_/g, ' ')}</span>
                    : v}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-card">
          <h3>Batch Timeline</h3>
          {loading ? <div className="loading">Loading timeline...</div>
            : history.length === 0 ? <div className="empty">No history.</div>
            : (
              <div className="history-list">
                {history.map((h, i) => (
                  <div className="history-item" key={i}>
                    <div className="history-dot" style={{ background: STATUS_COLORS[h.Status] || '#666' }} />
                    <div>
                      <div className="history-status">{h.Status?.replace(/_/g, ' ')}</div>
                      <div className="history-meta">
                        {h.Quantity !== undefined && <span>{h.Quantity} units</span>}
                        {h.WilayaName && <span>{h.WilayaName}</span>}
                        {h.GasStationName && <span>{h.GasStationName}</span>}
                        {h.Owner && <span>{h.Owner}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

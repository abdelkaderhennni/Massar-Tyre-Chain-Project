// src/components/BatchRow.js
import React from 'react';
import { STATUS_COLORS } from '../constants';
import { getStatusStep, getTransitDeadlineInfo } from '../utils';

export function BatchRow({ batch, org, onView, onAction }) {
  const statusColor = STATUS_COLORS[batch.Status] || '#666';
  const currentStep = getStatusStep(batch.Status);
  const isExpired   = batch.Status === 'EXPIRED_WILAYA' || batch.Status === 'EXPIRED_GAS';

  const deadlineInfo = batch.Status === 'IN_TRANSIT_WILAYA'
    ? getTransitDeadlineInfo(batch.SentAt)
    : batch.Status === 'IN_TRANSIT_GAS_STATION'
    ? getTransitDeadlineInfo(batch.SentToGasAt)
    : null;

  const actions = [];
  if (org === 'regional') {
    if (batch.Status === 'IN_TRANSIT_WILAYA') actions.push({ label: 'Confirm Arrival',    type: 'confirm-wilaya' });
    if (batch.Status === 'AT_WILAYA_DEPOT')   actions.push({ label: 'Send to Gas Station', type: 'send-gas' });
  }
  if (org === 'gas') {
    if (batch.Status === 'IN_TRANSIT_GAS_STATION') actions.push({ label: 'Confirm Arrival', type: 'confirm-gas' });
    if (batch.Status === 'AT_GAS_STATION')          actions.push({ label: 'Sell to Client',  type: 'sell' });
  }

  return (
    <div className={`batch-row${isExpired ? ' batch-row--expired' : ''}`}>
      <div className="batch-row-left">
        <div className="batch-row-id">{batch.ID?.replace('BATCH_', '')}</div>
        <div className="batch-row-brand">{batch.Brand} / {batch.Model}</div>
        <div className="batch-row-meta">
          <span className="batch-qty">{batch.Quantity} units</span>
          {batch.SoldQuantity > 0 && (
            <span className="batch-sold-qty">{batch.SoldQuantity} sold</span>
          )}
          {batch.WilayaName     && <span>{batch.WilayaName}</span>}
          {batch.GasStationName && <span>{batch.GasStationName}</span>}
        </div>

        {deadlineInfo && !deadlineInfo.expired && (
          <div className={`deadline-badge${deadlineInfo.urgent ? ' deadline-badge--urgent' : ''}`}>
            {deadlineInfo.daysLeft > 0
              ? `${deadlineInfo.daysLeft} day(s) left to confirm`
              : `${deadlineInfo.hoursLeft}h left to confirm`}
          </div>
        )}

        {isExpired && batch.ExpiredReason && (
          <div className="expired-reason">{batch.ExpiredReason}</div>
        )}

        <div className="shipment-steps" aria-label="Shipment progress">
          {['Central', 'Regional', 'Gas', 'Sold'].map((step, index) => (
            <span key={step} className={index < Math.min(currentStep, 4) ? 'done' : ''}>
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="batch-row-right">
        <span className="batch-status" style={{ background: `${statusColor}22`, color: statusColor }}>
          {batch.Status?.replace(/_/g, ' ')}
        </span>
        <div className="batch-actions">
          <button className="btn-view" onClick={onView}>Details</button>
          {actions.map(a => (
            <button key={a.type} className="btn-action" onClick={() => onAction(a.type)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
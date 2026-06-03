// src/components/ModalFields.js
import React from 'react';
import { TYRE_CATALOG, CATALOG_BRANDS } from '../constants';

export function ModalFields({ type, form, setForm, wilayas, gasStations, modal, userWilaya }) {
  const f = (key, required = true) => ({
    value: form[key] || '',
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
    required,
  });

  const selectedBrandModels = TYRE_CATALOG
    .filter(item => item.brand === form.brand)
    .map(item => item.model)
    .filter((model, index, models) => models.indexOf(model) === index);

  switch (type) {
    case 'create-type':
      return (
        <>
          <p className="modal-info">The tyre ID is generated automatically after you submit this form.</p>
          <select
            className="modal-select"
            value={form.brand || ''}
            onChange={e => setForm(p => ({ ...p, brand: e.target.value, model: '' }))}
            required
          >
            <option value="">Select brand</option>
            {CATALOG_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
          </select>
          <select
            className="modal-select"
            value={form.model || ''}
            onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
            required
            disabled={!form.brand}
          >
            <option value="">Select model</option>
            {selectedBrandModels.map(model => <option key={model} value={model}>{model}</option>)}
          </select>
          <input type="number" placeholder="Quantity (e.g. 500)" min="1" {...f('quantity')} />
        </>
      );
    case 'send-wilaya':
      return (
        <>
          <p className="modal-info">Stock: <strong>{modal.brand} {modal.model}</strong> - {modal.available} units available</p>
          <select {...f('wilayaCode')} className="modal-select">
            <option value="">Select regional depot</option>
            {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
          </select>
          <input type="number" placeholder={`Quantity to send (max ${modal.available})`} min="1" max={modal.available} {...f('quantity')} />
        </>
      );
    case 'confirm-wilaya':
      return <p className="modal-confirm">Confirm that this batch has arrived at <strong>{userWilaya?.name}</strong> depot?</p>;
    case 'send-gas':
      return (
        <>
          <input type="number" placeholder="Quantity to send" min="1" {...f('quantity')} />
          <select {...f('stationId')} className="modal-select">
            <option value="">Select gas station</option>
            {gasStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {gasStations.length === 0 && <p className="modal-warn">No gas stations in your wilaya. Ask Central to add one.</p>}
        </>
      );
    case 'confirm-gas':
      return <p className="modal-confirm">Confirm that this batch has arrived at the gas station?</p>;
    case 'sell':
  return (
    <>
<input type="number" placeholder="Quantity to sell" min="1" max="2" {...f('quantity')} />
      <input placeholder="Client name" {...f('client')} />
      <input
        placeholder="Vehicle card number"
        {...f('vehicleCard')}
        onBlur={async e => {
          const card = e.target.value.trim();
          if (!card) return;
          try {
            const { checkClientEligibility } = await import('../api');
            const res = await checkClientEligibility(card);
            if (!res.data.eligible) {
              setForm(p => ({
                ...p,
                _eligibilityError:
                  `Last purchase: ${res.data.lastPurchase}. ` +
                  `${res.data.daysRemaining} day(s) remaining. ` +
                  `Eligible from: ${res.data.eligibleFrom}`,
              }));
            } else {
              setForm(p => ({ ...p, _eligibilityError: null }));
            }
          } catch {
            setForm(p => ({ ...p, _eligibilityError: null }));
          }
        }}
      />
      {form._eligibilityError && (
        <p className="modal-warn">{form._eligibilityError}</p>
      )}
    </>
  );
    case 'add-station':
      return (
        <>
          <input placeholder="Station name" {...f('name')} />
          <select {...f('wilayaCode')} className="modal-select">
            <option value="">Select wilaya</option>
            {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
          </select>
          <input placeholder="Address (optional)" {...f('address', false)} />
          <input placeholder="Login username" {...f('username')} />
          <input type="password" placeholder="Login password" {...f('password')} />
        </>
      );
    case 'send-gas-from-stock':
      return (
        <>
          <p className="modal-info">
            Select the tyre batch available at your depot, the quantity, and the destination station.
          </p>
          <select
            className="modal-select"
            value={form.batchId || ''}
            onChange={e => setForm(p => ({ ...p, batchId: e.target.value }))}
            required
          >
            <option value="">Select tyre batch...</option>
            {(modal.availableBatches || []).map(b => {
              const brand = b.Brand || b.TyreTypeBrand || b.TyreBrand || '—';
              const model = b.Model || b.TyreTypeModel || b.TyreModel || '—';
              const qty   = b.Quantity ?? b.quantity ?? '?';
              const id    = b.ID?.replace('BATCH_', '') || b.id;
              return (
                <option key={b.ID || b.id} value={id}>
                  {brand} {model} — {qty} units
                </option>
              );
            })}
            {(modal.availableBatches || []).length === 0 && (
              <option disabled>No batches available at depot</option>
            )}
          </select>
          <input
            type="number"
            placeholder="Quantity to send"
            min="1"
            max={
              (modal.availableBatches || []).find(
                b => (b.ID?.replace('BATCH_', '') || b.id) === form.batchId
              )?.Quantity || undefined
            }
            {...f('quantity')}
          />
          <select
            className="modal-select"
            value={form.stationId || ''}
            onChange={e => setForm(p => ({ ...p, stationId: e.target.value }))}
            required
          >
            <option value="">Select gas station...</option>
            {gasStations.map(s => (
              <option key={s.id || s.ID} value={s.id || s.ID}>{s.name || s.Name}</option>
            ))}
          </select>
          {gasStations.length === 0 && (
            <p className="modal-warn">No gas stations in your wilaya. Ask Central to add one.</p>
          )}
        </>
      );
      case 'sale-rejected':
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        fontSize: '2.5rem',
        marginBottom: '12px',
      }}>⛔</div>
      <p style={{
        color: 'var(--danger)',
        fontWeight: 600,
        fontSize: '14px',
        lineHeight: 1.6,
        padding: '12px',
        background: 'var(--danger-bg)',
        border: '1px solid rgba(192,57,43,0.2)',
        borderRadius: 'var(--radius-md)',
      }}>
        {modal.reason}
      </p>
    </div>
  );
    default:
      return null;
  }
}
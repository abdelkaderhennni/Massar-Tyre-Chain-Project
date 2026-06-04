// src/tabs/GasStationsTab.js
import React, { useMemo, useState } from 'react';

export function GasStationsTab({ allGasStations, setModal, setForm, handleDeleteStation }) {
  const [query, setQuery] = useState('');
  const filteredStations = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allGasStations;
    return allGasStations.filter(station => [
      station.name,
      station.wilayaCode,
      station.wilayaName,
      station.address,
      station.username,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [allGasStations, query]);
  const wilayaCount = new Set(allGasStations.map(station => station.wilayaCode).filter(Boolean)).size;

  return (
    <div className="stations-view">
      <div className="stations-hero page-hero-light">
        <div>
          <span className="section-eyebrow">Network directory</span>
          <h2>Gas Stations</h2>
          <p>Manage active stations, assigned wilayas, operators, and station access in a clean network view.</p>
        </div>
        <button
          className="btn-add-station"
          onClick={() => { setModal({ type: 'add-station' }); setForm({}); }}
        >
          Add Gas Station
        </button>
      </div>

      <div className="stations-summary-grid">
        <div className="summary-card">
          <span>Total stations</span>
          <strong>{allGasStations.length}</strong>
        </div>
        <div className="summary-card">
          <span>Covered wilayas</span>
          <strong>{wilayaCount}</strong>
        </div>
        <div className="summary-card">
          <span>Visible results</span>
          <strong>{filteredStations.length}</strong>
        </div>
      </div>

      <div className="catalog-toolbar stations-toolbar">
        <div>
          <span className="section-eyebrow">Station management</span>
          <h2>Station directory</h2>
        </div>
        <div className="catalog-tools">
          <label className="catalog-search">
            <span aria-hidden="true">Search</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search station, wilaya, address..."
            />
          </label>
        </div>
      </div>

      <div className="stations-grid">
        {filteredStations.length === 0 ? <div className="empty">No gas stations found.</div>
          : filteredStations.map(station => (
            <div className="station-card" key={station.id}>
              <div className="station-header">
                <div className="station-title">
                  <span className="station-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M7 20V5a1 1 0 0 1 1-1h7l3 3v13M9 9h4M9 13h3M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-4 0v-1" /></svg>
                  </span>
                  <span className="station-name">{station.name}</span>
                </div>
                <button className="btn-delete" onClick={() => handleDeleteStation(station.id)}>Delete</button>
              </div>
              <div className="station-meta">
                <span>Wilaya {station.wilayaCode} - {station.wilayaName}</span>
                {station.address && <span>{station.address}</span>}
                <span>{station.username}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

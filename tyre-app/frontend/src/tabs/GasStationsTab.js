// src/tabs/GasStationsTab.js
import React from 'react';

export function GasStationsTab({ allGasStations, setModal, setForm, handleDeleteStation }) {
  return (
    <div className="stations-view">
      <div className="stations-header">
        <h3>All Gas Stations ({allGasStations.length})</h3>
        <button
          className="btn-add-station"
          onClick={() => { setModal({ type: 'add-station' }); setForm({}); }}
        >
          Add Gas Station
        </button>
      </div>
      <div className="stations-grid">
        {allGasStations.length === 0 ? <div className="empty">No gas stations yet.</div>
          : allGasStations.map(station => (
            <div className="station-card" key={station.id}>
              <div className="station-header">
                <span className="station-name">{station.name}</span>
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

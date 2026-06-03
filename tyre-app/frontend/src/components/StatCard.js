// src/components/StatCard.js
import React from 'react';

export function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

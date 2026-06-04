// src/components/StatCard.js
import React from 'react';

function StatIcon({ type }) {
  const icons = {
    stock: (
      <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Zm7 3.5 7-3.5M12 11v9M12 11 5 7.5" />
    ),
    types: (
      <path d="M5 6h14M5 12h14M5 18h14M8 6v12M16 6v12" />
    ),
    transit: (
      <path d="M4 14V7h10v7M14 10h3l3 3v1h-6M7 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    ),
    sold: (
      <path d="M6 12.5 10 16l8-9M5 5h14v14H5z" />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[type] || icons.stock}
    </svg>
  );
}

export function StatCard({ value, label, icon, tone = 'blue' }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-icon" aria-hidden="true"><StatIcon type={icon} /></div>
      <div>
        <div className="stat-num">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

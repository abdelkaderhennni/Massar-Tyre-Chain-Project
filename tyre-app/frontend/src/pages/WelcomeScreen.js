// src/pages/WelcomeScreen.js
import React from 'react';
import './WelcomeScreen.css';

// ── بيانات كل نوع حساب ────────────────────────────────────────────────────────
const ORG_CONFIG = {
  central: {
    accentColor:  '#1a3a6b',
    accentLight:  '#e3ecf8',
    accentBorder: '#b8cfe8',
    roleLabel:    'Central Depot',
    roleDesc:     'National tyre distribution authority',
    greeting:     'Welcome back, Administrator',
    nav: [
      { tab: 'stock',      icon: '▦',  label: 'Central Stock',    desc: 'Manage national tyre inventory'    },
      { tab: 'batches',    icon: '⊞',  label: 'Shipment Batches', desc: 'Track all active shipments'        },
      { tab: 'stations',   icon: '⛽', label: 'Gas Stations',     desc: 'Manage registered stations'        },
      { tab: 'analytics',  icon: '▣',  label: 'Analytics',        desc: 'Reports & distribution insights'   },
      { tab: 'users-mgmt', icon: '⊟',  label: 'User Management',  desc: 'Create and manage system accounts' },
    ],
  },
  regional: {
    accentColor:  '#0f6b3a',
    accentLight:  '#e6f4ed',
    accentBorder: '#a8d9bc',
    roleLabel:    'Regional Depot',
    roleDesc:     'Wilaya-level distribution centre',
    greeting:     'Welcome back, Depot Officer',
    nav: [
      { tab: 'stock',       icon: '▦', label: 'Wilaya Stock',   desc: 'Available tyres in your depot'  },
      { tab: 'batches',     icon: '⊞', label: 'Batches',        desc: 'Incoming & outgoing shipments'  },
      { tab: 'all-wilayas', icon: '⊡', label: 'All Wilayas',    desc: 'Cross-wilaya distribution view' },
    ],
  },
  gas: {
    accentColor:  '#8a5a00',
    accentLight:  '#fdf0d5',
    accentBorder: '#e8c47a',
    roleLabel:    'Gas Station',
    roleDesc:     'Point-of-sale tyre distribution',
    greeting:     'Welcome back, Station Agent',
    nav: [
      { tab: 'stock',   icon: '▦', label: 'Station Stock', desc: 'Tyres available for sale'      },
      { tab: 'batches', icon: '⊞', label: 'Batches',       desc: 'Deliveries and sale records'   },
    ],
  },
};

export function WelcomeScreen({ user, org, onNavigate }) {
  const config  = ORG_CONFIG[org] || ORG_CONFIG.central;
  const now     = new Date();
  const hour    = now.getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="welcome-root" data-org={org}>

      {/* ── top bar ─────────────────────────────────────────────────── */}
      <header className="welcome-topbar">
        <div className="welcome-topbar-brand">
          <div className="welcome-topbar-mark" style={{ background: config.accentColor }}>N</div>
          <span>TyreChain</span>
        </div>
        <div className="welcome-topbar-meta">
          <span className="welcome-role-pill" style={{
            background: config.accentLight,
            color: config.accentColor,
            border: `1px solid ${config.accentBorder}`,
          }}>
            {config.roleLabel}
          </span>
          <span className="welcome-topbar-user">{user.username}</span>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────────────── */}
      <section className="welcome-hero" style={{ '--accent': config.accentColor, '--accent-light': config.accentLight }}>
        <div className="welcome-hero-inner">

          <div className="welcome-greeting-block">
            <p className="welcome-time-greet">{timeGreet}</p>
            <h1 className="welcome-username">{user.username}</h1>
            <p className="welcome-role-desc">
              {config.roleDesc}
              {user.wilaya    && ` — Wilaya ${user.wilaya.code}, ${user.wilaya.name}`}
              {user.gasStation && ` — ${user.gasStation.name}`}
            </p>
          </div>

          <div className="welcome-org-badge" style={{
            background: config.accentLight,
            border: `1px solid ${config.accentBorder}`,
          }}>
            <div className="welcome-org-icon" style={{ background: config.accentColor }}>
              {org === 'central' ? 'CD' : org === 'regional' ? 'WD' : 'GS'}
            </div>
            <div>
              <div className="welcome-org-name" style={{ color: config.accentColor }}>
                {config.roleLabel}
              </div>
              <div className="welcome-org-sub">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── divider ─────────────────────────────────────────────────── */}
      <div className="welcome-divider">
        <span>Select a workspace to continue</span>
      </div>

      {/* ── nav cards ───────────────────────────────────────────────── */}
      <section className="welcome-nav">
        {config.nav.map(item => (
          <button
            key={item.tab}
            className="welcome-card"
            onClick={() => onNavigate(item.tab)}
            style={{ '--card-accent': config.accentColor, '--card-light': config.accentLight, '--card-border': config.accentBorder }}
          >
            <div className="welcome-card-icon" style={{ background: config.accentLight, color: config.accentColor, border: `1px solid ${config.accentBorder}` }}>
              {item.icon}
            </div>
            <div className="welcome-card-label">{item.label}</div>
            <div className="welcome-card-desc">{item.desc}</div>
            <div className="welcome-card-arrow" style={{ color: config.accentColor }}>→</div>
          </button>
        ))}
      </section>

      {/* ── footer ──────────────────────────────────────────────────── */}
      <footer className="welcome-footer">
        <span>NAFTAL · TyreChain v1.0 · Powered by Hyperledger Fabric</span>
      </footer>

    </div>
  );
}

// UsersManagement.js - User account management for central administrators
import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, getWilayas, getGasStations } from '../api';
import './UsersManagement.css';

const ROLE_INFO = {
  1: { label: 'Central', badge: 'badge-central', icon: 'C' },
  2: { label: 'Regional', badge: 'badge-regional', icon: 'R' },
  3: { label: 'Gas Station', badge: 'badge-gas', icon: 'G' },
};

const EMPTY_FORM = {
  username: '',
  password: '',
  role: 1,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  wilayaCode: '',
  gasStationId: '',
};

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [gasStations, setGasStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, wRes, gsRes] = await Promise.all([
        getUsers().catch(() => ({ data: [] })),
        getWilayas().catch(() => ({ data: [] })),
        getGasStations().catch(() => ({ data: [] })),
      ]);

      let usersArray = [];
      if (Array.isArray(uRes)) usersArray = uRes;
      else if (uRes && Array.isArray(uRes.data)) usersArray = uRes.data;
      else if (uRes && uRes.data && Array.isArray(uRes.data.users)) usersArray = uRes.data.users;

      setUsers(usersArray);
      setWilayas(wRes.data || wRes || []);
      setGasStations(gsRes.data || gsRes || []);
    } catch (e) {
      setError('Failed to load user data: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        role: Number(form.role),
        wilayaCode: Number(form.role) === 2 || Number(form.role) === 3 ? form.wilayaCode : null,
        gasStationId: Number(form.role) === 3 ? form.gasStationId : null,
      };

      await createUser(payload);
      setSuccess('Account "' + form.username + '" was created successfully.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(username) {
    if (!window.confirm('Disable account "' + username + '"?')) return;
    try {
      await deleteUser(username);
      setSuccess('Account "' + username + '" was disabled.');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  const filtered = users.filter(u => {
    const matchRole = filterRole === 'all' || String(u.role) === filterRole;
    const term = search.toLowerCase();
    const matchSearch = !term
      || u.username?.toLowerCase().includes(term)
      || u.firstName?.toLowerCase().includes(term)
      || u.lastName?.toLowerCase().includes(term)
      || u.email?.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const roleNum = Number(form.role);

  if (loading) return <div className="um-loading">Loading users...</div>;

  return (
    <div className="um-container">
      <div className="um-header">
        <div>
          <h2>User Management</h2>
          <p>Create and manage employee accounts for central, regional, and gas station teams.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}>
          + Create New Account
        </button>
      </div>

      {success && <div className="um-alert success">{success}</div>}
      {error && <div className="um-alert error">{error}</div>}

      {showForm && (
        <div className="um-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3>Create New Account</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>x</button>
            </div>

            <form onSubmit={handleSubmit} className="um-form" noValidate>
              <div className="um-form-section">
                <label>Account Type *</label>
                <div className="role-selector">
                  {Object.entries(ROLE_INFO).map(([r, info]) => (
                    <label key={r} className={`role-option ${String(form.role) === r ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={String(form.role) === r}
                        onChange={handleChange}
                      />
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="um-form-section">
                <h4>Personal Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Mohamed" required />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Benali" required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@naftal.dz" required />
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+213 6X XXX XXXX" required />
                  </div>
                  <div className="form-group full">
                    <label>Position *</label>
                    <input name="position" value={form.position} onChange={handleChange} placeholder="Depot manager, station operator..." required />
                  </div>
                </div>
              </div>

              <div className="um-form-section">
                <h4>Login Credentials</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username *</label>
                    <input name="username" value={form.username} onChange={handleChange} placeholder="m.benali" required />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required />
                  </div>
                </div>
              </div>

              {(roleNum === 2 || roleNum === 3) && (
                <div className="um-form-section">
                  <h4>Wilaya *</h4>
                  <select name="wilayaCode" value={form.wilayaCode} onChange={handleChange} required>
                    <option value="">Select wilaya</option>
                    {wilayas.map(w => (
                      <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {roleNum === 3 && (
                <div className="um-form-section">
                  <h4>Gas Station *</h4>
                  <select name="gasStationId" value={form.gasStationId} onChange={handleChange} required>
                    <option value="">Select gas station</option>
                    {gasStations
                      .filter(gs => !form.wilayaCode || gs.wilayaCode === form.wilayaCode)
                      .map(gs => (
                        <option key={gs.id} value={gs.id}>{gs.name} ({gs.wilayaName})</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {error && <div className="um-alert error small">{error}</div>}

              <div className="um-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="um-filters">
        <input
          className="um-search"
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="um-filter-tabs">
          {[
            ['all', 'All'],
            ['1', 'Central'],
            ['2', 'Regional'],
            ['3', 'Gas Station'],
          ].map(([val, lbl]) => (
            <button
              key={val}
              className={`filter-tab ${filterRole === val ? 'active' : ''}`}
              onClick={() => setFilterRole(val)}
            >
              {lbl}
              <span className="tab-count">
                {val === 'all' ? users.length : users.filter(u => String(u.role) === val).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Personal Information</th>
              <th>Position</th>
              <th>Role</th>
              <th>Wilaya / Station</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="um-empty">No users found.</td></tr>
            ) : (
              filtered.map(u => {
                const roleInfo = ROLE_INFO[u.role] || { label: 'Unknown', badge: '', icon: '?' };
                return (
                  <tr key={u.id || u.username}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{(u.firstName?.[0] || u.username?.[0] || '?').toUpperCase()}</div>
                        <div>
                          <div className="user-username">{u.username}</div>
                          <div className="user-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-name">{u.firstName} {u.lastName}</div>
                      <div className="user-sub">{u.phone}</div>
                    </td>
                    <td><span className="user-position">{u.position || '-'}</span></td>
                    <td>
                      <span className={`badge ${roleInfo.badge}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="user-sub">
                        {u.wilayaCode ? `Wilaya ${u.wilayaCode}` : '-'}
                        {u.gasStationId ? ` / Station ${String(u.gasStationId).slice(0, 8)}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`status-dot ${u.active ? 'active' : 'inactive'}`}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {u.active && (
                        <button
                          className="btn-danger-sm"
                          onClick={() => handleDelete(u.username)}
                          title="Disable account"
                        >
                          Disable
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Login.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import './Login.css';
const MY_LOGO     = require('../assets/logo.png'); // استيراد الصورة هنا
const NAFTAL_LOGO = require('../assets/naftal_logo.png');

// ── Slides ────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    image: require('../assets/slide1.jpg'),
    tag:   'Central Depot',
    title: 'National tyre distribution network',
    stat:  '1 Central Depot',
    desc:  'Centralised supply, quality control and national tyre stock management.',
  },
  {
    image: require('../assets/slide2.jpg'),
    tag:   '48 Wilayas',
    title: 'Coverage across all wilayas of Algeria',
    stat:  '48 Regional Depots',
    desc:  'A network of regional depots covering the entire national territory for equitable distribution.',
  },
  {
    image: require('../assets/slide3.jpg'),
    tag:   'Gas Stations',
    title: 'Hundreds of stations serving citizens',
    stat:  '+500 Stations',
    desc:  'Every NAFTAL gas station is equipped to ensure real-time tracking of every tyre sold.',
  },
  {
    image: require('../assets/slide4.jpg'),
    tag:   'Operations',
    title: 'Reliable tyre traceability for NAFTAL',
    stat:  '100% Controlled',
    desc:  'Every stock movement is recorded clearly so teams can audit shipments, sales, and responsibility with confidence.',
  },
];

// ── Role labels ───────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  1: { label: 'Central Depot',   color: '#003087', icon: '🏭' },
  2: { label: 'Regional Depot',  color: '#0066cc', icon: '🏬' },
  3: { label: 'Gas Station',     color: '#c8860a', icon: '⛽' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ArrowIcon = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left'
      ? <polyline points="15 18 9 12 15 6"/>
      : <polyline points="9 18 15 12 9 6"/>}
  </svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function Login() {
  const [current, setCurrent]     = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [direction, setDirection] = useState('next');
  const [transitioning, setTrans] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const [form, setForm]         = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // ── Slideshow ───────────────────────────────────────────────────────────────
  const goTo = useCallback((index, dir = 'next') => {
    if (transitioning) return;
    setDirection(dir);
    setPrevSlide(current);
    setTrans(true);
    setTimeout(() => {
      setCurrent(index);
      setTrans(false);
      setPrevSlide(null);
    }, 700);
  }, [transitioning, current]);

  const next = useCallback(() => goTo((current + 1) % SLIDES.length, 'next'), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length, 'prev'), [current, goTo]);

  useEffect(() => {
    if (modalOpen) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, modalOpen]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function openModal() {
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    setModalOpen(false);
    document.body.style.overflow = '';
    setError('');
    setForm({ username: '', password: '' });
    setShowPass(false);
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(form.username.trim(), form.password);
      const payload = res?.data ?? res;
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const slide = SLIDES[current];

  return (
    <div className="lp-root">

      {/* ── SLIDESHOW ──────────────────────────────────────────────────────── */}
      <div className="lp-slides">

        {prevSlide !== null && (
          <div
            className={`lp-slide lp-slide--exit lp-slide--exit-${direction}`}
            style={{ backgroundImage: `url(${SLIDES[prevSlide].image})` }}
          />
        )}

        <div
          className={`lp-slide lp-slide--enter lp-slide--enter-${direction} ${transitioning ? 'lp-slide--entering' : 'lp-slide--active'}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          <div className="lp-slide-overlay" />
          <div className="lp-slide-content">
            <span className="lp-slide-tag">{slide.tag}</span>
            <h2 className="lp-slide-title">{slide.title}</h2>
            <div className="lp-slide-stat">{slide.stat}</div>
            <p className="lp-slide-desc">{slide.desc}</p>
          </div>
        </div>

        <div className="lp-progress">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`lp-progress-bar ${i === current ? 'lp-progress-bar--active' : ''}`}
              onClick={() => goTo(i, i > current ? 'next' : 'prev')}
              aria-label={`Slide ${i + 1}`}
            >
              {i === current && <span className="lp-progress-fill" />}
            </button>
          ))}
        </div>

        <button className="lp-arrow lp-arrow--prev" onClick={prev} aria-label="Previous">
          <ArrowIcon dir="left" />
        </button>
        <button className="lp-arrow lp-arrow--next" onClick={next} aria-label="Next">
          <ArrowIcon dir="right" />
        </button>
      </div>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-left">
          <img src={NAFTAL_LOGO} alt="NAFTAL" className="lp-nav-logo" />
          <div className="lp-nav-divider" />
          <span className="lp-nav-app-name">Tyre Supply Chain Traceability System</span>
        </div>
        <div className="lp-nav-right">
          <span className="lp-nav-system-badge">
            <span className="lp-badge-dot" />
            Secure Operations
          </span>
          <button className="lp-login-btn" onClick={openModal}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Sign In
          </button>
        </div>
      </nav>

      {/* ── LOGIN MODAL ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="lp-modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="lp-modal" role="dialog" aria-modal="true">

            <button className="lp-modal-close" onClick={closeModal} aria-label="Close">
              <CloseIcon />
            </button>

            <div className="lp-modal-header">
<div className="lp-modal-logos-container">
    <img src={NAFTAL_LOGO} alt="NAFTAL" className="lp-modal-logo" />
    <div className="lp-modal-logos-divider" /> {/* خط فاصل صغير وجميل بين اللوجوهين */}
    <img src={MY_LOGO} alt="My Logo" className="lp-modal-logo-custom" /> {/* اللوجو الخاص بك */}
  </div>              <h3 className="lp-modal-title">Sign In</h3>
              <p className="lp-modal-sub">Tyre supply chain traceability system</p>
            </div>

            <form onSubmit={handleSubmit} className="lp-form" noValidate>

              <div className="lp-field">
                <label htmlFor="lp-username">
                  <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Username
                </label>
                <input
                  id="lp-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>

              <div className="lp-field">
                <label htmlFor="lp-password">
                  <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Password
                </label>
                <div className="lp-pass-wrap">
                  <input
                    id="lp-password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lp-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="lp-submit-btn" disabled={loading}>
                {loading
                  ? <><span className="lp-spinner" /> Signing in...</>
                  : 'Sign In'}
              </button>

              {loading && <div className="lp-loading-bar"><span /></div>}
            </form>

            <div className="lp-hint lp-role-info">
              <div className="lp-role-badges">
                {Object.entries(ROLE_LABELS).map(([role, info]) => (
                  <span
                    key={role}
                    className="lp-role-badge"
                    style={{ borderColor: info.color, color: info.color }}
                  >
                    {info.icon} {info.label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
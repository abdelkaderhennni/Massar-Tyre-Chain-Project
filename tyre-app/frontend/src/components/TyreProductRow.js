// src/components/TyreProductRow.js
import React from 'react';
import { getStockLevel, formatDate } from '../utils';

import continentalImg from '../assets/continental.png';
import semperitImg    from '../assets/semperit.png';
import irisImg        from '../assets/iris.png';
import defaultImg     from '../assets/default.png';

function TyreVisual({ brand, large = false }) {
  const images = {
    'Continental': continentalImg,
    'Semperit':    semperitImg,
    'Iris':        irisImg,
  };

  const src = images[brand] || defaultImg;

  return (
    <div className={large ? 'tyre-visual-frame tyre-visual-frame-large' : 'tyre-visual-frame'}>
      <img
        src={src}
        alt={brand || 'Tyre'}
        className={large ? 'tyre-visual tyre-visual-large' : 'tyre-visual'}
      />
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div className="spec-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function TyreProductRow({ product, onOpen, onSend, canSend }) {
  const stockPct = product.totalQty > 0 ? Math.min(100, Math.round((product.centralQty / product.totalQty) * 100)) : 0;
  const stockLevel = getStockLevel(product);
  const ringStyle = { '--stock-pct': `${stockPct}%` };
  return (
    <article className="tyre-product-row tyre-product-card" onClick={onOpen}>
      <div className="product-media">
        <TyreVisual brand={product.brand} />
        <div className="availability-ring" style={ringStyle} title={`${stockPct}% available`}>
          <span>{stockPct}%</span>
        </div>
      </div>
      <div className="product-copy">
        <div className="product-topline">
          <span className="brand-chip">{product.brand}</span>
          <span className={`stock-chip ${stockLevel.key}`}>{stockLevel.label}</span>
        </div>
        <h3>{product.size}</h3>
        <p>{product.model}</p>
        <div className="product-metrics">
          <div>
            <span>Available</span>
            <strong>{product.centralQty}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{product.totalQty}</strong>
          </div>
          <div>
            <span>Category</span>
            <strong>{product.category}</strong>
          </div>
        </div>
        <div className="product-stock-bar" title={`${stockPct}% available`}>
          <span style={{ width: `${stockPct}%` }} />
        </div>
      </div>
      <div className="product-actions" onClick={e => e.stopPropagation()}>
        {canSend && <button className="btn-send compact" disabled={product.centralQty <= 0} onClick={onSend}>Send</button>}
        <button className="btn-view product-open" onClick={onOpen}>Details</button>
      </div>
    </article>
  );
}

export function ProductDetailModal({ product, onClose, onSend, canSend }) {
  const stockPct = product.totalQty > 0 ? Math.min(100, Math.round((product.centralQty / product.totalQty) * 100)) : 0;
  const stockLevel = getStockLevel(product);
  return (
    <div className="modal-overlay product-overlay" onClick={onClose}>
      <section className="product-detail" onClick={e => e.stopPropagation()}>
        <button className="product-close" onClick={onClose}>Close</button>
        <div className="product-detail-top">
          <TyreVisual brand={product.brand} large />
          <div className="product-main-info">
            <span className="product-label">Product details</span>
            <h2>{product.size} {product.brand}</h2>
            <p>{product.category}</p>
            <div className="verified-row">
              <span>System verified</span>
              <span className={`stock-chip ${stockLevel.key}`}>{stockLevel.label}</span>
            </div>
          </div>
        </div>

        <div className="price-panel">
          <span>Available stock</span>
          <strong>{product.centralQty} tyres</strong>
          <small>{product.totalQty} total tyres registered for this type</small>
          <div className="product-stock-bar wide">
            <span style={{ width: `${stockPct}%` }} />
          </div>
        </div>

        <div className="technical-specs">
          <h3>Technical specifications</h3>
          <Spec label="Product name" value={`${product.brand}/${product.model}`} />
          <Spec label="Tyre size" value={product.size} />
          <Spec label="Brand" value={product.brand} />
          <Spec label="Source" value="NAFTAL stock" />
          <Spec label="Created at" value={formatDate(product.createdAt)} />
          <Spec label="Stock records" value={`${product.items.length} item(s)`} />
        </div>

        {canSend && (
          <button className="location-button" onClick={onSend} disabled={product.centralQty <= 0}>
            Send to Regional
          </button>
        )}
      </section>
    </div>
  );
}

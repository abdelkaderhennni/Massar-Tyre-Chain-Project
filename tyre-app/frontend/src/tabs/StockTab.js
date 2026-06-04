// src/tabs/StockTab.js
import React from 'react';
import { StatCard } from '../components/StatCard';
import { TyreProductRow } from '../components/TyreProductRow';
import { CATALOG_BRANDS } from '../constants';

export function StockTab({
  org,
  loading,
  stockProducts,
  filteredStockProducts,
  centralStock,
  inTransit,
  sold,
  productQuery,
  setProductQuery,
  brandFilter,
  setBrandFilter,
  stockFilter,
  setStockFilter,
  sortMode,
  setSortMode,
  setSelectedProduct,
  batches,
  setModal,
  setForm,
}) {
  return (
    <>
      <div className="control-hero">
        <div className="hero-copy">
          <span className="hero-kicker">NAFTAL logistics control</span>
          <h2>{org === 'central' ? 'Central tyre stock' : 'Available tyre stock'}</h2>
          <p>Inventory grouped by tyre type, ready for controlled regional transfer operations.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {org === 'central' && (
          <button className="stock-add-btn hero-stock-add-btn"
            onClick={() => { setModal({ type: 'create-type' }); setForm({}); }}>
            <span>+</span>Add Tyre Stock
          </button>
        )}
        {org === 'regional' && (
          <button
            className="stock-add-btn hero-stock-add-btn"
            onClick={() => {
              const availableBatches = batches.filter(b => b.Status === 'AT_WILAYA_DEPOT');
              setModal({ type: 'send-gas-from-stock', availableBatches });
              setForm({});
            }}
          >
            <span>+</span>
            Send to Gas Station
          </button>
        )}
      </div>


      <div className="stats-row">
        <StatCard icon="stock" tone="blue" value={org === 'central' ? centralStock : stockProducts.reduce((sum, product) => sum + product.centralQty, 0)} label="Available Stock" />
        <StatCard icon="types" tone="cyan" value={stockProducts.length} label="Tyre Types" />
        <StatCard icon="transit" tone="blue" value={inTransit} label="In Transit" />
        <StatCard icon="sold" tone="cyan" value={sold} label="Sold" />
      </div>

      <div className="catalog-shell">
        <div className="catalog-toolbar">
          <div>
            <span className="section-eyebrow">NAFTAL inventory</span>
            <h2>Tyre Stock</h2>
          </div>
          <div className="catalog-tools">
            <label className="catalog-search">
              <span aria-hidden="true">Search</span>
              <input
                value={productQuery}
                onChange={e => setProductQuery(e.target.value)}
                placeholder="Brand, size, model..."
              />
            </label>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="all">All brands</option>
              {CATALOG_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
              <option value="all">All stock</option>
              <option value="available">Available</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
              <option value="brand">Sort by brand</option>
              <option value="quantity">Sort by quantity</option>
              <option value="newest">Sort by newest</option>
            </select>
          </div>
        </div>

        <div className="tyre-product-list">
          {loading ? <div className="loading">Loading inventory...</div>
            : filteredStockProducts.length === 0 ? <div className="empty">No tyre types found.</div>
            : filteredStockProducts.map(product => (
              <TyreProductRow
                key={product.groupKey}
                product={product}
                onOpen={() => setSelectedProduct(product)}
                canSend={org === 'central'}
                onSend={() => {
                  const source = product.items.find(item => item.CentralQty > 0) || product.items[0];
                  setModal({
                    type: 'send-wilaya',
                    tyreTypeId: source.ID,
                    brand: product.brand,
                    model: product.model,
                    available: source.CentralQty || product.centralQty,
                  });
                  setForm({});
                }}
              />
            ))}
        </div>
      </div>
    </>
  );
}

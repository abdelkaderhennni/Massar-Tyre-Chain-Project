// src/pages/Dashboard.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllTyreTypes, createTyreType,
  getAllBatches, getMyWilayaBatches, getMyStationBatches, getAllWilayasBatches,
  getBatchHistory, getAllWilayas, getGasStationsByWilaya,
  getAllGasStations, addGasStation, deleteGasStation, getUsers,
  sendBatchToWilaya, confirmArrivalWilaya,
  sendBatchToGas, confirmArrivalGas, sellBatch,
} from '../api';
import logoImg from '../assets/logo.png'; // استيراد الصورة هنا

import { ORG_META, MODAL_TITLES } from '../constants';
import { groupTyreTypes, groupBatchesAsProducts, generateTyreTypeId, getStockLevel, calcSold } from '../utils';

import { StockTab }       from '../tabs/StockTab';
import { BatchesTab }     from '../tabs/BatchesTab';
import { GasStationsTab } from '../tabs/GasStationsTab';
import { AllWilayasTab }  from '../tabs/AllWilayasTab';
import { AnalyticsTab }   from '../tabs/AnalyticsTab';

import { BatchDetail }      from '../components/BatchDetail';
import { ProductDetailModal } from '../components/TyreProductRow';
import { ModalFields }      from '../components/ModalFields';

import UsersManagement from './UsersManagement';
import { WelcomeScreen } from './WelcomeScreen';

import './Dashboard.css';

function NavIcon({ name }) {
  const icons = {
    stock: <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Zm7 3.5 7-3.5M12 11v9M12 11 5 7.5" />,
    batches: <path d="M4 7h16M6 7v11h12V7M8 11h8M8 15h5" />,
    stations: <path d="M7 20V5a1 1 0 0 1 1-1h7l3 3v13M9 9h4M9 13h3M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-4 0v-1" />,
    analytics: <path d="M5 19V9M12 19V5M19 19v-7M4 19h16" />,
    users: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19a5 5 0 0 1 10 0M13.5 18.5A4 4 0 0 1 21 19" />,
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] || icons.stock}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const org = user.org;
  const meta = ORG_META[org] || ORG_META.central;

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [tyreTypes, setTyreTypes]           = useState([]);
  const [batches, setBatches]               = useState([]);
  const [allWilayasBatches, setAllWilayasBatches] = useState([]);
  const [wilayas, setWilayas]               = useState([]);
  const [gasStations, setGasStations]       = useState([]);
  const [allGasStations, setAllGasStations] = useState([]);
  const [users, setUsers]                   = useState([]);
  const [history, setHistory]               = useState([]);
const [activeTab, setActiveTab] = useState('welcome');
  const [loading, setLoading]               = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBatch, setSelectedBatch]   = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuery, setProductQuery]     = useState('');
  const [brandFilter, setBrandFilter]       = useState('all');
  const [stockFilter, setStockFilter]       = useState('all');
  const [sortMode, setSortMode]             = useState('brand');
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [modal, setModal]                   = useState(null);
  const [form, setForm]                     = useState({});
  const [submitting, setSubmitting]         = useState(false);

  // â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadMain = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (org === 'central') {
        const [tt, b] = await Promise.all([getAllTyreTypes(), getAllBatches()]);
        setTyreTypes(tt.data || []);
        setBatches(b.data || []);
      } else if (org === 'regional') {
        const b = await getMyWilayaBatches();
        setBatches(b.data || []);
      } else if (org === 'gas') {
        const b = await getMyStationBatches();
        setBatches(b.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load operational data.');
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    loadMain();
    if (org === 'central') {
      getAllWilayas().then(r => setWilayas(r.data || [])).catch(() => {});
      getAllGasStations().then(r => setAllGasStations(r.data || [])).catch(() => {});
      getUsers().then(r => setUsers(Array.isArray(r.data) ? r.data : (r.data?.users || []))).catch(() => {});
    }
  }, [loadMain, org]);

  useEffect(() => {
    const wilayaCode = form.wilayaCode || user.wilaya?.code;
    if (wilayaCode && (modal?.type === 'send-gas' || modal?.type === 'send-gas-from-stock')) {
      getGasStationsByWilaya(wilayaCode).then(r => setGasStations(r.data || [])).catch(() => {});
    }
  }, [form.wilayaCode, modal, user.wilaya]);

  async function loadAllWilayas() {
    setLoading(true);
    try {
      const r = await getAllWilayasBatches();
      setAllWilayasBatches(r.data || []);
    } catch {
      setError('Failed to load all wilayas data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(batchId) {
    setHistoryLoading(true);
    try {
      const r = await getBatchHistory(batchId);
      setHistory(r.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function openBatch(batch) {
    setSelectedBatch(batch);
    setActiveTab('detail');
    loadHistory(batch.ID.replace('BATCH_', ''));
  }

  function showMsg(msg, isError = false) {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    }
  }

  // â”€â”€ Form submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      switch (modal.type) {
        case 'create-type': {
          const id = generateTyreTypeId(form.brand, form.model, tyreTypes);
          await createTyreType({ id, brand: form.brand, model: form.model, quantity: parseInt(form.quantity, 10) });
          showMsg(`Created ${form.quantity} units of ${form.brand} ${form.model}`);
          loadMain();
          break;
        }
        case 'send-wilaya': {
          const batchID = `B${Date.now()}`;
          await sendBatchToWilaya({ batchID, tyreTypeID: modal.tyreTypeId, quantity: parseInt(form.quantity, 10), wilayaCode: form.wilayaCode });
          showMsg(`${form.quantity} tyres sent to ${wilayas.find(w => w.code === form.wilayaCode)?.name || 'regional depot'}`);
          loadMain();
          break;
        }
        case 'confirm-wilaya':
          await confirmArrivalWilaya(modal.batchId);
          showMsg(`Arrival confirmed at ${user.wilaya?.name || 'wilaya'} depot`);
          loadMain();
          break;
        case 'send-gas':
          await sendBatchToGas(modal.batchId, {
            stationId: form.stationId,
            quantity: parseInt(form.quantity, 10),
          });
          showMsg(`${form.quantity} tyres sent to gas station`);
          loadMain();
          break;
        case 'send-gas-from-stock':
          await sendBatchToGas(form.batchId, {
            stationId: form.stationId,
            quantity: parseInt(form.quantity, 10),
          });
          showMsg(`${form.quantity} tyres sent to gas station`);
          loadMain();
          break;

        case 'confirm-gas':
          await confirmArrivalGas(modal.batchId);
          showMsg('Arrival confirmed at gas station');
          loadMain();
          break;
      case 'sell': {
  try {
    await sellBatch(modal.batchId, {
      client: form.client,
      vehicleCard: form.vehicleCard,
      quantity: parseInt(form.quantity, 10),
    });
    showMsg(`${form.quantity} tyres sold to ${form.client}`);
    loadMain();
  } catch (sellErr) {
    const raw = sellErr.response?.data?.error || sellErr.message || 'Sale failed.';
    // استخرج رسالة الـ chaincode من الـ error string
    const match = raw.match(/chaincode response \d+[^:]*:\s*(.+)/i)
                || raw.match(/error:\s*(.+)/i);
    const reason = match ? match[1].trim() : raw;
    setModal({
      type: 'sale-rejected',
      reason,
    });
    return; // لا تغلق الـ modal الحالي
  }
  break;
}
        case 'add-station':
          await addGasStation({ name: form.name, wilayaCode: form.wilayaCode, address: form.address, username: form.username, password: form.password });
          showMsg(`Gas station ${form.name} added`);
          getAllGasStations().then(r => setAllGasStations(r.data || []));
          break;
        default:
          break;
      }
      setModal(null);
      setForm({});
    } catch (err) {
      showMsg(err.response?.data?.error || 'Transaction failed.', true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStation(id) {
    if (!window.confirm('Delete this gas station?')) return;
    try {
      await deleteGasStation(id);
      showMsg('Gas station deleted');
      getAllGasStations().then(r => setAllGasStations(r.data || []));
    } catch (err) {
      showMsg(err.response?.data?.error || 'Delete failed', true);
    }
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  // â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tyreProducts = useMemo(() => groupTyreTypes(tyreTypes), [tyreTypes]);
  const stockProducts = useMemo(() => (
    org === 'central'
      ? tyreProducts
      : groupBatchesAsProducts(batches.filter(batch => batch.Status !== 'SOLD'))
  ), [batches, org, tyreProducts]);

  const filteredStockProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return stockProducts
      .filter(p => brandFilter === 'all' || p.brand === brandFilter)
      .filter(p => {
        if (stockFilter === 'available') return p.centralQty > 0;
        if (stockFilter === 'low')       return p.centralQty > 0 && getStockLevel(p).key === 'low';
        if (stockFilter === 'out')       return p.centralQty <= 0;
        return true;
      })
      .filter(p => !query || [p.brand, p.model, p.primaryId, p.size, p.category]
        .filter(Boolean).join(' ').toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === 'quantity') return b.centralQty - a.centralQty;
        if (sortMode === 'newest')   return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
      });
  }, [brandFilter, productQuery, sortMode, stockFilter, stockProducts]);

  const centralStock = tyreProducts.reduce((sum, p) => sum + p.centralQty, 0);
  const inTransit    = batches.filter(b => b.Status?.includes('IN_TRANSIT')).length;
  const atDepot      = batches.filter(b => b.Status === 'AT_WILAYA_DEPOT' || b.Status === 'AT_GAS_STATION').length;
const sold = calcSold(batches);

  const batchesByWilaya = allWilayasBatches.reduce((acc, b) => {
    const key = b.WilayaCode || 'Unknown';
    if (!acc[key]) acc[key] = { name: b.WilayaName || key, batches: [] };
    acc[key].batches.push(b);
    return acc;
  }, {});

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="dash-root" style={{ '--org-color': meta.color }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
  <img src={logoImg} alt="Logo" className="brand-mark brand-logo-slot" />
  <div>
    <span className="brand-name">TyreChain</span>
    <span className="brand-subtitle">Powered by NAFTAL</span>
  </div>
</div>

        <div className="sidebar-org">
          <div className="org-icon">{meta.icon}</div>
          <div>
            <div className="org-name">{meta.label}</div>
            {user.wilaya    && <div className="org-sub">W{user.wilaya.code} - {user.wilaya.name}</div>}
            {user.gasStation && <div className="org-sub">{user.gasStation.name}</div>}
            <div className="org-user">{user.username}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Workspace</div>
          <button className={activeTab === 'stock' ? 'active' : ''} onClick={() => { setActiveTab('stock'); loadMain(); }}>
            <span><NavIcon name="stock" /></span>
            {org === 'central' ? 'Stock' : org === 'regional' ? 'Wilaya Stock' : 'Station Stock'}
          </button>
          <button className={activeTab === 'batches' ? 'active' : ''} onClick={() => { setActiveTab('batches'); loadMain(); }}>
            <span><NavIcon name="batches" /></span> Batches
          </button>
          {org === 'central' && (
            <>
              <button className={activeTab === 'stations' ? 'active' : ''} onClick={() => setActiveTab('stations')}>
                <span><NavIcon name="stations" /></span> Gas Stations
              </button>
              <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
                <span><NavIcon name="analytics" /></span> Analytics
              </button>
              <button className={activeTab === 'users-mgmt' ? 'active' : ''} onClick={() => setActiveTab('users-mgmt')}>
                <span><NavIcon name="users" /></span> User Management
              </button>
            </>
          )}
          {org === 'regional' && (
  <>
    <button className={activeTab === 'all-wilayas' ? 'active' : ''} onClick={() => { setActiveTab('all-wilayas'); loadAllWilayas(); }}>
      <span><NavIcon name="stations" /></span> All Wilayas
    </button>
    <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
      <span><NavIcon name="analytics" /></span> Analytics
    </button>
  </>
)}

{org === 'gas' && (
  <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
    <span><NavIcon name="analytics" /></span> Analytics
  </button>
)}
        </nav>

        <button className="logout-btn" onClick={logout}>Sign Out</button>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>
              {activeTab === 'detail'      ? `Batch: ${selectedBatch?.ID}`
                : activeTab === 'stations'   ? 'Gas Stations'
                : activeTab === 'all-wilayas'? 'All 48 Wilayas Stock'
                : activeTab === 'batches'    ? 'Transactions History'
                : activeTab === 'users-mgmt' ? 'User Management'
                : activeTab === 'analytics'  ? 'Analytics & Insights'
                : org === 'central'          ? 'Central Stock'
                : org === 'regional'         ? `${user.wilaya?.name || 'Wilaya'} Stock`
                :                             `${user.gasStation?.name || 'Gas Station'} Stock`}
            </h1>
            <p>NAFTAL tyre distribution control platform</p>
          </div>
          {activeTab !== 'users-mgmt' && activeTab !== 'analytics' && (
            <button className="refresh-btn" onClick={activeTab === 'all-wilayas' ? loadAllWilayas : loadMain}>
              Refresh
            </button>
          )}
        </header>

        <section className="dash-content">
          {error   && <div className="notif error">{error}</div>}
          {success && <div className="notif success">{success}</div>}

{activeTab === 'welcome' && (
  <WelcomeScreen
    user={user}
    org={org}
    onNavigate={tab => {
      if (tab === 'all-wilayas') { setActiveTab('all-wilayas'); loadAllWilayas(); }
      else { setActiveTab(tab); loadMain(); }
    }}
  />
)}
          {activeTab === 'stock' && (
            <StockTab
              org={org} loading={loading}
              stockProducts={stockProducts}
              filteredStockProducts={filteredStockProducts}
              centralStock={centralStock} inTransit={inTransit} sold={sold}
              productQuery={productQuery} setProductQuery={setProductQuery}
              brandFilter={brandFilter} setBrandFilter={setBrandFilter}
              stockFilter={stockFilter} setStockFilter={setStockFilter}
                batches={batches}
                setForm={setForm}
              sortMode={sortMode} setSortMode={setSortMode}
              setSelectedProduct={setSelectedProduct}
              setModal={setModal} setForm={setForm}
            />
          )}

          {activeTab === 'batches' && (
            <BatchesTab
              loading={loading} batches={batches} org={org}
              inTransit={inTransit} atDepot={atDepot} //sold={sold}
              openBatch={openBatch} setModal={setModal} setForm={setForm} user={user}
            />
          )}

          {activeTab === 'all-wilayas' && org === 'regional' && (
            <AllWilayasTab loading={loading} batchesByWilaya={batchesByWilaya} openBatch={openBatch} />
          )}

          {activeTab === 'stations' && org === 'central' && (
            <GasStationsTab
              allGasStations={allGasStations}
              setModal={setModal} setForm={setForm}
              handleDeleteStation={handleDeleteStation}
            />
          )}

{activeTab === 'analytics' && (
  <AnalyticsTab
    batches={batches}
    tyreTypes={tyreTypes}
    allGasStations={org === 'central' ? allGasStations : allGasStations}
    wilayas={wilayas}
    users={users}
    org={org}      // ← جديد
    user={user}    // ← جديد
  />
)}
          {activeTab === 'users-mgmt' && org === 'central' && (
            <UsersManagement />
          )}

          {activeTab === 'detail' && selectedBatch && (
            <BatchDetail
              batch={selectedBatch} history={history}
              loading={historyLoading} onBack={() => setActiveTab('batches')}
            />
          )}
        </section>
      </main>

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          canSend={org === 'central'}
          onClose={() => setSelectedProduct(null)}
          onSend={() => {
            const source = selectedProduct.items.find(item => item.CentralQty > 0) || selectedProduct.items[0];
            setSelectedProduct(null);
            setModal({
              type: 'send-wilaya',
              tyreTypeId: source.ID,
              brand: selectedProduct.brand,
              model: selectedProduct.model,
              available: source.CentralQty || selectedProduct.centralQty,
            });
            setForm({});
          }}
        />
      )}

      {/* Action modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{MODAL_TITLES[modal.type]}</h3>
            <form onSubmit={handleSubmit}>
              <ModalFields
                type={modal.type} form={form} setForm={setForm}
                wilayas={wilayas} gasStations={gasStations}
                modal={modal} userWilaya={user.wilaya}
              />
              <div className="modal-actions">
  <button type="button" onClick={() => setModal(null)}>
    {modal.type === 'sale-rejected' ? 'Close' : 'Cancel'}
  </button>
  {modal.type !== 'sale-rejected' && (
    <button type="submit" className="modal-submit" disabled={submitting}>
      {submitting ? 'Processing...' : 'Confirm'}
    </button>
  )}
</div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

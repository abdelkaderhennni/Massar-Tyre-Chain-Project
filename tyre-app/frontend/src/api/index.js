// src/api/index.js - TyreChain API Client (المدمج والآمن)
import axios from 'axios';

// استخدام الـ Base URL الخاص بنظامك
const API = axios.create({ baseURL: 'http://localhost:3001/api' });

// المعتَرض (Interceptor) لملء الـ Authorization Header تلقائياً في كل الطلبات
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// المعتَرض (Interceptor) لمعالجة انتهاء صلاحية الجلسة 401 وتوجيه المستخدم
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const login = (username, password) => API.post('/login', { username, password });
export const getMe = () => API.get('/me');

// ─── USER MANAGEMENT (Central only) ──────────────────────────────────────────
export const getUsers   = ()               => API.get('/users');
export const createUser = (data)           => API.post('/users', data);
export const updateUser = (username, data) => API.put(`/users/${username}`, data);
export const deleteUser = (username)       => API.delete(`/users/${username}`);

// ─── WILAYAS ───────────────────────────────────────────────────────────────────
export const getAllWilayas          = ()     => API.get('/wilayas');
export const getWilayas             = getAllWilayas; 
export const getGasStationsByWilaya = (code) => API.get(`/wilayas/${code}/gas-stations`); // 💡 تم تصحيح علامات الـ Backticks هنا

// ─── GAS STATIONS ──────────────────────────────────────────────────────────────
export const getAllGasStations = ()     => API.get('/gas-stations');
export const getGasStations    = getAllGasStations; 
export const addGasStation     = (data) => API.post('/gas-stations', data);
export const deleteGasStation  = (id)   => API.delete(`/gas-stations/${id}`);
export const removeGasStation  = deleteGasStation;

// ─── TYRE TYPES ───────────────────────────────────────────────────────────────
export const getAllTyreTypes = ()     => API.get('/tyre-types');
export const getTyreTypes    = getAllTyreTypes; 
export const createTyreType  = (data) => API.post('/tyre-types', data);

// ─── BATCHES ──────────────────────────────────────────────────────────────────
export const getAllBatches        = ()        => API.get('/batches');
export const getMyWilayaBatches   = ()        => API.get('/batches/my-wilaya');
export const getMyStationBatches  = ()        => API.get('/batches/my-station');
export const getAllWilayasBatches = ()        => API.get('/batches/all-wilayas');
export const getBatchHistory      = (id)      => API.get(`/batches/${id}/history`);
export const sendBatchToWilaya    = (data)    => API.post('/batches/send-to-wilaya', data);
export const confirmArrivalWilaya = (id)      => API.post(`/batches/${id}/confirm-wilaya`);
export const sendBatchToGas       = (id, data)=> API.post(`/batches/${id}/send-to-gas`, data);
export const confirmArrivalGas    = (id)      => API.post(`/batches/${id}/confirm-gas`);
export const sellBatch            = (id, data)=> API.post(`/batches/${id}/sell`, data);
// ─── CLIENTS ──────────────────────────────────────────────────────────────────
export const checkClientEligibility = (vehicleCard) => API.get(`/clients/${vehicleCard}/eligibility`);
export const getClientRecord        = (vehicleCard) => API.get(`/clients/${vehicleCard}`);

// ─── SALES ────────────────────────────────────────────────────────────────────
export const getAllSales = () => API.get('/sales');
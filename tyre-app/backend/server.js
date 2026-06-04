// server.js - TyreChain API v3 — Role-Based Auth (1=central, 2=regional, 3=gas)
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { submitTransaction, evaluateTransaction } = require('./fabric');
const authMiddleware = require('./auth');
const config = require('./config');
const {
  seedFirebase,
  getUserByUsername,
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
  getAllWilayas,
  getWilayaByCode,
  getGasStationsByWilaya,
  getGasStationById,
  getAllGasStations,
  addGasStation,
  deleteGasStation,
} = require('./firebaseDb');

const app = express();
app.use(cors());
app.use(express.json());

// Seed Firebase on startup
seedFirebase().catch(console.error);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Check that caller has role 1 (central) */
function requireCentral(req, res) {
  if (req.user.role !== 1) {
    res.status(403).json({ error: 'هذه العملية مخصصة للمستودع المركزي فقط.' });
    return false;
  }
  return true;
}

/** Check that caller has role 2 (regional) */
function requireRegional(req, res) {
  if (req.user.role !== 2) {
    res.status(403).json({ error: 'هذه العملية مخصصة للمستودعات الولائية فقط.' });
    return false;
  }
  return true;
}

/** Check that caller has role 3 (gas station) */
function requireGas(req, res) {
  if (req.user.role !== 3) {
    res.status(403).json({ error: 'هذه العملية مخصصة لمحطات الوقود فقط.' });
    return false;
  }
  return true;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/login
 * Body: { username, password }
 * Returns: { token, user }
 * Role is read from Firebase — no need to select org at login.
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان.' });

  try {
    const user = await getUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });

    if (user.active === false)
      return res.status(403).json({ error: 'هذا الحساب معطّل. تواصل مع المستودع المركزي.' });

    // Build extra context
    let extra = {};
    if (user.wilayaCode) {
      const wilaya = await getWilayaByCode(user.wilayaCode);
      extra.wilaya = wilaya;
    }
    if (user.gasStationId) {
      const station = await getGasStationById(user.gasStationId);
      extra.gasStation = station;
    }

    // JWT payload includes role (number) and org (string derived from role)
    const payload = {
      username: user.username,
      role: user.role,       // 1 | 2 | 3
      org: user.org,         // 'central' | 'regional' | 'gas'
      firstName: user.firstName,
      lastName: user.lastName,
      wilayaCode: user.wilayaCode || null,
      gasStationId: user.gasStationId || null,
      ...extra,
    };

    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        org: user.org,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        position: user.position,
        ...extra,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', authMiddleware, (req, res) => res.json({ user: req.user }));

// ─── USER MANAGEMENT (Central only) ──────────────────────────────────────────

/**
 * GET /api/users
 * Central: all users (without passwords)
 */
app.get('/api/users', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users
 * Central only — create any type of account
 * Body: {
 *   username, password, role (1|2|3),
 *   firstName, lastName, email, phone, position,
 *   wilayaCode?,   (required if role=2)
 *   gasStationId?  (required if role=3, OR omit to auto-create with gas station)
 * }
 */
app.post('/api/users', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;

  const {
    username, password, role,
    firstName, lastName, email, phone, position,
    wilayaCode, gasStationId,
  } = req.body;

  try {
    await createUser({
      username, password, role: Number(role),
      firstName, lastName, email, phone, position,
      wilayaCode: wilayaCode || null,
      gasStationId: gasStationId || null,
      createdBy: req.user.username,
    });

    res.json({ success: true, message: `تم إنشاء حساب "${username}" بنجاح.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/users/:username
 * Central only — update user info or password
 */
app.put('/api/users/:username', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  try {
    await updateUser(req.params.username, req.body);
    res.json({ success: true, message: 'تم تحديث بيانات المستخدم.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/users/:username
 * Central only — soft deactivate a user
 */
app.delete('/api/users/:username', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  if (req.params.username === req.user.username)
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص.' });
  try {
    await deactivateUser(req.params.username);
    res.json({ success: true, message: `تم تعطيل حساب "${req.params.username}".` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── WILAYAS ──────────────────────────────────────────────────────────────────

app.get('/api/wilayas', authMiddleware, async (req, res) => {
  try {
    const wilayas = await getAllWilayas();
    res.json(wilayas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wilayas/:code/gas-stations', authMiddleware, async (req, res) => {
  try {
    res.json(await getGasStationsByWilaya(req.params.code));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GAS STATIONS ─────────────────────────────────────────────────────────────

app.get('/api/gas-stations', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  try {
    res.json(await getAllGasStations());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/gas-stations
 * Central only — creates station + operator account in one request
 * Body: {
 *   // Station info
 *   name, wilayaCode, address,
 *   // Operator account info
 *   username, password, firstName, lastName, email, phone, position
 * }
 */
app.post('/api/gas-stations', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;

  const { name, wilayaCode, address, username, password, firstName, lastName, email, phone, position } = req.body;

  if (!name || !wilayaCode || !username || !password || !firstName || !lastName || !email || !phone)
    return res.status(400).json({ error: 'جميع الحقول مطلوبة: name, wilayaCode, username, password, firstName, lastName, email, phone.' });

  try {
    const id = await addGasStation(
      { name, wilayaCode, address },
      { username, password, firstName, lastName, email, phone, position: position || 'مشغّل محطة الوقود' },
      req.user.username
    );
    res.json({ success: true, id, message: `تمت إضافة محطة "${name}" وحساب المشغّل.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gas-stations/:id', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  try {
    await deleteGasStation(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TYRE TYPES ───────────────────────────────────────────────────────────────

app.get('/api/tyre-types', authMiddleware, async (req, res) => {
  try {
    const types = await evaluateTransaction(req.user.org, 'GetAllTyreTypes');
    res.json(types || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tyre-types', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;
  const { id, brand, model, quantity } = req.body;
  if (!id || !brand || !model || !quantity)
    return res.status(400).json({ error: 'id, brand, model و quantity مطلوبة.' });
  try {
    await submitTransaction(req.user.org, 'CreateTyreType', id, brand, model, String(quantity));
    res.json({ success: true, message: `تم إنشاء ${quantity} وحدة من ${brand} ${model}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BATCHES ──────────────────────────────────────────────────────────────────

app.get('/api/batches', authMiddleware, async (req, res) => {
  try {
    const batches = await evaluateTransaction(req.user.org, 'GetAllBatches');
    res.json(batches || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/my-wilaya', authMiddleware, async (req, res) => {
  if (!req.user.wilayaCode)
    return res.status(400).json({ error: 'لا توجد ولاية مرتبطة بهذا الحساب.' });
  try {
    const batches = await evaluateTransaction(req.user.org, 'GetBatchesByWilaya', req.user.wilayaCode);
    res.json(batches || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/my-station', authMiddleware, async (req, res) => {
  if (!req.user.gasStationId)
    return res.status(400).json({ error: 'لا توجد محطة وقود مرتبطة بهذا الحساب.' });
  try {
    const batches = await evaluateTransaction(req.user.org, 'GetBatchesByGasStation', String(req.user.gasStationId));
    res.json(batches || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/all-wilayas', authMiddleware, async (req, res) => {
  if (!requireRegional(req, res)) return;
  try {
    const batches = await evaluateTransaction(req.user.org, 'GetAllBatches');
    res.json(batches || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/:id/history', authMiddleware, async (req, res) => {
  try {
    const history = await evaluateTransaction(req.user.org, 'GetBatchHistory', req.params.id);
    const parsed = (history || []).map(e => { try { return JSON.parse(e); } catch { return e; } });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/send-to-wilaya', authMiddleware, async (req, res) => {
  if (!requireCentral(req, res)) return;

  const { batchID, tyreTypeID, quantity, wilayaCode } = req.body;
  if (!batchID || !tyreTypeID || !quantity || !wilayaCode)
    return res.status(400).json({ error: 'batchID, tyreTypeID, quantity و wilayaCode مطلوبة.' });

  try {
    const wilaya = await getWilayaByCode(wilayaCode);
    if (!wilaya) return res.status(404).json({ error: `الولاية ${wilayaCode} غير موجودة.` });

    await submitTransaction(req.user.org, 'SendBatchToWilaya', batchID, tyreTypeID, String(quantity), wilayaCode, wilaya.name);
    res.json({ success: true, message: `تم إرسال ${quantity} إطار إلى ${wilaya.name}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/:id/confirm-wilaya', authMiddleware, async (req, res) => {
  if (!requireRegional(req, res)) return;
  try {
    await submitTransaction(req.user.org, 'ConfirmArrivalWilaya', req.params.id);
    res.json({ success: true, message: `تم تأكيد الوصول في مستودع ${req.user.wilaya?.name || 'الولاية'}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/:id/send-to-gas', authMiddleware, async (req, res) => {
  if (!requireRegional(req, res)) return;

  const { stationId, quantity } = req.body;
  if (!stationId || !quantity)
    return res.status(400).json({ error: 'stationId و quantity مطلوبان.' });

  try {
    const station = await getGasStationById(stationId);
    if (!station) return res.status(404).json({ error: 'محطة الوقود غير موجودة.' });

    if (station.wilayaCode !== req.user.wilayaCode)
      return res.status(403).json({ error: 'هذه المحطة لا تنتمي لولايتك.' });

    await submitTransaction(req.user.org, 'SendBatchToGasStation', req.params.id, String(station.id), station.name, String(quantity));
    res.json({ success: true, message: `تم إرسال ${quantity} إطار إلى ${station.name}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/:id/confirm-gas', authMiddleware, async (req, res) => {
  if (!requireGas(req, res)) return;
  try {
    await submitTransaction(req.user.org, 'ConfirmArrivalGasStation', req.params.id);
    res.json({ success: true, message: 'تم تأكيد الوصول في محطة الوقود.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/:id/sell', authMiddleware, async (req, res) => {
  if (!requireGas(req, res)) return;

  const { client, vehicleCard, quantity } = req.body;
  if (!client || !vehicleCard || !quantity)
    return res.status(400).json({ error: 'client, vehicleCard و quantity مطلوبة.' });

  try {
    await submitTransaction(req.user.org, 'SellBatch', req.params.id, client, vehicleCard, String(quantity));
    res.json({ success: true, message: `تم بيع ${quantity} إطار للعميل ${client}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
// app.listen(PORT, '0.0.0.0', () => {
//   console.log('Server running on port 3000');
// });

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   TyreChain API v3 — Role-Based Auth            ║
  ║   http://localhost:${PORT}                         ║
  ║                                                  ║
  ║   Role 1 → Central  (إدارة مركزية)              ║
  ║   Role 2 → Regional (مستودع ولائي)              ║
  ║   Role 3 → Gas      (محطة وقود)                 ║
  ╚══════════════════════════════════════════════════╝
  `);
});
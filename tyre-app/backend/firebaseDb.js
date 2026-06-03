// firebaseDb.js - TyreChain Firebase Database Layer
// Role system: 1 = central, 2 = regional, 3 = gas station
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const path = require('path');

// ─── INIT ──────────────────────────────────────────────────────────────────────
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-key.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ─── ROLE MAPPING ──────────────────────────────────────────────────────────────
// role 1 → central org,  role 2 → regional org,  role 3 → gas org
function roleToOrg(role) {
  if (role === 1) return 'central';
  if (role === 2) return 'regional';
  if (role === 3) return 'gas';
  throw new Error(`Invalid role: ${role}. Must be 1, 2, or 3.`);
}

function orgToRole(org) {
  if (org === 'central') return 1;
  if (org === 'regional') return 2;
  if (org === 'gas') return 3;
  throw new Error(`Invalid org: ${org}`);
}

// ─── SEED ──────────────────────────────────────────────────────────────────────
async function seedFirebase() {
  // Seed default super-admin (central) only if no users exist
  const usersSnap = await db.collection('users').limit(1).get();
  if (!usersSnap.empty) {
    console.log('Firebase already seeded — skipping.');
    return;
  }

  console.log('Seeding Firebase with initial admin account...');

  const hash = bcrypt.hashSync('central123', 10);
  await db.collection('users').doc('admin.central').set({
    username: 'admin.central',
    password: hash,
    role: 1,            // 1 = central
    org: 'central',
    firstName: 'Admin',
    lastName: 'Central',
    email: 'admin@naftal.dz',
    phone: '+213 21 000 000',
    position: 'Administrateur Principal',
    wilayaCode: null,
    gasStationId: null,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    active: true,
  });

  // Seed all 48 wilayas
  const wilayas = [
    { code: '01', name: 'Adrar', name_ar: 'أدرار' },
    { code: '02', name: 'Chlef', name_ar: 'الشلف' },
    { code: '03', name: 'Laghouat', name_ar: 'الأغواط' },
    { code: '04', name: 'Oum El Bouaghi', name_ar: 'أم البواقي' },
    { code: '05', name: 'Batna', name_ar: 'باتنة' },
    { code: '06', name: 'Béjaïa', name_ar: 'بجاية' },
    { code: '07', name: 'Biskra', name_ar: 'بسكرة' },
    { code: '08', name: 'Béchar', name_ar: 'بشار' },
    { code: '09', name: 'Blida', name_ar: 'البليدة' },
    { code: '10', name: 'Bouira', name_ar: 'البويرة' },
    { code: '11', name: 'Tamanrasset', name_ar: 'تمنراست' },
    { code: '12', name: 'Tébessa', name_ar: 'تبسة' },
    { code: '13', name: 'Tlemcen', name_ar: 'تلمسان' },
    { code: '14', name: 'Tiaret', name_ar: 'تيارت' },
    { code: '15', name: 'Tizi Ouzou', name_ar: 'تيزي وزو' },
    { code: '16', name: 'Alger', name_ar: 'الجزائر' },
    { code: '17', name: 'Djelfa', name_ar: 'الجلفة' },
    { code: '18', name: 'Jijel', name_ar: 'جيجل' },
    { code: '19', name: 'Sétif', name_ar: 'سطيف' },
    { code: '20', name: 'Saïda', name_ar: 'سعيدة' },
    { code: '21', name: 'Skikda', name_ar: 'سكيكدة' },
    { code: '22', name: 'Sidi Bel Abbès', name_ar: 'سيدي بلعباس' },
    { code: '23', name: 'Annaba', name_ar: 'عنابة' },
    { code: '24', name: 'Guelma', name_ar: 'قالمة' },
    { code: '25', name: 'Constantine', name_ar: 'قسنطينة' },
    { code: '26', name: 'Médéa', name_ar: 'المدية' },
    { code: '27', name: 'Mostaganem', name_ar: 'مستغانم' },
    { code: '28', name: "M'Sila", name_ar: 'المسيلة' },
    { code: '29', name: 'Mascara', name_ar: 'معسكر' },
    { code: '30', name: 'Ouargla', name_ar: 'ورقلة' },
    { code: '31', name: 'Oran', name_ar: 'وهران' },
    { code: '32', name: 'El Bayadh', name_ar: 'البيض' },
    { code: '33', name: 'Illizi', name_ar: 'إليزي' },
    { code: '34', name: 'Bordj Bou Arréridj', name_ar: 'برج بوعريريج' },
    { code: '35', name: 'Boumerdès', name_ar: 'بومرداس' },
    { code: '36', name: 'El Tarf', name_ar: 'الطارف' },
    { code: '37', name: 'Tindouf', name_ar: 'تندوف' },
    { code: '38', name: 'Tissemsilt', name_ar: 'تيسمسيلت' },
    { code: '39', name: 'El Oued', name_ar: 'الوادي' },
    { code: '40', name: 'Khenchela', name_ar: 'خنشلة' },
    { code: '41', name: 'Souk Ahras', name_ar: 'سوق أهراس' },
    { code: '42', name: 'Tipaza', name_ar: 'تيبازة' },
    { code: '43', name: 'Mila', name_ar: 'ميلة' },
    { code: '44', name: 'Aïn Defla', name_ar: 'عين الدفلى' },
    { code: '45', name: 'Naâma', name_ar: 'النعامة' },
    { code: '46', name: 'Aïn Témouchent', name_ar: 'عين تموشنت' },
    { code: '47', name: 'Ghardaïa', name_ar: 'غرداية' },
    { code: '48', name: 'Relizane', name_ar: 'غليزان' },
  ];

  const batch = db.batch();
  for (const w of wilayas) {
    batch.set(db.collection('wilayas').doc(w.code), w);
  }
  await batch.commit();

  console.log('Firebase seeded successfully.');
}

// ─── USERS ─────────────────────────────────────────────────────────────────────

async function getUserByUsername(username) {
  const doc = await db.collection('users').doc(username).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getAllUsers() {
  const snap = await db.collection('users').get();
  return snap.docs.map(d => {
    const data = d.data();
    delete data.password; // never expose password
    return { id: d.id, ...data };
  });
}

/**
 * Create a new user account.
 * Only callable by central (enforced in server.js).
 *
 * @param {object} userData
 * @param {string} userData.username       - unique login name
 * @param {string} userData.password       - plain text (will be hashed)
 * @param {number} userData.role           - 1 | 2 | 3
 * @param {string} userData.firstName
 * @param {string} userData.lastName
 * @param {string} userData.email
 * @param {string} userData.phone
 * @param {string} userData.position       - job title
 * @param {string} [userData.wilayaCode]   - required for role 2
 * @param {string} [userData.gasStationId] - required for role 3
 * @param {string} userData.createdBy      - username of creator
 */
async function createUser(userData) {
  const {
    username, password, role,
    firstName, lastName, email, phone, position,
    wilayaCode = null, gasStationId = null,
    createdBy,
  } = userData;

  // Validate required fields
  if (!username || !password || !role || !firstName || !lastName || !email || !phone || !position)
    throw new Error('الحقول المطلوبة: username, password, role, firstName, lastName, email, phone, position');

  if (![1, 2, 3].includes(Number(role)))
    throw new Error('role يجب أن يكون 1 (central) أو 2 (regional) أو 3 (gas station)');

  if (Number(role) === 2 && !wilayaCode)
    throw new Error('wilayaCode مطلوب لحسابات regional (role 2)');

  if (Number(role) === 3 && !gasStationId)
    throw new Error('gasStationId مطلوب لحسابات gas station (role 3)');

  // Check username uniqueness
  const existing = await getUserByUsername(username);
  if (existing) throw new Error(`اسم المستخدم "${username}" مستخدم بالفعل.`);

  const org = roleToOrg(Number(role));
  const hash = bcrypt.hashSync(password, 10);

  await db.collection('users').doc(username).set({
    username,
    password: hash,
    role: Number(role),
    org,
    firstName,
    lastName,
    email,
    phone,
    position,
    wilayaCode,
    gasStationId,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || 'admin',
    active: true,
  });

  return username;
}

/**
 * Update user information (password optional).
 * Only central can update — enforced in server.js.
 */
async function updateUser(username, updates) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`المستخدم "${username}" غير موجود.`);

  const allowed = ['firstName', 'lastName', 'email', 'phone', 'position', 'wilayaCode', 'gasStationId', 'active'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  if (updates.password) {
    safeUpdates.password = bcrypt.hashSync(updates.password, 10);
  }

  if (updates.role !== undefined) {
    const newRole = Number(updates.role);
    if (![1, 2, 3].includes(newRole)) throw new Error('role غير صالح.');
    safeUpdates.role = newRole;
    safeUpdates.org = roleToOrg(newRole);
  }

  safeUpdates.updatedAt = new Date().toISOString();
  await db.collection('users').doc(username).update(safeUpdates);
}

/**
 * Deactivate (soft delete) a user.
 */
async function deactivateUser(username) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`المستخدم "${username}" غير موجود.`);
  await db.collection('users').doc(username).update({ active: false, deactivatedAt: new Date().toISOString() });
}

// ─── WILAYAS ───────────────────────────────────────────────────────────────────

async function getAllWilayas() {
  const snap = await db.collection('wilayas').get();
  const wilayas = snap.docs.map(d => d.data());
  return wilayas.sort((a, b) => a.code.localeCompare(b.code));
}

async function getWilayaByCode(code) {
  const doc = await db.collection('wilayas').doc(String(code)).get();
  return doc.exists ? doc.data() : null;
}

// ─── GAS STATIONS ──────────────────────────────────────────────────────────────

async function getGasStationsByWilaya(wilayaCode) {
  const snap = await db.collection('gasStations').where('wilayaCode', '==', String(wilayaCode)).where('active', '==', true).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getGasStationById(id) {
  const doc = await db.collection('gasStations').doc(String(id)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getAllGasStations() {
  const snap = await db.collection('gasStations').where('active', '==', true).get();
  const stations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return stations.sort((a, b) => a.wilayaCode.localeCompare(b.wilayaCode) || a.name.localeCompare(b.name));
}

/**
 * Add a gas station AND create its user account automatically.
 * The user for the gas station will have role = 3.
 */
async function addGasStation(stationData, operatorData, createdBy) {
  const { name, wilayaCode, address } = stationData;
  const { username, password, firstName, lastName, email, phone, position } = operatorData;

  // Check username not taken
  const existing = await getUserByUsername(username);
  if (existing) throw new Error(`اسم المستخدم "${username}" مستخدم بالفعل.`);

  const wilaya = await getWilayaByCode(wilayaCode);
  if (!wilaya) throw new Error(`الولاية ${wilayaCode} غير موجودة.`);

  // Create gas station document
  const ref = await db.collection('gasStations').add({
    name,
    wilayaCode,
    wilayaName: wilaya.name,
    address: address || '',
    username,
    active: true,
    createdAt: new Date().toISOString(),
  });

  // Create user account with full profile (role 3 = gas)
  await createUser({
    username, password, role: 3,
    firstName, lastName, email, phone,
    position: position || 'مشغّل محطة الوقود',
    wilayaCode,
    gasStationId: ref.id,
    createdBy,
  });

  return ref.id;
}

async function deleteGasStation(id) {
  const doc = await db.collection('gasStations').doc(String(id)).get();
  if (doc.exists) {
    const station = doc.data();
    await db.collection('gasStations').doc(String(id)).update({ active: false });
    if (station.username) {
      await deactivateUser(station.username);
    }
  }
}

module.exports = {
  seedFirebase,
  roleToOrg,
  orgToRole,
  // Users
  getUserByUsername,
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
  // Wilayas
  getAllWilayas,
  getWilayaByCode,
  // Gas Stations
  getGasStationsByWilaya,
  getGasStationById,
  getAllGasStations,
  addGasStation,
  deleteGasStation,
};

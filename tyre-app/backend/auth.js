// auth.js - JWT Authentication Middleware
// Token payload: { username, role (1|2|3), org ('central'|'regional'|'gas'), ... }
const jwt = require('jsonwebtoken');
const config = require('./config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد رمز مصادقة.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // decoded contains: { username, role (number), org (string), firstName, lastName, wilayaCode, gasStationId, ... }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'رمز المصادقة غير صالح أو منتهي الصلاحية.' });
  }
}

module.exports = authMiddleware;

const fs = require('fs');
const jwt = require('jsonwebtoken');

// ===== REPLACE THESE =====
const TEAM_ID = '8YS8LDSZXL';
const CLIENT_ID = 'com.anonymous.dripmaxx.login'; // e.g. com.anonymous.dripmaxx.login
const KEY_ID = '8CAGHBXLH4';
const PRIVATE_KEY_PATH = './AuthKey_8CAGHBXLH4.p8';
// =========================

const privateKey = fs.readFileSync(PRIVATE_KEY_PATH);

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d', // Maximum allowed by Apple
  issuer: TEAM_ID,
  audience: 'https://appleid.apple.com',
  subject: CLIENT_ID,
  keyid: KEY_ID,
});

console.log('\nApple Client Secret:\n');
console.log(token);
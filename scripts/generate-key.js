const crypto = require('crypto');

const MASTER_SECRET = 'TELEFONCU_STOK_MASTER_KEY_2026_SECURE_SALT_9988';

const args = process.argv.slice(2);
const machineId = args[0];

if (!machineId) {
  console.log('\n❌ Lütfen Cihaz Kimliğini (Machine ID) girin!');
  console.log('Kullanım: npm run key-gen -- STOK-XXXX-YYYY-ZZZZ\n');
  process.exit(1);
}

function generateLicenseKey(rawId) {
  const cleanId = rawId.trim().toUpperCase();
  const hmac = crypto.createHmac('sha256', MASTER_SECRET);
  hmac.update(cleanId);
  const hash = hmac.digest('hex').toUpperCase();

  const p1 = hash.substring(0, 4);
  const p2 = hash.substring(4, 8);
  const p3 = hash.substring(8, 12);
  const p4 = hash.substring(12, 16);

  return `LIC-${p1}-${p2}-${p3}-${p4}`;
}

const key = generateLicenseKey(machineId);

console.log('\n====================================================');
console.log('🔑 KODHANEM STOK TAKİP PROGRAMI — LİSANS ANAHTARI ÜRETİCİSİ');
console.log('====================================================');
console.log(`💻 Cihaz Kimliği (Hardware ID) : ${machineId.trim().toUpperCase()}`);
console.log(`✅ Üretilen Lisans Anahtarı   : ${key}`);
console.log('====================================================\n');

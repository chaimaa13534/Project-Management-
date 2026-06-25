/**
 * server/utils/initDb.js
 * Exécute le schema.sql au premier démarrage
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('📦  Initialisation de la base de données…');

  const sql = fs.readFileSync(
    path.join(__dirname, '../../database/schema.sql'),
    'utf8'
  );

  await conn.query(sql);
  console.log('✅  Schema créé avec succès');
  await conn.end();
  process.exit(0);
})().catch(err => {
  console.error('❌  Erreur initDb :', err.message);
  process.exit(1);
});

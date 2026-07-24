'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../src/db');

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Administrator email and password are required');
  if (password.length < 12) throw new Error('Administrator password must be at least 12 characters');

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, name = EXCLUDED.name, role = 'admin'
     RETURNING id`,
    [email.toLowerCase(), hash, process.env.SEED_ADMIN_NAME || 'Runtime Administrator']
  );
  await pool.query(
    'INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [result.rows[0].id]
  );
  console.log('administrator provisioned');
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

// db.js
// This file creates ONE shared connection pool to PostgreSQL and exports it.
// Every other file that needs to talk to the database imports { pool } from here,
// instead of each file opening its own connection.

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Small helper so route/controller files can just do: const { rows } = await db.query(...)
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };

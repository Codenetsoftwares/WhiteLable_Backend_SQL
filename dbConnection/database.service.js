import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
  waitForConnections: true, 
  connectionLimit: 10,
  maxIdle: 10, 
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const database = {
  execute: async (query, parameters = []) => {
    if (!query) throw new Error('Invalid SQL query');
    const conn = await pool.getConnection();
    let result = await conn.execute(query, parameters);
    pool.releaseConnection(conn);
    return result;
  },
};

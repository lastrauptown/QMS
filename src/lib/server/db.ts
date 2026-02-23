import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';

// Create a connection pool
const pool = mysql.createPool({
    host: env.MYSQL_HOST || 'localhost',
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD || '',
    database: env.MYSQL_DATABASE || 'qms_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const db = pool;

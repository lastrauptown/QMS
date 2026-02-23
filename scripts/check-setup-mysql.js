import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
} else {
    console.warn('No .env file found');
}

const dbConfig = {
    host: envConfig.MYSQL_HOST || 'localhost',
    user: envConfig.MYSQL_USER || 'root',
    password: envConfig.MYSQL_PASSWORD || '',
    database: envConfig.MYSQL_DATABASE || 'qms'
};

async function check() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database!');

        console.log('--- SERVICES ---');
        const [services] = await connection.query('SELECT * FROM services');
        console.table(services.map(s => ({ id: s.id, code: s.code, name: s.name })));

        console.log('\n--- COUNTERS ---');
        const [counters] = await connection.query('SELECT * FROM counters');
        console.table(counters.map(c => ({ id: c.id, name: c.name, service_id: c.service_id, is_active: c.is_active })));

        console.log('\n--- WAITING TICKETS ---');
        const [tickets] = await connection.query("SELECT * FROM tickets WHERE status = 'waiting'");
        console.table(tickets.map(t => ({ ticket: t.ticket_number, service: t.service_code, status: t.status })));

    } catch (error) {
        console.error('Error:', error.message);
        console.log('Make sure MySQL is running and the database is created (database/schema-mysql.sql)');
    } finally {
        if (connection) await connection.end();
    }
}

check();

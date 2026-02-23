import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath);
    envConfig = dotenv.parse(envContent);
}

const config = {
    host: envConfig.MYSQL_HOST || 'localhost',
    user: envConfig.MYSQL_USER || 'root',
    password: envConfig.MYSQL_PASSWORD || ''
};

const dbName = envConfig.MYSQL_DATABASE || 'qms';

async function init() {
    console.log('Initializing Database...');
    let connection;

    try {
        // Connect without database selected
        connection = await mysql.createConnection(config);
        console.log('Connected to MySQL server.');

        // Create database
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' created or already exists.`);

        // Use database
        await connection.changeUser({ database: dbName });

        // Read schema file
        const schemaPath = path.resolve(process.cwd(), 'database/schema-mysql.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to run statements individually (simple parser)
        // Note: This is a basic split and might fail on complex stored procedures with semicolons inside strings
        // But for this schema it should be fine.
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Executing ${statements.length} schema statements...`);

        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                console.warn(`Warning executing statement: ${statement.substring(0, 50)}...`);
                console.warn(err.message);
                // Continue despite errors (e.g. table already exists)
            }
        }

        console.log('Schema initialization complete!');
        console.log('You can now restart the application.');

    } catch (error) {
        console.error('Initialization Failed:', error.message);
        console.log('Please ensure MySQL is running and credentials in .env are correct.');
    } finally {
        if (connection) await connection.end();
    }
}

init();

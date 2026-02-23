
-- Create database (matches default .env: MYSQL_DATABASE=qms)
CREATE DATABASE IF NOT EXISTS qms;
USE qms;

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counters table
CREATE TABLE IF NOT EXISTS counters (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_id VARCHAR(36),
    is_active BOOLEAN DEFAULT true,
    current_ticket VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Users table (Replaces Supabase auth.users + public.user_profiles)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- In real app, store bcrypt hash
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'counter_staff')),
    name VARCHAR(255),
    counter_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    service_code VARCHAR(10) NOT NULL,
    number INTEGER NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'served', 'skipped')),
    counter_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    served_at TIMESTAMP NULL,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(36),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
    `key` VARCHAR(50) PRIMARY KEY,
    `value` TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tickets_service_code ON tickets(service_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_counter_id ON tickets(counter_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_counters_service_id ON counters(service_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_tickets_service_date ON tickets(service_code, created_at);

-- Initial Admin User (Password: admin123)
-- UUID: 68a63320-11cd-44db-9232-da0287787e7c
INSERT IGNORE INTO users (id, email, password_hash, role, name)
VALUES (
    '68a63320-11cd-44db-9232-da0287787e7c',
    'admin@sanpedro.com',
    'admin123', 
    'admin',
    'Admin User'
);

-- Sample Services
INSERT IGNORE INTO services (id, code, name, description, is_active) VALUES
('s1', 'PAY', 'Payments', 'Tax and Fee Payments', true),
('s2', 'INQ', 'Inquiries', 'General Inquiries', true),
('s3', 'DOC', 'Documents', 'Permits and Clearances', true);

-- Sample Counters
INSERT IGNORE INTO counters (id, name, service_id, is_active) VALUES
('c1', 'Counter 1', 's1', true),
('c2', 'Counter 2', 's1', true),
('c3', 'Counter 3', 's2', true),
('c4', 'Counter 4', 's3', true);

-- Users table (replacing Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'counter_staff') NOT NULL,
    name VARCHAR(255),
    counter_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counters table
CREATE TABLE IF NOT EXISTS counters (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    current_ticket VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL,
    service_code VARCHAR(10) NOT NULL,
    status ENUM('waiting', 'called', 'served', 'cancelled', 'skipped') DEFAULT 'waiting',
    counter_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    served_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL
);

-- App Settings
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Default Admin (Password: admin123)
-- Note: You should generate a real bcrypt hash. This is just a placeholder.
INSERT IGNORE INTO users (id, email, password_hash, role, name) 
VALUES ('1', 'admin@sanpedro.com', '$2b$10$YourHashedPasswordHere', 'admin', 'Admin User');

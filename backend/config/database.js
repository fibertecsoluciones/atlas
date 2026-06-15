const { Pool } = require('pg');

// Configuración simplificada para Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },  // Railway requiere SSL
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Eventos de conexión
pool.on('connect', () => {
    console.log('✅ PostgreSQL: Conexión exitosa');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL: Error de conexión', err.message);
});

// Función para probar la conexión
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL: Query de prueba exitosa', result.rows[0]);
        return true;
    } catch (err) {
        console.error('❌ PostgreSQL: Error en query de prueba', err.message);
        return false;
    }
};

// Probar conexión al iniciar
testConnection();

module.exports = pool;
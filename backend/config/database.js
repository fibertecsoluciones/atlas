const { Pool } = require('pg');

console.log('🔍 Inicializando conexión a PostgreSQL...');
console.log('🔍 DATABASE_URL existe:', !!process.env.DATABASE_URL);

// Configuración simplificada y robusta
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Probar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERROR DE CONEXIÓN A POSTGRESQL:', err.message);
        return;
    }
    console.log('✅ PostgreSQL conectado exitosamente');
    release();
});

pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err.message);
});

// Función para probar la conexión con una consulta real
async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW() as time');
        console.log('✅ Query de prueba exitosa:', result.rows[0].time);
        return true;
    } catch (err) {
        console.error('❌ Error en query de prueba:', err.message);
        return false;
    }
}

// Ejecutar prueba
testConnection();

module.exports = pool;
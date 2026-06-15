require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARES GLOBALES
// =====================================================

// Seguridad
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar para Leaflet
}));

// CORS
app.use(cors({
    origin: '*', // En producción, restringir a tu dominio
    credentials: true
}));

// Rate limiting (protección contra ataques)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por IP
    message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);



// Ruta de prueba (agregar ANTES de los middlewares)
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Ruta de municipios pública (no requiere autenticación)
app.get('/api/auth/municipios', async (req, res) => {
    const pool = require('./config/database');
    try {
        const result = await pool.query('SELECT id, nombre, slug FROM municipios WHERE activo = true');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Parseo de JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// =====================================================
// RUTAS DE LA API
// =====================================================

app.use('/api/incidentes', require('./routes/incidentes'));
app.use('/api/albergues', require('./routes/albergues'));
app.use('/api/zonas', require('./routes/zonas'));
app.use('/api/auth', require('./routes/auth'));

// =====================================================
// RUTA DE SALUD (para Railway)
// =====================================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Sistema Atlas SAS'
    });
});

// =====================================================
// RUTA PRINCIPAL (envía el frontend)
// =====================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║     SISTEMA ATLAS SAS - PROTECCIÓN CIVIL        ║
    ║                                                  ║
    ║   🚀 Servidor corriendo en puerto: ${PORT}        ║
    ║   📍 API: http://localhost:${PORT}/api          ║
    ║   🌐 Web: http://localhost:${PORT}              ║
    ║                                                  ║
    ║   ✅ Multi-tenant activado                       ║
    ║   ✅ Base de datos conectada                     ║
    ╚══════════════════════════════════════════════════╝
    `);
});
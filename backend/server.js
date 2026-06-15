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
    contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
    origin: '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

// Parseo de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// =====================================================
// RUTAS DE LA API (TODAS aquí, en orden)
// =====================================================

// Ruta de prueba
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Rutas principales (todas manejan sus propios endpoints)
app.use('/api/auth', require('./routes/auth'));      // ← Esto incluye /municipios
app.use('/api/incidentes', require('./routes/incidentes'));
app.use('/api/albergues', require('./routes/albergues'));
app.use('/api/zonas', require('./routes/zonas'));

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
// RUTA CATCH-ALL (siempre al final)
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
    ╚══════════════════════════════════════════════════╝
    `);
});
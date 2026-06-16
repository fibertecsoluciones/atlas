require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// IMPORTANTE: Configurar trust proxy para Railway
// =====================================================
app.set('trust proxy', 1);

// =====================================================
// MIDDLEWARES
// =====================================================
app.use(helmet({
    contentSecurityPolicy: false,
}));

app.use(cors({
    origin: '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// =====================================================
// RUTAS DE PRUEBA
// =====================================================
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

app.get('/api/diagnostico', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        has_db_url: !!process.env.DATABASE_URL,
        node_version: process.version
    });
});

// =====================================================
// RUTA DE PRUEBA DE BASE DE DATOS (NUEVA)
// =====================================================
app.get('/api/db-test', async (req, res) => {
    try {
        const pool = require('./config/database');
        const result = await pool.query('SELECT id, email, rol FROM usuarios LIMIT 5');
        res.json({ 
            status: 'OK', 
            usuarios: result.rows,
            count: result.rows.length 
        });
    } catch (error) {
        console.error('❌ Error en /api/db-test:', error.message);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// =====================================================
// RUTAS DE LA API
// =====================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidentes', require('./routes/incidentes'));
app.use('/api/albergues', require('./routes/albergues'));
app.use('/api/zonas', require('./routes/zonas'));

// =====================================================
// RUTA DE SALUD
// =====================================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Sistema Atlas SAS'
    });
});

// =====================================================
// CATCH-ALL
// =====================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 DATABASE_URL configurada: ${process.env.DATABASE_URL ? 'SÍ' : 'NO'}`);
});
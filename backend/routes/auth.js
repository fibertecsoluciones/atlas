const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// GET: Listar municipios
router.get('/municipios', async (req, res) => {
    try {
        console.log('🔍 Obteniendo municipios...');
        const result = await pool.query('SELECT id, nombre, slug FROM municipios WHERE activo = true OR activo IS NULL');
        console.log(`✅ Encontrados ${result.rows.length} municipios`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en /municipios:', error.message);
        res.status(200).json([]);
    }
});

// POST: Login - CON PRUEBA DIRECTA DE BCRYPT
router.post('/login', async (req, res) => {
    try {
        const { email, password, municipio_slug } = req.body;
        
        console.log('========================================');
        console.log('🔍 NUEVO INTENTO DE LOGIN');
        console.log('📧 Email recibido:', email);
        console.log('🏛️ Municipio recibido:', municipio_slug);
        console.log('========================================');
        
        if (!email || !password) {
            console.log('❌ Email o password faltante');
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        
        // Buscar usuario
        const query = `
            SELECT u.*, m.id as municipio_id, m.nombre as municipio_nombre, m.slug as municipio_slug
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.email = $1
        `;
        
        console.log('🔍 Buscando usuario con email:', email);
        const result = await pool.query(query, [email]);
        
        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        console.log('✅ Usuario encontrado:', user.email);
        console.log('🔍 Hash almacenado:', user.password_hash);
        console.log('🔍 Longitud del hash:', user.password_hash.length);
        
        // VERIFICAR CONTRASEÑA CON BCRYPT DIRECTAMENTE
        console.log('🔍 Verificando contraseña con bcrypt.compare...');
        
        let validPassword = false;
        try {
            validPassword = await bcrypt.compare(password, user.password_hash);
            console.log(`🔍 Resultado de bcrypt.compare: ${validPassword}`);
        } catch (bcryptError) {
            console.error('❌ Error en bcrypt.compare:', bcryptError.message);
            return res.status(500).json({ error: 'Error al verificar la contraseña' });
        }
        
        if (!validPassword) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Verificar municipio
        if (municipio_slug && user.municipio_slug !== municipio_slug) {
            console.log(`❌ Municipio no coincide. Esperado: ${municipio_slug}, Real: ${user.municipio_slug}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Actualizar último acceso
        await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);
        
        // Generar token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                nombre: user.nombre_completo,
                rol: user.rol,
                municipio_id: user.municipio_id,
                municipio_slug: user.municipio_slug
            },
            process.env.JWT_SECRET || 'secreto-temporal',
            { expiresIn: '8h' }
        );
        
        console.log('✅ LOGIN EXITOSO para:', user.email);
        console.log('========================================');
        
        res.json({
            success: true,
            token,
            usuario: {
                id: user.id,
                email: user.email,
                nombre: user.nombre_completo,
                rol: user.rol,
                municipio: {
                    id: user.municipio_id,
                    nombre: user.municipio_nombre,
                    slug: user.municipio_slug
                }
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR EN LOGIN:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
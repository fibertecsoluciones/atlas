const express = require('express');
const router = express.Router();
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

// POST: Login - VERSIÓN SIN BCRYPT (SOLO PARA PRUEBAS)
router.post('/login', async (req, res) => {
    try {
        const { email, password, municipio_slug } = req.body;
        
        console.log('========================================');
        console.log('🔍 LOGIN (SIN BCRYPT - MODO PRUEBA)');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('🏛️ Municipio:', municipio_slug);
        console.log('========================================');
        
        if (!email || !password) {
            console.log('❌ Email o password faltante');
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        
        // Buscar usuario SOLO POR EMAIL
        const query = `
            SELECT u.*, m.id as municipio_id, m.nombre as municipio_nombre, m.slug as municipio_slug
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.email = $1
        `;
        
        const result = await pool.query(query, [email]);
        
        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        console.log('✅ Usuario encontrado:', user.email);
        console.log('🔍 Municipio del usuario:', user.municipio_slug);
        
        // ==== COMPARACIÓN DIRECTA (SIN BCRYPT) ====
        // La contraseña debe ser "admin123"
        const validPassword = (password === 'admin123');
        console.log(`🔍 Contraseña válida (comparación directa): ${validPassword}`);
        
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
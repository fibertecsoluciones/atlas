const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// =====================================================
// GET: Listar municipios (público)
// =====================================================
// GET: Listar municipios (público) - VERSIÓN SIMPLIFICADA
router.get('/municipios', async (req, res) => {
    try {
        console.log('🔍 Obteniendo municipios...');
        console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);
        
        const pool = require('../config/database');
        
        // Query simple
        const result = await pool.query('SELECT id, nombre, slug FROM municipios WHERE activo = true OR activo IS NULL');
        
        console.log(`✅ Encontrados ${result.rows.length} municipios`);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en /municipios:', error.message);
        console.error('Detalle:', error);
        
        // Devolver array vacío en lugar de error 500 para no romper el frontend
        res.status(200).json([]);
    }
});

// =====================================================
// POST: Login
// =====================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password, municipio_slug } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        
        let query = `
            SELECT u.*, m.id as municipio_id, m.nombre as municipio_nombre, m.slug as municipio_slug
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.email = $1 AND u.activo = true
        `;
        let params = [email];
        
        if (municipio_slug) {
            query += ` AND m.slug = $2`;
            params.push(municipio_slug);
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);
        
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
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
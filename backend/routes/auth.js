const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// =====================================================
// POST: Login de usuario
// =====================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password, municipio_slug } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        
        // Buscar usuario
        let query = `
            SELECT u.*, m.id as municipio_id, m.nombre as municipio_nombre, m.slug as municipio_slug
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.email = $1 AND u.activo = true
        `;
        const params = [email];
        
        // Si se especifica municipio, filtrar
        if (municipio_slug) {
            query += ` AND m.slug = $2`;
            params.push(municipio_slug);
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        
        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Actualizar último acceso
        await pool.query(
            'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
            [user.id]
        );
        
        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                nombre: user.nombre_completo,
                rol: user.rol,
                municipio_id: user.municipio_id,
                municipio_slug: user.municipio_slug
            },
            process.env.JWT_SECRET,
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
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// =====================================================
// GET: Listar municipios disponibles (para login)
// =====================================================
router.get('/municipios', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, slug, centro_mapa_lat, centro_mapa_lng
            FROM municipios
            WHERE activo = true
            ORDER BY nombre
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener municipios' });
    }
});

module.exports = router;
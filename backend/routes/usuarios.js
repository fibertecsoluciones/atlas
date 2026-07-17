const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// =====================================================
// GET: Listar usuarios del municipio actual
// =====================================================
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.nombre_completo, u.rol, u.activo, 
                   u.ultimo_acceso, u.fecha_creacion,
                   m.nombre as municipio_nombre
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.municipio_id = $1
            ORDER BY u.nombre_completo
        `, [req.user.municipio_id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// =====================================================
// GET: Obtener usuario por ID
// =====================================================
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT u.id, u.email, u.nombre_completo, u.rol, u.activo, 
                   u.ultimo_acceso, u.fecha_creacion,
                   m.nombre as municipio_nombre
            FROM usuarios u
            JOIN municipios m ON u.municipio_id = m.id
            WHERE u.id = $1 AND u.municipio_id = $2
        `, [id, req.user.municipio_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en GET /usuarios/:id:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// =====================================================
// POST: Crear usuario (solo admin)
// =====================================================
router.post('/', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { email, password, nombre_completo, rol } = req.body;
        
        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        
        // Verificar email único en el municipio
        const existCheck = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1 AND municipio_id = $2',
            [email, req.user.municipio_id]
        );
        if (existCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está en uso' });
        }
        
        // Hash de contraseña
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(`
            INSERT INTO usuarios (municipio_id, email, password_hash, nombre_completo, rol, activo)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id, email, nombre_completo, rol
        `, [req.user.municipio_id, email, passwordHash, nombre_completo, rol || 'operador']);
        
        res.status(201).json({
            success: true,
            mensaje: 'Usuario creado exitosamente',
            usuario: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /usuarios:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// =====================================================
// PUT: Actualizar usuario
// =====================================================
router.put('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, rol, activo, password } = req.body;
        
        // Verificar que existe
        const existCheck = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1 AND municipio_id = $2',
            [id, req.user.municipio_id]
        );
        if (existCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        let query = 'UPDATE usuarios SET ';
        const params = [];
        let paramCount = 1;
        
        if (nombre_completo !== undefined) {
            query += `nombre_completo = $${paramCount}, `;
            params.push(nombre_completo);
            paramCount++;
        }
        
        if (rol !== undefined) {
            query += `rol = $${paramCount}, `;
            params.push(rol);
            paramCount++;
        }
        
        if (activo !== undefined) {
            query += `activo = $${paramCount}, `;
            params.push(activo);
            paramCount++;
        }
        
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += `password_hash = $${paramCount}, `;
            params.push(hash);
            paramCount++;
        }
        
        // Eliminar la última coma y espacio
        query = query.slice(0, -2);
        query += ` WHERE id = $${paramCount} RETURNING id, email, nombre_completo, rol, activo`;
        params.push(id);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            mensaje: 'Usuario actualizado',
            usuario: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /usuarios/:id:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// =====================================================
// DELETE: Eliminar usuario
// =====================================================
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // No permitir eliminar a sí mismo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
        }
        
        const result = await pool.query(
            'DELETE FROM usuarios WHERE id = $1 AND municipio_id = $2 RETURNING id',
            [id, req.user.municipio_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            mensaje: 'Usuario eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /usuarios/:id:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
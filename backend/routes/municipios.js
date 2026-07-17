const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// =====================================================
// GET: Listar todos los municipios (público)
// =====================================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, slug, departamento, activo 
            FROM municipios 
            ORDER BY nombre
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /municipios:', error);
        res.status(500).json({ error: 'Error al obtener municipios' });
    }
});

// =====================================================
// GET: Obtener municipio por ID (admin)
// =====================================================
router.get('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT id, nombre, slug, departamento, activo, fecha_creacion
            FROM municipios 
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Municipio no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en GET /municipios/:id:', error);
        res.status(500).json({ error: 'Error al obtener municipio' });
    }
});

// =====================================================
// POST: Crear municipio (solo super_admin)
// =====================================================
router.post('/', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { nombre, slug, departamento } = req.body;
        
        // Validaciones
        if (!nombre || !slug) {
            return res.status(400).json({ error: 'Nombre y slug son requeridos' });
        }
        
        // Verificar slug único
        const existCheck = await pool.query('SELECT id FROM municipios WHERE slug = $1', [slug]);
        if (existCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El slug ya está en uso' });
        }
        
        const result = await pool.query(`
            INSERT INTO municipios (nombre, slug, departamento, activo)
            VALUES ($1, $2, $3, true)
            RETURNING id, nombre, slug, departamento
        `, [nombre, slug, departamento]);
        
        res.status(201).json({
            success: true,
            mensaje: 'Municipio creado exitosamente',
            municipio: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /municipios:', error);
        res.status(500).json({ error: 'Error al crear municipio' });
    }
});

// =====================================================
// PUT: Actualizar municipio (solo super_admin)
// =====================================================
router.put('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, slug, departamento, activo } = req.body;
        
        // Verificar que existe
        const existCheck = await pool.query('SELECT id FROM municipios WHERE id = $1', [id]);
        if (existCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Municipio no encontrado' });
        }
        
        // Verificar slug único (excepto el mismo)
        if (slug) {
            const slugCheck = await pool.query(
                'SELECT id FROM municipios WHERE slug = $1 AND id != $2',
                [slug, id]
            );
            if (slugCheck.rows.length > 0) {
                return res.status(400).json({ error: 'El slug ya está en uso' });
            }
        }
        
        const result = await pool.query(`
            UPDATE municipios 
            SET nombre = COALESCE($1, nombre),
                slug = COALESCE($2, slug),
                departamento = COALESCE($3, departamento),
                activo = COALESCE($4, activo)
            WHERE id = $5
            RETURNING id, nombre, slug, departamento, activo
        `, [nombre, slug, departamento, activo, id]);
        
        res.json({
            success: true,
            mensaje: 'Municipio actualizado',
            municipio: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /municipios/:id:', error);
        res.status(500).json({ error: 'Error al actualizar municipio' });
    }
});

// =====================================================
// DELETE: Eliminar municipio (solo super_admin)
// =====================================================
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que existe
        const existCheck = await pool.query('SELECT id FROM municipios WHERE id = $1', [id]);
        if (existCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Municipio no encontrado' });
        }
        
        // Verificar que no tiene usuarios asociados
        const userCheck = await pool.query('SELECT id FROM usuarios WHERE municipio_id = $1 LIMIT 1', [id]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el municipio porque tiene usuarios asociados' 
            });
        }
        
        await pool.query('DELETE FROM municipios WHERE id = $1', [id]);
        
        res.json({
            success: true,
            mensaje: 'Municipio eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /municipios/:id:', error);
        res.status(500).json({ error: 'Error al eliminar municipio' });
    }
});

module.exports = router;
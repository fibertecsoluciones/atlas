const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

router.use(tenantMiddleware);

// =====================================================
// GET: Zonas de riesgo del municipio
// =====================================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM zonas_riesgo
            WHERE municipio_id = $1
            ORDER BY 
                CASE nivel 
                    WHEN 'critico' THEN 1 
                    WHEN 'alto' THEN 2 
                    WHEN 'medio' THEN 3 
                    ELSE 4 
                END
        `, [req.municipioId]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener zonas de riesgo' });
    }
});

// =====================================================
// POST: Crear zona de riesgo (solo admin)
// =====================================================
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { nombre, tipo, nivel, descripcion, coordenadas_poligono } = req.body;
        
        const result = await pool.query(`
            INSERT INTO zonas_riesgo (
                municipio_id, nombre, tipo, nivel, descripcion, 
                coordenadas_poligono, creado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [req.municipioId, nombre, tipo, nivel, descripcion, coordenadas_poligono, req.user.id]);
        
        res.json({ success: true, id: result.rows[0].id });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear zona de riesgo' });
    }
});

// =====================================================
// DELETE: Eliminar zona de riesgo
// =====================================================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            'DELETE FROM zonas_riesgo WHERE id = $1 AND municipio_id = $2',
            [id, req.municipioId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar zona de riesgo' });
    }
});

module.exports = router;
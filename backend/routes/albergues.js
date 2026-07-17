const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

router.use(tenantMiddleware);

// =====================================================
// GET: Todos los albergues del municipio
// =====================================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*,
                   ROUND((a.ocupacion_actual::DECIMAL / NULLIF(a.capacidad_total, 0)) * 100, 2) as porcentaje_ocupacion,
                   CASE 
                       WHEN a.ocupacion_actual >= a.capacidad_total THEN 'LLENO'
                       WHEN a.ocupacion_actual >= a.capacidad_total * 0.8 THEN 'ALTO'
                       WHEN a.ocupacion_actual >= a.capacidad_total * 0.5 THEN 'MEDIO'
                       ELSE 'BAJO'
                   END as nivel_ocupacion
            FROM albergues a
            WHERE a.municipio_id = $1 AND a.estado = 'activo'
            ORDER BY a.nombre
        `, [req.municipioId]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener albergues' });
    }
});

// =====================================================
// GET: Albergues para el mapa
// =====================================================
router.get('/mapa', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, latitud, longitud, capacidad_total, ocupacion_actual,
                   encargado_nombre, encargado_telefono, servicios,
                   CASE 
                       WHEN ocupacion_actual >= capacidad_total THEN 'rojo'
                       WHEN ocupacion_actual >= capacidad_total * 0.8 THEN 'naranja'
                       WHEN ocupacion_actual >= capacidad_total * 0.5 THEN 'amarillo'
                       ELSE 'verde'
                   END as color_estado
            FROM albergues
            WHERE municipio_id = $1 AND estado = 'activo'
        `, [req.municipioId]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener albergues' });
    }
});

// =====================================================
// POST: Crear albergue (solo admin)
// =====================================================
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            latitud, longitud, direccion, nombre, tipo,
            capacidad_total, encargado_nombre, encargado_telefono, servicios
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO albergues (
                municipio_id, latitud, longitud, direccion, nombre, tipo,
                capacidad_total, encargado_nombre, encargado_telefono, servicios, creado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            req.municipioId, latitud, longitud, direccion, nombre, tipo || 'oficial',
            capacidad_total, encargado_nombre, encargado_telefono, servicios || '[]', req.user.id
        ]);
        
        res.json({ success: true, id: result.rows[0].id });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear albergue' });
    }
});

// =====================================================
// PUT: Actualizar ocupación de albergue
// =====================================================
router.put('/:id/ocupacion', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { ocupacion_actual } = req.body;
        
        await pool.query(`
            UPDATE albergues 
            SET ocupacion_actual = $1, fecha_actualizacion = NOW()
            WHERE id = $2 AND municipio_id = $3
        `, [ocupacion_actual, id, req.municipioId]);
        
        res.json({ success: true, mensaje: 'Ocupación actualizada' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar ocupación' });
    }
});

module.exports = router;
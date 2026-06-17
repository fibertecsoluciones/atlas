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
            SELECT 
                id, 
                nombre, 
                tipo, 
                nivel, 
                descripcion,
                coordenadas_poligono,
                poblacion_afectada,
                viviendas_afectadas,
                fecha_creacion,
                creado_por
            FROM zonas_riesgo
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
        console.error('❌ Error en GET /zonas:', error);
        res.status(500).json({ error: 'Error al obtener zonas de riesgo' });
    }
});

// =====================================================
// POST: Crear zona de riesgo (solo admin)
// =====================================================
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('📝 Creando zona de riesgo...');
        console.log('📦 Body recibido:', req.body);
        
        const { 
            nombre, 
            tipo, 
            nivel, 
            descripcion, 
            coordenadas_poligono,
            poblacion_afectada,
            viviendas_afectadas
        } = req.body;
        
        // Validaciones
        if (!nombre || !coordenadas_poligono) {
            return res.status(400).json({ 
                error: 'Nombre y coordenadas del polígono son requeridos' 
            });
        }
        
        // Validar GeoJSON
        try {
            const geo = JSON.parse(coordenadas_poligono);
            if (geo.type !== 'Polygon' && geo.type !== 'MultiPolygon') {
                return res.status(400).json({ 
                    error: 'El GeoJSON debe ser de tipo Polygon o MultiPolygon' 
                });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Formato GeoJSON inválido' });
        }
        
        // Asegurar que los valores sean números
        const poblacion = parseInt(poblacion_afectada) || 0;
        const viviendas = parseInt(viviendas_afectadas) || 0;
        
        console.log('📊 Población afectada:', poblacion);
        console.log('🏠 Viviendas afectadas:', viviendas);
        
        const result = await pool.query(`
            INSERT INTO zonas_riesgo (
                municipio_id, 
                nombre, 
                tipo, 
                nivel, 
                descripcion, 
                coordenadas_poligono,
                poblacion_afectada,
                viviendas_afectadas,
                creado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, nombre, tipo, nivel, poblacion_afectada, viviendas_afectadas
        `, [
            req.municipioId, 
            nombre, 
            tipo || 'otro', 
            nivel || 'medio', 
            descripcion || '', 
            coordenadas_poligono,
            poblacion,      // ← NUEVO
            viviendas,      // ← NUEVO
            req.user.id
        ]);
        
        console.log('✅ Zona creada:', result.rows[0]);
        
        res.json({ 
            success: true, 
            id: result.rows[0].id,
            zona: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /zonas:', error);
        res.status(500).json({ error: 'Error al crear zona de riesgo' });
    }
});

// =====================================================
// DELETE: Eliminar zona de riesgo
// =====================================================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM zonas_riesgo WHERE id = $1 AND municipio_id = $2 RETURNING id',
            [id, req.municipioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zona de riesgo no encontrada' });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error en DELETE /zonas:', error);
        res.status(500).json({ error: 'Error al eliminar zona de riesgo' });
    }
});

module.exports = router;
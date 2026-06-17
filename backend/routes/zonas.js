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
    console.log('📥 [API] GET /zonas - Municipio:', req.municipioId);
    
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
                fecha_creacion
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
        
        console.log(`📥 [API] GET /zonas - ${result.rows.length} zonas encontradas`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ [API] Error GET /zonas:', error);
        res.status(500).json({ error: 'Error al obtener zonas' });
    }
});

// =====================================================
// GET: Obtener una zona por ID
// =====================================================
router.get('/:id', async (req, res) => {
    console.log(`📥 [API] GET /zonas/${req.params.id}`);
    
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT * FROM zonas_riesgo
            WHERE id = $1 AND municipio_id = $2
        `, [id, req.municipioId]);
        
        if (result.rows.length === 0) {
            console.log(`⚠️ [API] GET /zonas/${id} - No encontrada`);
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        console.log(`✅ [API] GET /zonas/${id} - Encontrada`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ [API] Error GET /zonas/${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener zona' });
    }
});

// =====================================================
// POST: Crear zona de riesgo
// =====================================================
router.post('/', authMiddleware, async (req, res) => {
    console.log('📥 [API] POST /zonas');
    console.log('📦 Body:', req.body);
    
    try {
        const { 
            nombre, 
            tipo, 
            nivel, 
            descripcion, 
            coordenadas_poligono,
            poblacion_afectada,
            viviendas_afectadas
        } = req.body;
        
        if (!nombre || !coordenadas_poligono) {
            console.log('❌ [API] POST /zonas - Faltan datos requeridos');
            return res.status(400).json({ error: 'Nombre y coordenadas son requeridos' });
        }
        
        const result = await pool.query(`
            INSERT INTO zonas_riesgo (
                municipio_id, nombre, tipo, nivel, descripcion, 
                coordenadas_poligono, poblacion_afectada, viviendas_afectadas, creado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            req.municipioId, 
            nombre, 
            tipo || 'otro', 
            nivel || 'medio', 
            descripcion || '', 
            coordenadas_poligono,
            parseInt(poblacion_afectada) || 0,
            parseInt(viviendas_afectadas) || 0,
            req.user.id
        ]);
        
        console.log(`✅ [API] POST /zonas - Creada ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('❌ [API] Error POST /zonas:', error);
        res.status(500).json({ error: 'Error al crear zona' });
    }
});

// =====================================================
// PUT: Actualizar zona de riesgo - CON LOGS DETALLADOS
// =====================================================
router.put('/:id', authMiddleware, async (req, res) => {
    console.log(`📥 [API] PUT /zonas/${req.params.id}`);
    
    try {
        const { id } = req.params;
        const { 
            nombre, 
            tipo, 
            nivel, 
            descripcion, 
            coordenadas_poligono,
            poblacion_afectada,
            viviendas_afectadas
        } = req.body;
        
        console.log('📦 [API] Body recibido:', req.body);
        console.log('📦 [API] coordenadas_poligono:', coordenadas_poligono);
        
        // Verificar que la zona existe
        const check = await pool.query(
            'SELECT id FROM zonas_riesgo WHERE id = $1 AND municipio_id = $2',
            [id, req.municipioId]
        );
        
        if (check.rows.length === 0) {
            console.log(`❌ [API] PUT /zonas/${id} - No encontrada`);
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        console.log(`✅ [API] PUT /zonas/${id} - Zona encontrada, actualizando...`);
        
        // ACTUALIZAR TODO INCLUYENDO EL POLÍGONO
        const result = await pool.query(`
            UPDATE zonas_riesgo 
            SET 
                nombre = $1,
                tipo = $2,
                nivel = $3,
                descripcion = $4,
                coordenadas_poligono = $5,
                poblacion_afectada = $6,
                viviendas_afectadas = $7,
                fecha_actualizacion = NOW()
            WHERE id = $8 AND municipio_id = $9
            RETURNING id
        `, [
            nombre,
            tipo || 'otro',
            nivel || 'medio',
            descripcion || '',
            coordenadas_poligono,
            parseInt(poblacion_afectada) || 0,
            parseInt(viviendas_afectadas) || 0,
            id,
            req.municipioId
        ]);
        
        console.log(`✅ [API] PUT /zonas/${id} - Actualizada correctamente`);
        console.log('📦 [API] Nuevo coordenadas_poligono:', coordenadas_poligono);
        
        res.json({ success: true, mensaje: 'Zona actualizada' });
        
    } catch (error) {
        console.error(`❌ [API] Error PUT /zonas/${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al actualizar zona' });
    }
});

// =====================================================
// DELETE: Eliminar zona de riesgo
// =====================================================
router.delete('/:id', authMiddleware, async (req, res) => {
    console.log(`📥 [API] DELETE /zonas/${req.params.id}`);
    
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM zonas_riesgo WHERE id = $1 AND municipio_id = $2 RETURNING id',
            [id, req.municipioId]
        );
        
        if (result.rows.length === 0) {
            console.log(`❌ [API] DELETE /zonas/${id} - No encontrada`);
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        console.log(`✅ [API] DELETE /zonas/${id} - Eliminada`);
        res.json({ success: true });
    } catch (error) {
        console.error(`❌ [API] Error DELETE /zonas/${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al eliminar zona' });
    }
});

module.exports = router;
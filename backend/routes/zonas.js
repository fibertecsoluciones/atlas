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
// PUT: Actualizar zona de riesgo
// =====================================================
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            tipo, 
            nivel, 
            descripcion, 
            poblacion_afectada,
            viviendas_afectadas,
            coordenadas_poligono
        } = req.body;
        
        // Verificar que la zona existe
        const checkResult = await pool.query(
            'SELECT id FROM zonas_riesgo WHERE id = $1 AND municipio_id = $2',
            [id, req.municipioId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        const poblacion = parseInt(poblacion_afectada) || 0;
        const viviendas = parseInt(viviendas_afectadas) || 0;
        
        // Construir query dinámica
        let query = 'UPDATE zonas_riesgo SET ';
        const params = [];
        let paramCount = 1;
        let setClauses = [];
        
        if (nombre !== undefined) {
            setClauses.push(`nombre = $${paramCount}`);
            params.push(nombre);
            paramCount++;
        }
        if (tipo !== undefined) {
            setClauses.push(`tipo = $${paramCount}`);
            params.push(tipo);
            paramCount++;
        }
        if (nivel !== undefined) {
            setClauses.push(`nivel = $${paramCount}`);
            params.push(nivel);
            paramCount++;
        }
        if (descripcion !== undefined) {
            setClauses.push(`descripcion = $${paramCount}`);
            params.push(descripcion);
            paramCount++;
        }
        if (poblacion !== undefined) {
            setClauses.push(`poblacion_afectada = $${paramCount}`);
            params.push(poblacion);
            paramCount++;
        }
        if (viviendas !== undefined) {
            setClauses.push(`viviendas_afectadas = $${paramCount}`);
            params.push(viviendas);
            paramCount++;
        }
        if (coordenadas_poligono !== undefined && coordenadas_poligono !== null) {
            setClauses.push(`coordenadas_poligono = $${paramCount}`);
            params.push(coordenadas_poligono);
            paramCount++;
        }
        
        // Siempre actualizar fecha
        setClauses.push(`fecha_actualizacion = NOW()`);
        
        query += setClauses.join(', ');
        query += ` WHERE id = $${paramCount} AND municipio_id = $${paramCount + 1}`;
        params.push(id);
        params.push(req.municipioId);
        
        await pool.query(query, params);
        
        res.json({
            success: true,
            mensaje: 'Zona actualizada'
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /zonas:', error);
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
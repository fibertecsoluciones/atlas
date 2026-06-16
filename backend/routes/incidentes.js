const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

// Aplicar middleware multi-tenant
router.use(tenantMiddleware);

// =====================================================
// GET: Obtener incidentes del municipio actual
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { estado, tipo, limite = 50 } = req.query;
        
        let query = `
            SELECT i.*, u.nombre_completo as asignado_nombre
            FROM incidentes i
            LEFT JOIN usuarios u ON i.asignado_a = u.id
            WHERE i.municipio_id = $1
        `;
        const params = [req.municipioId];
        
        if (estado) {
            query += ` AND i.estado = $${params.length + 1}`;
            params.push(estado);
        }
        
        if (tipo) {
            query += ` AND i.tipo = $${params.length + 1}`;
            params.push(tipo);
        }
        
        query += ` ORDER BY i.fecha_reporte DESC LIMIT $${params.length + 1}`;
        params.push(limite);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /incidentes:', error);
        res.status(500).json({ error: 'Error al obtener incidentes' });
    }
});

// =====================================================
// GET: Incidentes para el mapa
// =====================================================
router.get('/mapa', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, 
                latitud, 
                longitud, 
                tipo, 
                descripcion, 
                estado, 
                prioridad, 
                foto_url, 
                fecha_reporte, 
                direccion_aproximada,
                CASE 
                    WHEN EXTRACT(EPOCH FROM (NOW() - fecha_reporte)) < 300 THEN 'nuevo'
                    ELSE 'antiguo'
                END as es_nuevo
            FROM incidentes
            WHERE municipio_id = $1 AND estado != 'resuelto'
            ORDER BY 
                CASE WHEN prioridad = 1 THEN 1 ELSE 2 END,
                fecha_reporte DESC
        `, [req.municipioId]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /incidentes/mapa:', error);
        res.status(500).json({ error: 'Error al obtener incidentes para mapa' });
    }
});

// =====================================================
// POST: Crear nuevo incidente
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            latitud,
            longitud,
            direccion_aproximada,
            tipo,
            descripcion,
            foto_url,
            ciudadano_nombre,
            ciudadano_telefono
        } = req.body;
        
        if (!latitud || !longitud) {
            return res.status(400).json({ error: 'La ubicación es requerida' });
        }
        
        if (!tipo || !descripcion) {
            return res.status(400).json({ error: 'Tipo y descripción son requeridos' });
        }
        
        let prioridad = 2;
        const tiposAltaPrioridad = ['incendio', 'explosion', 'rescate'];
        if (tiposAltaPrioridad.includes(tipo)) {
            prioridad = 1;
        }
        
        const result = await pool.query(`
            INSERT INTO incidentes (
                municipio_id, 
                latitud, 
                longitud, 
                direccion_aproximada,
                tipo, 
                descripcion, 
                foto_url, 
                ciudadano_nombre,
                ciudadano_telefono, 
                prioridad, 
                estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente')
            RETURNING id
        `, [
            req.municipioId, 
            latitud, 
            longitud, 
            direccion_aproximada,
            tipo, 
            descripcion, 
            foto_url, 
            ciudadano_nombre || 'Anónimo',
            ciudadano_telefono, 
            prioridad
        ]);
        
        res.json({ 
            success: true, 
            id: result.rows[0].id,
            mensaje: 'Incidente reportado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error en POST /incidentes:', error);
        res.status(500).json({ error: 'Error al crear incidente' });
    }
});

// =====================================================
// PUT: Actualizar estado de incidente
// =====================================================
router.put('/:id/estado', authMiddleware, async function(req, res) {
    try {
        const { id } = req.params;
        const { estado, comentarios } = req.body;
        
        const checkResult = await pool.query(
            'SELECT id FROM incidentes WHERE id = $1 AND municipio_id = $2',
            [id, req.municipioId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Incidente no encontrado' });
        }
        
        let query = 'UPDATE incidentes SET estado = $1, fecha_actualizacion = NOW()';
        const params = [estado];
        
        if (estado === 'asignado') {
            query += ', fecha_asignacion = NOW()';
        }
        
        if (estado === 'resuelto') {
            query += ', fecha_resolucion = NOW()';
        }
        
        if (comentarios) {
            query += `, comentarios_internos = $${params.length + 1}`;
            params.push(comentarios);
        }
        
        query += ` WHERE id = $${params.length + 1}`;
        params.push(id);
        
        await pool.query(query, params);
        
        res.json({ success: true, mensaje: 'Estado actualizado' });
        
    } catch (error) {
        console.error('❌ Error en PUT /incidentes/:id/estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

module.exports = router;
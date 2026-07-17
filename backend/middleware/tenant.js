// Middleware multi-tenant - El corazón del sistema
// Filtra TODAS las consultas por municipio

const pool = require('../config/database');

const tenantMiddleware = async (req, res, next) => {
    try {
        // Obtener municipio desde el header o token
        let municipioSlug = req.headers['x-municipio-slug'];
        
        // Si viene de un usuario autenticado, obtener de su token
        if (req.user && req.user.municipio_id) {
            req.municipioId = req.user.municipio_id;
            return next();
        }
        
        // Si no hay usuario autenticado, buscar por slug
        if (municipioSlug) {
            const result = await pool.query(
                'SELECT id FROM municipios WHERE slug = $1 AND activo = true',
                [municipioSlug]
            );
            
            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Municipio no encontrado' });
            }
            
            req.municipioId = result.rows[0].id;
            return next();
        }
        
        // Si no hay ni usuario ni slug, error
        return res.status(400).json({ error: 'Municipio no especificado' });
        
    } catch (error) {
        console.error('Error en tenant middleware:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
};

module.exports = tenantMiddleware;
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto-temporal');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar si es administrador
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (req.user.rol !== 'admin_municipal' && req.user.rol !== 'super_admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
};

module.exports = { authMiddleware, isAdmin };
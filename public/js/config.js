// =====================================================
// CONFIGURACIÓN GLOBAL - SISTEMA ATLAS SAS
// =====================================================

// URL base de la API
const API_BASE_URL = window.location.origin;

// Centros por municipio (coordenadas predefinidas)
const CENTROS_MUNICIPIOS = {
    'las-choapas': { lat: 17.9117, lng: -94.0958, zoom: 13 },
    'moloacan': { lat: 17.9842, lng: -94.3467, zoom: 14 }
};

// Centro por defecto
const DEFAULT_CENTER = { lat: 18.0, lng: -94.5, zoom: 13 };

// Tipos de emergencia con sus iconos
const TIPOS_EMERGENCIA = {
    incendio: { icono: '🔥', nombre: 'Incendio', prioridad: 1 },
    inundacion: { icono: '🌊', nombre: 'Inundación', prioridad: 1 },
    deslizamiento: { icono: '⛰️', nombre: 'Deslizamiento', prioridad: 1 },
    accidente: { icono: '🚗', nombre: 'Accidente', prioridad: 2 },
    arbol_caido: { icono: '🌳', nombre: 'Árbol caído', prioridad: 3 },
    otro: { icono: '⚠️', nombre: 'Otro', prioridad: 2 }
};

// Estados de incidentes
const ESTADOS_INCIDENTES = {
    pendiente: { texto: 'Pendiente', color: '#ef4444' },
    en_revision: { texto: 'En revisión', color: '#8b5cf6' },
    asignado: { texto: 'Asignado', color: '#3b82f6' },
    en_proceso: { texto: 'En proceso', color: '#f59e0b' },
    resuelto: { texto: 'Resuelto', color: '#10b981' },
    cancelado: { texto: 'Cancelado', color: '#6b7280' }
};

// Funciones auxiliares
function getIconoTipo(tipo) {
    return TIPOS_EMERGENCIA[tipo]?.icono || '📍';
}

function getEstadoTexto(estado) {
    return ESTADOS_INCIDENTES[estado]?.texto || estado;
}

function getEstadoColor(estado) {
    return ESTADOS_INCIDENTES[estado]?.color || '#6b7280';
}

function formatFecha(fecha) {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = Math.floor((ahora - date) / 1000 / 60);
    
    if (diff < 1) return 'hace segundos';
    if (diff < 60) return `hace ${diff} minutos`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)} horas`;
    return `hace ${Math.floor(diff / 1440)} días`;
}
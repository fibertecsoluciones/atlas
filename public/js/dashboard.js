// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS
// =====================================================

let mapa = null;
let marcadores = [];
let marcadoresAlbergues = [];
let poligonosRiesgo = [];
let incidentesData = [];
let alberguesData = [];
let riesgosData = [];
let userData = null;
let selectedUbicacion = null;

// =====================================================
// REFERENCIAS DOM
// =====================================================
const userNameSpan = document.getElementById('user-name');
const municipioBadge = document.getElementById('municipio-badge');
const statsActivos = document.getElementById('stats-activos');
const statsProceso = document.getElementById('stats-proceso');
const statsResueltos = document.getElementById('stats-resueltos');
const statsAlbergues = document.getElementById('stats-albergues');
const statsRiesgos = document.getElementById('stats-riesgos');
const statsHoy = document.getElementById('stats-hoy');
const listaIncidentes = document.getElementById('lista-incidentes');
const listaAlbergues = document.getElementById('lista-albergues');
const listaRiesgos = document.getElementById('lista-riesgos');
const toastContainer = document.getElementById('toast-container');

// =====================================================
// NOTA: DEFAULT_CENTER y CENTROS_MUNICIPIOS 
// ya están definidos en config.js
// NO los declares de nuevo aquí
// =====================================================

// =====================================================
// FUNCIONES DE ICONOS
// =====================================================
function crearIconoEmoji(emoji, color, tamaño = 36, fondo = true) {
    const fondoStyle = fondo ? `
        background: rgba(0,0,0,0.6);
        border-radius: 50%;
        padding: 6px;
        border: 2px solid ${color};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ` : '';
    
    return L.divIcon({
        html: `<div style="
            width: ${tamaño}px;
            height: ${tamaño}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${tamaño - 10}px;
            ${fondoStyle}
            cursor: pointer;
        ">${emoji}</div>`,
        iconSize: [tamaño, tamaño],
        popupAnchor: [0, -tamaño/2],
        className: 'emoji-marcador'
    });
}

function getEmojiPorTipo(tipo, prioridad) {
    const t = tipo?.toLowerCase() || '';
    let emoji = '⚠️';
    let color = '#FF9800';
    let tamaño = 36;
    
    if (t.includes('incendio')) { emoji = '🔥'; color = '#FF5722'; tamaño = 42; }
    else if (t.includes('inundacion')) { emoji = '🌊'; color = '#2196F3'; tamaño = 38; }
    else if (t.includes('deslizamiento')) { emoji = '⛰️'; color = '#795548'; tamaño = 38; }
    else if (t.includes('accidente')) { emoji = '🚗'; color = '#F44336'; tamaño = 38; }
    else if (t.includes('arbol')) { emoji = '🌳'; color = '#4CAF50'; tamaño = 36; }
    
    if (prioridad === 1) { tamaño += 6; color = '#F44336'; }
    else if (prioridad === 2) { tamaño += 2; color = '#FF9800'; }
    
    return { emoji, color, tamaño };
}

function getIconoAlbergue(ocupacion, capacidad) {
    let porcentaje = capacidad > 0 ? (ocupacion / capacidad) * 100 : 0;
    let color = '#4CAF50';
    if (porcentaje > 80) color = '#FF9800';
    if (porcentaje >= 100) color = '#F44336';
    return crearIconoEmoji('🏠', color, 38, true);
}

function getEstadoTexto(estado) {
    const estados = {
        pendiente: 'Pendiente',
        en_proceso: 'En proceso',
        en_revision: 'En revisión',
        resuelto: 'Resuelto',
        cancelado: 'Cancelado'
    };
    return estados[estado] || estado;
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

// =====================================================
// OBTENER USUARIO
// =====================================================
function obtenerUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        userData = JSON.parse(userStr);
        if (userNameSpan) userNameSpan.textContent = `👤 ${userData.nombre || userData.email || 'Operador'}`;
        if (municipioBadge) municipioBadge.textContent = `📍 ${userData.municipio?.nombre || 'Sin municipio'}`;
        return userData;
    }
    return null;
}

// =====================================================
// INICIALIZAR MAPA (LEAFLET)
// =====================================================
function initMapaDashboard() {
    try {
        console.log('🗺️ Creando mapa...');
        
        if (mapa) {
            mapa.remove();
            mapa = null;
        }
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const slug = user.municipio?.slug || 'las-choapas';
        const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
        
        console.log('📍 Centro del mapa:', centro);
        
        mapa = L.map('mapa-dashboard').setView([centro.lat, centro.lng], centro.zoom || 13);
        
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            attribution: 'Map data &copy; Google',
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(mapa);
        
        setTimeout(() => {
            mapa.invalidateSize();
        }, 500);
        
        console.log('✅ Mapa inicializado correctamente');
        window.mapa = mapa;
        
    } catch (error) {
        console.error('❌ Error al crear mapa:', error);
    }
}

// =====================================================
// CARGAR INCIDENTES
// =====================================================
async function cargarIncidentes() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/incidentes/mapa`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        incidentesData = await res.json();
        
        const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
        const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
        const hoy = incidentesData.filter(i => new Date(i.fecha_reporte).toDateString() === new Date().toDateString()).length;
        
        if (statsActivos) statsActivos.textContent = activos;
        if (statsProceso) statsProceso.textContent = enProceso;
        if (statsHoy) statsHoy.textContent = hoy;
        
        actualizarListaIncidentes();
        actualizarMapaIncidentes();
        
    } catch (error) {
        console.error('Error cargando incidentes:', error);
    }
}

function actualizarListaIncidentes() {
    if (!listaIncidentes) return;
    
    if (incidentesData.length === 0) {
        listaIncidentes.innerHTML = '<div class="loading-spinner">No hay incidentes</div>';
        return;
    }
    
    listaIncidentes.innerHTML = incidentesData.map(inc => `
        <div class="incidente-card prioridad-${inc.prioridad}">
            <div class="incidente-tipo">
                <span>${getEmojiPorTipo(inc.tipo, inc.prioridad).emoji} ${inc.tipo.toUpperCase()}</span>
                <span class="estado-badge estado-${inc.estado}">${getEstadoTexto(inc.estado)}</span>
            </div>
            <div class="incidente-desc">${inc.descripcion?.substring(0, 80)}${inc.descripcion?.length > 80 ? '...' : ''}</div>
            <div class="incidente-fecha">📅 ${formatFecha(inc.fecha_reporte)}</div>
        </div>
    `).join('');
}

function actualizarMapaIncidentes() {
    if (!mapa) return;
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];
    
    incidentesData.forEach(inc => {
        const { emoji, color, tamaño } = getEmojiPorTipo(inc.tipo, inc.prioridad);
        const icono = crearIconoEmoji(emoji, color, tamaño, true);
        
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`<b>🚨 ${inc.tipo.toUpperCase()}</b><br>${inc.descripcion || 'Sin descripción'}`);
        
        marcadores.push(marker);
    });
}

// =====================================================
// CARGAR ALBERGUES
// =====================================================
async function cargarAlbergues() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/albergues/mapa`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        alberguesData = await res.json();
        
        if (statsAlbergues) statsAlbergues.textContent = alberguesData.length;
        actualizarListaAlbergues();
        actualizarMapaAlbergues();
        
    } catch (error) {
        console.error('Error cargando albergues:', error);
    }
}

function actualizarListaAlbergues() {
    if (!listaAlbergues) return;
    
    if (alberguesData.length === 0) {
        listaAlbergues.innerHTML = '<div class="loading-spinner">No hay albergues</div>';
        return;
    }
    
    listaAlbergues.innerHTML = alberguesData.map(a => `
        <div class="albergue-card">
            <strong>🏠 ${a.nombre}</strong>
            <div>Capacidad: ${a.ocupacion_actual}/${a.capacidad_total}</div>
        </div>
    `).join('');
}

function actualizarMapaAlbergues() {
    if (!mapa) return;
    marcadoresAlbergues.forEach(m => mapa.removeLayer(m));
    marcadoresAlbergues = [];
    
    alberguesData.forEach(a => {
        const icono = getIconoAlbergue(a.ocupacion_actual, a.capacidad_total);
        const marker = L.marker([a.latitud, a.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`🏠 ${a.nombre}<br>Capacidad: ${a.ocupacion_actual}/${a.capacidad_total}`);
        marcadoresAlbergues.push(marker);
    });
}

// =====================================================
// CARGAR ZONAS DE RIESGO
// =====================================================
async function cargarRiesgos() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        riesgosData = await res.json();
        
        if (statsRiesgos) statsRiesgos.textContent = riesgosData.length;
        actualizarMapaRiesgos();
        
    } catch (error) {
        console.error('Error cargando riesgos:', error);
    }
}

function actualizarMapaRiesgos() {
    if (!mapa) return;
    poligonosRiesgo.forEach(p => mapa.removeLayer(p));
    poligonosRiesgo = [];
    
    riesgosData.forEach(r => {
        try {
            const geo = JSON.parse(r.coordenadas_poligono);
            const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
            
            const polygon = L.polygon(coords, {
                color: '#f59e0b',
                weight: 3,
                fillColor: '#f59e0b',
                fillOpacity: 0.3
            }).addTo(mapa)
              .bindPopup(`⚠️ ${r.nombre}`);
            
            poligonosRiesgo.push(polygon);
        } catch(e) {
            console.error('Error parseando polígono:', e);
        }
    });
}

// =====================================================
// INICIALIZAR DASHBOARD
// =====================================================
async function initDashboard() {
    try {
        console.log('🚀 Iniciando Dashboard...');
        
        // Verificar sesión
        if (typeof verificarSesion === 'function') {
            if (!verificarSesion()) {
                window.location.href = '/login.html';
                return;
            }
        } else {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            if (!token || !user) {
                window.location.href = '/login.html';
                return;
            }
        }
        
        const user = obtenerUsuario();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        initMapaDashboard();
        await cargarIncidentes();
        await cargarAlbergues();
        await cargarRiesgos();
        
        console.log('✅ Dashboard iniciado correctamente');
        
        setInterval(() => {
            cargarIncidentes();
            cargarAlbergues();
        }, 30000);
        
    } catch (error) {
        console.error('❌ Error en initDashboard:', error);
    }
}

// =====================================================
// LOGOUT
// =====================================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// =====================================================
// INICIALIZAR
// =====================================================
document.addEventListener('DOMContentLoaded', initDashboard);

// Exportar globales
window.logout = logout;
window.initMapaDashboard = initMapaDashboard;
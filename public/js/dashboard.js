// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS (SOLO ORQUESTADOR)
// =====================================================

let mapa = null;
let userData = null;
let drawingControl = null;
let featureGroup = null;

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
const listaMunicipios = document.getElementById('lista-municipios');
const listaUsuarios = document.getElementById('lista-usuarios');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitulo = document.getElementById('modal-titulo');
const modalBody = document.getElementById('modal-body');
const toastContainer = document.getElementById('toast-container');

// =====================================================
// FUNCIONES DE ICONOS (EXPORTADAS PARA OTROS MÓDULOS)
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

function getNivelColor(nivel) {
    const colores = {
        'critico': '#dc2626',
        'alto': '#f97316',
        'medio': '#f59e0b',
        'bajo': '#10b981'
    };
    return colores[nivel] || '#6b7f9f';
}

// =====================================================
// UTILIDADES
// =====================================================
function mostrarToast(mensaje, tipo = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function cerrarModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
}

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
// MAPA
// =====================================================
function initMapaDashboard() {
    try {
        console.log('🗺️ Creando mapa...');
        if (mapa) { mapa.remove(); mapa = null; }
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const slug = user.municipio?.slug || 'las-choapas';
        const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
        
        mapa = L.map('mapa-dashboard').setView([centro.lat, centro.lng], centro.zoom || 13);
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            attribution: 'Map data &copy; Google',
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(mapa);
        
        // Crear FeatureGroup
        if (!featureGroup) {
            featureGroup = L.featureGroup().addTo(mapa);
        }
        
        // Crear control de dibujo
        if (!drawingControl) {
            drawingControl = new L.Control.Draw({
                draw: {
                    polygon: { allowIntersection: false, showArea: true },
                    rectangle: true,
                    circle: false,
                    polyline: false,
                    marker: false
                },
                edit: {
                    featureGroup: featureGroup
                }
            });
            mapa.addControl(drawingControl);
        }
        
        setTimeout(() => mapa.invalidateSize(), 500);
        console.log('✅ Mapa inicializado');
        window.mapa = mapa;
    } catch (error) {
        console.error('❌ Error al crear mapa:', error);
    }
}

// =====================================================
// FUNCIONES DE MAPA
// =====================================================
function resetMapa() {
    if (mapa) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const slug = user.municipio?.slug || 'las-choapas';
        const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
        mapa.setView([centro.lat, centro.lng], centro.zoom || 13);
        mostrarToast('📍 Vista restablecida', 'info');
    }
}

function centrarUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                mapa.setView([pos.coords.latitude, pos.coords.longitude], 16);
                mostrarToast('📍 Tu ubicación', 'info');
            },
            () => mostrarToast('⚠️ No se pudo obtener ubicación', 'warning')
        );
    } else {
        mostrarToast('⚠️ Geolocalización no soportada', 'warning');
    }
}

function zoomIn() { if (mapa) mapa.zoomIn(); }
function zoomOut() { if (mapa) mapa.zoomOut(); }

// =====================================================
// BOTONES QUE LLAMAN A MÓDULOS
// =====================================================
// =====================================================
// ACTIVAR DIBUJO DE POLÍGONO
// =====================================================
function activarDibujoPoligono() {
    console.log('🖊️ Botón Dibujar presionado');
    
    // Verificar que el mapa existe
    if (!mapa) {
        mostrarToast('⚠️ El mapa no está cargado', 'warning');
        return;
    }
    
    // Verificar que el control de dibujo existe y tiene el método
    if (!drawingControl || typeof drawingControl.setDrawingMode !== 'function') {
        // Recrear el control de dibujo si no existe o está mal
        console.log('🔄 Recreando control de dibujo...');
        
        if (!featureGroup) {
            featureGroup = L.featureGroup().addTo(mapa);
        }
        
        drawingControl = new L.Control.Draw({
            draw: {
                polygon: { allowIntersection: false, showArea: true },
                rectangle: true,
                circle: false,
                polyline: false,
                marker: false
            },
            edit: {
                featureGroup: featureGroup
            }
        });
        mapa.addControl(drawingControl);
    }
    
    // Verificar si ya estamos dibujando
    if (window.dibujando) {
        mostrarToast('⚠️ Ya estás dibujando', 'warning');
        return;
    }
    
    window.dibujando = true;
    mostrarToast('✏️ Dibuja un polígono en el mapa', 'info');
    
    try {
        drawingControl.setDrawingMode('polygon');
    } catch (error) {
        console.error('❌ Error al activar dibujo:', error);
        mostrarToast('⚠️ Error al activar dibujo', 'error');
        window.dibujando = false;
        return;
    }
    
    // Escuchar evento de dibujo completado
    mapa.once('draw:created', function(e) {
        const layer = e.layer;
        const coords = layer.getLatLngs()[0];
        const geojson = { 
            type: 'Polygon', 
            coordinates: [coords.map(c => [c.lng, c.lat])] 
        };
        window.dibujando = false;
        
        // Mostrar formulario
        if (typeof window.mostrarFormularioZona === 'function') {
            window.mostrarFormularioZona(geojson, layer);
        } else {
            mostrarToast('⚠️ Formulario no disponible', 'warning');
            if (layer && mapa) mapa.removeLayer(layer);
        }
    });
    
    // Escuchar cancelación de dibujo
    mapa.once('draw:drawstop', function() {
        window.dibujando = false;
        mostrarToast('⏹️ Dibujo cancelado', 'info');
    });
}
function abrirFormularioMunicipio() {
    if (typeof window.abrirFormularioMunicipio === 'function') {
        window.abrirFormularioMunicipio();
    } else {
        mostrarToast('⚠️ Módulo de municipios no disponible', 'warning');
    }
}

function abrirFormularioUsuario() {
    if (typeof window.abrirFormularioUsuario === 'function') {
        window.abrirFormularioUsuario();
    } else {
        mostrarToast('⚠️ Módulo de usuarios no disponible', 'warning');
    }
}

function abrirFormularioAlbergue() {
    if (typeof window.abrirFormularioAlbergue === 'function') {
        window.abrirFormularioAlbergue();
    } else {
        mostrarToast('📝 Formulario de albergue en desarrollo', 'info');
    }
}

function seleccionarUbicacionMapa() {
    if (typeof window.seleccionarUbicacionMapa === 'function') {
        window.seleccionarUbicacionMapa();
    } else {
        mostrarToast('📍 Haz clic en el mapa para seleccionar ubicación', 'info');
        if (!mapa) return;
        const clickHandler = function(e) {
            const { lat, lng } = e.latlng;
            const input = document.getElementById('reporte-ubicacion');
            if (input) input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            mostrarToast('✅ Ubicación seleccionada', 'success');
            mapa.off('click', clickHandler);
        };
        mapa.on('click', clickHandler);
    }
}

// =====================================================
// TABS
// =====================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        const content = document.getElementById(`tab-${tab}`);
        if (content) content.classList.add('active');
        
        // Cargar datos al cambiar de tab
        if (tab === 'incidentes' && typeof window.cargarIncidentes === 'function') window.cargarIncidentes();
        if (tab === 'albergues' && typeof window.cargarAlbergues === 'function') window.cargarAlbergues();
        if (tab === 'riesgos' && typeof window.cargarRiesgos === 'function') window.cargarRiesgos();
        if (tab === 'municipios' && typeof window.cargarMunicipiosAdmin === 'function') window.cargarMunicipiosAdmin();
        if (tab === 'usuarios' && typeof window.cargarUsuarios === 'function') window.cargarUsuarios();
    });
});

// =====================================================
// LOGOUT E INICIO
// =====================================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

async function initDashboard() {
    console.log('🚀 Iniciando Dashboard...');
    
    if (typeof verificarSesion === 'function') {
        if (!verificarSesion()) { window.location.href = '/login.html'; return; }
    } else {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (!token || !user) { window.location.href = '/login.html'; return; }
    }
    
    const user = obtenerUsuario();
    if (!user) { window.location.href = '/login.html'; return; }
    
    initMapaDashboard();
    
    if (typeof window.cargarIncidentes === 'function') await window.cargarIncidentes();
    if (typeof window.cargarAlbergues === 'function') await window.cargarAlbergues();
    if (typeof window.cargarRiesgos === 'function') await window.cargarRiesgos();
    
    console.log('✅ Dashboard iniciado correctamente');
    
    setInterval(() => {
        if (typeof window.cargarIncidentes === 'function') window.cargarIncidentes();
        if (typeof window.cargarAlbergues === 'function') window.cargarAlbergues();
        if (typeof window.cargarRiesgos === 'function') window.cargarRiesgos();
    }, 30000);
}

// =====================================================
// EXPORTAR GLOBALES
// =====================================================
window.logout = logout;
window.resetMapa = resetMapa;
window.centrarUbicacion = centrarUbicacion;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.activarDibujoPoligono = activarDibujoPoligono;
window.abrirFormularioMunicipio = abrirFormularioMunicipio;
window.abrirFormularioUsuario = abrirFormularioUsuario;
window.abrirFormularioAlbergue = abrirFormularioAlbergue;
window.seleccionarUbicacionMapa = seleccionarUbicacionMapa;
window.cerrarModal = cerrarModal;
window.mostrarToast = mostrarToast;
window.crearIconoEmoji = crearIconoEmoji;
window.getNivelColor = getNivelColor;

document.addEventListener('DOMContentLoaded', initDashboard);
// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS (SOLO ORQUESTADOR)
// =====================================================

let mapa = null;
let userData = null;
let drawingControl = null;
let dibujando = false;

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
        
        if (!drawingControl) {
            drawingControl = new L.Control.Draw({
                draw: {
                    polygon: { allowIntersection: false, showArea: true },
                    rectangle: true,
                    circle: false,
                    polyline: false,
                    marker: false
                },
                edit: { featureGroup: null }
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
function activarDibujoPoligono() {
    if (typeof window.activarDibujoPoligono === 'function') {
        window.activarDibujoPoligono();
    } else {
        mostrarToast('⚠️ Módulo de zonas no disponible', 'warning');
    }
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
            document.getElementById('reporte-ubicacion').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
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
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        if (tab === 'incidentes' && typeof cargarIncidentes === 'function') cargarIncidentes();
        if (tab === 'albergues' && typeof cargarAlbergues === 'function') cargarAlbergues();
        if (tab === 'riesgos' && typeof cargarRiesgos === 'function') cargarRiesgos();
        if (tab === 'municipios' && typeof cargarMunicipiosAdmin === 'function') cargarMunicipiosAdmin();
        if (tab === 'usuarios' && typeof cargarUsuarios === 'function') cargarUsuarios();
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
    
    if (typeof cargarIncidentes === 'function') await cargarIncidentes();
    if (typeof cargarAlbergues === 'function') await cargarAlbergues();
    if (typeof cargarRiesgos === 'function') await cargarRiesgos();
    
    console.log('✅ Dashboard iniciado correctamente');
    
    setInterval(() => {
        if (typeof cargarIncidentes === 'function') cargarIncidentes();
        if (typeof cargarAlbergues === 'function') cargarAlbergues();
        if (typeof cargarRiesgos === 'function') cargarRiesgos();
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

document.addEventListener('DOMContentLoaded', initDashboard);
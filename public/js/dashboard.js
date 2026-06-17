// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS (VERSIÓN ESTABLE)
// =====================================================

let mapa = null;
let userData = null;
let drawnItems = null;  // ← En lugar de featureGroup
let drawControl = null; // ← En lugar de drawingControl
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
// INICIALIZAR MAPA (CON LEAFLET-DRAW)
// =====================================================
function initMapaDashboard() {
    try {
        console.log('🗺️ Creando mapa...');
        if (mapa) { mapa.remove(); mapa = null; }
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const slug = user.municipio?.slug || 'las-choapas';
        const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
        
        // Crear mapa
        mapa = L.map('mapa-dashboard').setView([centro.lat, centro.lng], centro.zoom || 13);
        
        // Capa base
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            attribution: 'Map data &copy; Google',
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(mapa);
        
        // =============================================
        // CONFIGURACIÓN CORRECTA DE LEAFLET-DRAW
        // =============================================
        
        // 1. Crear capa para los dibujos
        drawnItems = L.featureGroup().addTo(mapa);
        
        // 2. Crear control de dibujo
        drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: {
                        color: '#dc2626',
                        fillColor: '#dc2626',
                        fillOpacity: 0.3
                    }
                },
                rectangle: {
                    shapeOptions: {
                        color: '#3b82f6',
                        fillColor: '#3b82f6',
                        fillOpacity: 0.3
                    }
                },
                circle: false,
                polyline: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });
        
        // 3. Agregar control al mapa
        mapa.addControl(drawControl);
        
        // 4. Evento cuando se crea un dibujo
        mapa.on(L.Draw.Event.CREATED, function(event) {
            const layer = event.layer;
            const type = event.layerType;
            
            // Agregar a la capa de dibujos
            drawnItems.addLayer(layer);
            
            // Obtener coordenadas del polígono
            if (type === 'polygon' || type === 'rectangle') {
                const latlngs = layer.getLatLngs()[0];
                const coords = latlngs.map(c => [c.lng, c.lat]);
                const geojson = {
                    type: 'Polygon',
                    coordinates: [coords]
                };
                
                // Mostrar formulario
                mostrarFormularioZona(geojson, layer);
            }
        });
        
        // 5. Evento cuando se elimina un dibujo
        mapa.on(L.Draw.Event.DELETED, function(event) {
            console.log('🗑️ Dibujo eliminado');
        });
        
        // 6. Evento cuando se edita un dibujo
        mapa.on(L.Draw.Event.EDITED, function(event) {
            console.log('✏️ Dibujo editado');
        });
        
        // Ajustar tamaño del mapa
        setTimeout(() => mapa.invalidateSize(), 500);
        
        console.log('✅ Mapa inicializado con Leaflet Draw');
        window.mapa = mapa;
        window.drawnItems = drawnItems;
        window.drawControl = drawControl;
        
    } catch (error) {
        console.error('❌ Error al crear mapa:', error);
        mostrarToast('❌ Error al inicializar el mapa', 'error');
    }
}

// =====================================================
// ACTIVAR DIBUJO DE POLÍGONO (SIMPLIFICADO)
// =====================================================
function activarDibujoPoligono() {
    console.log('🖊️ Botón Dibujar presionado');
    
    if (!mapa) {
        mostrarToast('⚠️ El mapa no está cargado', 'warning');
        return;
    }
    
    if (!drawControl) {
        mostrarToast('⚠️ Herramienta de dibujo no disponible', 'warning');
        return;
    }
    
    if (dibujando) {
        mostrarToast('⚠️ Ya estás dibujando', 'warning');
        return;
    }
    
    // =============================================
    // FORMA CORRECTA DE ACTIVAR DIBUJO EN LEAFLET-DRAW v1.x
    // =============================================
    
    // 1. Activar el modo polígono
    drawControl.setDrawingMode('polygon');
    dibujando = true;
    
    mostrarToast('✏️ Dibuja un polígono en el mapa', 'info');
    
    // 2. Cuando se complete el dibujo (ya está manejado en initMapaDashboard)
    // 3. Cuando se cancele
    mapa.once(L.Draw.Event.DRAWSTOP, function() {
        dibujando = false;
        mostrarToast('⏹️ Dibujo cancelado', 'info');
    });
}

// =====================================================
// MOSTRAR FORMULARIO PARA ZONA DE RIESGO
// =====================================================
function mostrarFormularioZona(geojson, layer) {
    if (!modalOverlay) {
        console.error('❌ Modal no encontrado');
        return;
    }
    
    console.log('📝 Mostrando formulario para zona de riesgo');
    
    modalTitulo.textContent = '⚠️ Nueva Zona de Riesgo';
    modalBody.innerHTML = `
        <form id="form-zona" class="form-reporte">
            <div class="form-group">
                <label>Nombre de la zona *</label>
                <input type="text" id="z-nombre" placeholder="Ej: Barrio La Esperanza" required>
            </div>
            <div class="form-group">
                <label>Tipo de riesgo</label>
                <select id="z-tipo">
                    <option value="inundacion">🌊 Inundación</option>
                    <option value="deslizamiento">⛰️ Deslizamiento</option>
                    <option value="incendio">🔥 Incendio</option>
                    <option value="sismo">🌍 Sismo</option>
                    <option value="vendaval">💨 Vendaval</option>
                    <option value="otro">⚠️ Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nivel de riesgo</label>
                <select id="z-nivel">
                    <option value="critico">🔴 Crítico</option>
                    <option value="alto">🟠 Alto</option>
                    <option value="medio" selected>🟡 Medio</option>
                    <option value="bajo">🟢 Bajo</option>
                </select>
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="z-descripcion" rows="2" placeholder="Descripción de la zona"></textarea>
            </div>
            <div class="form-group">
                <label>Población afectada (opcional)</label>
                <input type="number" id="z-poblacion" placeholder="0" min="0">
            </div>
            <div class="form-group">
                <label>Viviendas afectadas (opcional)</label>
                <input type="number" id="z-viviendas" placeholder="0" min="0">
            </div>
            <button type="submit" class="btn-enviar">💾 Guardar Zona</button>
        </form>
    `;
    
    modalOverlay.style.display = 'flex';
    
    document.getElementById('form-zona').addEventListener('submit', async function(e) {
        e.preventDefault();
        await guardarZona(geojson, layer);
    });
}

// =====================================================
// GUARDAR ZONA DE RIESGO
// =====================================================
async function guardarZona(geojson, layer) {
    const nombre = document.getElementById('z-nombre').value.trim();
    const tipo = document.getElementById('z-tipo').value;
    const nivel = document.getElementById('z-nivel').value;
    const descripcion = document.getElementById('z-descripcion').value.trim();
    const poblacion = parseInt(document.getElementById('z-poblacion').value) || 0;
    const viviendas = parseInt(document.getElementById('z-viviendas').value) || 0;
    
    if (!nombre) {
        mostrarToast('⚠️ El nombre es requerido', 'warning');
        return;
    }
    
    try {
        const res = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre,
                tipo,
                nivel,
                descripcion,
                coordenadas_poligono: JSON.stringify(geojson),
                poblacion_afectada: poblacion,
                viviendas_afectadas: viviendas
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Zona de riesgo guardada', 'success');
            cerrarModal();
            // Limpiar el dibujo del mapa
            if (drawnItems && layer) {
                drawnItems.removeLayer(layer);
            }
            // Recargar zonas
            if (typeof window.cargarRiesgos === 'function') {
                window.cargarRiesgos();
            }
        } else {
            mostrarToast(`❌ ${data.error || 'Error al guardar'}`, 'error');
            if (layer && drawnItems) {
                drawnItems.removeLayer(layer);
            }
        }
    } catch (error) {
        console.error('Error guardando zona:', error);
        mostrarToast('❌ Error de conexión', 'error');
        if (layer && drawnItems) {
            drawnItems.removeLayer(layer);
        }
    }
    
    dibujando = false;
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
        
        if (tab === 'incidentes' && typeof window.cargarIncidentes === 'function') window.cargarIncidentes();
        if (tab === 'albergues' && typeof window.cargarAlbergues === 'function') window.cargarAlbergues();
        if (tab === 'riesgos' && typeof window.cargarRiesgos === 'function') window.cargarRiesgos();
        if (tab === 'municipios' && typeof window.cargarMunicipiosAdmin === 'function') window.cargarMunicipiosAdmin();
        if (tab === 'usuarios' && typeof window.cargarUsuarios === 'function') window.cargarUsuarios();
    });
});

// =====================================================
// LOGOUT
// =====================================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// =====================================================
// INICIALIZAR DASHBOARD
// =====================================================
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
window.mostrarFormularioZona = mostrarFormularioZona;

document.addEventListener('DOMContentLoaded', initDashboard);
// =====================================================
// DASHBOARD - LÓGICA COMPLETA (LEAFLET)
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
let drawingControl = null;

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
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalTitulo = document.getElementById('modal-titulo');
const toastContainer = document.getElementById('toast-container');

// =====================================================
// CONFIGURACIÓN DEL MAPA
// =====================================================
const CENTRO = [17.9117, -94.0958];
const GOOGLE_TILES = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

// =====================================================
// FUNCIONES DE ICONOS (Emojis)
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
    else if (t.includes('gas')) { emoji = '⛽'; color = '#FF6D00'; tamaño = 40; }
    else if (t.includes('sismo')) { emoji = '🌍'; color = '#9C27B0'; tamaño = 38; }
    
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
// INICIALIZAR MAPA
// =====================================================
function initMapa() {
    if (mapa) { mapa.remove(); mapa = null; }
    
    mapa = L.map('mapa-dashboard').setView(CENTRO, 13);
    
    L.tileLayer(GOOGLE_TILES, {
        attribution: 'Map data &copy; Google',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapa);
    
    // Herramienta de dibujo
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
    
    mapa.on('draw:created', function(e) {
        const layer = e.layer;
        const coords = layer.getLatLngs()[0];
        const geojson = {
            type: 'Polygon',
            coordinates: [coords.map(c => [c.lng, c.lat])]
        };
        guardarZonaRiesgo(geojson, layer);
    });
    
    marcadores = [];
    marcadoresAlbergues = [];
    poligonosRiesgo = [];
}

// =====================================================
// GUARDAR ZONA DE RIESGO DESDE DIBUJO
// =====================================================
async function guardarZonaRiesgo(geojson, layer) {
    const nombre = prompt('Nombre de la zona de riesgo:');
    if (!nombre) { mapa.removeLayer(layer); return; }
    
    const tipo = prompt('Tipo (inundacion, deslizamiento, incendio, sismo, vendaval, otoro):') || 'otro';
    const nivel = prompt('Nivel (critico, alto, medio, bajo):') || 'medio';
    
    try {
        const res = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({ nombre, tipo, nivel, coordenadas_poligono: JSON.stringify(geojson) })
        });
        
        if (res.ok) {
            mostrarToast('✅ Zona de riesgo guardada', 'success');
            await cargarRiesgos();
        } else {
            mostrarToast('❌ Error al guardar', 'error');
            mapa.removeLayer(layer);
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
        mapa.removeLayer(layer);
    }
}

// =====================================================
// FUNCIONES DE TOAST
// =====================================================
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
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
        const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
        const hoy = incidentesData.filter(i => new Date(i.fecha_reporte).toDateString() === new Date().toDateString()).length;
        
        if (statsActivos) statsActivos.textContent = activos;
        if (statsProceso) statsProceso.textContent = enProceso;
        if (statsResueltos) statsResueltos.textContent = resueltos;
        if (statsHoy) statsHoy.textContent = hoy;
        
        actualizarListaIncidentes();
        actualizarMapaIncidentes();
        
    } catch (error) {
        console.error('Error cargando incidentes:', error);
    }
}

function actualizarListaIncidentes() {
    if (!listaIncidentes) return;
    
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'todos';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    
    let filtrados = incidentesData;
    if (filtroEstado !== 'todos') filtrados = filtrados.filter(i => i.estado === filtroEstado);
    if (filtroTipo !== 'todos') filtrados = filtrados.filter(i => i.tipo === filtroTipo);
    
    if (filtrados.length === 0) {
        listaIncidentes.innerHTML = '<div class="loading-spinner">No hay incidentes</div>';
        return;
    }
    
    listaIncidentes.innerHTML = filtrados.map(inc => `
        <div class="incidente-card prioridad-${inc.prioridad}" onclick="centrarEnIncidente(${inc.latitud}, ${inc.longitud})">
            <div class="incidente-tipo">
                <span>${getEmojiPorTipo(inc.tipo, inc.prioridad).emoji} ${inc.tipo.toUpperCase()}</span>
                <span class="estado-badge estado-${inc.estado}">${getEstadoTexto(inc.estado)}</span>
            </div>
            <div class="incidente-desc">${inc.descripcion?.substring(0, 80)}${inc.descripcion?.length > 80 ? '...' : ''}</div>
            <div class="incidente-fecha">📅 ${formatFecha(inc.fecha_reporte)}</div>
        </div>
    `).join('');
}

function filtrarIncidentes() { actualizarListaIncidentes(); }

function actualizarMapaIncidentes() {
    if (!mapa) return;
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];
    
    incidentesData.forEach(inc => {
        const { emoji, color, tamaño } = getEmojiPorTipo(inc.tipo, inc.prioridad);
        const icono = crearIconoEmoji(emoji, color, tamaño, true);
        
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`
                <div style="min-width: 220px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e3a8a;">🚨 ${inc.tipo.toUpperCase()}</h3>
                    <p><strong>Estado:</strong> ${getEstadoTexto(inc.estado)}</p>
                    <p><strong>Prioridad:</strong> ${inc.prioridad === 1 ? '🔴 Alta' : inc.prioridad === 2 ? '🟠 Media' : '🟢 Baja'}</p>
                    <p>${inc.descripcion || 'Sin descripción'}</p>
                    <p><small>${formatFecha(inc.fecha_reporte)}</small></p>
                    ${inc.es_nuevo === 'nuevo' ? '<p style="color:#dc2626;font-weight:bold;">‼️ NUEVO</p>' : ''}
                    <div style="margin-top:8px;">
                        <button onclick="cambiarEstado(${inc.id},'en_proceso')" style="background:#f59e0b;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin:2px;">🔄 En proceso</button>
                        <button onclick="cambiarEstado(${inc.id},'resuelto')" style="background:#10b981;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin:2px;">✅ Resuelto</button>
                    </div>
                </div>
            `);
        
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
        listaAlbergues.innerHTML = '<div class="loading-spinner">No hay albergues registrados</div>';
        return;
    }
    
    listaAlbergues.innerHTML = alberguesData.map(a => `
        <div class="albergue-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>🏠 ${a.nombre}</strong>
                <span style="font-size:0.75rem;color:${a.capacidad_total > 0 && (a.ocupacion_actual/a.capacidad_total) > 0.8 ? '#dc2626' : '#10b981'};">
                    ${a.ocupacion_actual}/${a.capacidad_total}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#475569;">📍 ${a.direccion || 'Sin dirección'}</div>
            <div style="font-size:0.75rem;color:#94a3b8;">👤 ${a.encargado_nombre || 'Sin encargado'} | 📞 ${a.encargado_telefono || 'N/A'}</div>
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
            .bindPopup(`
                <div style="min-width:200px;">
                    <h3 style="margin:0 0 8px 0;color:#1e3a8a;">🏠 ${a.nombre}</h3>
                    <p><strong>Capacidad:</strong> ${a.ocupacion_actual}/${a.capacidad_total}</p>
                    <p><strong>Encargado:</strong> ${a.encargado_nombre || 'No registrado'}</p>
                    <p><strong>Teléfono:</strong> ${a.encargado_telefono || 'N/A'}</p>
                    <p><strong>Servicios:</strong> ${a.servicios?.join(', ') || 'No especificados'}</p>
                </div>
            `);
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
        actualizarListaRiesgos();
        actualizarMapaRiesgos();
        
    } catch (error) {
        console.error('Error cargando riesgos:', error);
    }
}

function actualizarListaRiesgos() {
    if (!listaRiesgos) return;
    
    if (riesgosData.length === 0) {
        listaRiesgos.innerHTML = '<div class="loading-spinner">No hay zonas de riesgo</div>';
        return;
    }
    
    listaRiesgos.innerHTML = riesgosData.map(r => `
        <div class="riesgo-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>⚠️ ${r.nombre}</strong>
                <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${r.nivel === 'critico' ? '#dc2626' : r.nivel === 'alto' ? '#f59e0b' : '#10b981'};color:white;">
                    ${r.nivel?.toUpperCase() || 'MEDIO'}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#475569;">${r.tipo || 'Sin tipo'} | ${r.descripcion || ''}</div>
        </div>
    `).join('');
}

function actualizarMapaRiesgos() {
    if (!mapa) return;
    poligonosRiesgo.forEach(p => mapa.removeLayer(p));
    poligonosRiesgo = [];
    
    riesgosData.forEach(r => {
        try {
            const geo = JSON.parse(r.coordenadas_poligono);
            const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
            
            let color = '#f59e0b';
            if (r.nivel === 'critico') color = '#dc2626';
            else if (r.nivel === 'alto') color = '#f59e0b';
            else if (r.nivel === 'medio') color = '#3b82f6';
            else color = '#10b981';
            
            const polygon = L.polygon(coords, {
                color: color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.3
            }).addTo(mapa)
              .bindPopup(`<b>⚠️ ${r.nombre}</b><br>${r.tipo || 'Riesgo'}<br>Nivel: ${r.nivel || 'No especificado'}`);
            
            poligonosRiesgo.push(polygon);
        } catch(e) {
            console.error('Error parseando polígono:', e);
        }
    });
}

// =====================================================
// CENTRAR EN INCIDENTE
// =====================================================
function centrarEnIncidente(lat, lng) {
    if (mapa) mapa.setView([lat, lng], 16);
}

// =====================================================
// CAMBIAR ESTADO
// =====================================================
async function cambiarEstado(id, nuevoEstado) {
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/incidentes/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData.municipio.slug
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (res.ok) {
            mostrarToast('✅ Estado actualizado', 'success');
            await cargarIncidentes();
        }
    } catch (error) {
        mostrarToast('❌ Error al actualizar', 'error');
    }
}

// =====================================================
// CONTROL DE MAPA
// =====================================================
function centrarUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            mapa.setView([pos.coords.latitude, pos.coords.longitude], 16);
            const icono = crearIconoEmoji('📍', '#2196F3', 32, true);
            L.marker([pos.coords.latitude, pos.coords.longitude], { icon: icono })
                .bindPopup('📍 Tu ubicación')
                .addTo(mapa);
        });
    }
}

function zoomIn() { mapa?.zoomIn(); }
function zoomOut() { mapa?.zoomOut(); }
function resetMapa() { mapa?.setView(CENTRO, 13); }

function activarDibujoPoligono() {
    if (drawingControl) {
        drawingControl.setDrawingMode('polygon');
        mostrarToast('✏️ Dibuja un polígono en el mapa', 'info');
    }
}

function seleccionarUbicacionMapa() {
    mostrarToast('📍 Haz clic en el mapa para seleccionar ubicación', 'info');
    mapa.once('click', function(e) {
        const { lat, lng } = e.latlng;
        selectedUbicacion = { lat, lng };
        document.getElementById('reporte-ubicacion').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        mostrarToast('✅ Ubicación seleccionada', 'success');
    });
}

// =====================================================
// TABS
// =====================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');
    });
});

// =====================================================
// FORMULARIO DE REPORTE
// =====================================================
document.getElementById('form-reporte')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tipo = document.getElementById('reporte-tipo').value;
    const descripcion = document.getElementById('reporte-descripcion').value;
    const ubicacion = document.getElementById('reporte-ubicacion').value;
    
    if (!tipo || !descripcion || !selectedUbicacion) {
        mostrarToast('⚠️ Completa todos los campos y selecciona ubicación', 'warning');
        return;
    }
    
    try {
        const res = await fetch('/api/incidentes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                latitud: selectedUbicacion.lat,
                longitud: selectedUbicacion.lng,
                tipo,
                descripcion,
                ciudadano_nombre: document.getElementById('reporte-nombre').value || 'Anónimo'
            })
        });
        
        if (res.ok) {
            mostrarToast('✅ Reporte enviado', 'success');
            this.reset();
            selectedUbicacion = null;
            document.getElementById('reporte-ubicacion').value = '';
            await cargarIncidentes();
        }
    } catch (error) {
        mostrarToast('❌ Error al enviar', 'error');
    }
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
// INICIALIZAR
// =====================================================
async function initDashboard() {
    if (!verificarSesion()) return;
    const user = obtenerUsuario();
    if (!user) return;
    
    initMapa();
    await cargarIncidentes();
    await cargarAlbergues();
    await cargarRiesgos();
    
    setInterval(() => {
        cargarIncidentes();
        cargarAlbergues();
        cargarRiesgos();
    }, 30000);
}

document.addEventListener('DOMContentLoaded', initDashboard);

// Funciones globales
window.logout = logout;
window.centrarEnIncidente = centrarEnIncidente;
window.cambiarEstado = cambiarEstado;
window.centrarUbicacion = centrarUbicacion;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetMapa = resetMapa;
window.activarDibujoPoligono = activarDibujoPoligono;
window.seleccionarUbicacionMapa = seleccionarUbicacionMapa;
window.filtrarIncidentes = filtrarIncidentes;
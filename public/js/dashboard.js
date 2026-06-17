// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS (COMPLETO)
// =====================================================

// =====================================================
// VARIABLES GLOBALES
// =====================================================
let mapa = null;
let userData = null;
let drawingControl = null;
let dibujando = false;

let incidentesData = [];
let alberguesData = [];
let riesgosData = [];
let municipiosData = [];
let usuariosData = [];

let marcadoresIncidentes = [];
let marcadoresAlbergues = [];
let poligonosRiesgo = [];

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
// NOTA: DEFAULT_CENTER y CENTROS_MUNICIPIOS ya están en config.js
// =====================================================

// =====================================================
// FUNCIONES DE UTILERÍA
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

function getEstadoTexto(estado) {
    const estados = { pendiente: 'Pendiente', en_proceso: 'En proceso', en_revision: 'En revisión', resuelto: 'Resuelto', cancelado: 'Cancelado' };
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

function getNivelColor(nivel) {
    const colores = { 'critico': '#dc2626', 'alto': '#f97316', 'medio': '#f59e0b', 'bajo': '#10b981' };
    return colores[nivel] || '#6b7f9f';
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
// INICIALIZAR MAPA
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
// FUNCIONES DE MAPA (Botones flotantes)
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
        navigator.geolocation.getCurrentPosition(pos => {
            mapa.setView([pos.coords.latitude, pos.coords.longitude], 16);
            mostrarToast('📍 Tu ubicación', 'info');
        }, () => mostrarToast('⚠️ No se pudo obtener ubicación', 'warning'));
    } else {
        mostrarToast('⚠️ Geolocalización no soportada', 'warning');
    }
}

function zoomIn() { if (mapa) mapa.zoomIn(); }
function zoomOut() { if (mapa) mapa.zoomOut(); }

// =====================================================
// =====================================================
// 1. MÓDULO: INCIDENTES
// =====================================================
// =====================================================
async function cargarIncidentes() {
    console.log('📡 Cargando incidentes...');
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/incidentes/mapa`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        incidentesData = await res.json();
        console.log('📡 Incidentes recibidos:', incidentesData.length);
        
        const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
        const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
        const hoy = incidentesData.filter(i => new Date(i.fecha_reporte).toDateString() === new Date().toDateString()).length;
        
        if (statsActivos) statsActivos.textContent = activos;
        if (statsProceso) statsProceso.textContent = enProceso;
        if (statsHoy) statsHoy.textContent = hoy;
        
        actualizarListaIncidentes();
        actualizarMapaIncidentes();
    } catch (error) {
        console.error('❌ Error cargando incidentes:', error);
        if (listaIncidentes) listaIncidentes.innerHTML = '<div class="error">❌ Error al cargar incidentes</div>';
    }
}

function filtrarIncidentes() { actualizarListaIncidentes(); }

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
    marcadoresIncidentes.forEach(m => mapa.removeLayer(m));
    marcadoresIncidentes = [];
    
    incidentesData.forEach(inc => {
        const { emoji, color, tamaño } = getEmojiPorTipo(inc.tipo, inc.prioridad);
        const icono = crearIconoEmoji(emoji, color, tamaño, true);
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`<b>🚨 ${inc.tipo.toUpperCase()}</b><br>${inc.descripcion || 'Sin descripción'}`);
        marcadoresIncidentes.push(marker);
    });
}

// =====================================================
// =====================================================
// 2. MÓDULO: ALBERGUES
// =====================================================
// =====================================================
async function cargarAlbergues() {
    console.log('📡 Cargando albergues...');
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/albergues/mapa`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        alberguesData = await res.json();
        console.log('📡 Albergues recibidos:', alberguesData.length);
        
        if (statsAlbergues) statsAlbergues.textContent = alberguesData.length;
        actualizarListaAlbergues();
        actualizarMapaAlbergues();
    } catch (error) {
        console.error('❌ Error cargando albergues:', error);
        if (listaAlbergues) listaAlbergues.innerHTML = '<div class="error">❌ Error al cargar albergues</div>';
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
            <div style="font-size:0.8rem;color:#8a9bb5;">📍 ${a.direccion || 'Sin dirección'}</div>
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

function abrirFormularioAlbergue() {
    mostrarToast('📝 Formulario de albergue en desarrollo', 'info');
}

// =====================================================
// =====================================================
// 3. MÓDULO: ZONAS DE RIESGO
// =====================================================
// =====================================================
async function cargarRiesgos() {
    console.log('📡 Cargando zonas de riesgo...');
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: {
                'X-Municipio-Slug': userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        riesgosData = await res.json();
        console.log('📡 Zonas recibidas:', riesgosData.length);
        
        if (statsRiesgos) statsRiesgos.textContent = riesgosData.length;
        actualizarListaRiesgos();
        actualizarMapaRiesgos();
    } catch (error) {
        console.error('❌ Error cargando zonas:', error);
        if (listaRiesgos) listaRiesgos.innerHTML = '<div class="error">❌ Error al cargar zonas</div>';
    }
}

function actualizarListaRiesgos() {
    if (!listaRiesgos) return;
    if (riesgosData.length === 0) {
        listaRiesgos.innerHTML = `<div class="loading-spinner">No hay zonas de riesgo</div>
            <div style="text-align:center;margin-top:20px;">
                <p style="color:#6b7f9f;font-size:0.9rem;">Haz clic en "✏️ Dibujar" para crear una zona</p>
            </div>`;
        return;
    }
    listaRiesgos.innerHTML = riesgosData.map(r => `
        <div class="riesgo-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>⚠️ ${r.nombre}</strong>
                <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${getNivelColor(r.nivel)};color:white;">
                    ${r.nivel?.toUpperCase() || 'MEDIO'}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;">${r.tipo || 'Sin tipo'}</div>
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
            else if (r.nivel === 'alto') color = '#f97316';
            else if (r.nivel === 'medio') color = '#f59e0b';
            else color = '#10b981';
            
            const polygon = L.polygon(coords, {
                color: color, weight: 3, fillColor: color, fillOpacity: 0.3
            }).addTo(mapa)
              .bindPopup(`<b>⚠️ ${r.nombre}</b><br>Nivel: ${r.nivel?.toUpperCase() || 'MEDIO'}`);
            poligonosRiesgo.push(polygon);
        } catch(e) { console.error('Error parseando polígono:', e); }
    });
}

function activarDibujoPoligono() {
    console.log('🖊️ Botón Dibujar presionado');
    if (!mapa) { mostrarToast('⚠️ El mapa no está cargado', 'warning'); return; }
    if (dibujando) { mostrarToast('⚠️ Ya estás dibujando', 'warning'); return; }
    
    dibujando = true;
    mostrarToast('✏️ Dibuja un polígono en el mapa', 'info');
    if (drawingControl) drawingControl.setDrawingMode('polygon');
    
    mapa.once('draw:created', function(e) {
        const layer = e.layer;
        const coords = layer.getLatLngs()[0];
        const geojson = { type: 'Polygon', coordinates: [coords.map(c => [c.lng, c.lat])] };
        dibujando = false;
        mostrarFormularioZona(geojson, layer);
    });
    mapa.once('draw:drawstop', function() {
        dibujando = false;
        mostrarToast('⏹️ Dibujo cancelado', 'info');
    });
}

function mostrarFormularioZona(geojson, layer) {
    if (!modalOverlay) return;
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
                <label>Población afectada</label>
                <input type="number" id="z-poblacion" placeholder="0" min="0">
            </div>
            <div class="form-group">
                <label>Viviendas afectadas</label>
                <input type="number" id="z-viviendas" placeholder="0" min="0">
            </div>
            <button type="submit" class="btn-enviar">💾 Guardar Zona</button>
        </form>
    `;
    modalOverlay.style.display = 'flex';
    document.getElementById('form-zona').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarZona(geojson, layer);
    });
}

async function guardarZona(geojson, layer) {
    const nombre = document.getElementById('z-nombre').value.trim();
    const tipo = document.getElementById('z-tipo').value;
    const nivel = document.getElementById('z-nivel').value;
    const descripcion = document.getElementById('z-descripcion').value.trim();
    const poblacion = parseInt(document.getElementById('z-poblacion').value) || 0;
    const viviendas = parseInt(document.getElementById('z-viviendas').value) || 0;
    
    if (!nombre) { mostrarToast('⚠️ El nombre es requerido', 'warning'); return; }
    
    try {
        const res = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre, tipo, nivel, descripcion,
                coordenadas_poligono: JSON.stringify(geojson),
                poblacion_afectada: poblacion,
                viviendas_afectadas: viviendas
            })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarToast('✅ Zona guardada', 'success');
            cerrarModal();
            await cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error'}`, 'error');
            if (layer) mapa.removeLayer(layer);
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
        if (layer) mapa.removeLayer(layer);
    }
}

// =====================================================
// =====================================================
// 4. MÓDULO: MUNICIPIOS
// =====================================================
// =====================================================
async function cargarMunicipiosAdmin() {
    console.log('📡 Cargando municipios...');
    try {
        const res = await fetch('/api/municipios', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        municipiosData = await res.json();
        console.log('📡 Municipios recibidos:', municipiosData.length);
        actualizarListaMunicipios();
    } catch (error) {
        console.error('❌ Error cargando municipios:', error);
        if (listaMunicipios) listaMunicipios.innerHTML = '<div class="error">❌ Error al cargar municipios</div>';
    }
}

function actualizarListaMunicipios() {
    if (!listaMunicipios) return;
    if (municipiosData.length === 0) {
        listaMunicipios.innerHTML = '<div class="loading-spinner">No hay municipios</div>';
        return;
    }
    listaMunicipios.innerHTML = municipiosData.map(m => `
        <div class="municipio-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>🏛️ ${m.nombre}</strong>
                <span style="font-size:0.7rem;color:#6b7f9f;">${m.slug}</span>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;">${m.departamento || 'Sin departamento'}</div>
        </div>
    `).join('');
}

function abrirFormularioMunicipio() {
    mostrarToast('📝 Formulario de municipio en desarrollo', 'info');
}

// =====================================================
// =====================================================
// 5. MÓDULO: USUARIOS
// =====================================================
// =====================================================
async function cargarUsuarios() {
    console.log('📡 Cargando usuarios...');
    try {
        const res = await fetch('/api/usuarios', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        usuariosData = await res.json();
        console.log('📡 Usuarios recibidos:', usuariosData.length);
        actualizarListaUsuarios();
    } catch (error) {
        console.error('❌ Error cargando usuarios:', error);
        if (listaUsuarios) listaUsuarios.innerHTML = '<div class="error">❌ Error al cargar usuarios</div>';
    }
}

function actualizarListaUsuarios() {
    if (!listaUsuarios) return;
    if (usuariosData.length === 0) {
        listaUsuarios.innerHTML = '<div class="loading-spinner">No hay usuarios</div>';
        return;
    }
    listaUsuarios.innerHTML = usuariosData.map(u => `
        <div class="usuario-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>👤 ${u.nombre_completo || u.email}</strong>
                <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${u.rol === 'admin_municipal' ? '#dc2626' : '#3b82f6'};color:white;">
                    ${u.rol === 'admin_municipal' ? 'Admin' : u.rol}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;">${u.email}</div>
        </div>
    `).join('');
}

function abrirFormularioUsuario() {
    mostrarToast('📝 Formulario de usuario en desarrollo', 'info');
}

// =====================================================
// =====================================================
// 6. MÓDULO: REPORTAR
// =====================================================
// =====================================================
function seleccionarUbicacionMapa() {
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

document.getElementById('form-reporte')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const tipo = document.getElementById('reporte-tipo').value;
    const descripcion = document.getElementById('reporte-descripcion').value;
    const ubicacion = document.getElementById('reporte-ubicacion').value;
    
    if (!tipo || !descripcion || !ubicacion) {
        mostrarToast('⚠️ Completa todos los campos', 'warning');
        return;
    }
    
    const coords = ubicacion.split(',').map(s => parseFloat(s.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        mostrarToast('⚠️ Ubicación inválida', 'warning');
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
                latitud: coords[0],
                longitud: coords[1],
                tipo,
                descripcion,
                ciudadano_nombre: document.getElementById('reporte-nombre').value || 'Anónimo'
            })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarToast('✅ Reporte enviado', 'success');
            this.reset();
            document.getElementById('reporte-ubicacion').value = '';
            await cargarIncidentes();
        } else {
            mostrarToast(`❌ ${data.error || 'Error'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
});

// =====================================================
// =====================================================
// FUNCIONES DE TABS
// =====================================================
// =====================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        // Cargar datos al cambiar de tab
        if (tab === 'incidentes') cargarIncidentes();
        if (tab === 'albergues') cargarAlbergues();
        if (tab === 'riesgos') cargarRiesgos();
        if (tab === 'municipios') cargarMunicipiosAdmin();
        if (tab === 'usuarios') cargarUsuarios();
    });
});

// =====================================================
// =====================================================
// LOGOUT E INICIO
// =====================================================
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
    await cargarIncidentes();
    await cargarAlbergues();
    await cargarRiesgos();
    
    console.log('✅ Dashboard iniciado correctamente');
    
    setInterval(() => {
        cargarIncidentes();
        cargarAlbergues();
        cargarRiesgos();
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
window.filtrarIncidentes = filtrarIncidentes;
window.activarDibujoPoligono = activarDibujoPoligono;
window.abrirFormularioAlbergue = abrirFormularioAlbergue;
window.abrirFormularioMunicipio = abrirFormularioMunicipio;
window.abrirFormularioUsuario = abrirFormularioUsuario;
window.seleccionarUbicacionMapa = seleccionarUbicacionMapa;
window.cerrarModal = cerrarModal;
window.mostrarToast = mostrarToast;

// =====================================================
// INICIALIZAR
// =====================================================
document.addEventListener('DOMContentLoaded', initDashboard);
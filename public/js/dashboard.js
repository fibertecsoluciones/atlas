// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS
// =====================================================

// Referencias DOM
const userNameSpan = document.getElementById('user-name');
const statsActivos = document.getElementById('stats-activos');
const statsProceso = document.getElementById('stats-proceso');
const statsResueltos = document.getElementById('stats-resueltos');
const statsAlbergues = document.getElementById('stats-albergues');
const listaIncidentes = document.getElementById('lista-incidentes');

// Estado
let mapa;
let marcadores = [];
let incidentesData = [];
let userData = null;

// =====================================================
// OBTENER USUARIO
// =====================================================
function obtenerUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        userData = JSON.parse(userStr);
        if (userNameSpan) {
            userNameSpan.innerText = userData.nombre || userData.email || 'Operador';
        }
        return userData;
    }
    return null;
}

// =====================================================
// INICIALIZAR MAPA
// =====================================================
function initMapaDashboard() {
    mapa = L.map('mapa').setView([17.9117, -94.0958], 13);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);
    
    return mapa;
}

// =====================================================
// CARGAR INCIDENTES
// =====================================================
async function cargarIncidentes() {
    if (!userData?.municipio?.slug) return;
    
    try {
        incidentesData = await api.obtenerIncidentes(userData.municipio.slug);
        
        // Actualizar estadísticas
        const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
        const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
        
        if (statsActivos) statsActivos.innerText = activos;
        if (statsProceso) statsProceso.innerText = enProceso;
        
        // Actualizar lista
        actualizarListaIncidentes();
        
        // Actualizar mapa
        actualizarMapaIncidentes();
        
    } catch (error) {
        console.error('Error cargando incidentes:', error);
    }
}

// =====================================================
// ACTUALIZAR LISTA DE INCIDENTES
// =====================================================
function actualizarListaIncidentes() {
    if (!listaIncidentes) return;
    
    if (incidentesData.length === 0) {
        listaIncidentes.innerHTML = '<p>No hay incidentes activos</p>';
        return;
    }
    
    listaIncidentes.innerHTML = incidentesData.map(inc => `
        <div class="incidente-card prioridad-${inc.prioridad}" onclick="centrarEnIncidente(${inc.latitud}, ${inc.longitud})">
            <div class="incidente-tipo">
                ${getIconoTipo(inc.tipo)} ${inc.tipo.toUpperCase()}
                <span class="estado-badge estado-${inc.estado}">${getEstadoTexto(inc.estado)}</span>
            </div>
            <div class="incidente-desc">${inc.descripcion?.substring(0, 80)}${inc.descripcion?.length > 80 ? '...' : ''}</div>
            <div class="incidente-fecha">📅 ${formatFecha(inc.fecha_reporte)}</div>
        </div>
    `).join('');
}

// =====================================================
// ACTUALIZAR MAPA CON MARCADORES
// =====================================================
function actualizarMapaIncidentes() {
    if (!mapa) return;
    
    // Limpiar marcadores existentes
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];
    
    incidentesData.forEach(inc => {
        let color = '#ef4444';
        if (inc.prioridad === 2) color = '#f59e0b';
        if (inc.prioridad === 3) color = '#10b981';
        
        const icono = L.divIcon({
            html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px black; text-align: center; line-height: 28px; color: white; font-weight: bold;">${inc.es_nuevo === 'nuevo' ? '‼️' : '!'}</div>`,
            className: 'marcador-incidente',
            iconSize: [28, 28]
        });
        
        const marcador = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`
                <b>${inc.tipo.toUpperCase()}</b><br>
                ${inc.descripcion || 'Sin descripción'}<br>
                <small>${formatFecha(inc.fecha_reporte)}</small><br>
                <button onclick="cambiarEstadoIncidente(${inc.id}, 'en_proceso')">🔄 Marcar en proceso</button>
                <button onclick="cambiarEstadoIncidente(${inc.id}, 'resuelto')">✅ Marcar resuelto</button>
            `);
        
        marcadores.push(marcador);
    });
}

// =====================================================
// CENTRAR MAPA EN INCIDENTE
// =====================================================
function centrarEnIncidente(lat, lng) {
    if (mapa) {
        mapa.setView([lat, lng], 16);
    }
}

// =====================================================
// CAMBIAR ESTADO DE INCIDENTE
// =====================================================
async function cambiarEstadoIncidente(id, nuevoEstado) {
    if (!userData?.municipio?.slug) return;
    
    try {
        const result = await api.actualizarEstadoIncidente(id, nuevoEstado, userData.municipio.slug);
        
        if (result.success) {
            await cargarIncidentes();
        } else {
            alert('Error al actualizar estado');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// =====================================================
// CARGAR ALBERGUES EN EL MAPA
// =====================================================
async function cargarAlbergues() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const albergues = await api.obtenerAlbergues(userData.municipio.slug);
        
        if (statsAlbergues) statsAlbergues.innerText = albergues.length;
        
        albergues.forEach(alb => {
            let color = '#10b981';
            if (alb.color_estado === 'rojo') color = '#ef4444';
            else if (alb.color_estado === 'naranja') color = '#f59e0b';
            else if (alb.color_estado === 'amarillo') color = '#eab308';
            
            const icono = L.divIcon({
                html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; color: white;">🏠</div>`,
                className: 'marcador-albergue'
            });
            
            L.marker([alb.latitud, alb.longitud], { icon: icono })
                .addTo(mapa)
                .bindPopup(`
                    <b>🏠 ${alb.nombre}</b><br>
                    Capacidad: ${alb.ocupacion_actual}/${alb.capacidad_total}<br>
                    Encargado: ${alb.encargado_nombre || 'No registrado'}<br>
                    Tel: ${alb.encargado_telefono || 'N/A'}
                `);
        });
        
    } catch (error) {
        console.error('Error cargando albergues:', error);
    }
}

// =====================================================
// FUNCIONES GLOBALES (para llamar desde el HTML)
// =====================================================
window.centrarEnIncidente = centrarEnIncidente;
window.cambiarEstadoIncidente = cambiarEstadoIncidente;
window.logout = logout;

// =====================================================
// INICIALIZAR DASHBOARD
// =====================================================
async function initDashboard() {
    // Verificar sesión
    if (!verificarSesion()) return;
    
    // Obtener usuario
    const user = obtenerUsuario();
    if (!user) return;
    
    // Inicializar mapa
    initMapaDashboard();
    
    // Cargar datos
    await cargarIncidentes();
    await cargarAlbergues();
    
    // Recargar cada 30 segundos
    setInterval(() => {
        cargarIncidentes();
        cargarAlbergues();
    }, 30000);
}

document.addEventListener('DOMContentLoaded', initDashboard);
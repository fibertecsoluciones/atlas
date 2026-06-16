// =====================================================
// DASHBOARD - SISTEMA ATLAS SAS (GOOGLE MAPS)
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
let infoWindow;
let marcadores = [];
let poligonos = [];
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
// INICIALIZAR MAPA (GOOGLE MAPS)
// =====================================================
function initMapaDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const slug = user.municipio?.slug || 'las-choapas';
    const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
    
    mapa = new google.maps.Map(document.getElementById('mapa-google'), {
        center: { lat: centro.lat, lng: centro.lng },
        zoom: centro.zoom || 13,
        mapTypeId: 'roadmap',
        streetViewControl: true,
        fullscreenControl: true
    });
    
    infoWindow = new google.maps.InfoWindow();
    marcadores = [];
    poligonos = [];
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
        const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
        
        if (statsActivos) statsActivos.innerText = activos;
        if (statsProceso) statsProceso.innerText = enProceso;
        if (statsResueltos) statsResueltos.innerText = resueltos;
        
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
// ACTUALIZAR MAPA CON MARCADORES (GOOGLE MAPS)
// =====================================================
function actualizarMapaIncidentes() {
    if (!mapa) return;
    
    // Limpiar marcadores existentes
    marcadores.forEach(m => m.setMap(null));
    marcadores = [];
    
    incidentesData.forEach(inc => {
        let color = '#ef4444';
        if (inc.prioridad === 2) color = '#f59e0b';
        if (inc.prioridad === 3) color = '#10b981';
        
        // Crear marcador de Google Maps
        const marker = new google.maps.Marker({
            position: { lat: inc.latitud, lng: inc.longitud },
            map: mapa,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 14
            },
            title: inc.tipo
        });
        
        // Contenido del popup
        const content = `
            <div style="padding: 10px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #1e3a8a;">🚨 ${inc.tipo.toUpperCase()}</h3>
                <p><strong>Estado:</strong> ${getEstadoTexto(inc.estado)}</p>
                <p><strong>Prioridad:</strong> ${inc.prioridad === 1 ? 'Alta' : inc.prioridad === 2 ? 'Media' : 'Baja'}</p>
                <p>${inc.descripcion || 'Sin descripción'}</p>
                <p><small>${formatFecha(inc.fecha_reporte)}</small></p>
                ${inc.es_nuevo === 'nuevo' ? '<p style="color: #dc2626; font-weight: bold;">‼️ NUEVO</p>' : ''}
                <div style="margin-top: 10px;">
                    <button onclick="cambiarEstadoIncidente(${inc.id}, 'en_proceso')" style="background: #f59e0b; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin: 3px;">🔄 En proceso</button>
                    <button onclick="cambiarEstadoIncidente(${inc.id}, 'resuelto')" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin: 3px;">✅ Resuelto</button>
                </div>
            </div>
        `;
        
        marker.addListener('click', () => {
            infoWindow.setContent(content);
            infoWindow.open(mapa, marker);
        });
        
        marcadores.push(marker);
    });
}

// =====================================================
// CENTRAR MAPA EN INCIDENTE
// =====================================================
function centrarEnIncidente(lat, lng) {
    if (mapa) {
        mapa.setCenter({ lat, lng });
        mapa.setZoom(16);
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
// CARGAR ALBERGUES EN EL MAPA (GOOGLE MAPS)
// =====================================================
async function cargarAlbergues() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const albergues = await api.obtenerAlbergues(userData.municipio.slug);
        
        if (statsAlbergues) statsAlbergues.innerText = albergues.length;
        
        albergues.forEach(alb => {
            // Crear marcador de Google Maps
            const marker = new google.maps.Marker({
                position: { lat: alb.latitud, lng: alb.longitud },
                map: mapa,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new google.maps.Size(32, 32)
                },
                title: alb.nombre
            });
            
            const ocupacion = alb.capacidad_total > 0 
                ? Math.round((alb.ocupacion_actual / alb.capacidad_total) * 100)
                : 0;
            
            let estadoColor = '';
            if (ocupacion >= 100) estadoColor = '🔴 LLENO';
            else if (ocupacion >= 80) estadoColor = '🟠 ALTO';
            else if (ocupacion >= 50) estadoColor = '🟡 MEDIO';
            else estadoColor = '🟢 DISPONIBLE';
            
            const content = `
                <div style="padding: 10px; max-width: 250px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e3a8a;">🏠 ${alb.nombre}</h3>
                    <p><strong>Capacidad:</strong> ${alb.ocupacion_actual}/${alb.capacidad_total}</p>
                    <p><strong>Ocupación:</strong> ${ocupacion}% ${estadoColor}</p>
                    <p><strong>Encargado:</strong> ${alb.encargado_nombre || 'No registrado'}</p>
                    <p><strong>Teléfono:</strong> ${alb.encargado_telefono || 'N/A'}</p>
                    <p><strong>Servicios:</strong> ${alb.servicios?.join(', ') || 'No especificados'}</p>
                </div>
            `;
            
            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open(mapa, marker);
            });
            
            marcadores.push(marker);
        });
        
    } catch (error) {
        console.error('Error cargando albergues:', error);
    }
}

// =====================================================
// CARGAR ZONAS DE RIESGO (GOOGLE MAPS POLYGONS)
// =====================================================
async function cargarZonasRiesgo() {
    if (!userData?.municipio?.slug) return;
    
    try {
        const response = await fetch(`/api/zonas`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        const zonas = await response.json();
        
        zonas.forEach(zona => {
            const geojson = JSON.parse(zona.coordenadas_poligono);
            
            let color = '#ef4444';
            if (zona.nivel === 'medio') color = '#f59e0b';
            if (zona.nivel === 'bajo') color = '#10b981';
            
            const polygon = new google.maps.Polygon({
                paths: geojson.coordinates[0].map(c => ({ lat: c[1], lng: c[0] })),
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: color,
                fillOpacity: 0.3,
                map: mapa
            });
            
            const content = `
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e3a8a;">⚠️ ${zona.nombre}</h3>
                    <p><strong>Tipo:</strong> ${zona.tipo}</p>
                    <p><strong>Nivel:</strong> ${zona.nivel.toUpperCase()}</p>
                    <p>${zona.descripcion || ''}</p>
                </div>
            `;
            
            polygon.addListener('click', (event) => {
                infoWindow.setPosition(event.latLng);
                infoWindow.setContent(content);
                infoWindow.open(mapa);
            });
            
            poligonos.push(polygon);
        });
        
    } catch (error) {
        console.error('Error cargando zonas de riesgo:', error);
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
    
    // Inicializar mapa (Google Maps)
    initMapaDashboard();
    
    // Cargar datos
    await cargarIncidentes();
    await cargarAlbergues();
    await cargarZonasRiesgo();
    
    // Recargar cada 30 segundos
    setInterval(() => {
        cargarIncidentes();
        cargarAlbergues();
    }, 30000);
}

// Esperar a que Google Maps cargue
document.addEventListener('DOMContentLoaded', initDashboard);
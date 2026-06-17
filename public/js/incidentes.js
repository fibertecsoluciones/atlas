// =====================================================
// INCIDENTES - MÓDULO COMPLETO
// =====================================================

let incidentesData = [];
let marcadoresIncidentes = [];

// =====================================================
// CARGAR INCIDENTES
// =====================================================
async function cargarIncidentes() {
    console.log('📡 Cargando incidentes...');
    
    if (!userData?.municipio?.slug) {
        console.warn('⚠️ No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/incidentes/mapa`, {
            headers: {
                'X-Municipio-Slug': userData.municipio.slug
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        incidentesData = await res.json();
        console.log('📡 Incidentes recibidos:', incidentesData.length);
        
        // Actualizar estadísticas
        const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
        const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
        const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
        const hoy = incidentesData.filter(i => {
            return new Date(i.fecha_reporte).toDateString() === new Date().toDateString();
        }).length;
        
        if (statsActivos) statsActivos.textContent = activos;
        if (statsProceso) statsProceso.textContent = enProceso;
        if (statsResueltos) statsResueltos.textContent = resueltos;
        if (statsHoy) statsHoy.textContent = hoy;
        
        renderizarListaIncidentes();
        renderizarMapaIncidentes();
        
    } catch (error) {
        console.error('❌ Error cargando incidentes:', error);
        if (listaIncidentes) {
            listaIncidentes.innerHTML = '<div class="error">❌ Error al cargar incidentes</div>';
        }
    }
}

// =====================================================
// RENDERIZAR LISTA DE INCIDENTES
// =====================================================
function renderizarListaIncidentes() {
    if (!listaIncidentes) return;
    
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'todos';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    
    let filtrados = incidentesData;
    if (filtroEstado !== 'todos') {
        filtrados = filtrados.filter(i => i.estado === filtroEstado);
    }
    if (filtroTipo !== 'todos') {
        filtrados = filtrados.filter(i => i.tipo === filtroTipo);
    }
    
    if (filtrados.length === 0) {
        listaIncidentes.innerHTML = '<div class="loading-spinner">No hay incidentes</div>';
        return;
    }
    
    listaIncidentes.innerHTML = filtrados.map(inc => {
        const color = inc.prioridad === 1 ? '#dc2626' : inc.prioridad === 2 ? '#f97316' : '#10b981';
        const estadoText = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En proceso',
            'en_revision': 'En revisión',
            'resuelto': 'Resuelto',
            'cancelado': 'Cancelado'
        }[inc.estado] || inc.estado;
        
        return `
            <div class="incidente-card prioridad-${inc.prioridad}">
                <div class="incidente-tipo">
                    <span>⚠️ ${inc.tipo.toUpperCase()}</span>
                    <span class="estado-badge estado-${inc.estado}">${estadoText}</span>
                </div>
                <div class="incidente-desc">
                    ${inc.descripcion?.substring(0, 80) || 'Sin descripción'}
                    ${inc.descripcion?.length > 80 ? '...' : ''}
                </div>
                <div class="incidente-fecha">
                    📅 ${formatFecha(inc.fecha_reporte)}
                    ${inc.es_nuevo === 'nuevo' ? ' 🔴 NUEVO' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// =====================================================
// RENDERIZAR INCIDENTES EN EL MAPA
// =====================================================
function renderizarMapaIncidentes() {
    if (!mapa) return;
    
    marcadoresIncidentes.forEach(m => mapa.removeLayer(m));
    marcadoresIncidentes = [];
    
    incidentesData.forEach(inc => {
        let color = '#ef4444';
        if (inc.prioridad === 2) color = '#f59e0b';
        if (inc.prioridad === 3) color = '#10b981';
        
        const icono = crearIconoEmoji('📍', color, 32, true);
        
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`
                <b>🚨 ${inc.tipo.toUpperCase()}</b><br>
                ${inc.descripcion || 'Sin descripción'}<br>
                Estado: ${inc.estado}<br>
                📅 ${formatFecha(inc.fecha_reporte)}
            `);
        
        marcadoresIncidentes.push(marker);
    });
}

// =====================================================
// FILTRAR INCIDENTES
// =====================================================
function filtrarIncidentes() {
    renderizarListaIncidentes();
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================
window.cargarIncidentes = cargarIncidentes;
window.filtrarIncidentes = filtrarIncidentes;
// =====================================================
// INCIDENTES - MÓDULO COMPLETO
// =====================================================

let incidentesData = [];
let marcadoresIncidentes = [];

// =====================================================
// REFERENCIAS DOM
// =====================================================
const statsResueltos = document.getElementById('stats-resueltos');  // ← AGREGADO

// =====================================================
// ICONOS POR TIPO DE INCIDENTE
// =====================================================
const ICONOS_INCIDENTES = {
    incendio: { emoji: '🔥', color: '#ef4444', label: 'Incendio' },
    inundacion: { emoji: '🌊', color: '#3b82f6', label: 'Inundación' },
    deslizamiento: { emoji: '⛰️', color: '#f59e0b', label: 'Deslizamiento' },
    accidente: { emoji: '🚗', color: '#f97316', label: 'Accidente' },
    arbol_caido: { emoji: '🌳', color: '#10b981', label: 'Árbol caído' },
    fuga_gas: { emoji: '⛽', color: '#ef4444', label: 'Fuga de gas' },
    explosion: { emoji: '💥', color: '#dc2626', label: 'Explosión' },
    rescate: { emoji: '🆘', color: '#8b5cf6', label: 'Rescate' },
    otro: { emoji: '⚠️', color: '#6b7280', label: 'Otro' }
};

function getIconoIncidente(tipo) {
    return ICONOS_INCIDENTES[tipo] || ICONOS_INCIDENTES.otro;
}

// =====================================================
// CARGAR INCIDENTES
// =====================================================
async function cargarIncidentes() {
    console.log('📡 Cargando incidentes...');
    
    if (!window.userData?.municipio?.slug) {
        console.warn('⚠️ No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/incidentes/mapa`, {
            headers: {
                'X-Municipio-Slug': window.userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        incidentesData = await res.json();
        console.log('📡 Incidentes recibidos:', incidentesData.length);
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
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
// ACTUALIZAR ESTADÍSTICAS
// =====================================================
function actualizarEstadisticas() {
    const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
    const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
    const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
    const hoy = incidentesData.filter(i => {
        return new Date(i.fecha_reporte).toDateString() === new Date().toDateString();
    }).length;
    
    // Actualizar DOM usando las referencias
    if (statsActivos) statsActivos.textContent = activos;
    if (statsProceso) statsProceso.textContent = enProceso;
    if (statsResueltos) statsResueltos.textContent = resueltos;  // ← AHORA FUNCIONA
    if (statsHoy) statsHoy.textContent = hoy;
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
        const icono = getIconoIncidente(inc.tipo);
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
                    <span>${icono.emoji} ${inc.tipo.toUpperCase()}</span>
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
        const iconoData = getIconoIncidente(inc.tipo);
        
        let color = iconoData.color;
        if (inc.prioridad === 1) color = '#dc2626';
        else if (inc.prioridad === 3) color = '#10b981';
        
        let tamaño = 36;
        if (inc.prioridad === 1) tamaño = 44;
        else if (inc.prioridad === 3) tamaño = 32;
        
        const icono = crearIconoEmoji(iconoData.emoji, color, tamaño, true);
        
        const estadoTexto = {
            'pendiente': '⏳ Pendiente',
            'en_proceso': '🔄 En proceso',
            'en_revision': '🔍 En revisión',
            'resuelto': '✅ Resuelto',
            'cancelado': '❌ Cancelado'
        }[inc.estado] || inc.estado;
        
        const prioridadTexto = inc.prioridad === 1 ? '🔴 Alta' : inc.prioridad === 2 ? '🟠 Media' : '🟢 Baja';
        
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`
                <div style="min-width: 220px; max-width: 300px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                        <div style="font-size:2rem;">${iconoData.emoji}</div>
                        <div>
                            <div style="font-weight:700; font-size:1rem; color:#e8edf5;">${inc.tipo.toUpperCase()}</div>
                            <span style="font-size:0.6rem; padding:2px 10px; border-radius:12px; background:${color}33; color:${color}; border:1px solid ${color};">
                                ${estadoTexto}
                            </span>
                        </div>
                    </div>
                    
                    <div style="font-size:0.8rem; color:#c8d2e3; margin-bottom:8px;">${inc.descripcion || 'Sin descripción'}</div>
                    
                    <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                        <span style="font-size:0.7rem; color:#8a9bb5;">📅 ${formatFecha(inc.fecha_reporte)}</span>
                        <span style="font-size:0.7rem; color:#8a9bb5;">🎯 ${prioridadTexto}</span>
                    </div>
                    
                    ${inc.es_nuevo === 'nuevo' ? '<div style="text-align:center; padding:2px; background:rgba(220,38,38,0.1); border-radius:4px; margin-bottom:8px; font-size:0.7rem; color:#f87171;">🔴 NUEVO</div>' : ''}
                    
                    <div style="display:flex; gap:6px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                        <button onclick="cambiarEstadoIncidente(${inc.id}, 'en_proceso')" 
                                style="flex:1; background:#f59e0b; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer;">
                            🔄 Proceso
                        </button>
                        <button onclick="cambiarEstadoIncidente(${inc.id}, 'resuelto')" 
                                style="flex:1; background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer;">
                            ✅ Resolver
                        </button>
                        <button onclick="eliminarIncidente(${inc.id})" 
                                style="flex:1; background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer;">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `, {
                maxWidth: 320,
                className: 'custom-popup'
            });
        
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
// CAMBIAR ESTADO DE INCIDENTE
// =====================================================
async function cambiarEstadoIncidente(id, nuevoEstado) {
    try {
        const res = await fetch(`/api/incidentes/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast(`✅ Estado actualizado a ${nuevoEstado}`, 'success');
            await cargarIncidentes();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ELIMINAR INCIDENTE
// =====================================================
async function eliminarIncidente(id) {
    if (!confirm('¿Estás seguro de eliminar este incidente?')) return;
    
    try {
        const res = await fetch(`/api/incidentes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        if (res.ok) {
            mostrarToast('✅ Incidente eliminado', 'success');
            await cargarIncidentes();
        } else {
            const data = await res.json();
            mostrarToast(`❌ ${data.error || 'Error al eliminar'}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================
window.cargarIncidentes = cargarIncidentes;
window.filtrarIncidentes = filtrarIncidentes;
window.cambiarEstadoIncidente = cambiarEstadoIncidente;
window.eliminarIncidente = eliminarIncidente;
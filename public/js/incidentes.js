// =====================================================
// INCIDENTES - MÓDULO COMPLETO
// =====================================================

let incidentesData = [];
let marcadoresIncidentes = [];

// =====================================================

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
// INICIALIZAR - ESTO ES NUEVO
// =====================================================
function init() {
    console.log('🚀 Inicializando Incidentes...');
    
    if (typeof L === 'undefined') {
        console.log('⏳ Esperando Leaflet...');
        setTimeout(init, 500);
        return;
    }
    
    if (typeof window.iniciarMapa === 'function') {
        window.iniciarMapa();
    }
    
    if (typeof cargarMunicipios === 'function') {
        cargarMunicipios();
    }
    
    initTiposEmergencia();
    
    const btnEnviar = document.getElementById('btn-enviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviarReporte);
    }
    
    console.log('✅ Incidentes.js inicializado');
}

// =====================================================
// INICIALIZAR TIPOS DE EMERGENCIA - ESTO ES NUEVO
// =====================================================
function initTiposEmergencia() {
    const tiposCards = document.querySelectorAll('.tipo-card');
    
    tiposCards.forEach(card => {
        card.addEventListener('click', function() {
            tiposCards.forEach(c => c.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            const tipo = this.dataset.tipo;
            document.getElementById('tipo-seleccionado').value = tipo;
        });
    });
}

// =====================================================
// CARGAR MUNICIPIOS - ESTO ES NUEVO
// =====================================================
async function cargarMunicipios() {
    const selector = document.getElementById('municipio-selector');
    if (!selector) return;
    
    try {
        const response = await fetch('/api/auth/municipios');
        const municipios = await response.json();
        
        selector.innerHTML = '<option value="">Selecciona tu municipio</option>';
        
        if (Array.isArray(municipios) && municipios.length > 0) {
            municipios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.slug;
                option.textContent = m.nombre;
                selector.appendChild(option);
            });
            
            if (municipios.length > 0) {
                selector.value = municipios[0].slug;
                if (typeof window.cambiarMunicipio === 'function') {
                    window.cambiarMunicipio(municipios[0].slug);
                }
            }
        }
    } catch (error) {
        console.error('Error cargando municipios:', error);
    }
}

// =====================================================
// ENVIAR REPORTE - YA ESTABA (SIN CAMBIOS)
// =====================================================
async function enviarReporte() {
    const municipioSelector = document.getElementById('municipio-selector');
    const tipoSeleccionado = document.getElementById('tipo-seleccionado');
    const descripcionInput = document.getElementById('descripcion');
    const fotoInput = document.getElementById('foto');
    const nombreInput = document.getElementById('nombre');
    const telefonoInput = document.getElementById('telefono');
    const btnEnviar = document.getElementById('btn-enviar');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('success');
    const errorDiv = document.getElementById('error');
    
    const municipioSlug = municipioSelector.value;
    if (!municipioSlug) {
        alert('⚠️ Por favor, selecciona tu municipio');
        return;
    }
    
    const tipo = tipoSeleccionado.value;
    if (!tipo) {
        alert('⚠️ Por favor, selecciona el tipo de emergencia');
        return;
    }
    
    const descripcion = descripcionInput.value.trim();
    if (!descripcion) {
        alert('⚠️ Por favor, describe la emergencia');
        return;
    }
    
    const ubicacion = window.obtenerUbicacionSeleccionada ? window.obtenerUbicacionSeleccionada() : null;
    if (!ubicacion) {
        alert('⚠️ Por favor, haz clic en el mapa para seleccionar la ubicación');
        return;
    }
    
    btnEnviar.disabled = true;
    loadingDiv.style.display = 'block';
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    const datos = {
        latitud: ubicacion.lat,
        longitud: ubicacion.lng,
        tipo: tipo,
        descripcion: descripcion,
        ciudadano_nombre: nombreInput.value.trim() || 'Anónimo',
        ciudadano_telefono: telefonoInput.value.trim() || null
    };
    
    try {
        const result = await api.reportarIncidente(datos, municipioSlug);
        
        if (result.success || result.id) {
            successDiv.style.display = 'block';
            
            descripcionInput.value = '';
            nombreInput.value = '';
            telefonoInput.value = '';
            fotoInput.value = '';
            
            document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('seleccionado'));
            tipoSeleccionado.value = '';
            
            if (window.limpiarSeleccion) {
                window.limpiarSeleccion();
            }
            
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '📍 Selecciona una ubicación en el mapa';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        } else {
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } finally {
        loadingDiv.style.display = 'none';
        btnEnviar.disabled = false;
    }
}

// =====================================================
// CARGAR INCIDENTES (CORREGIDO)
// =====================================================
async function cargarIncidentes() {
    console.log('📡 Cargando incidentes...');
    
    // Usar window.userData (se establece en dashboard.js)
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
        
        // ✅ ACTUALIZAR ESTADÍSTICAS
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
// ACTUALIZAR ESTADÍSTICAS - VERSIÓN DEFINITIVA
// =====================================================
function actualizarEstadisticas() {
    console.log('📊 Actualizando estadísticas...');
    
    // Calcular valores
    const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
    const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
    const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
    const hoy = incidentesData.filter(i => {
        return new Date(i.fecha_reporte).toDateString() === new Date().toDateString();
    }).length;
    
    // Actualizar DOM directamente (SIN variables intermedias)
    document.getElementById('stats-activos').textContent = activos;
    document.getElementById('stats-proceso').textContent = enProceso;
    document.getElementById('stats-resueltos').textContent = resueltos;
    document.getElementById('stats-hoy').textContent = hoy;
    
    console.log(`📊 Activos: ${activos}, En proceso: ${enProceso}, Resueltos: ${resueltos}, Hoy: ${hoy}`);
}

// =====================================================
// RENDERIZAR LISTA DE INCIDENTES - YA ESTABA (SIN CAMBIOS)
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
// RENDERIZAR INCIDENTES EN EL MAPA - YA ESTABA (SIN CAMBIOS)
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
// FILTRAR INCIDENTES - YA ESTABA (SIN CAMBIOS)
// =====================================================
function filtrarIncidentes() {
    renderizarListaIncidentes();
}

// =====================================================
// CAMBIAR ESTADO DE INCIDENTE - YA ESTABA (SIN CAMBIOS)
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
// ELIMINAR INCIDENTE - YA ESTABA (SIN CAMBIOS)
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
// EXPORTAR FUNCIONES GLOBALES - YA ESTABA (SIN CAMBIOS)
// =====================================================
window.cargarIncidentes = cargarIncidentes;
window.filtrarIncidentes = filtrarIncidentes;
window.cambiarEstadoIncidente = cambiarEstadoIncidente;
window.eliminarIncidente = eliminarIncidente;

// =====================================================
// INICIAR CUANDO EL DOM ESTÉ LISTO - ESTO ES NUEVO
// =====================================================
document.addEventListener('DOMContentLoaded', init);
// =====================================================
// INCIDENTES - MÓDULO COMPLETO
// =====================================================

let incidentesData = [];
let marcadoresIncidentes = [];

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
// INICIALIZAR
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
// INICIALIZAR TIPOS DE EMERGENCIA
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
// CARGAR MUNICIPIOS
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
// ENVIAR REPORTE
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
// CARGAR INCIDENTES (TODOS PARA ESTADÍSTICAS)
// =====================================================
async function cargarIncidentes() {
    console.log('📡 Cargando incidentes...');
    
    if (!window.userData?.municipio?.slug) {
        console.warn('⚠️ No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/incidentes?limite=100`, {
            headers: {
                'X-Municipio-Slug': window.userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        incidentesData = await res.json();
        console.log('📡 Incidentes recibidos (todos):', incidentesData.length);
        
        actualizarEstadisticas();
        
        const noResueltos = incidentesData.filter(i => i.estado !== 'resuelto');
        renderizarMapaIncidentes(noResueltos);
        renderizarListaIncidentes();
        
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
    console.log('📊 Actualizando estadísticas...');
    
    const activos = incidentesData.filter(i => i.estado !== 'resuelto').length;
    const enProceso = incidentesData.filter(i => i.estado === 'en_proceso').length;
    const resueltos = incidentesData.filter(i => i.estado === 'resuelto').length;
    const hoy = incidentesData.filter(i => {
        return new Date(i.fecha_reporte).toDateString() === new Date().toDateString();
    }).length;
    
    const elActivos = document.getElementById('stats-activos');
    const elProceso = document.getElementById('stats-proceso');
    const elResueltos = document.getElementById('stats-resueltos');
    const elHoy = document.getElementById('stats-hoy');
    
    if (elActivos) elActivos.textContent = activos;
    if (elProceso) elProceso.textContent = enProceso;
    if (elResueltos) elResueltos.textContent = resueltos;
    if (elHoy) elHoy.textContent = hoy;
    
    console.log(`📊 Activos: ${activos}, En proceso: ${enProceso}, Resueltos: ${resueltos}, Hoy: ${hoy}`);
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
// RENDERIZAR INCIDENTES EN EL MAPA (SOLO NO RESUELTOS)
// =====================================================
// =====================================================
// RENDERIZAR INCIDENTES EN EL MAPA (POPUP MEJORADO)
// =====================================================
function renderizarMapaIncidentes(incidentes) {
    if (!mapa) return;
    
    marcadoresIncidentes.forEach(m => mapa.removeLayer(m));
    marcadoresIncidentes = [];
    
    incidentes.forEach(inc => {
        const iconoData = getIconoIncidente(inc.tipo);
        
        let color = iconoData.color;
        if (inc.prioridad === 1) color = '#dc2626';
        else if (inc.prioridad === 3) color = '#10b981';
        
        let tamaño = 36;
        if (inc.prioridad === 1) tamaño = 44;
        else if (inc.prioridad === 3) tamaño = 32;
        
        const icono = crearIconoEmoji(iconoData.emoji, color, tamaño, true);
        
        // === POPUP MEJORADO ===
        const popupContent = construirPopupIncidente(inc);
        
        const marker = L.marker([inc.latitud, inc.longitud], { icon: icono })
            .addTo(window.capaIncidentes)
            .bindPopup(popupContent, {
                maxWidth: 360,
                className: 'custom-popup incidente-popup',
                autoPan: true,
                keepInView: true
            });
        
        // =============================================
        // TOOLTIP AL PASAR EL MOUSE (NUEVO)
        // =============================================
        const tooltipContent = `
            <div style="font-weight: 600; font-size: 0.8rem; color: #e8edf5;">
                ${iconoData.emoji} ${inc.tipo.toUpperCase()}
            </div>
            <div style="font-size: 0.65rem; color: #8a9bb5; margin-top: 2px;">
                ${getEstadoTexto(inc.estado)} • ${formatFecha(inc.fecha_reporte)}
            </div>
        `;
        
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'auto',
            offset: [0, -10],
            className: 'tooltip-incidente',
            sticky: true,
            opacity: 0.95
        });
        
        marcadoresIncidentes.push(marker);
    });
}

// =====================================================
// CONSTRUIR POPUP DE INCIDENTE (NUEVA FUNCIÓN)
// =====================================================
function construirPopupIncidente(inc) {
    const iconoData = getIconoIncidente(inc.tipo);
    
    // Colores según prioridad
    const prioridadColor = inc.prioridad === 1 ? '#dc2626' : inc.prioridad === 2 ? '#f59e0b' : '#10b981';
    const prioridadTexto = inc.prioridad === 1 ? '🔴 Alta' : inc.prioridad === 2 ? '🟠 Media' : '🟢 Baja';
    
    // Estado para mostrar
    const estadoTexto = {
        'pendiente': '⏳ Pendiente',
        'en_proceso': '🔄 En proceso',
        'en_revision': '🔍 En revisión',
        'resuelto': '✅ Resuelto',
        'cancelado': '❌ Cancelado'
    }[inc.estado] || inc.estado;
    
    const estadoColor = {
        'pendiente': '#dc2626',
        'en_proceso': '#f59e0b',
        'en_revision': '#8b5cf6',
        'resuelto': '#10b981',
        'cancelado': '#6b7280'
    }[inc.estado] || '#6b7280';
    
    // Fecha formateada
    const fechaReporte = new Date(inc.fecha_reporte).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="popup-incidente">
            <!-- CABECERA -->
            <div class="popup-incidente-header">
                <div class="popup-incidente-icono">${iconoData.emoji}</div>
                <div class="popup-incidente-titulo">
                    <div class="popup-incidente-nombre">${inc.tipo.toUpperCase()}</div>
                    <div class="popup-incidente-badges">
                        <span class="popup-badge-estado" style="background:${estadoColor}22; color:${estadoColor}; border:1px solid ${estadoColor};">
                            ${estadoTexto}
                        </span>
                        <span class="popup-badge-prioridad" style="background:${prioridadColor}22; color:${prioridadColor}; border:1px solid ${prioridadColor};">
                            ${prioridadTexto}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- DESCRIPCIÓN -->
            <div class="popup-incidente-descripcion">
                ${inc.descripcion || 'Sin descripción'}
            </div>
            
            <!-- INFORMACIÓN -->
            <div class="popup-incidente-info">
                <div class="popup-incidente-item">
                    <span class="popup-incidente-label">📅 Reportado</span>
                    <span class="popup-incidente-valor">${fechaReporte}</span>
                </div>
                ${inc.direccion_aproximada ? `
                    <div class="popup-incidente-item">
                        <span class="popup-incidente-label">📍 Ubicación</span>
                        <span class="popup-incidente-valor">${inc.direccion_aproximada}</span>
                    </div>
                ` : ''}
                ${inc.ciudadano_nombre ? `
                    <div class="popup-incidente-item">
                        <span class="popup-incidente-label">👤 Reporta</span>
                        <span class="popup-incidente-valor">${inc.ciudadano_nombre}</span>
                    </div>
                ` : ''}
            </div>
            
            <!-- NUEVO BADGE -->
            ${inc.es_nuevo === 'nuevo' ? `
                <div class="popup-incidente-nuevo">🔴 NUEVO</div>
            ` : ''}
            
            <!-- ACCIONES -->
            <div class="popup-incidente-acciones">
                ${inc.estado !== 'resuelto' ? `
                    <button onclick="cambiarEstadoIncidente(${inc.id}, 'en_proceso')" 
                            class="popup-btn proceso">
                        🔄 En proceso
                    </button>
                    <button onclick="cambiarEstadoIncidente(${inc.id}, 'resuelto')" 
                            class="popup-btn resuelto">
                        ✅ Resolver
                    </button>
                ` : `
                    <span style="font-size:0.7rem; color:#10b981; text-align:center; width:100%; padding:4px;">
                        ✅ Incidente resuelto
                    </span>
                `}
                <button onclick="eliminarIncidente(${inc.id})" 
                        class="popup-btn eliminar">
                    🗑️ Eliminar
                </button>
            </div>
            
            <!-- FOOTER -->
            <div class="popup-incidente-footer">
                <span>ID: ${inc.id}</span>
                <span>${inc.es_nuevo === 'nuevo' ? '🟢 Nuevo' : ''}</span>
            </div>
        </div>
    `;
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

// =====================================================
// INICIAR
// =====================================================
document.addEventListener('DOMContentLoaded', init);
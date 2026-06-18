// =====================================================
// ZONAS DE RIESGO - MÓDULO COMPLETO
// =====================================================

let riesgosData = [];
let poligonosRiesgo = [];
let polygonEditando = null;
let zonaEditandoId = null;
let zonaEditandoData = null;
let modoEdicion = false;

// =====================================================
// CARGAR ZONAS DE RIESGO
// =====================================================
async function cargarRiesgos() {
    console.log('📡 Cargando zonas de riesgo...');
    
    if (!window.userData?.municipio?.slug) {
        console.warn('⚠️ No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: {
                'X-Municipio-Slug': window.userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        riesgosData = await res.json();
        console.log('📡 Zonas recibidas:', riesgosData.length);
        
        if (statsRiesgos) statsRiesgos.textContent = riesgosData.length;
        
        renderizarListaRiesgos();
        renderizarMapaRiesgos();
        
    } catch (error) {
        console.error('❌ Error cargando zonas:', error);
        if (listaRiesgos) {
            listaRiesgos.innerHTML = '<div class="error">❌ Error al cargar zonas de riesgo</div>';
        }
    }
}

// =====================================================
// RENDERIZAR LISTA DE ZONAS CON CLICK PARA CENTRAR
// =====================================================
function renderizarListaRiesgos() {
    if (!listaRiesgos) return;
    
    if (riesgosData.length === 0) {
        listaRiesgos.innerHTML = `
            <div class="loading-spinner">No hay zonas de riesgo</div>
            <div style="text-align:center;margin-top:20px;">
                <p style="color:#6b7f9f;font-size:0.9rem;">
                    Haz clic en "✏️ Dibujar" para crear una zona
                </p>
            </div>
        `;
        return;
    }
    
    listaRiesgos.innerHTML = riesgosData.map(r => `
        <div class="riesgo-card" onclick="centrarEnZona(${r.id})" style="cursor:pointer;">
            <div class="riesgo-card-header">
                <div class="riesgo-card-titulo">
                    <strong>⚠️ ${r.nombre}</strong>
                    <span class="riesgo-nivel ${r.nivel || 'medio'}">${r.nivel?.toUpperCase() || 'MEDIO'}</span>
                </div>
                <div class="riesgo-card-acciones" onclick="event.stopPropagation();">
                    <button class="btn-editar" onclick="abrirFormularioEdicion(${r.id})" title="Editar datos">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarZona(${r.id})" title="Eliminar zona">🗑️</button>
                </div>
            </div>
            <div class="riesgo-card-info">
                ${r.tipo || 'Sin tipo'} | ${r.descripcion || ''}
            </div>
            <div class="riesgo-card-stats">
                👥 ${r.poblacion_afectada || 0} personas | 🏠 ${r.viviendas_afectadas || 0} viviendas
            </div>
        </div>
    `).join('');
}

// =====================================================
// RENDERIZAR ZONAS EN EL MAPA (CON POPUP MEJORADO)
// =====================================================
function renderizarMapaRiesgos() {
    if (!mapa) return;
    
    poligonosRiesgo.forEach(p => mapa.removeLayer(p));
    poligonosRiesgo = [];
    
    riesgosData.forEach(r => {
        try {
            const geo = JSON.parse(r.coordenadas_poligono);
            const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
            
            const color = getColorPorNivel(r.nivel);
            const popupContent = construirPopupRiesgo(r, coords);
            
            const polygon = L.polygon(coords, {
                color: color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.25
            }).addTo(mapa)
              .bindPopup(popupContent, {
                  maxWidth: 320,
                  minWidth: 200,
                  className: 'custom-popup',
                  autoPan: true,
                  keepInView: true
              });
            
            poligonosRiesgo.push(polygon);
        } catch(e) {
            console.error('Error al renderizar zona:', e);
        }
    });
}

// =====================================================
// CONSTRUIR POPUP CON BOTONES DE EDICIÓN
// =====================================================
function construirPopupRiesgo(zona, coords) {
    const icono = getIconoPorNivel(zona.nivel);
    const nivelTexto = zona.nivel?.toUpperCase() || 'MEDIO';
    
    return `
        <div class="popup-riesgo">
            <div class="popup-header">
                <div class="popup-icon">${icono}</div>
                <div class="popup-titulo">
                    <div class="popup-nombre">${zona.nombre}</div>
                    <span class="popup-badge ${zona.nivel || 'medio'}">${nivelTexto}</span>
                </div>
            </div>
            <div class="popup-body">
                <div class="popup-grid">
                    <div class="popup-item">
                        <span class="popup-label">Tipo</span>
                        <span class="popup-value">${zona.tipo ? zona.tipo.charAt(0).toUpperCase() + zona.tipo.slice(1) : 'No especificado'}</span>
                    </div>
                    <div class="popup-item">
                        <span class="popup-label">Creado</span>
                        <span class="popup-value">${new Date(zona.fecha_creacion).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>
                ${zona.descripcion ? `
                    <div class="popup-descripcion">
                        <span class="popup-label">📝 Descripción</span>
                        <p>${zona.descripcion}</p>
                    </div>
                ` : ''}
                <div class="popup-stats">
                    <div class="popup-stat">
                        <span class="popup-number">${zona.poblacion_afectada || 0}</span>
                        <span class="popup-label">👥 Personas</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-number">${zona.viviendas_afectadas || 0}</span>
                        <span class="popup-label">🏠 Viviendas</span>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button onclick="editarPoligonoDesdePopup(${zona.id})" 
                            style="flex:1; background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                        ✏️ Editar Polígono
                    </button>
                    <button onclick="abrirFormularioEdicion(${zona.id})" 
                            style="flex:1; background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                        📝 Editar Datos
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// EDITAR POLÍGONO DESDE POPUP (ACTIVA EDICIÓN)
// =====================================================
async function editarPoligonoDesdePopup(id) {
    console.log('✏️ EDITAR POLÍGONO DESDE POPUP ID:', id);
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        if (!res.ok) throw new Error('Error al obtener los datos');
        
        const zona = await res.json();
        zonaEditandoId = id;
        zonaEditandoData = zona;
        modoEdicion = true;
        
        // Cerrar popup actual
        mapa.closePopup();
        
        if (polygonEditando) {
            mapa.removeLayer(polygonEditando);
            polygonEditando = null;
        }
        
        const geo = JSON.parse(zona.coordenadas_poligono);
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
        
        polygonEditando = L.polygon(coords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        }).addTo(mapa);
        
        mapa.fitBounds(polygonEditando.getBounds(), { padding: [50, 50] });
        polygonEditando.editing.enable();
        
        mostrarBotonGuardarEdicion();
        mostrarToast('🔄 Arrastra los puntos azules para modificar el polígono', 'info');
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('❌ Error al activar edición del polígono', 'error');
    }
}

// =====================================================
// BOTÓN GUARDAR (FLOTANTE)
// =====================================================
function mostrarBotonGuardarEdicion() {
    const btnAnterior = document.getElementById('btn-guardar-edicion');
    if (btnAnterior) btnAnterior.remove();
    
    const btnGuardar = document.createElement('button');
    btnGuardar.id = 'btn-guardar-edicion';
    btnGuardar.className = 'btn-guardar-flotante';
    btnGuardar.textContent = '💾 Guardar Polígono';
    btnGuardar.onclick = guardarPoligonoYMostrarFormulario;
    
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) mapContainer.appendChild(btnGuardar);
}

// =====================================================
// GUARDAR POLÍGONO Y ABRIR FORMULARIO
// =====================================================
function guardarPoligonoYMostrarFormulario() {
    console.log('💾 Guardando polígono...');
    
    if (!polygonEditando || !zonaEditandoData) {
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    try {
        const latlngs = polygonEditando.getLatLngs()[0];
        if (!latlngs || latlngs.length < 3) {
            mostrarToast('⚠️ El polígono no tiene suficientes puntos', 'warning');
            return;
        }
        
        const coordenadas = latlngs.map(c => [c.lng, c.lat]);
        coordenadas.push(coordenadas[0]);
        
        const geojson = {
            type: 'Polygon',
            coordinates: [coordenadas]
        };
        
        guardarPoligonoYMostrarFormularioBackend(zonaEditandoId, geojson);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('❌ Error al leer el polígono', 'error');
    }
}

// =====================================================
// GUARDAR POLÍGONO + FORMULARIO
// =====================================================
async function guardarPoligonoYMostrarFormularioBackend(id, geojson) {
    try {
        const payload = {
            nombre: zonaEditandoData.nombre,
            tipo: zonaEditandoData.tipo,
            nivel: zonaEditandoData.nivel,
            descripcion: zonaEditandoData.descripcion || '',
            poblacion_afectada: zonaEditandoData.poblacion_afectada || 0,
            viviendas_afectadas: zonaEditandoData.viviendas_afectadas || 0,
            coordenadas_poligono: JSON.stringify(geojson)
        };
        
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Polígono guardado correctamente', 'success');
            // Limpiar edición del polígono
            if (polygonEditando) {
                mapa.removeLayer(polygonEditando);
                polygonEditando = null;
            }
            const btn = document.getElementById('btn-guardar-edicion');
            if (btn) btn.remove();
            
            // Abrir formulario para editar datos
            abrirFormularioEdicion(id);
            modoEdicion = false;
        } else {
            mostrarToast(`❌ ${data.error || 'Error al guardar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ABRIR FORMULARIO DE EDICIÓN (SOLO DATOS)
// =====================================================
async function abrirFormularioEdicion(id) {
    console.log('📝 ABRIR FORMULARIO DE EDICIÓN ID:', id);
    
    try {
        // Si no tenemos los datos, cargarlos
        if (!zonaEditandoData || zonaEditandoId !== id) {
            const res = await fetch(`/api/zonas/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
                }
            });
            if (!res.ok) throw new Error('Error al obtener datos');
            zonaEditandoData = await res.json();
            zonaEditandoId = id;
        }
        
        const zona = zonaEditandoData;
        
        // Cerrar popup si está abierto
        mapa.closePopup();
        
        modalTitulo.textContent = '✏️ Editar Datos de la Zona';
        modalBody.innerHTML = `
            <form id="form-zona-edit" class="form-reporte">
                <div class="form-group">
                    <label>Nombre de la zona *</label>
                    <input type="text" id="z-edit-nombre" value="${zona.nombre}" required>
                </div>
                <div class="form-group">
                    <label>Tipo de riesgo</label>
                    <select id="z-edit-tipo">
                        <option value="inundacion" ${zona.tipo === 'inundacion' ? 'selected' : ''}>🌊 Inundación</option>
                        <option value="deslizamiento" ${zona.tipo === 'deslizamiento' ? 'selected' : ''}>⛰️ Deslizamiento</option>
                        <option value="incendio" ${zona.tipo === 'incendio' ? 'selected' : ''}>🔥 Incendio</option>
                        <option value="sismo" ${zona.tipo === 'sismo' ? 'selected' : ''}>🌍 Sismo</option>
                        <option value="vendaval" ${zona.tipo === 'vendaval' ? 'selected' : ''}>💨 Vendaval</option>
                        <option value="otro" ${zona.tipo === 'otro' ? 'selected' : ''}>⚠️ Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nivel de riesgo</label>
                    <select id="z-edit-nivel">
                        <option value="critico" ${zona.nivel === 'critico' ? 'selected' : ''}>🔴 Crítico</option>
                        <option value="alto" ${zona.nivel === 'alto' ? 'selected' : ''}>🟠 Alto</option>
                        <option value="medio" ${zona.nivel === 'medio' ? 'selected' : ''}>🟡 Medio</option>
                        <option value="bajo" ${zona.nivel === 'bajo' ? 'selected' : ''}>🟢 Bajo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="z-edit-descripcion" rows="2">${zona.descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Población afectada</label>
                    <input type="number" id="z-edit-poblacion" value="${zona.poblacion_afectada || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Viviendas afectadas</label>
                    <input type="number" id="z-edit-viviendas" value="${zona.viviendas_afectadas || 0}" min="0">
                </div>
                <div style="display:flex;gap:10px;margin-top:10px;">
                    <button type="submit" class="btn-enviar" style="flex:1;">💾 Guardar Datos</button>
                    <button type="button" class="btn-enviar" style="flex:1;background:#6b7280;" onclick="cancelarEdicionPoligono()">❌ Cancelar</button>
                </div>
            </form>
        `;
        
        modalOverlay.style.display = 'flex';
        
        document.getElementById('form-zona-edit').addEventListener('submit', async function(e) {
            e.preventDefault();
            await actualizarDatosZona(id);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('❌ Error al abrir formulario', 'error');
    }
}

// =====================================================
// ACTUALIZAR SOLO DATOS
// =====================================================
async function actualizarDatosZona(id) {
    const nombre = document.getElementById('z-edit-nombre').value.trim();
    const tipo = document.getElementById('z-edit-tipo').value;
    const nivel = document.getElementById('z-edit-nivel').value;
    const descripcion = document.getElementById('z-edit-descripcion').value.trim();
    const poblacion = parseInt(document.getElementById('z-edit-poblacion').value) || 0;
    const viviendas = parseInt(document.getElementById('z-edit-viviendas').value) || 0;
    
    if (!nombre) {
        mostrarToast('⚠️ El nombre es requerido', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre,
                tipo,
                nivel,
                descripcion,
                poblacion_afectada: poblacion,
                viviendas_afectadas: viviendas
                // NOTA: No enviamos coordenadas_poligono para preservar el polígono actual
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Datos actualizados correctamente', 'success');
            cerrarModal();
            cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ELIMINAR ZONA
// =====================================================
async function eliminarZona(id) {
    if (!confirm('¿Eliminar esta zona de riesgo?')) return;
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        if (res.ok) {
            mostrarToast('✅ Zona eliminada', 'success');
            cargarRiesgos();
        } else {
            const data = await res.json();
            mostrarToast(`❌ ${data.error || 'Error al eliminar'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// CANCELAR EDICIÓN
// =====================================================
function cancelarEdicionPoligono() {
    if (polygonEditando) {
        mapa.removeLayer(polygonEditando);
        polygonEditando = null;
    }
    zonaEditandoId = null;
    zonaEditandoData = null;
    modoEdicion = false;
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
    cerrarModal();
    mostrarToast('⏹️ Edición cancelada', 'info');
}

// =====================================================
// LIMPIAR COMPLETO
// =====================================================
function limpiarCompleto() {
    if (polygonEditando) {
        mapa.removeLayer(polygonEditando);
        polygonEditando = null;
    }
    zonaEditandoId = null;
    zonaEditandoData = null;
    modoEdicion = false;
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================
function getColorPorNivel(nivel) {
    const colores = {
        'critico': '#dc2626',
        'alto': '#f97316',
        'medio': '#f59e0b',
        'bajo': '#10b981'
    };
    return colores[nivel] || '#f59e0b';
}

function getIconoPorNivel(nivel) {
    const iconos = {
        'critico': '🔴',
        'alto': '🟠',
        'medio': '🟡',
        'bajo': '🟢'
    };
    return iconos[nivel] || '⚠️';
}

// =====================================================
// EXPORTAR GLOBALES
// =====================================================
window.cargarRiesgos = cargarRiesgos;
window.abrirFormularioEdicion = abrirFormularioEdicion;
window.editarPoligonoDesdePopup = editarPoligonoDesdePopup;
window.eliminarZona = eliminarZona;
window.cancelarEdicionPoligono = cancelarEdicionPoligono;
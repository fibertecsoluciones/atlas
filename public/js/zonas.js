// =====================================================
// ZONAS DE RIESGO - MÓDULO COMPLETO (CON EDICIÓN FUNCIONAL)
// =====================================================

let riesgosData = [];
let poligonosRiesgo = [];
let polygonEditando = null;
let zonaEditandoId = null;
let zonaEditandoData = null;
let editLayer = null;

// =====================================================
// CARGAR ZONAS DE RIESGO
// =====================================================
async function cargarRiesgos() {
    console.log('📡 Cargando zonas de riesgo...');
    
    if (!userData?.municipio?.slug) {
        console.warn('⚠️ No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: {
                'X-Municipio-Slug': userData.municipio.slug,
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
// RENDERIZAR LISTA DE ZONAS CON BOTONES
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
        <div class="riesgo-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>⚠️ ${r.nombre}</strong>
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;margin-left:10px;background:${getNivelColor(r.nivel)};color:white;">
                        ${r.nivel?.toUpperCase() || 'MEDIO'}
                    </span>
                </div>
                <div>
                    <button onclick="editarZona(${r.id})" 
                            style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">
                        ✏️
                    </button>
                    <button onclick="eliminarZona(${r.id})" 
                            style="background:#dc2626;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">
                        🗑️
                    </button>
                </div>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;margin-top:4px;">
                ${r.tipo || 'Sin tipo'} | ${r.descripcion || ''}
            </div>
            <div style="font-size:0.7rem;color:#6b7f9f;margin-top:4px;">
                👥 ${r.poblacion_afectada || 0} personas | 🏠 ${r.viviendas_afectadas || 0} viviendas
            </div>
        </div>
    `).join('');
}

// =====================================================
// RENDERIZAR ZONAS EN EL MAPA
// =====================================================
function renderizarMapaRiesgos() {
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
                color: color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.25
            }).addTo(mapa)
              .bindPopup(`
                  <b>⚠️ ${r.nombre}</b><br>
                  Tipo: ${r.tipo || 'No especificado'}<br>
                  Nivel: ${r.nivel?.toUpperCase() || 'MEDIO'}<br>
                  👥 ${r.poblacion_afectada || 0} personas<br>
                  🏠 ${r.viviendas_afectadas || 0} viviendas
              `);
            
            poligonosRiesgo.push(polygon);
        } catch(e) {
            console.error('Error al renderizar zona:', e);
        }
    });
}

// =====================================================
// EDITAR ZONA (CON LEAFLET DRAW)
// =====================================================
async function editarZona(id) {
    try {
        // Obtener datos de la zona
        const res = await fetch(`/api/zonas/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        if (!res.ok) {
            throw new Error('Error al obtener los datos de la zona');
        }
        
        const zona = await res.json();
        zonaEditandoId = id;
        zonaEditandoData = zona;
        
        // Limpiar edición anterior
        limpiarEdicion();
        
        // Dibujar polígono existente
        const geo = JSON.parse(zona.coordenadas_poligono);
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
        
        polygonEditando = L.polygon(coords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        }).addTo(mapa);
        
        // Centrar mapa
        mapa.fitBounds(polygonEditando.getBounds(), { padding: [50, 50] });
        
        // =============================================
        // IMPORTANTE: Usar drawnItems de dashboard.js
        // =============================================
        if (window.drawnItems) {
            window.drawnItems.addLayer(polygonEditando);
            editLayer = window.drawnItems;
        }
        
        // =============================================
        // ACTIVAR EDICIÓN MANUAL (MÁS CONFIABLE)
        // =============================================
        polygonEditando.editing.enable();
        
        // =============================================
        // ESCUCHAR EVENTO DE EDICIÓN
        // =============================================
        mapa.on('draw:edited', function(e) {
            const layers = e.layers;
            layers.eachLayer(function(layer) {
                if (layer === polygonEditando) {
                    console.log('✅ Polígono editado correctamente');
                    mostrarToast('✅ Polígono actualizado. Haz clic en "💾 Guardar"', 'success');
                }
            });
        });
        
        // =============================================
        // ESCUCHAR EVENTO DE DIBUJO EDITADO (ALTERNATIVO)
        // =============================================
        mapa.on('editable:editing', function(e) {
            console.log('✏️ Editando polígono...');
        });
        
        // =============================================
        // MOSTRAR BOTÓN GUARDAR
        // =============================================
        mostrarBotonGuardarEdicion();
        
        mostrarToast('🔄 Arrastra los puntos azules o usa los controles para editar. Luego haz clic en "💾 Guardar"', 'info');
        
    } catch (error) {
        console.error('❌ Error al editar zona:', error);
        mostrarToast('❌ Error al cargar zona para editar', 'error');
    }
}

// =====================================================
// MOSTRAR BOTÓN GUARDAR EN EL MAPA
// =====================================================
function mostrarBotonGuardarEdicion() {
    const btnAnterior = document.getElementById('btn-guardar-edicion');
    if (btnAnterior) {
        btnAnterior.remove();
    }
    
    const btnGuardar = document.createElement('button');
    btnGuardar.id = 'btn-guardar-edicion';
    btnGuardar.innerHTML = '💾 Guardar Cambios';
    btnGuardar.style.cssText = `
        position: absolute;
        bottom: 100px;
        right: 20px;
        z-index: 1000;
        background: #10b981;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s;
    `;
    btnGuardar.onclick = function() {
        guardarPoligonoEditado();
    };
    
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.appendChild(btnGuardar);
    }
}

// =====================================================
// GUARDAR POLÍGONO EDITADO (DIRECTO, SIN MODAL)
// =====================================================
function guardarPoligonoEditado() {
    if (!polygonEditando || !zonaEditandoData) {
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    // Obtener coordenadas actuales
    const latlngs = polygonEditando.getLatLngs()[0];
    const coordenadas = latlngs.map(c => [c.lng, c.lat]);
    coordenadas.push(coordenadas[0]);
    
    const geojson = {
        type: 'Polygon',
        coordinates: [coordenadas]
    };
    
    // Mostrar formulario con los datos actuales
    const zona = zonaEditandoData;
    
    modalTitulo.textContent = '✏️ Guardar Cambios de la Zona';
    modalBody.innerHTML = `
        <form id="form-zona-edit" class="form-reporte">
            <div style="background:#e0f2fe;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:0.8rem;color:#1e3a8a;">
                ✅ Polígono editado correctamente. Verifica los datos antes de guardar.
            </div>
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
                <button type="submit" class="btn-enviar" style="flex:1;">💾 Guardar Cambios</button>
                <button type="button" class="btn-enviar" style="flex:1;background:#6b7280;" onclick="cancelarEdicionPoligono()">❌ Cancelar</button>
            </div>
        </form>
    `;
    
    modalOverlay.style.display = 'flex';
    
    document.getElementById('form-zona-edit').addEventListener('submit', async function(e) {
        e.preventDefault();
        await actualizarZonaConPoligono(zonaEditandoId, geojson);
    });
}

// =====================================================
// ACTUALIZAR ZONA CON POLÍGONO EDITADO
// =====================================================
async function actualizarZonaConPoligono(id, geojson) {
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
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre,
                tipo,
                nivel,
                descripcion,
                poblacion_afectada: poblacion,
                viviendas_afectadas: viviendas,
                coordenadas_poligono: JSON.stringify(geojson)
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Zona actualizada correctamente', 'success');
            cerrarModal();
            limpiarEdicion();
            await cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error actualizando zona:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// LIMPIAR EDICIÓN
// =====================================================
function limpiarEdicion() {
    if (polygonEditando) {
        mapa.removeLayer(polygonEditando);
        polygonEditando = null;
    }
    zonaEditandoId = null;
    zonaEditandoData = null;
    
    if (editLayer) {
        editLayer.clearLayers();
        editLayer = null;
    }
    
    // Remover eventos de edición
    mapa.off('draw:edited');
    mapa.off('editable:editing');
    
    const btnGuardar = document.getElementById('btn-guardar-edicion');
    if (btnGuardar) {
        btnGuardar.remove();
    }
}

// =====================================================
// CANCELAR EDICIÓN
// =====================================================
function cancelarEdicionPoligono() {
    limpiarEdicion();
    cerrarModal();
    mostrarToast('⏹️ Edición cancelada', 'info');
}

// =====================================================
// ELIMINAR ZONA DE RIESGO
// =====================================================
async function eliminarZona(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta zona de riesgo?')) {
        return;
    }
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Zona eliminada correctamente', 'success');
            await cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al eliminar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error eliminando zona:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================
window.cargarRiesgos = cargarRiesgos;
window.editarZona = editarZona;
window.eliminarZona = eliminarZona;
window.cancelarEdicionPoligono = cancelarEdicionPoligono;
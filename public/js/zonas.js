// =====================================================
// ZONAS DE RIESGO - MÓDULO COMPLETO
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
    
    // Usar window.userData en lugar de userData
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
// PASO 1: EDITAR ZONA (SOLO POLÍGONO, SIN MODAL)
// =====================================================
async function editarZona(id) {
    try {
        // Obtener datos de la zona
        const res = await fetch(`/api/zonas/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
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
        
        // Activar edición manual (puntos arrastrables)
        polygonEditando.editing.enable();
        
        // Mostrar botón flotante con dos opciones
        mostrarBotonGuardarEdicion();
        
        mostrarToast('🔄 Arrastra los puntos azules para modificar el polígono', 'info');
        
    } catch (error) {
        console.error('❌ Error al cargar zona para editar:', error);
        mostrarToast('❌ Error al cargar los datos de la zona', 'error');
    }
}

// =====================================================
// MOSTRAR BOTÓN GUARDAR EN EL MAPA (CON DOS OPCIONES)
// =====================================================
function mostrarBotonGuardarEdicion() {
    const btnAnterior = document.getElementById('btn-guardar-edicion');
    if (btnAnterior) {
        btnAnterior.remove();
    }
    
    const container = document.createElement('div');
    container.id = 'btn-guardar-edicion';
    container.style.cssText = `
        position: absolute;
        bottom: 100px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Botón principal: Guardar Directo
    const btnGuardar = document.createElement('button');
    btnGuardar.innerHTML = '💾 Guardar Cambios';
    btnGuardar.style.cssText = `
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
    btnGuardar.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
    btnGuardar.onmouseout = function() { this.style.transform = 'scale(1)'; };
    btnGuardar.onclick = function() {
        guardarPoligonoDirecto();
    };
    
    // Botón secundario: Guardar con Edición de Datos
    const btnEditarDatos = document.createElement('button');
    btnEditarDatos.innerHTML = '✏️ Editar Datos';
    btnEditarDatos.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s;
    `;
    btnEditarDatos.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
    btnEditarDatos.onmouseout = function() { this.style.transform = 'scale(1)'; };
    btnEditarDatos.onclick = function() {
        mostrarFormularioEdicion();
    };
    
    container.appendChild(btnGuardar);
    container.appendChild(btnEditarDatos);
    
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.appendChild(container);
    }
}

// =====================================================
// OPCIÓN 1: GUARDAR DIRECTO (SOLO POLÍGONO)
// =====================================================
function guardarPoligonoDirecto() {
    if (!polygonEditando) {
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    if (!zonaEditandoData) {
        mostrarToast('⚠️ No hay datos de la zona', 'warning');
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
    
    // Confirmar antes de guardar
    if (!confirm(`¿Guardar cambios del polígono de "${zonaEditandoData.nombre}"?`)) {
        return;
    }
    
    guardarZonaEditada(zonaEditandoId, geojson, zonaEditandoData);
}

// =====================================================
// OPCIÓN 2: GUARDAR CON EDICIÓN DE DATOS (FORMULARIO)
// =====================================================
function mostrarFormularioEdicion() {
    if (!zonaEditandoData) {
        mostrarToast('⚠️ No hay zona seleccionada', 'warning');
        return;
    }
    
    const zona = zonaEditandoData;
    
    modalTitulo.textContent = '✏️ Editar Datos de la Zona';
    modalBody.innerHTML = `
        <form id="form-zona-edit" class="form-reporte">
            <div style="background:#e0f2fe;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:0.8rem;color:#1e3a8a;">
                ✅ El polígono ya fue editado en el mapa. Puedes modificar los datos y guardar.
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
        await guardarConDatosEditados(zonaEditandoId);
    });
}

// =====================================================
// GUARDAR CON DATOS EDITADOS (FORMULARIO)
// =====================================================
async function guardarConDatosEditados(id) {
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
    
    // Obtener coordenadas del polígono editado
    if (!polygonEditando) {
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    const latlngs = polygonEditando.getLatLngs()[0];
    const coordenadas = latlngs.map(c => [c.lng, c.lat]);
    coordenadas.push(coordenadas[0]);
    
    const geojson = {
        type: 'Polygon',
        coordinates: [coordenadas]
    };
    
    const datosActualizados = {
        nombre,
        tipo,
        nivel,
        descripcion,
        poblacion_afectada: poblacion,
        viviendas_afectadas: viviendas,
        coordenadas_poligono: JSON.stringify(geojson)
    };
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify(datosActualizados)
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
// GUARDAR ZONA EDITADA (DIRECTO AL BACKEND)
// =====================================================
async function guardarZonaEditada(id, geojson, datos) {
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre: datos.nombre,
                tipo: datos.tipo,
                nivel: datos.nivel,
                descripcion: datos.descripcion || '',
                poblacion_afectada: datos.poblacion_afectada || 0,
                viviendas_afectadas: datos.viviendas_afectadas || 0,
                coordenadas_poligono: JSON.stringify(geojson)
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Polígono actualizado correctamente', 'success');
            limpiarEdicion();
            await cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al guardar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando zona editada:', error);
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
    
    const btnContainer = document.getElementById('btn-guardar-edicion');
    if (btnContainer) {
        btnContainer.remove();
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
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
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
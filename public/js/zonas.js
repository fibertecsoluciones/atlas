// =====================================================
// ZONAS DE RIESGO - MÓDULO COMPLETO (SOLO LÓGICA)
// =====================================================

let riesgosData = [];
let poligonosRiesgo = [];
let polygonEditando = null;
let zonaEditandoId = null;
let zonaEditandoData = null;

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
// RENDERIZAR LISTA DE ZONAS (SOLO DATOS, NO HTML)
// =====================================================
function renderizarListaRiesgos() {
    if (!listaRiesgos) return;
    
    if (riesgosData.length === 0) {
        listaRiesgos.innerHTML = '<div class="loading-spinner">No hay zonas de riesgo</div>';
        return;
    }
    
    // Delegar la construcción del HTML a una función de renderizado
    listaRiesgos.innerHTML = construirTarjetasRiesgo(riesgosData);
}

// =====================================================
// CONSTRUIR TARJETAS DE RIESGO (FUNCIÓN PURA)
// =====================================================
function construirTarjetasRiesgo(data) {
    return data.map(r => `
        <div class="riesgo-card" data-id="${r.id}" onclick="centrarEnZona(${r.id})">
            <div class="riesgo-card-header">
                <div class="riesgo-card-titulo">
                    <strong>⚠️ ${r.nombre}</strong>
                    <span class="riesgo-nivel ${r.nivel || 'medio'}">${r.nivel?.toUpperCase() || 'MEDIO'}</span>
                </div>
                <div class="riesgo-card-acciones">
                    <button class="btn-editar" onclick="event.stopPropagation();editarZona(${r.id})">✏️</button>
                    <button class="btn-eliminar" onclick="event.stopPropagation();eliminarZona(${r.id})">🗑️</button>
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
// RENDERIZAR ZONAS EN EL MAPA (SOLO LÓGICA)
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
    maxWidth: 280,      // ← MÁS PEQUEÑO
    minWidth: 180,      // ← MÍNIMO
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
// CONSTRUIR POPUP (FUNCIÓN PURA)
// =====================================================
function construirPopupRiesgo(zona, coords) {
    const icono = getIconoPorNivel(zona.nivel);
    const nivelTexto = zona.nivel?.toUpperCase() || 'MEDIO';
    const color = getColorPorNivel(zona.nivel);
    
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
            </div>
            
        </div>
    `;
}

// =====================================================
// FUNCIONES AUXILIARES PURAS
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
// CENTRAR MAPA EN ZONA
// =====================================================
function centrarEnZona(id) {
    const zona = riesgosData.find(r => r.id === id);
    if (!zona || !mapa) {
        mostrarToast('⚠️ Zona no encontrada', 'warning');
        return;
    }
    
    try {
        const geo = JSON.parse(zona.coordenadas_poligono);
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
        
        const latSum = coords.reduce((sum, c) => sum + c[0], 0);
        const lngSum = coords.reduce((sum, c) => sum + c[1], 0);
        const centerLat = latSum / coords.length;
        const centerLng = lngSum / coords.length;
        
        mapa.setView([centerLat, centerLng], 15);
        
        // Resaltar el polígono
        poligonosRiesgo.forEach(p => p.setStyle({ weight: 3, opacity: 0.8 }));
        const index = riesgosData.findIndex(r => r.id === id);
        if (index !== -1 && poligonosRiesgo[index]) {
            poligonosRiesgo[index].setStyle({ weight: 6, opacity: 1, color: '#ffffff' });
            poligonosRiesgo[index].openPopup();
            setTimeout(() => {
                if (poligonosRiesgo[index]) renderizarMapaRiesgos();
            }, 3000);
        }
        
        mostrarToast(`📍 ${zona.nombre}`, 'info');
    } catch (error) {
        console.error('Error al centrar en zona:', error);
        mostrarToast('❌ Error al centrar en la zona', 'error');
    }
}

// =====================================================
// EDITAR ZONA
// =====================================================
async function editarZona(id) {
    console.log('✏️ EDITAR ZONA ID:', id);
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        if (!res.ok) throw new Error('Error al obtener los datos de la zona');
        
        const zona = await res.json();
        zonaEditandoId = id;
        zonaEditandoData = zona;
        
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
        console.error('❌ Error al cargar zona para editar:', error);
        mostrarToast('❌ Error al cargar los datos de la zona', 'error');
    }
}

// =====================================================
// BOTÓN GUARDAR (CREACIÓN DINÁMICA CON CLASES CSS)
// =====================================================
function mostrarBotonGuardarEdicion() {
    const btnAnterior = document.getElementById('btn-guardar-edicion');
    if (btnAnterior) btnAnterior.remove();
    
    const btnGuardar = document.createElement('button');
    btnGuardar.id = 'btn-guardar-edicion';
    btnGuardar.className = 'btn-guardar-flotante';
    btnGuardar.textContent = '💾 Guardar Cambios';
    btnGuardar.onclick = guardarPoligonoEditado;
    
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) mapContainer.appendChild(btnGuardar);
}

// =====================================================
// GUARDAR POLÍGONO EDITADO
// =====================================================
// =====================================================
// GUARDAR POLÍGONO EDITADO - GUARDA DIRECTO + FORMULARIO
// =====================================================
function guardarPoligonoEditado() {
    console.log('💾 [3] GUARDAR POLÍGONO EDITADO - INICIO');
    console.log('💾 [3] polygonEditando:', polygonEditando);
    console.log('💾 [3] zonaEditandoData:', zonaEditandoData);
    console.log('💾 [3] zonaEditandoId:', zonaEditandoId);
    
    if (!polygonEditando) {
        console.error('❌ [3] polygonEditando es null');
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    if (!zonaEditandoData) {
        console.error('❌ [3] zonaEditandoData es null');
        mostrarToast('⚠️ No hay datos de la zona', 'warning');
        return;
    }
    
    // =============================================
    // PASO 1: GUARDAR EL POLÍGONO DIRECTO
    // =============================================
    try {
        console.log('🔍 [3] Obteniendo puntos del polígono...');
        
        const latlngs = polygonEditando.getLatLngs()[0];
        console.log('📍 [3] LatLngs raw:', latlngs);
        
        if (!latlngs || latlngs.length < 3) {
            console.error('❌ [3] El polígono no tiene suficientes puntos:', latlngs?.length);
            mostrarToast('⚠️ El polígono no tiene suficientes puntos', 'warning');
            return;
        }
        
        console.log(`📍 [3] Número de puntos: ${latlngs.length}`);
        
        const coordenadas = latlngs.map(c => [c.lng, c.lat]);
        console.log('📍 [3] Coordenadas [lng, lat]:', coordenadas);
        
        coordenadas.push(coordenadas[0]);
        console.log('📍 [3] Coordenadas cerradas:', coordenadas);
        
        const geojson = {
            type: 'Polygon',
            coordinates: [coordenadas]
        };
        
        console.log('📦 [3] GeoJSON final:', JSON.stringify(geojson));
        
        // =============================================
        // PASO 2: GUARDAR DIRECTO EN EL BACKEND
        // =============================================
        guardarPoligonoYMostrarFormulario(zonaEditandoId, geojson);
        
    } catch (error) {
        console.error('❌ [3] Error al obtener coordenadas:', error);
        mostrarToast('❌ Error al leer el polígono', 'error');
    }
}

// =====================================================
// GUARDAR POLÍGONO Y LUEGO MOSTRAR FORMULARIO
// =====================================================
async function guardarPoligonoYMostrarFormulario(id, geojson) {
    try {
        console.log('📤 [4] Guardando polígono en el backend...');
        
        const payload = {
            nombre: zonaEditandoData.nombre,
            tipo: zonaEditandoData.tipo,
            nivel: zonaEditandoData.nivel,
            descripcion: zonaEditandoData.descripcion || '',
            poblacion_afectada: zonaEditandoData.poblacion_afectada || 0,
            viviendas_afectadas: zonaEditandoData.viviendas_afectadas || 0,
            coordenadas_poligono: JSON.stringify(geojson)
        };
        
        console.log('📤 [4] Payload:', payload);
        
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
        console.log('📥 [4] Respuesta:', data);
        
        if (res.ok) {
            mostrarToast('✅ Polígono guardado correctamente', 'success');
            
            // =============================================
            // PASO 3: ABRIR FORMULARIO PARA EDITAR DATOS
            // =============================================
            mostrarFormularioEdicion(id);
            
        } else {
            mostrarToast(`❌ ${data.error || 'Error al guardar el polígono'}`, 'error');
        }
    } catch (error) {
        console.error('❌ [4] Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// MOSTRAR FORMULARIO DE EDICIÓN (DATOS)
// =====================================================
function mostrarFormularioEdicion(id) {
    if (!zonaEditandoData) {
        mostrarToast('⚠️ No hay zona seleccionada', 'warning');
        return;
    }
    
    const zona = zonaEditandoData;
    
    modalTitulo.textContent = '✏️ Editar Datos de la Zona';
    modalBody.innerHTML = `
        <form id="form-zona-edit" class="form-reporte">
            <div style="background:#e0f2fe;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:0.8rem;color:#1e3a8a;">
                ✅ El polígono ya fue guardado. Ahora puedes editar los datos.
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
}

// =====================================================
// ACTUALIZAR SOLO DATOS (EL POLÍGONO YA ESTÁ GUARDADO)
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
                // NOTA: NO enviamos coordenadas_poligono porque ya está guardado
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            mostrarToast('✅ Datos actualizados correctamente', 'success');
            cerrarModal();
            limpiarCompleto();
            cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error actualizando datos:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ENVIAR ACTUALIZACIÓN AL BACKEND
// =====================================================
async function enviarActualizacion(id, geojson) {
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
            mostrarToast('✅ Polígono actualizado correctamente', 'success');
            limpiarEdicion();
            cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al guardar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
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
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
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
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
}

// =====================================================
// CANCELAR EDICIÓN
// =====================================================
function cancelarEdicionPoligono() {
    limpiarCompleto();
    cerrarModal();
    mostrarToast('⏹️ Edición cancelada', 'info');
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
// EXPORTAR GLOBALES
// =====================================================
window.cargarRiesgos = cargarRiesgos;
window.editarZona = editarZona;
window.eliminarZona = eliminarZona;
window.cancelarEdicionPoligono = cancelarEdicionPoligono;
window.centrarEnZona = centrarEnZona;
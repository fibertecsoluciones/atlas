// =====================================================
// ZONAS DE RIESGO - MÓDULO COMPLETO
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
// EDITAR ZONA (SOLO POLÍGONO, SIN MODAL)
// =====================================================
async function editarZona(id) {
    try {
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
        
        // Mostrar botón guardar
        mostrarBotonGuardarEdicion();
        
        mostrarToast('🔄 Arrastra los puntos azules para modificar el polígono. Luego haz clic en "💾 Guardar"', 'info');
        
    } catch (error) {
        console.error('❌ Error al cargar zona para editar:', error);
        mostrarToast('❌ Error al cargar los datos de la zona', 'error');
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
        guardarPoligonoDirecto();
    };
    
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.appendChild(btnGuardar);
    }
}

// =====================================================
// GUARDAR POLÍGONO EDITADO - VERSIÓN CORREGIDA
// =====================================================
function guardarPoligonoDirecto() {
    console.log('💾 Intentando guardar polígono editado...');
    
    if (!polygonEditando) {
        mostrarToast('⚠️ No hay polígono para guardar', 'warning');
        return;
    }
    
    if (!zonaEditandoData) {
        mostrarToast('⚠️ No hay datos de la zona', 'warning');
        return;
    }
    
    try {
        // Obtener puntos actuales del polígono
        const latlngs = polygonEditando.getLatLngs()[0];
        
        if (!latlngs || latlngs.length < 3) {
            mostrarToast('⚠️ El polígono no tiene suficientes puntos', 'warning');
            return;
        }
        
        console.log('📍 Puntos del polígono:', latlngs);
        
        // Convertir a coordenadas [lng, lat]
        const coordenadas = latlngs.map(c => [c.lng, c.lat]);
        coordenadas.push(coordenadas[0]); // Cerrar polígono
        
        const geojson = {
            type: 'Polygon',
            coordinates: [coordenadas]
        };
        
        console.log('📦 GeoJSON a guardar:', JSON.stringify(geojson));
        
        if (!confirm(`¿Guardar cambios del polígono de "${zonaEditandoData.nombre}"?`)) {
            return;
        }
        
        guardarZonaEditada(zonaEditandoId, geojson, zonaEditandoData);
        
    } catch (error) {
        console.error('❌ Error al obtener coordenadas del polígono:', error);
        mostrarToast('❌ Error al leer el polígono', 'error');
    }
}

// =====================================================
// GUARDAR ZONA EDITADA (EN EL BACKEND)
// =====================================================
async function guardarZonaEditada(id, geojson, datos) {
    try {
        console.log('📤 Enviando al backend:', { id, geojson, datos });
        
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
        console.log('📥 Respuesta del backend:', data);
        
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
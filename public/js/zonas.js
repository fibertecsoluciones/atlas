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
    console.log('📡 [1] Cargando zonas de riesgo...');
    
    if (!window.userData?.municipio?.slug) {
        console.warn('⚠️ [1] No hay municipio seleccionado');
        return;
    }
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: {
                'X-Municipio-Slug': window.userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('📡 [1] Respuesta HTTP:', res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        riesgosData = await res.json();
        console.log('📡 [1] Zonas recibidas:', riesgosData.length);
        
        if (statsRiesgos) statsRiesgos.textContent = riesgosData.length;
        
        renderizarListaRiesgos();
        renderizarMapaRiesgos();
        
    } catch (error) {
        console.error('❌ [1] Error cargando zonas:', error);
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
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>⚠️ ${r.nombre}</strong>
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;margin-left:10px;background:${getNivelColor(r.nivel)};color:white;">
                        ${r.nivel?.toUpperCase() || 'MEDIO'}
                    </span>
                </div>
                <div>
                    <button onclick="event.stopPropagation();editarZona(${r.id})" 
                            style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">
                        ✏️
                    </button>
                    <button onclick="event.stopPropagation();eliminarZona(${r.id})" 
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
// EDITAR ZONA - CON LOGS
// =====================================================
async function editarZona(id) {
    console.log('✏️ [2] EDITAR ZONA ID:', id);
    
    try {
        const res = await fetch(`/api/zonas/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            }
        });
        
        console.log('📡 [2] Respuesta HTTP:', res.status);
        
        if (!res.ok) {
            throw new Error('Error al obtener los datos de la zona');
        }
        
        const zona = await res.json();
        console.log('📦 [2] Datos de la zona:', zona);
        
        // =============================================
        // GUARDAR DATOS EN VARIABLES GLOBALES
        // =============================================
        zonaEditandoId = id;
        zonaEditandoData = zona;
        console.log('💾 [2] zonaEditandoData guardado:', zonaEditandoData);
        
        // Limpiar polígono anterior (sin borrar los datos)
        if (polygonEditando) {
            mapa.removeLayer(polygonEditando);
            polygonEditando = null;
        }
        
        const geo = JSON.parse(zona.coordenadas_poligono);
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
        
        console.log('📍 [2] Puntos del polígono:', coords);
        
        polygonEditando = L.polygon(coords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        }).addTo(mapa);
        
        mapa.fitBounds(polygonEditando.getBounds(), { padding: [50, 50] });
        polygonEditando.editing.enable();
        
        console.log('✅ [2] Polígono dibujado y editable');
        
        mostrarBotonGuardarEdicion();
        mostrarToast('🔄 Arrastra los puntos azules para modificar el polígono', 'info');
        
    } catch (error) {
        console.error('❌ [2] Error al cargar zona para editar:', error);
        mostrarToast('❌ Error al cargar los datos de la zona', 'error');
    }
}

// =====================================================
// BOTÓN GUARDAR
// =====================================================
function mostrarBotonGuardarEdicion() {
    const btnAnterior = document.getElementById('btn-guardar-edicion');
    if (btnAnterior) btnAnterior.remove();
    
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
    if (mapContainer) mapContainer.appendChild(btnGuardar);
}

// =====================================================
// GUARDAR POLÍGONO EDITADO - CON LOGS DETALLADOS
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
        
        if (!confirm(`¿Guardar cambios de "${zonaEditandoData.nombre}"?`)) {
            console.log('❌ [3] Usuario canceló');
            return;
        }
        
        console.log('📤 [3] Enviando al backend...');
        enviarActualizacion(zonaEditandoId, geojson);
        
    } catch (error) {
        console.error('❌ [3] Error al obtener coordenadas:', error);
        mostrarToast('❌ Error al leer el polígono', 'error');
    }
}

// =====================================================
// ENVIAR ACTUALIZACIÓN AL BACKEND - CON LOGS
// =====================================================
async function enviarActualizacion(id, geojson) {
    console.log('📤 [4] ENVIANDO ACTUALIZACIÓN - ID:', id);
    console.log('📤 [4] GeoJSON:', geojson);
    
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
        
        console.log('📤 [4] Payload completo:', payload);
        console.log('📤 [4] coordenadas_poligono:', payload.coordenadas_poligono);
        
        const res = await fetch(`/api/zonas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': window.userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📥 [4] Respuesta HTTP:', res.status);
        console.log('📥 [4] Respuesta OK?', res.ok);
        
        const data = await res.json();
        console.log('📥 [4] Datos de respuesta:', data);
        
        if (res.ok) {
            console.log('✅ [4] ¡ÉXITO! Polígono actualizado');
            mostrarToast('✅ Polígono actualizado correctamente', 'success');
            limpiarEdicion();
            cargarRiesgos(); // ← CORREGIDO: cargarRiesgos (no cargarRiegos)
        } else {
            console.error('❌ [4] Error del backend:', data);
            mostrarToast(`❌ ${data.error || 'Error al guardar'}`, 'error');
        }
    } catch (error) {
        console.error('❌ [4] Error de conexión:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// LIMPIAR EDICIÓN (SIN BORRAR DATOS)
// =====================================================
function limpiarEdicion() {
    console.log('🧹 [5] Limpiando edición...');
    
    // SOLO LIMPIAR EL POLÍGONO DEL MAPA, NO LOS DATOS
    if (polygonEditando) {
        mapa.removeLayer(polygonEditando);
        polygonEditando = null;
    }
    
    // NO BORRAR zonaEditandoId ni zonaEditandoData aquí
    // Se borrarán después de guardar exitosamente
    
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
    
    console.log('✅ [5] Edición limpiada (datos conservados)');
}

// =====================================================
// LIMPIAR TODO DESPUÉS DE GUARDAR
// =====================================================
function limpiarCompleto() {
    console.log('🧹 [6] Limpiando completo...');
    
    if (polygonEditando) {
        mapa.removeLayer(polygonEditando);
        polygonEditando = null;
    }
    zonaEditandoId = null;
    zonaEditandoData = null;
    
    const btn = document.getElementById('btn-guardar-edicion');
    if (btn) btn.remove();
    
    console.log('✅ [6] Limpieza completa');
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
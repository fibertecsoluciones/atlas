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
            <div class="popup-footer">
                <span>ID: ${zona.id}</span>
                <span>📍 ${coords.length} puntos</span>
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
function guardarPoligonoEditado() {
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
        
        if (!confirm(`¿Guardar cambios de "${zonaEditandoData.nombre}"?`)) return;
        
        enviarActualizacion(zonaEditandoId, geojson);
        
    } catch (error) {
        console.error('❌ Error al obtener coordenadas:', error);
        mostrarToast('❌ Error al leer el polígono', 'error');
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
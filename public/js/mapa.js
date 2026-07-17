// =====================================================
// MAPA PRINCIPAL - LEAFLET (ÍNDICE)
// =====================================================

let mapaPrincipal = null;
let marcadorSeleccionado = null;
let ubicacionSeleccionada = null;

// =====================================================
// INICIALIZAR MAPA
// =====================================================
function iniciarMapa() {
    if (mapaPrincipal) {
        mapaPrincipal.remove();
        mapaPrincipal = null;
    }
    
    // Obtener centro del municipio seleccionado
    const selector = document.getElementById('municipio-selector');
    const slug = selector?.value || 'las-choapas';
    const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
    
    mapaPrincipal = L.map('mapa-principal').setView([centro.lat, centro.lng], centro.zoom || 13);
    
    // TileLayer de Google (gratuito)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: 'Map data &copy; Google',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapaPrincipal);
    
    // Evento de clic en el mapa
    mapaPrincipal.on('click', function(e) {
        seleccionarUbicacion(e.latlng.lat, e.latlng.lng);
    });
    
    // Limpiar selección anterior
    marcadorSeleccionado = null;
    ubicacionSeleccionada = null;
    
    // Notificar que el mapa está listo
    if (window.onMapaIniciado) {
        window.onMapaIniciado();
    }
    
    return mapaPrincipal;
}

// =====================================================
// SELECCIONAR UBICACIÓN
// =====================================================
function seleccionarUbicacion(lat, lng) {
    // Eliminar marcador anterior
    if (marcadorSeleccionado) {
        mapaPrincipal.removeLayer(marcadorSeleccionado);
    }
    
    // Crear nuevo marcador (arrastrable)
    marcadorSeleccionado = L.marker([lat, lng], { draggable: true })
        .addTo(mapaPrincipal);
    
    // Evento de arrastre
    marcadorSeleccionado.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        ubicacionSeleccionada = { lat: pos.lat, lng: pos.lng };
        actualizarInfoUbicacion(pos.lat, pos.lng);
    });
    
    // Guardar ubicación
    ubicacionSeleccionada = { lat, lng };
    
    // Centrar mapa
    mapaPrincipal.setView([lat, lng], 16);
    
    // Actualizar UI
    actualizarInfoUbicacion(lat, lng);
    const btn = document.getElementById('btn-enviar');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🚨 Enviar Reporte de Emergencia';
    }
    
    // Notificar a incidentes.js
    if (window.onUbicacionSeleccionada) {
        window.onUbicacionSeleccionada(ubicacionSeleccionada);
    }
}

// =====================================================
// ACTUALIZAR INFO UBICACIÓN
// =====================================================
function actualizarInfoUbicacion(lat, lng) {
    const infoDiv = document.getElementById('ubicacion-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            ✅ <strong>Ubicación seleccionada:</strong><br>
            📍 Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
            ✏️ Puedes arrastrar el marcador para ajustar
        `;
    }
}

// =====================================================
// CENTRAR EN UBICACIÓN ACTUAL (GPS)
// =====================================================
function centrarEnUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                mapaPrincipal.setView([lat, lng], 16);
                
                // Agregar marcador temporal
                const icono = L.divIcon({
                    html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>`,
                    iconSize: [20, 20]
                });
                L.marker([lat, lng], { icon: icono })
                    .bindPopup('📍 Tu ubicación actual')
                    .addTo(mapaPrincipal);
            },
            () => {
                alert('No se pudo obtener tu ubicación. Verifica los permisos.');
            }
        );
    } else {
        alert('Tu navegador no soporta geolocalización.');
    }
}

// =====================================================
// OBTENER UBICACIÓN SELECCIONADA
// =====================================================
function obtenerUbicacionSeleccionada() {
    return ubicacionSeleccionada;
}

// =====================================================
// LIMPIAR SELECCIÓN
// =====================================================
function limpiarSeleccion() {
    if (marcadorSeleccionado) {
        mapaPrincipal.removeLayer(marcadorSeleccionado);
        marcadorSeleccionado = null;
    }
    ubicacionSeleccionada = null;
    const btn = document.getElementById('btn-enviar');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '📍 Selecciona una ubicación en el mapa';
    }
    const infoDiv = document.getElementById('ubicacion-info');
    if (infoDiv) {
        infoDiv.innerHTML = '✏️ Haz clic en el mapa para marcar la ubicación';
    }
}

// =====================================================
// CAMBIAR MUNICIPIO
// =====================================================
function cambiarMunicipio(slug) {
    const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
    if (mapaPrincipal) {
        mapaPrincipal.setView([centro.lat, centro.lng], centro.zoom || 13);
        limpiarSeleccion();
    }
}

// =====================================================
// EXPONER FUNCIONES GLOBALES
// =====================================================
window.iniciarMapa = iniciarMapa;
window.seleccionarUbicacion = seleccionarUbicacion;
window.centrarEnUbicacion = centrarEnUbicacion;
window.obtenerUbicacionSeleccionada = obtenerUbicacionSeleccionada;
window.limpiarSeleccion = limpiarSeleccion;
window.cambiarMunicipio = cambiarMunicipio;
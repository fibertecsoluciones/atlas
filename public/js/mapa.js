// =====================================================
// GOOGLE MAPS - LÓGICA PRINCIPAL
// =====================================================

let mapa;
let marcadorSeleccionado = null;
let marcadoresCapa = [];
let poligonosCapa = [];
let infoWindow = null;
let municipioActual = null;
let drawingManager = null;

// =====================================================
// INICIALIZAR MAPA
// =====================================================
function iniciarMapa() {
    // Obtener municipio del usuario (si está logueado)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    municipioActual = user.municipio?.slug || 'las-choapas';
    
    // Centro por defecto
    const centro = CENTROS_MUNICIPIOS[municipioActual] || DEFAULT_CENTER;
    
    // Crear mapa
    mapa = new google.maps.Map(document.getElementById('mapa-google'), {
        center: { lat: centro.lat, lng: centro.lng },
        zoom: centro.zoom || 14,
        mapTypeId: 'roadmap',
        streetViewControl: true,
        fullscreenControl: true,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    // Inicializar InfoWindow
    infoWindow = new google.maps.InfoWindow();
    
    // Evento de clic en el mapa
    mapa.addListener('click', function(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        seleccionarUbicacion(lat, lng);
    });
    
    // Activar herramientas de dibujo
    activarDibujo();
    
    // Cargar datos iniciales
    cargarCapasMapa();
    
    // Disparar evento de inicio
    if (window.onMapaIniciado) {
        window.onMapaIniciado();
    }
}

// =====================================================
// SELECCIONAR UBICACIÓN
// =====================================================
function seleccionarUbicacion(lat, lng) {
    // Eliminar marcador anterior
    if (marcadorSeleccionado) {
        marcadorSeleccionado.setMap(null);
    }
    
    // Crear nuevo marcador
    marcadorSeleccionado = new google.maps.Marker({
        position: { lat, lng },
        map: mapa,
        draggable: true,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#dc2626',
            fillOpacity: 0.9,
            strokeColor: 'white',
            strokeWeight: 3,
            scale: 14,
            labelOrigin: new google.maps.Point(0, -10)
        },
        label: {
            text: '📍',
            fontSize: '20px'
        }
    });
    
    // Evento de arrastre
    marcadorSeleccionado.addListener('dragend', function(event) {
        const pos = event.latLng;
        actualizarInfoUbicacion(pos.lat(), pos.lng());
    });
    
    // Centrar mapa
    mapa.setCenter({ lat, lng });
    mapa.setZoom(16);
    
    // Actualizar info
    actualizarInfoUbicacion(lat, lng);
    
    // Habilitar botón
    const btn = document.getElementById('btn-enviar');
    btn.disabled = false;
    btn.innerHTML = '🚨 Enviar Reporte de Emergencia';
    
    // Guardar en variable global
    window.ubicacionSeleccionada = { lat, lng };
}

// =====================================================
// ACTUALIZAR INFO UBICACIÓN
// =====================================================
async function actualizarInfoUbicacion(lat, lng) {
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
// ACTIVAR HERRAMIENTA DE DIBUJO
// =====================================================
function activarDibujo() {
    // Solo para usuarios autenticados
    const token = localStorage.getItem('token');
    if (!token) return;
    
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon', 'rectangle']
        },
        polygonOptions: {
            fillColor: '#f59e0b',
            fillOpacity: 0.3,
            strokeColor: '#dc2626',
            strokeWeight: 2,
            editable: true,
            draggable: true
        },
        rectangleOptions: {
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            strokeColor: '#1e3a8a',
            strokeWeight: 2,
            editable: true,
            draggable: true
        }
    });
    
    drawingManager.setMap(mapa);
    
    // Escuchar cuando se completa un dibujo
    google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
        guardarPoligono(polygon);
    });
    
    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {
        guardarRectangulo(rectangle);
    });
}

// =====================================================
// GUARDAR POLÍGONO
// =====================================================
async function guardarPoligono(polygon) {
    const vertices = polygon.getPath().getArray();
    const coordenadas = vertices.map(v => [v.lng(), v.lat()]);
    coordenadas.push(coordenadas[0]);
    
    const geojson = {
        type: 'Polygon',
        coordinates: [coordenadas]
    };
    
    const nombre = prompt('Nombre de la zona de riesgo:');
    if (!nombre) {
        polygon.setMap(null);
        return;
    }
    
    const tipo = prompt('Tipo (inundacion, deslizamiento, incendio, sismo, vendaval):') || 'otro';
    const nivel = prompt('Nivel (critico, alto, medio, bajo):') || 'medio';
    
    try {
        const response = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': municipioActual
            },
            body: JSON.stringify({
                nombre,
                tipo,
                nivel,
                coordenadas_poligono: JSON.stringify(geojson)
            })
        });
        
        if (response.ok) {
            alert('✅ Zona de riesgo guardada');
            cargarCapasMapa();
        } else {
            alert('❌ Error al guardar');
            polygon.setMap(null);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
        polygon.setMap(null);
    }
}

// =====================================================
// GUARDAR RECTÁNGULO
// =====================================================
async function guardarRectangulo(rectangle) {
    const bounds = rectangle.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    const coordenadas = [
        [sw.lng(), sw.lat()],
        [ne.lng(), sw.lat()],
        [ne.lng(), ne.lat()],
        [sw.lng(), ne.lat()],
        [sw.lng(), sw.lat()]
    ];
    
    const geojson = {
        type: 'Polygon',
        coordinates: [coordenadas]
    };
    
    const nombre = prompt('Nombre de la zona de riesgo:');
    if (!nombre) {
        rectangle.setMap(null);
        return;
    }
    
    const tipo = prompt('Tipo:') || 'otro';
    const nivel = prompt('Nivel (critico, alto, medio, bajo):') || 'medio';
    
    try {
        const response = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': municipioActual
            },
            body: JSON.stringify({
                nombre,
                tipo,
                nivel,
                coordenadas_poligono: JSON.stringify(geojson)
            })
        });
        
        if (response.ok) {
            alert('✅ Zona de riesgo guardada');
            cargarCapasMapa();
        } else {
            alert('❌ Error al guardar');
            rectangle.setMap(null);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
        rectangle.setMap(null);
    }
}

// =====================================================
// CARGAR CAPAS DEL MAPA
// =====================================================
async function cargarCapasMapa() {
    limpiarCapas();
    
    // Cargar incidentes
    await cargarIncidentesMapa();
    
    // Cargar albergues
    await cargarAlberguesMapa();
    
    // Cargar zonas de riesgo
    await cargarZonasRiesgoMapa();
}

// =====================================================
// CARGAR INCIDENTES EN EL MAPA
// =====================================================
async function cargarIncidentesMapa() {
    try {
        const response = await fetch(`/api/incidentes/mapa`, {
            headers: { 'X-Municipio-Slug': municipioActual }
        });
        const incidentes = await response.json();
        
        incidentes.forEach(inc => {
            let color = '#ef4444';
            if (inc.prioridad === 2) color = '#f59e0b';
            if (inc.prioridad === 3) color = '#10b981';
            
            const marker = new google.maps.Marker({
                position: { lat: inc.latitud, lng: inc.longitud },
                map: mapa,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeColor: 'white',
                    strokeWeight: 2,
                    scale: 12
                },
                title: inc.tipo
            });
            
            const content = `
                <div class="info-marcador">
                    <h3>🚨 ${inc.tipo.toUpperCase()}</h3>
                    <p><strong>Estado:</strong> ${inc.estado}</p>
                    <p><strong>Prioridad:</strong> ${inc.prioridad === 1 ? 'Alta' : inc.prioridad === 2 ? 'Media' : 'Baja'}</p>
                    <p>${inc.descripcion || 'Sin descripción'}</p>
                    <p><small>${formatFecha(inc.fecha_reporte)}</small></p>
                    ${inc.foto_url ? `<img src="${inc.foto_url}" class="foto">` : ''}
                </div>
            `;
            
            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open(mapa, marker);
            });
            
            marcadoresCapa.push(marker);
        });
        
    } catch (error) {
        console.error('Error cargando incidentes:', error);
    }
}

// =====================================================
// CARGAR ALBERGUES EN EL MAPA
// =====================================================
async function cargarAlberguesMapa() {
    try {
        const response = await fetch(`/api/albergues/mapa`, {
            headers: { 'X-Municipio-Slug': municipioActual }
        });
        const albergues = await response.json();
        
        albergues.forEach(alb => {
            const marker = new google.maps.Marker({
                position: { lat: alb.latitud, lng: alb.longitud },
                map: mapa,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new google.maps.Size(32, 32)
                },
                title: alb.nombre
            });
            
            const ocupacion = alb.capacidad_total > 0 
                ? Math.round((alb.ocupacion_actual / alb.capacidad_total) * 100)
                : 0;
            
            let estadoColor = '';
            if (ocupacion >= 100) estadoColor = '🔴 LLENO';
            else if (ocupacion >= 80) estadoColor = '🟠 ALTO';
            else if (ocupacion >= 50) estadoColor = '🟡 MEDIO';
            else estadoColor = '🟢 DISPONIBLE';
            
            const content = `
                <div class="info-marcador">
                    <h3>🏠 ${alb.nombre}</h3>
                    <p><strong>Capacidad:</strong> ${alb.ocupacion_actual}/${alb.capacidad_total}</p>
                    <p><strong>Ocupación:</strong> ${ocupacion}% ${estadoColor}</p>
                    <p><strong>Encargado:</strong> ${alb.encargado_nombre || 'No registrado'}</p>
                    <p><strong>Teléfono:</strong> ${alb.encargado_telefono || 'N/A'}</p>
                    <p><strong>Servicios:</strong> ${alb.servicios?.join(', ') || 'No especificados'}</p>
                </div>
            `;
            
            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open(mapa, marker);
            });
            
            marcadoresCapa.push(marker);
        });
        
    } catch (error) {
        console.error('Error cargando albergues:', error);
    }
}

// =====================================================
// CARGAR ZONAS DE RIESGO
// =====================================================
async function cargarZonasRiesgoMapa() {
    try {
        const response = await fetch(`/api/zonas`, {
            headers: { 'X-Municipio-Slug': municipioActual }
        });
        const zonas = await response.json();
        
        zonas.forEach(zona => {
            const geojson = JSON.parse(zona.coordenadas_poligono);
            
            let color = '#ef4444';
            if (zona.nivel === 'medio') color = '#f59e0b';
            if (zona.nivel === 'bajo') color = '#10b981';
            
            const polygon = new google.maps.Polygon({
                paths: geojson.coordinates[0].map(c => ({ lat: c[1], lng: c[0] })),
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: color,
                fillOpacity: 0.3,
                map: mapa,
                title: zona.nombre
            });
            
            const content = `
                <div class="info-marcador">
                    <h3>⚠️ ${zona.nombre}</h3>
                    <p><strong>Tipo:</strong> ${zona.tipo}</p>
                    <p><strong>Nivel:</strong> ${zona.nivel.toUpperCase()}</p>
                    <p>${zona.descripcion || ''}</p>
                </div>
            `;
            
            polygon.addListener('click', (event) => {
                infoWindow.setPosition(event.latLng);
                infoWindow.setContent(content);
                infoWindow.open(mapa);
            });
            
            poligonosCapa.push(polygon);
        });
        
    } catch (error) {
        console.error('Error cargando zonas de riesgo:', error);
    }
}

// =====================================================
// LIMPIAR CAPAS
// =====================================================
function limpiarCapas() {
    marcadoresCapa.forEach(m => m.setMap(null));
    poligonosCapa.forEach(p => p.setMap(null));
    marcadoresCapa = [];
    poligonosCapa = [];
}

// =====================================================
// CENTRAR EN UBICACIÓN ACTUAL
// =====================================================
function centrarEnUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                mapa.setCenter(pos);
                mapa.setZoom(16);
                
                // Agregar marcador temporal
                new google.maps.Marker({
                    position: pos,
                    map: mapa,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#3b82f6',
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                        scale: 8
                    },
                    title: 'Tu ubicación'
                });
            },
            () => {
                alert('No se pudo obtener tu ubicación. Verifica los permisos.');
            }
        );
    } else {
        alert('Tu navegador no soporta geolocalización');
    }
}

// =====================================================
// FUNCIÓN GLOBAL PARA CAMBIAR MUNICIPIO
// =====================================================
window.cambiarMunicipioMapa = function(slug) {
    municipioActual = slug;
    const centro = CENTROS_MUNICIPIOS[slug] || DEFAULT_CENTER;
    mapa.setCenter({ lat: centro.lat, lng: centro.lng });
    mapa.setZoom(centro.zoom || 13);
    limpiarCapas();
    cargarCapasMapa();
};

// =====================================================
// FUNCIONES GLOBALES
// =====================================================
window.centrarEnUbicacion = centrarEnUbicacion;
window.cargarCapasMapa = cargarCapasMapa;

// =====================================================
// EXPONER FUNCIONES PARA INCIDENTES.JS
// =====================================================
window.obtenerUbicacionSeleccionada = function() {
    return window.ubicacionSeleccionada || null;
};

window.limpiarSeleccion = function() {
    if (marcadorSeleccionado) {
        marcadorSeleccionado.setMap(null);
        marcadorSeleccionado = null;
    }
    window.ubicacionSeleccionada = null;
    const btn = document.getElementById('btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '📍 Selecciona una ubicación en el mapa';
};
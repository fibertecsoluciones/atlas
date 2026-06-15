// =====================================================
// LÓGICA DEL MAPA - SISTEMA ATLAS SAS
// =====================================================

class MapaManager {
    constructor() {
        this.mapa = null;
        this.marcador = null;
        this.ubicacionSeleccionada = null;
        this.municipioActual = null;
    }
    
    // Inicializar mapa
    init(containerId = 'mapa') {
        this.mapa = L.map(containerId).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_CENTER.zoom);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.mapa);
        
        // Evento de clic en el mapa
        this.mapa.on('click', (e) => {
            this.seleccionarUbicacion(e.latlng.lat, e.latlng.lng);
        });
        
        return this.mapa;
    }
    
    // Seleccionar ubicación
    seleccionarUbicacion(lat, lng) {
        this.ubicacionSeleccionada = { lat, lng };
        
        if (this.marcador) {
            this.mapa.removeLayer(this.marcador);
        }
        
        this.marcador = L.marker([lat, lng], { draggable: true }).addTo(this.mapa);
        
        this.marcador.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.ubicacionSeleccionada = { lat: pos.lat, lng: pos.lng };
            this.actualizarInfoUbicacion(pos.lat, pos.lng);
        });
        
        this.mapa.setView([lat, lng], 16);
        this.actualizarInfoUbicacion(lat, lng);
        
        // Disparar evento
        if (window.onUbicacionSeleccionada) {
            window.onUbicacionSeleccionada(this.ubicacionSeleccionada);
        }
    }
    
    // Actualizar información de ubicación en UI
    actualizarInfoUbicacion(lat, lng) {
        const infoDiv = document.getElementById('ubicacion-info');
        if (infoDiv) {
            infoDiv.innerHTML = `
                ✅ <strong>Ubicación seleccionada:</strong><br>
                📍 Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                ✏️ Puedes arrastrar el marcador para ajustar
            `;
        }
    }
    
    // Cambiar centro del mapa
    cambiarCentro(lat, lng, zoom = 13) {
        this.mapa.setView([lat, lng], zoom);
    }
    
    // Obtener ubicación actual del usuario (GPS)
    obtenerUbicacionActual() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocalización no soportada');
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error.message);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }
    
    // Limpiar marcador
    limpiarMarcador() {
        if (this.marcador) {
            this.mapa.removeLayer(this.marcador);
            this.marcador = null;
        }
        this.ubicacionSeleccionada = null;
    }
}

// Instancia global
const mapaManager = new MapaManager();
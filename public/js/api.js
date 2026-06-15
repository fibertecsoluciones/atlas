// =====================================================
// API CLIENT - SISTEMA ATLAS SAS
// =====================================================

class APIClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }
    
    // Obtener headers (con token si existe)
    getHeaders(municipioSlug = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (municipioSlug) {
            headers['X-Municipio-Slug'] = municipioSlug;
        }
        
        return headers;
    }
    
    // =====================================================
    // INCIDENTES
    // =====================================================
    
    async reportarIncidente(datos, municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/incidentes`, {
            method: 'POST',
            headers: this.getHeaders(municipioSlug),
            body: JSON.stringify(datos)
        });
        return response.json();
    }
    
    async obtenerIncidentes(municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/incidentes/mapa`, {
            headers: this.getHeaders(municipioSlug)
        });
        return response.json();
    }
    
    async actualizarEstadoIncidente(id, estado, municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/incidentes/${id}/estado`, {
            method: 'PUT',
            headers: this.getHeaders(municipioSlug),
            body: JSON.stringify({ estado })
        });
        return response.json();
    }
    
    // =====================================================
    // ALBERGUES
    // =====================================================
    
    async obtenerAlbergues(municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/albergues/mapa`, {
            headers: this.getHeaders(municipioSlug)
        });
        return response.json();
    }
    
    // =====================================================
    // ZONAS DE RIESGO
    // =====================================================
    
    async obtenerZonasRiesgo(municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/zonas`, {
            headers: this.getHeaders(municipioSlug)
        });
        return response.json();
    }
    
    // =====================================================
    // AUTENTICACIÓN
    // =====================================================
    
    async login(email, password, municipioSlug) {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, municipio_slug: municipioSlug })
        });
        return response.json();
    }
    
    async obtenerMunicipios() {
        const response = await fetch(`${this.baseUrl}/api/auth/municipios`);
        return response.json();
    }
}

// Instancia global
const api = new APIClient();
// =====================================================
// INCIDENTES - MÓDULO COMPLETO (CON INIT FUNCIONAL)
// =====================================================

let incidentesData = [];
let marcadoresIncidentes = [];

// =====================================================
// REFERENCIAS DOM
// =====================================================
const statsResueltos = document.getElementById('stats-resueltos');

// =====================================================
// ICONOS POR TIPO DE INCIDENTE
// =====================================================
const ICONOS_INCIDENTES = {
    incendio: { emoji: '🔥', color: '#ef4444', label: 'Incendio' },
    inundacion: { emoji: '🌊', color: '#3b82f6', label: 'Inundación' },
    deslizamiento: { emoji: '⛰️', color: '#f59e0b', label: 'Deslizamiento' },
    accidente: { emoji: '🚗', color: '#f97316', label: 'Accidente' },
    arbol_caido: { emoji: '🌳', color: '#10b981', label: 'Árbol caído' },
    fuga_gas: { emoji: '⛽', color: '#ef4444', label: 'Fuga de gas' },
    explosion: { emoji: '💥', color: '#dc2626', label: 'Explosión' },
    rescate: { emoji: '🆘', color: '#8b5cf6', label: 'Rescate' },
    otro: { emoji: '⚠️', color: '#6b7280', label: 'Otro' }
};

function getIconoIncidente(tipo) {
    return ICONOS_INCIDENTES[tipo] || ICONOS_INCIDENTES.otro;
}

// =====================================================
// INICIALIZAR - ESTO ES LO QUE FALTABA
// =====================================================
function init() {
    console.log('🚀 Inicializando Incidentes...');
    
    // Verificar que Leaflet está cargado
    if (typeof L === 'undefined') {
        console.log('⏳ Esperando Leaflet...');
        setTimeout(init, 500);
        return;
    }
    
    // Inicializar mapa
    if (typeof window.iniciarMapa === 'function') {
        window.iniciarMapa();
    } else {
        console.error('❌ iniciarMapa no está definida');
    }
    
    // Cargar municipios (si existe la función)
    if (typeof cargarMunicipios === 'function') {
        cargarMunicipios();
    }
    
    // Inicializar tipos de emergencia
    initTiposEmergencia();
    
    // Evento del botón enviar (solo si existe)
    const btnEnviar = document.getElementById('btn-enviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviarReporte);
    }
    
    console.log('✅ Incidentes.js inicializado');
}

// =====================================================
// INICIALIZAR TIPOS DE EMERGENCIA
// =====================================================
function initTiposEmergencia() {
    const tiposCards = document.querySelectorAll('.tipo-card');
    
    tiposCards.forEach(card => {
        card.addEventListener('click', function() {
            tiposCards.forEach(c => c.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            const tipo = this.dataset.tipo;
            document.getElementById('tipo-seleccionado').value = tipo;
        });
    });
}

// =====================================================
// CARGAR MUNICIPIOS
// =====================================================
async function cargarMunicipios() {
    const selector = document.getElementById('municipio-selector');
    if (!selector) return;
    
    try {
        const response = await fetch('/api/auth/municipios');
        const municipios = await response.json();
        
        selector.innerHTML = '<option value="">Selecciona tu municipio</option>';
        
        if (Array.isArray(municipios) && municipios.length > 0) {
            municipios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.slug;
                option.textContent = m.nombre;
                selector.appendChild(option);
            });
            
            // Seleccionar el primer municipio por defecto
            if (municipios.length > 0) {
                selector.value = municipios[0].slug;
                // Cambiar centro del mapa
                if (typeof window.cambiarMunicipio === 'function') {
                    window.cambiarMunicipio(municipios[0].slug);
                }
            }
        }
    } catch (error) {
        console.error('Error cargando municipios:', error);
    }
}

// =====================================================
// ENVIAR REPORTE
// =====================================================
async function enviarReporte() {
    const municipioSelector = document.getElementById('municipio-selector');
    const tipoSeleccionado = document.getElementById('tipo-seleccionado');
    const descripcionInput = document.getElementById('descripcion');
    const fotoInput = document.getElementById('foto');
    const nombreInput = document.getElementById('nombre');
    const telefonoInput = document.getElementById('telefono');
    const btnEnviar = document.getElementById('btn-enviar');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('success');
    const errorDiv = document.getElementById('error');
    
    const municipioSlug = municipioSelector.value;
    if (!municipioSlug) {
        alert('⚠️ Por favor, selecciona tu municipio');
        return;
    }
    
    const tipo = tipoSeleccionado.value;
    if (!tipo) {
        alert('⚠️ Por favor, selecciona el tipo de emergencia');
        return;
    }
    
    const descripcion = descripcionInput.value.trim();
    if (!descripcion) {
        alert('⚠️ Por favor, describe la emergencia');
        return;
    }
    
    const ubicacion = window.obtenerUbicacionSeleccionada ? window.obtenerUbicacionSeleccionada() : null;
    if (!ubicacion) {
        alert('⚠️ Por favor, haz clic en el mapa para seleccionar la ubicación');
        return;
    }
    
    btnEnviar.disabled = true;
    loadingDiv.style.display = 'block';
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    const datos = {
        latitud: ubicacion.lat,
        longitud: ubicacion.lng,
        tipo: tipo,
        descripcion: descripcion,
        ciudadano_nombre: nombreInput.value.trim() || 'Anónimo',
        ciudadano_telefono: telefonoInput.value.trim() || null
    };
    
    try {
        const result = await api.reportarIncidente(datos, municipioSlug);
        
        if (result.success || result.id) {
            successDiv.style.display = 'block';
            
            descripcionInput.value = '';
            nombreInput.value = '';
            telefonoInput.value = '';
            fotoInput.value = '';
            
            document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('seleccionado'));
            tipoSeleccionado.value = '';
            
            if (window.limpiarSeleccion) {
                window.limpiarSeleccion();
            }
            
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '📍 Selecciona una ubicación en el mapa';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        } else {
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } finally {
        loadingDiv.style.display = 'none';
        btnEnviar.disabled = false;
    }
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================
window.cargarIncidentes = cargarIncidentes;
window.filtrarIncidentes = filtrarIncidentes;
window.cambiarEstadoIncidente = cambiarEstadoIncidente;
window.eliminarIncidente = eliminarIncidente;

// =====================================================
// INICIAR CUANDO EL DOM ESTÉ LISTO
// =====================================================
document.addEventListener('DOMContentLoaded', init);
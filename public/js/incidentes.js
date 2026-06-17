// =====================================================
// LÓGICA DE INCIDENTES - SISTEMA ATLAS SAS
// =====================================================

// Referencias DOM
const municipioSelector = document.getElementById('municipio-selector');
const tipoSeleccionado = document.getElementById('tipo-seleccionado');
const descripcionInput = document.getElementById('descripcion');
const fotoInput = document.getElementById('foto');
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const btnEnviar = document.getElementById('btn-enviar');
const loadingIncidenteDiv = document.getElementById('loading');
const successIncidenteDiv = document.getElementById('success');  // ← RENOMBRADO
const errorIncidenteDiv = document.getElementById('error');      // ← RENOMBRADO

// Estado
let tipoActual = null;

// =====================================================
// CARGAR MUNICIPIOS
// =====================================================
async function cargarMunicipios() {
    try {
        const municipios = await api.obtenerMunicipios();
        
        municipioSelector.innerHTML = '<option value="">Selecciona tu municipio</option>';
        
        municipios.forEach(m => {
            const option = document.createElement('option');
            option.value = m.slug;
            option.textContent = m.nombre;
            municipioSelector.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando municipios:', error);
    }
}

// =====================================================
// SELECCIÓN DE TIPO DE EMERGENCIA
// =====================================================
function initTiposEmergencia() {
    const tiposCards = document.querySelectorAll('.tipo-card');
    
    tiposCards.forEach(card => {
        card.addEventListener('click', function() {
            tiposCards.forEach(c => c.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            tipoActual = this.dataset.tipo;
            tipoSeleccionado.value = tipoActual;
        });
    });
}

// =====================================================
// ENVIAR REPORTE
// =====================================================
async function enviarReporte() {
    const municipioSlug = municipioSelector.value;
    if (!municipioSlug) {
        alert('⚠️ Por favor, selecciona tu municipio');
        return;
    }
    
    if (!tipoActual) {
        alert('⚠️ Por favor, selecciona el tipo de emergencia');
        return;
    }
    
    const descripcion = descripcionInput.value.trim();
    if (!descripcion) {
        alert('⚠️ Por favor, describe la emergencia');
        return;
    }
    
    // Obtener ubicación usando la función global
    const ubicacion = window.obtenerUbicacionSeleccionada ? window.obtenerUbicacionSeleccionada() : null;
    if (!ubicacion) {
        alert('⚠️ Por favor, haz clic en el mapa para seleccionar la ubicación');
        return;
    }
    
    // Deshabilitar botón y mostrar loading
    btnEnviar.disabled = true;
    loadingIncidenteDiv.style.display = 'block';
    successIncidenteDiv.style.display = 'none';
    errorIncidenteDiv.style.display = 'none';
    
    const datos = {
        latitud: ubicacion.lat,
        longitud: ubicacion.lng,
        tipo: tipoActual,
        descripcion: descripcion,
        ciudadano_nombre: nombreInput.value.trim() || 'Anónimo',
        ciudadano_telefono: telefonoInput.value.trim() || null
    };
    
    try {
        const result = await api.reportarIncidente(datos, municipioSlug);
        
        if (result.success || result.id) {
            successIncidenteDiv.style.display = 'block';
            
            // Limpiar formulario
            descripcionInput.value = '';
            nombreInput.value = '';
            telefonoInput.value = '';
            fotoInput.value = '';
            
            // Limpiar tipo seleccionado
            document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('seleccionado'));
            tipoActual = null;
            tipoSeleccionado.value = '';
            
            // Limpiar marcador
            if (window.limpiarSeleccion) {
                window.limpiarSeleccion();
            }
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '📍 Selecciona una ubicación en el mapa';
            
            setTimeout(() => {
                successIncidenteDiv.style.display = 'none';
            }, 5000);
        } else {
            errorIncidenteDiv.style.display = 'block';
            setTimeout(() => {
                errorIncidenteDiv.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        errorIncidenteDiv.style.display = 'block';
        setTimeout(() => {
            errorIncidenteDiv.style.display = 'none';
        }, 5000);
    } finally {
        loadingIncidenteDiv.style.display = 'none';
        btnEnviar.disabled = false;
    }
}

// =====================================================
// CALLBACK CUANDO SE SELECCIONA UBICACIÓN
// =====================================================
window.onUbicacionSeleccionada = (ubicacion) => {
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = '🚨 Enviar Reporte de Emergencia';
};

// =====================================================
// CAMBIO DE MUNICIPIO
// =====================================================
municipioSelector.addEventListener('change', (e) => {
    const slug = e.target.value;
    if (slug && window.cambiarMunicipio) {
        window.cambiarMunicipio(slug);
    }
});

// =====================================================
// INICIALIZAR
// =====================================================
function init() {
    // Verificar que Leaflet está cargado
    if (typeof L === 'undefined') {
        console.log('Esperando Leaflet...');
        setTimeout(init, 500);
        return;
    }
    
    // Inicializar mapa
    if (window.iniciarMapa) {
        window.iniciarMapa();
    }
    
    // Cargar municipios
    cargarMunicipios();
    
    // Inicializar tipos de emergencia
    initTiposEmergencia();
    
    // Evento del botón enviar
    document.getElementById('btn-enviar').addEventListener('click', enviarReporte);
    
    console.log('✅ Incidentes.js inicializado con Leaflet');
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
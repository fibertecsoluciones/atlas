// =====================================================
// LÓGICA DE INCIDENTES - SISTEMA ATLAS SAS
// =====================================================

// Referencias DOM - VERIFICAR QUE EXISTEN
const municipioSelector = document.getElementById('municipio-selector');
const tipoSeleccionado = document.getElementById('tipo-seleccionado');
const descripcionInput = document.getElementById('descripcion');
const fotoInput = document.getElementById('foto');
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const btnEnviar = document.getElementById('btn-enviar');
const loadingIncidenteDiv = document.getElementById('loading');
const successIncidenteDiv = document.getElementById('success');
const errorIncidenteDiv = document.getElementById('error');

// Estado
let tipoActual = null;

// =====================================================
// CARGAR MUNICIPIOS
// =====================================================
async function cargarMunicipios() {
    if (!municipioSelector) return;
    
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
    if (!tiposCards.length) return;
    
    tiposCards.forEach(card => {
        card.addEventListener('click', function() {
            tiposCards.forEach(c => c.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            tipoActual = this.dataset.tipo;
            if (tipoSeleccionado) tipoSeleccionado.value = tipoActual;
        });
    });
}

// =====================================================
// ENVIAR REPORTE
// =====================================================
async function enviarReporte() {
    if (!municipioSelector) {
        alert('⚠️ Error: selector de municipio no disponible');
        return;
    }
    
    const municipioSlug = municipioSelector.value;
    if (!municipioSlug) {
        alert('⚠️ Por favor, selecciona tu municipio');
        return;
    }
    
    if (!tipoActual) {
        alert('⚠️ Por favor, selecciona el tipo de emergencia');
        return;
    }
    
    if (!descripcionInput) return;
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
    if (btnEnviar) btnEnviar.disabled = true;
    if (loadingIncidenteDiv) loadingIncidenteDiv.style.display = 'block';
    if (successIncidenteDiv) successIncidenteDiv.style.display = 'none';
    if (errorIncidenteDiv) errorIncidenteDiv.style.display = 'none';
    
    const datos = {
        latitud: ubicacion.lat,
        longitud: ubicacion.lng,
        tipo: tipoActual,
        descripcion: descripcion,
        ciudadano_nombre: nombreInput ? nombreInput.value.trim() || 'Anónimo' : 'Anónimo',
        ciudadano_telefono: telefonoInput ? telefonoInput.value.trim() || null : null
    };
    
    try {
        const result = await api.reportarIncidente(datos, municipioSlug);
        
        if (result.success || result.id) {
            if (successIncidenteDiv) successIncidenteDiv.style.display = 'block';
            
            // Limpiar formulario
            if (descripcionInput) descripcionInput.value = '';
            if (nombreInput) nombreInput.value = '';
            if (telefonoInput) telefonoInput.value = '';
            if (fotoInput) fotoInput.value = '';
            
            // Limpiar tipo seleccionado
            document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('seleccionado'));
            tipoActual = null;
            if (tipoSeleccionado) tipoSeleccionado.value = '';
            
            // Limpiar marcador
            if (window.limpiarSeleccion) {
                window.limpiarSeleccion();
            }
            if (btnEnviar) {
                btnEnviar.disabled = true;
                btnEnviar.innerHTML = '📍 Selecciona una ubicación en el mapa';
            }
            
            setTimeout(() => {
                if (successIncidenteDiv) successIncidenteDiv.style.display = 'none';
            }, 5000);
        } else {
            if (errorIncidenteDiv) errorIncidenteDiv.style.display = 'block';
            setTimeout(() => {
                if (errorIncidenteDiv) errorIncidenteDiv.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        if (errorIncidenteDiv) errorIncidenteDiv.style.display = 'block';
        setTimeout(() => {
            if (errorIncidenteDiv) errorIncidenteDiv.style.display = 'none';
        }, 5000);
    } finally {
        if (loadingIncidenteDiv) loadingIncidenteDiv.style.display = 'none';
        if (btnEnviar) btnEnviar.disabled = false;
    }
}

// =====================================================
// CALLBACK CUANDO SE SELECCIONA UBICACIÓN
// =====================================================
window.onUbicacionSeleccionada = (ubicacion) => {
    if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '🚨 Enviar Reporte de Emergencia';
    }
};

// =====================================================
// CAMBIO DE MUNICIPIO
// =====================================================
if (municipioSelector) {
    municipioSelector.addEventListener('change', (e) => {
        const slug = e.target.value;
        if (slug && window.cambiarMunicipio) {
            window.cambiarMunicipio(slug);
        }
    });
}

// =====================================================
// INICIALIZAR - SOLO SI ESTAMOS EN LA PÁGINA DE REPORTE
// =====================================================
function init() {
    // Verificar que estamos en la página de reporte (tiene el formulario)
    if (!document.getElementById('form-reporte') && !document.querySelector('.form-panel')) {
        console.log('ℹ️ Incidentes.js: No estamos en la página de reporte, omitiendo inicialización');
        return;
    }
    
    // Verificar que Leaflet está cargado
    if (typeof L === 'undefined') {
        console.log('Esperando Leaflet...');
        setTimeout(init, 500);
        return;
    }
    
    // Inicializar mapa si existe
    if (window.iniciarMapa) {
        window.iniciarMapa();
    }
    
    // Cargar municipios
    cargarMunicipios();
    
    // Inicializar tipos de emergencia
    initTiposEmergencia();
    
    // Evento del botón enviar (solo si existe)
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviarReporte);
    }
    
    console.log('✅ Incidentes.js inicializado');
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
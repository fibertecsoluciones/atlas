// =====================================================
// LÓGICA DE INCIDENTES - SISTEMA ATLAS SAS
// =====================================================

// Referencias DOM
const municipioSelector = document.getElementById('municipio-selector');
const tiposContainer = document.getElementById('tipos-emergencia');
const tipoSeleccionado = document.getElementById('tipo-seleccionado');
const descripcionInput = document.getElementById('descripcion');
const fotoInput = document.getElementById('foto');
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const btnEnviar = document.getElementById('btn-enviar');
const loadingDiv = document.getElementById('loading');
const successDiv = document.getElementById('success');
const errorDiv = document.getElementById('error');

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
            // Remover selección anterior
            tiposCards.forEach(c => c.classList.remove('seleccionado'));
            
            // Seleccionar nuevo
            this.classList.add('seleccionado');
            tipoActual = this.dataset.tipo;
            tipoSeleccionado.value = tipoActual;
        });
    });
}

// =====================================================
// SUBIR FOTO (si es necesario)
// =====================================================
async function subirFoto(file) {
    // Por ahora, no implementamos subida de fotos
    // Se puede agregar después con Cloudinary o similar
    return null;
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
    
    if (!mapaManager.ubicacionSeleccionada) {
        alert('⚠️ Por favor, haz clic en el mapa para seleccionar la ubicación');
        return;
    }
    
    // Deshabilitar botón y mostrar loading
    btnEnviar.disabled = true;
    loadingDiv.style.display = 'block';
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    const datos = {
        latitud: mapaManager.ubicacionSeleccionada.lat,
        longitud: mapaManager.ubicacionSeleccionada.lng,
        tipo: tipoActual,
        descripcion: descripcion,
        ciudadano_nombre: nombreInput.value.trim() || 'Anónimo',
        ciudadano_telefono: telefonoInput.value.trim() || null
    };
    
    // Subir foto si existe
    const foto = fotoInput.files[0];
    if (foto) {
        // Por ahora no implementamos subida
        // datos.foto_url = await subirFoto(foto);
    }
    
    try {
        const result = await api.reportarIncidente(datos, municipioSlug);
        
        if (result.success || result.id) {
            successDiv.style.display = 'block';
            
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
            mapaManager.limpiarMarcador();
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '📍 Selecciona una ubicación en el mapa';
            
            // Ocultar éxito después de 5 segundos
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
    if (slug && CENTROS_MUNICIPIOS[slug]) {
        const centro = CENTROS_MUNICIPIOS[slug];
        mapaManager.cambiarCentro(centro.lat, centro.lng, centro.zoom);
    }
});

// =====================================================
// INICIALIZAR
// =====================================================
function init() {
    // Inicializar mapa
    mapaManager.init();
    
    // Cargar municipios
    cargarMunicipios();
    
    // Inicializar tipos de emergencia
    initTiposEmergencia();
    
    // Evento del botón enviar
    btnEnviar.addEventListener('click', enviarReporte);
    
    // Intentar obtener ubicación actual para centrar el mapa
    mapaManager.obtenerUbicacionActual()
        .then(ubicacion => {
            mapaManager.cambiarCentro(ubicacion.lat, ubicacion.lng, 15);
        })
        .catch(error => {
            console.log('No se pudo obtener ubicación:', error);
        });
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
// =====================================================
// AUTENTICACIÓN - FRONTEND (NO USAR require)
// =====================================================

// Referencias DOM
const loginForm = document.getElementById('login-form');
const municipioSelect = document.getElementById('municipio');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

// =====================================================
// CARGAR MUNICIPIOS
// =====================================================
async function cargarMunicipiosLogin() {
    if (!municipioSelect) return;
    
    try {
        const response = await fetch('/api/auth/municipios');
        const municipios = await response.json();
        
        municipioSelect.innerHTML = '<option value="">Selecciona tu municipio</option>';
        
        if (Array.isArray(municipios) && municipios.length > 0) {
            municipios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.slug;
                option.textContent = m.nombre;
                municipioSelect.appendChild(option);
            });
        } else {
            municipioSelect.innerHTML += '<option value="" disabled>No hay municipios disponibles</option>';
        }
    } catch (error) {
        console.error('Error cargando municipios:', error);
        municipioSelect.innerHTML = '<option value="">Error al cargar municipios</option>';
    }
}

// =====================================================
// LOGIN
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    
    const municipioSlug = municipioSelect?.value;
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    
    if (!municipioSlug) {
        mostrarError('Selecciona un municipio');
        return;
    }
    
    if (!email || !password) {
        mostrarError('Completa todos los campos');
        return;
    }
    
    mostrarLoading(true);
    ocultarError();
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, municipio_slug: municipioSlug })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.usuario));
            window.location.href = '/dashboard.html';
        } else {
            mostrarError(data.error || 'Credenciales inválidas');
        }
    } catch (error) {
        console.error('Error en login:', error);
        mostrarError('Error de conexión. Intenta de nuevo.');
    } finally {
        mostrarLoading(false);
    }
}

// =====================================================
// VERIFICAR SESIÓN ACTIVA
// =====================================================
function verificarSesion() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        if (window.location.pathname.includes('login.html')) {
            window.location.href = '/dashboard.html';
        }
        return true;
    }
    
    if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/login.html';
        return false;
    }
    
    return false;
}

// =====================================================
// CERRAR SESIÓN
// =====================================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// =====================================================
// UTILIDADES UI
// =====================================================
function mostrarError(mensaje) {
    if (errorDiv) {
        errorDiv.innerText = mensaje;
        errorDiv.style.display = 'block';
    }
}

function ocultarError() {
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function mostrarLoading(show) {
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}

// =====================================================
// INICIALIZAR
// =====================================================
function initAuth() {
    verificarSesion();
    
    if (loginForm) {
        cargarMunicipiosLogin();
        loginForm.addEventListener('submit', handleLogin);
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAuth);

// Exportar funciones globales
window.logout = logout;
window.verificarSesion = verificarSesion;
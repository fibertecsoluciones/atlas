// =====================================================
// AUTENTICACIÓN - SISTEMA ATLAS SAS
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
// =====================================================
// CARGAR MUNICIPIOS EN EL SELECTOR
// =====================================================

async function cargarMunicipiosLogin() {
    const select = document.getElementById('municipio');
    if (!select) return;
    
    try {
        const response = await fetch('/api/auth/municipios');
        const municipios = await response.json();
        
        select.innerHTML = '<option value="">Selecciona tu municipio</option>';
        
        municipios.forEach(m => {
            const option = document.createElement('option');
            option.value = m.slug;
            option.textContent = m.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando municipios:', error);
        select.innerHTML = '<option value="">Error al cargar municipios</option>';
    }
}

// Llamar a la función cuando carga la página
document.addEventListener('DOMContentLoaded', cargarMunicipiosLogin);

// =====================================================
// LOGIN
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    
    const municipioSlug = municipioSelect?.value;
    const email = emailInput?.value;
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
        const data = await api.login(email, password, municipioSlug);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.usuario));
            window.location.href = '/dashboard.html';
        } else {
            mostrarError(data.error || 'Credenciales inválidas');
        }
    } catch (error) {
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
        // Está en login pero ya tiene sesión
        if (window.location.pathname.includes('login.html')) {
            window.location.href = '/dashboard.html';
        }
        return true;
    }
    
    // Está en dashboard pero no tiene sesión
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

document.addEventListener('DOMContentLoaded', initAuth);
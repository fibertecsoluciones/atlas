// =====================================================
// MÓDULO DE GESTIÓN DE USUARIOS
// =====================================================

let usuariosData = [];

// =====================================================
// CARGAR USUARIOS
// =====================================================
async function cargarUsuarios() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/usuarios', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        usuariosData = await response.json();
        renderizarListaUsuarios();
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        mostrarToast('❌ Error al cargar usuarios', 'error');
    }
}

// =====================================================
// RENDERIZAR LISTA DE USUARIOS
// =====================================================
function renderizarListaUsuarios() {
    const container = document.getElementById('lista-usuarios');
    if (!container) return;
    
    if (usuariosData.length === 0) {
        container.innerHTML = '<div class="loading-spinner">No hay usuarios registrados</div>';
        return;
    }
    
    container.innerHTML = usuariosData.map(u => `
        <div class="usuario-card" data-id="${u.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>👤 ${u.nombre_completo || u.email}</strong>
                    <span style="font-size:0.8rem;color:#64748b;margin-left:10px;">${u.email}</span>
                </div>
                <div>
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${u.rol === 'admin_municipal' ? '#dc2626' : '#3b82f6'};color:white;">
                        ${u.rol === 'admin_municipal' ? 'Admin' : u.rol}
                    </span>
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${u.activo ? '#10b981' : '#ef4444'};color:white;margin-left:5px;">
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button onclick="editarUsuario(${u.id})" style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">✏️</button>
                    <button onclick="eliminarUsuario(${u.id})" style="background:#ef4444;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">🗑️</button>
                </div>
            </div>
            <div style="font-size:0.8rem;color:#64748b;margin-top:4px;">
                Último acceso: ${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString() : 'Nunca'}
            </div>
        </div>
    `).join('');
}

// =====================================================
// ABRIR FORMULARIO CREAR USUARIO
// =====================================================
function abrirFormularioUsuario() {
    document.getElementById('modal-titulo').textContent = '👤 Nuevo Usuario';
    document.getElementById('modal-body').innerHTML = `
        <form id="form-usuario" class="form-reporte">
            <div class="form-group">
                <label>Correo electrónico *</label>
                <input type="email" id="u-email" placeholder="usuario@municipio.gob.mx" required>
            </div>
            <div class="form-group">
                <label>Contraseña *</label>
                <input type="password" id="u-password" placeholder="Mínimo 6 caracteres" required minlength="6">
            </div>
            <div class="form-group">
                <label>Nombre completo</label>
                <input type="text" id="u-nombre" placeholder="Nombre del operador">
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="u-rol">
                    <option value="operador">Operador</option>
                    <option value="admin_municipal">Administrador Municipal</option>
                </select>
            </div>
            <button type="submit" class="btn-enviar">✅ Crear Usuario</button>
        </form>
    `;
    
    document.getElementById('modal-overlay').style.display = 'flex';
    
    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearUsuario();
    });
}

// =====================================================
// CREAR USUARIO
// =====================================================
async function crearUsuario() {
    const email = document.getElementById('u-email').value.trim();
    const password = document.getElementById('u-password').value;
    const nombre_completo = document.getElementById('u-nombre').value.trim();
    const rol = document.getElementById('u-rol').value;
    
    if (!email || !password) {
        mostrarToast('⚠️ Email y contraseña son requeridos', 'warning');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, password, nombre_completo, rol })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Usuario creado exitosamente', 'success');
            cerrarModal();
            await cargarUsuarios();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al crear'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// EDITAR USUARIO
// =====================================================
async function editarUsuario(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/usuarios/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usuario = await response.json();
        
        document.getElementById('modal-titulo').textContent = '✏️ Editar Usuario';
        document.getElementById('modal-body').innerHTML = `
            <form id="form-usuario" class="form-reporte">
                <div class="form-group">
                    <label>Nombre completo</label>
                    <input type="text" id="u-nombre" value="${usuario.nombre_completo || ''}">
                </div>
                <div class="form-group">
                    <label>Nueva contraseña (dejar vacío para no cambiar)</label>
                    <input type="password" id="u-password" placeholder="Nueva contraseña">
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select id="u-rol">
                        <option value="operador" ${usuario.rol === 'operador' ? 'selected' : ''}>Operador</option>
                        <option value="admin_municipal" ${usuario.rol === 'admin_municipal' ? 'selected' : ''}>Administrador Municipal</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="u-activo">
                        <option value="true" ${usuario.activo ? 'selected' : ''}>Activo</option>
                        <option value="false" ${!usuario.activo ? 'selected' : ''}>Inactivo</option>
                    </select>
                </div>
                <button type="submit" class="btn-enviar">💾 Actualizar</button>
            </form>
        `;
        
        document.getElementById('modal-overlay').style.display = 'flex';
        
        document.getElementById('form-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            await actualizarUsuario(id);
        });
        
    } catch (error) {
        mostrarToast('❌ Error al cargar usuario', 'error');
    }
}

// =====================================================
// ACTUALIZAR USUARIO
// =====================================================
async function actualizarUsuario(id) {
    const nombre_completo = document.getElementById('u-nombre').value.trim();
    const password = document.getElementById('u-password').value;
    const rol = document.getElementById('u-rol').value;
    const activo = document.getElementById('u-activo').value === 'true';
    
    const data = { nombre_completo, rol, activo };
    if (password) data.password = password;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Usuario actualizado', 'success');
            cerrarModal();
            await cargarUsuarios();
        } else {
            mostrarToast(`❌ ${result.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ELIMINAR USUARIO
// =====================================================
async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            mostrarToast('✅ Usuario eliminado', 'success');
            await cargarUsuarios();
        } else {
            const data = await response.json();
            mostrarToast(`❌ ${data.error || 'Error al eliminar'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================
window.cargarUsuarios = cargarUsuarios;
window.abrirFormularioUsuario = abrirFormularioUsuario;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
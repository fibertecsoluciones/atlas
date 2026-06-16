// =====================================================
// MÓDULO DE GESTIÓN DE MUNICIPIOS
// =====================================================

let municipiosData = [];

// =====================================================
// CARGAR MUNICIPIOS
// =====================================================
async function cargarMunicipiosAdmin() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/municipios', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        municipiosData = await response.json();
        renderizarListaMunicipios();
        
    } catch (error) {
        console.error('Error cargando municipios:', error);
        mostrarToast('❌ Error al cargar municipios', 'error');
    }
}

// =====================================================
// RENDERIZAR LISTA DE MUNICIPIOS
// =====================================================
function renderizarListaMunicipios() {
    const container = document.getElementById('lista-municipios');
    if (!container) return;
    
    if (municipiosData.length === 0) {
        container.innerHTML = '<div class="loading-spinner">No hay municipios registrados</div>';
        return;
    }
    
    container.innerHTML = municipiosData.map(m => `
        <div class="municipio-card" data-id="${m.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>🏛️ ${m.nombre}</strong>
                    <span style="font-size:0.8rem;color:#64748b;margin-left:10px;">${m.slug}</span>
                </div>
                <div>
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${m.activo ? '#10b981' : '#ef4444'};color:white;">
                        ${m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button onclick="editarMunicipio(${m.id})" style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">✏️</button>
                    <button onclick="eliminarMunicipio(${m.id})" style="background:#ef4444;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:5px;">🗑️</button>
                </div>
            </div>
            <div style="font-size:0.8rem;color:#64748b;margin-top:4px;">${m.departamento || 'Sin departamento'}</div>
        </div>
    `).join('');
}

// =====================================================
// ABRIR FORMULARIO CREAR MUNICIPIO
// =====================================================
function abrirFormularioMunicipio() {
    document.getElementById('modal-titulo').textContent = '🏛️ Nuevo Municipio';
    document.getElementById('modal-body').innerHTML = `
        <form id="form-municipio" class="form-reporte">
            <div class="form-group">
                <label>Nombre del municipio *</label>
                <input type="text" id="m-nombre" placeholder="Ej: Las Choapas" required>
            </div>
            <div class="form-group">
                <label>Slug (identificador único) *</label>
                <input type="text" id="m-slug" placeholder="Ej: las-choapas" required>
                <small style="color:#64748b;">Sin espacios, usar guiones</small>
            </div>
            <div class="form-group">
                <label>Departamento</label>
                <input type="text" id="m-departamento" placeholder="Ej: Veracruz">
            </div>
            <button type="submit" class="btn-enviar">✅ Guardar Municipio</button>
        </form>
    `;
    
    document.getElementById('modal-overlay').style.display = 'flex';
    
    document.getElementById('form-municipio').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearMunicipio();
    });
}

// =====================================================
// CREAR MUNICIPIO
// =====================================================
async function crearMunicipio() {
    const nombre = document.getElementById('m-nombre').value.trim();
    const slug = document.getElementById('m-slug').value.trim();
    const departamento = document.getElementById('m-departamento').value.trim();
    
    if (!nombre || !slug) {
        mostrarToast('⚠️ Nombre y slug son requeridos', 'warning');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/municipios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, slug, departamento })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Municipio creado exitosamente', 'success');
            cerrarModal();
            await cargarMunicipiosAdmin();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al crear'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// EDITAR MUNICIPIO
// =====================================================
async function editarMunicipio(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/municipios/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const municipio = await response.json();
        
        document.getElementById('modal-titulo').textContent = '✏️ Editar Municipio';
        document.getElementById('modal-body').innerHTML = `
            <form id="form-municipio" class="form-reporte">
                <div class="form-group">
                    <label>Nombre del municipio *</label>
                    <input type="text" id="m-nombre" value="${municipio.nombre}" required>
                </div>
                <div class="form-group">
                    <label>Slug *</label>
                    <input type="text" id="m-slug" value="${municipio.slug}" required>
                </div>
                <div class="form-group">
                    <label>Departamento</label>
                    <input type="text" id="m-departamento" value="${municipio.departamento || ''}">
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="m-activo">
                        <option value="true" ${municipio.activo ? 'selected' : ''}>Activo</option>
                        <option value="false" ${!municipio.activo ? 'selected' : ''}>Inactivo</option>
                    </select>
                </div>
                <button type="submit" class="btn-enviar">💾 Actualizar</button>
            </form>
        `;
        
        document.getElementById('modal-overlay').style.display = 'flex';
        
        document.getElementById('form-municipio').addEventListener('submit', async (e) => {
            e.preventDefault();
            await actualizarMunicipio(id);
        });
        
    } catch (error) {
        mostrarToast('❌ Error al cargar municipio', 'error');
    }
}

// =====================================================
// ACTUALIZAR MUNICIPIO
// =====================================================
async function actualizarMunicipio(id) {
    const nombre = document.getElementById('m-nombre').value.trim();
    const slug = document.getElementById('m-slug').value.trim();
    const departamento = document.getElementById('m-departamento').value.trim();
    const activo = document.getElementById('m-activo').value === 'true';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/municipios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, slug, departamento, activo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Municipio actualizado', 'success');
            cerrarModal();
            await cargarMunicipiosAdmin();
        } else {
            mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// =====================================================
// ELIMINAR MUNICIPIO
// =====================================================
async function eliminarMunicipio(id) {
    if (!confirm('¿Estás seguro de eliminar este municipio?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/municipios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            mostrarToast('✅ Municipio eliminado', 'success');
            await cargarMunicipiosAdmin();
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
window.cargarMunicipiosAdmin = cargarMunicipiosAdmin;
window.abrirFormularioMunicipio = abrirFormularioMunicipio;
window.editarMunicipio = editarMunicipio;
window.eliminarMunicipio = eliminarMunicipio;
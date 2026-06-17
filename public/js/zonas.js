// =====================================================
// MÓDULO DE ZONAS DE RIESGO
// =====================================================

let riesgosData = [];
let poligonosRiesgo = [];
let dibujando = false;

// =====================================================
// CARGAR ZONAS DE RIESGO
// =====================================================
async function cargarRiesgos() {
    console.log('📡 Cargando zonas de riesgo...');
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/zonas`, {
            headers: {
                'X-Municipio-Slug': userData.municipio.slug,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        riesgosData = await res.json();
        console.log('📡 Zonas recibidas:', riesgosData.length);
        
        if (statsRiesgos) statsRiesgos.textContent = riesgosData.length;
        renderizarListaRiesgos();
        renderizarMapaRiesgos();
    } catch (error) {
        console.error('❌ Error cargando zonas:', error);
        if (listaRiesgos) listaRiesgos.innerHTML = '<div class="error">❌ Error al cargar zonas</div>';
    }
}

function renderizarListaRiesgos() {
    if (!listaRiesgos) return;
    if (riesgosData.length === 0) {
        listaRiesgos.innerHTML = `<div class="loading-spinner">No hay zonas de riesgo</div>
            <div style="text-align:center;margin-top:20px;">
                <p style="color:#6b7f9f;font-size:0.9rem;">Haz clic en "✏️ Dibujar" para crear una zona</p>
            </div>`;
        return;
    }
    listaRiesgos.innerHTML = riesgosData.map(r => `
        <div class="riesgo-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>⚠️ ${r.nombre}</strong>
                <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${getNivelColor(r.nivel)};color:white;">
                    ${r.nivel?.toUpperCase() || 'MEDIO'}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;">${r.tipo || 'Sin tipo'}</div>
        </div>
    `).join('');
}

function renderizarMapaRiesgos() {
    if (!mapa) return;
    poligonosRiesgo.forEach(p => mapa.removeLayer(p));
    poligonosRiesgo = [];
    
    riesgosData.forEach(r => {
        try {
            const geo = JSON.parse(r.coordenadas_poligono);
            const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
            let color = '#f59e0b';
            if (r.nivel === 'critico') color = '#dc2626';
            else if (r.nivel === 'alto') color = '#f97316';
            else if (r.nivel === 'medio') color = '#f59e0b';
            else color = '#10b981';
            
            const polygon = L.polygon(coords, {
                color: color, weight: 3, fillColor: color, fillOpacity: 0.3
            }).addTo(mapa)
              .bindPopup(`<b>⚠️ ${r.nombre}</b><br>Nivel: ${r.nivel?.toUpperCase() || 'MEDIO'}`);
            poligonosRiesgo.push(polygon);
        } catch(e) { console.error('Error parseando polígono:', e); }
    });
}

function activarDibujoPoligono() {
    console.log('🖊️ Botón Dibujar presionado');
    if (!mapa) { mostrarToast('⚠️ El mapa no está cargado', 'warning'); return; }
    if (dibujando) { mostrarToast('⚠️ Ya estás dibujando', 'warning'); return; }
    
    dibujando = true;
    mostrarToast('✏️ Dibuja un polígono en el mapa', 'info');
    if (drawingControl) drawingControl.setDrawingMode('polygon');
    
    mapa.once('draw:created', function(e) {
        const layer = e.layer;
        const coords = layer.getLatLngs()[0];
        const geojson = { type: 'Polygon', coordinates: [coords.map(c => [c.lng, c.lat])] };
        dibujando = false;
        mostrarFormularioZona(geojson, layer);
    });
    mapa.once('draw:drawstop', function() {
        dibujando = false;
        mostrarToast('⏹️ Dibujo cancelado', 'info');
    });
}

function mostrarFormularioZona(geojson, layer) {
    if (!modalOverlay) return;
    modalTitulo.textContent = '⚠️ Nueva Zona de Riesgo';
    modalBody.innerHTML = `
        <form id="form-zona" class="form-reporte">
            <div class="form-group">
                <label>Nombre de la zona *</label>
                <input type="text" id="z-nombre" placeholder="Ej: Barrio La Esperanza" required>
            </div>
            <div class="form-group">
                <label>Tipo de riesgo</label>
                <select id="z-tipo">
                    <option value="inundacion">🌊 Inundación</option>
                    <option value="deslizamiento">⛰️ Deslizamiento</option>
                    <option value="incendio">🔥 Incendio</option>
                    <option value="sismo">🌍 Sismo</option>
                    <option value="vendaval">💨 Vendaval</option>
                    <option value="otro">⚠️ Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nivel de riesgo</label>
                <select id="z-nivel">
                    <option value="critico">🔴 Crítico</option>
                    <option value="alto">🟠 Alto</option>
                    <option value="medio" selected>🟡 Medio</option>
                    <option value="bajo">🟢 Bajo</option>
                </select>
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="z-descripcion" rows="2" placeholder="Descripción de la zona"></textarea>
            </div>
            <div class="form-group">
                <label>Población afectada (opcional)</label>
                <input type="number" id="z-poblacion" placeholder="0" min="0">
            </div>
            <div class="form-group">
                <label>Viviendas afectadas (opcional)</label>
                <input type="number" id="z-viviendas" placeholder="0" min="0">
            </div>
            <button type="submit" class="btn-enviar">💾 Guardar Zona</button>
        </form>
    `;
    modalOverlay.style.display = 'flex';
    document.getElementById('form-zona').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarZona(geojson, layer);
    });
}

async function guardarZona(geojson, layer) {
    const nombre = document.getElementById('z-nombre').value.trim();
    const tipo = document.getElementById('z-tipo').value;
    const nivel = document.getElementById('z-nivel').value;
    const descripcion = document.getElementById('z-descripcion').value.trim();
    const poblacion = parseInt(document.getElementById('z-poblacion').value) || 0;
    const viviendas = parseInt(document.getElementById('z-viviendas').value) || 0;
    
    if (!nombre) { mostrarToast('⚠️ El nombre es requerido', 'warning'); return; }
    
    try {
        const res = await fetch('/api/zonas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Municipio-Slug': userData?.municipio?.slug || 'las-choapas'
            },
            body: JSON.stringify({
                nombre, tipo, nivel, descripcion,
                coordenadas_poligono: JSON.stringify(geojson),
                poblacion_afectada: poblacion,
                viviendas_afectadas: viviendas
            })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarToast('✅ Zona guardada', 'success');
            cerrarModal();
            await cargarRiesgos();
        } else {
            mostrarToast(`❌ ${data.error || 'Error'}`, 'error');
            if (layer) mapa.removeLayer(layer);
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
        if (layer) mapa.removeLayer(layer);
    }
}

// Exportar globales
window.cargarRiesgos = cargarRiesgos;
window.activarDibujoPoligono = activarDibujoPoligono;
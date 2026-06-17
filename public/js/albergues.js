// =====================================================
// MÓDULO DE ALBERGUES
// =====================================================

let alberguesData = [];
let marcadoresAlbergues = [];

// =====================================================
// CARGAR ALBERGUES
// =====================================================
async function cargarAlbergues() {
    console.log('📡 Cargando albergues...');
    if (!userData?.municipio?.slug) return;
    
    try {
        const res = await fetch(`/api/albergues/mapa`, {
            headers: { 'X-Municipio-Slug': userData.municipio.slug }
        });
        alberguesData = await res.json();
        console.log('📡 Albergues recibidos:', alberguesData.length);
        
        if (statsAlbergues) statsAlbergues.textContent = alberguesData.length;
        renderizarListaAlbergues();
        renderizarMapaAlbergues();
    } catch (error) {
        console.error('❌ Error cargando albergues:', error);
        if (listaAlbergues) listaAlbergues.innerHTML = '<div class="error">❌ Error al cargar albergues</div>';
    }
}

function renderizarListaAlbergues() {
    if (!listaAlbergues) return;
    if (alberguesData.length === 0) {
        listaAlbergues.innerHTML = '<div class="loading-spinner">No hay albergues</div>';
        return;
    }
    listaAlbergues.innerHTML = alberguesData.map(a => `
        <div class="albergue-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>🏠 ${a.nombre}</strong>
                <span style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${a.capacidad_total > 0 && (a.ocupacion_actual/a.capacidad_total) > 0.8 ? '#dc2626' : '#10b981'};color:white;">
                    ${a.ocupacion_actual}/${a.capacidad_total}
                </span>
            </div>
            <div style="font-size:0.8rem;color:#8a9bb5;">📍 ${a.direccion || 'Sin dirección'}</div>
            <div style="font-size:0.75rem;color:#6b7f9f;">👤 ${a.encargado_nombre || 'Sin encargado'} | 📞 ${a.encargado_telefono || 'N/A'}</div>
        </div>
    `).join('');
}

function renderizarMapaAlbergues() {
    if (!mapa) return;
    marcadoresAlbergues.forEach(m => mapa.removeLayer(m));
    marcadoresAlbergues = [];
    
    alberguesData.forEach(a => {
        let color = '#10b981';
        let pct = a.capacidad_total > 0 ? (a.ocupacion_actual / a.capacidad_total) * 100 : 0;
        if (pct > 80) color = '#f97316';
        if (pct >= 100) color = '#dc2626';
        
        const icono = crearIconoEmoji('🏠', color, 38, true);
        const marker = L.marker([a.latitud, a.longitud], { icon: icono })
            .addTo(mapa)
            .bindPopup(`<b>🏠 ${a.nombre}</b><br>Capacidad: ${a.ocupacion_actual}/${a.capacidad_total}<br>📍 ${a.direccion || ''}`);
        marcadoresAlbergues.push(marker);
    });
}

function abrirFormularioAlbergue() {
    mostrarToast('📝 Formulario de albergue en desarrollo', 'info');
}

// Exportar globales
window.cargarAlbergues = cargarAlbergues;
window.abrirFormularioAlbergue = abrirFormularioAlbergue;
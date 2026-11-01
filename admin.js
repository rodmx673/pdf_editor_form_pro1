const SECURE_TOKEN = 'PdfAdm1n_8f3a2b9c1d4e5f6g!';
const API_URL = 'https://pdf.teclingoingles.com/api/overlay-config';
const UPLOAD_URL = 'https://pdf.teclingoingles.com/api/upload-image';

let config = { active: true, background: 'dark', landing: [], editing: [] };
let selectedId = null;

function checkAdminPass() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === SECURE_TOKEN) { 
        sessionStorage.setItem('admin_token', pass);
        document.getElementById('admin-login-screen').style.display = 'none'; 
        loadConfig(); 
    } else { alert('Contraseña incorrecta'); }
}

if (sessionStorage.getItem('admin_token') === SECURE_TOKEN) {
    document.getElementById('admin-login-screen').style.display = 'none';
    setTimeout(loadConfig, 100);
}

async function loadConfig() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) { 
            config = await res.json(); 
            if (config.active === undefined) config.active = true;
            if (config.background === undefined) config.background = 'dark';
        }
    } catch (e) { console.log('Usando configuración por defecto'); }
    document.getElementById('layer-active-toggle').checked = config.active;
    document.getElementById('bg-toggle').checked = (config.background === 'transparent');
    updateCanvasBg();
    renderCanvas();
}

function toggleLayerActive() { config.active = document.getElementById('layer-active-toggle').checked; }
function toggleBackground() { config.background = document.getElementById('bg-toggle').checked ? 'transparent' : 'dark'; updateCanvasBg(); }

function updateCanvasBg() {
    const canvas = document.getElementById('canvas');
    if (config.background === 'transparent') {
        canvas.classList.remove('dark-bg'); canvas.classList.add('transparent-bg');
    } else {
        canvas.classList.remove('transparent-bg'); canvas.classList.add('dark-bg');
    }
}

function generateId() { return Math.random().toString(36).substr(2, 9); }

function addBlock(type) {
    const newBlock = { 
        id: generateId(), type: type, x: 100, y: 100, w: 300, h: 150, 
        content: type === 'text' ? 'Texto de ejemplo' : '', url: '',
        fontSize: 24, fontFamily: 'sans-serif'
    };
    config.landing.push(newBlock);
    selectedId = newBlock.id;
    renderCanvas();
}

function renderCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    config.landing.forEach(block => {
        const el = document.createElement('div');
        el.className = 'draggable-block' + (selectedId === block.id ? ' selected' : '');
        el.style.left = block.x + 'px'; el.style.top = block.y + 'px';
        el.style.width = block.w + 'px'; el.style.height = block.h + 'px';
        el.id = 'block-' + block.id;

        if (block.type === 'text') {
            el.innerHTML = `<div class="text-content" style="font-size:${block.fontSize || 24}px; font-family:${block.fontFamily || 'sans-serif'};">${block.content}</div>`;
        } else if (block.type === 'youtube') {
            const vid = block.url && block.url.includes('v=') ? block.url.split('v=')[1].split('&')[0] : '';
            el.innerHTML = vid ? `<iframe src="https://www.youtube.com/embed/${vid}" allow="autoplay"></iframe>` : 'Sin video';
        } else if (block.type === 'banner') {
            el.innerHTML = block.url ? `<img src="${block.url}">` : 'Sin imagen';
        }

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        el.appendChild(resizeHandle);
        setupDragAndDrop(el, resizeHandle, block);
        el.addEventListener('mousedown', (e) => { if(e.target !== resizeHandle && selectedId !== block.id) { selectedId = block.id; renderCanvas(); } });
        canvas.appendChild(el);
    });
    renderProperties();
}

function setupDragAndDrop(el, resizeHandle, block) {
    let isDragging = false, isResizing = false, startX, startY, startLeft, startTop, startW, startH;
    el.addEventListener('mousedown', (e) => {
        if (e.target === resizeHandle) isResizing = true; else isDragging = true;
        startX = e.clientX; startY = e.clientY; startLeft = block.x; startTop = block.y; startW = block.w; startH = block.h;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) { block.x = startLeft + (e.clientX - startX); block.y = startTop + (e.clientY - startY); el.style.left = block.x + 'px'; el.style.top = block.y + 'px'; }
        if (isResizing) { block.w = Math.max(50, startW + (e.clientX - startX)); block.h = Math.max(30, startH + (e.clientY - startY)); el.style.width = block.w + 'px'; el.style.height = block.h + 'px'; }
    });
    document.addEventListener('mouseup', () => { isDragging = false; isResizing = false; });
}

function renderProperties() {
    const panel = document.getElementById('properties-panel');
    if (!selectedId) { panel.innerHTML = '<p style="text-align: center; color: #999; font-size: 14px;">Selecciona un bloque para editar.</p>'; return; }
    const block = config.landing.find(b => b.id === selectedId);
    if (!block) return;
    
    let html = `<h3>Propiedades del Bloque</h3>`;
    if (block.type === 'text') {
        html += `
            <label>Texto</label>
            <input type="text" value="${block.content}" oninput="updateProp('content', this.value)">
            <label>Tamaño de letra (px)</label>
            <input type="number" value="${block.fontSize || 24}" oninput="updateProp('fontSize', this.value)" min="10" max="100">
            <label>Tipografía</label>
            <select onchange="updateProp('fontFamily', this.value)">
                <option value="sans-serif" ${block.fontFamily === 'sans-serif' ? 'selected' : ''}>Moderna (Sans-Serif)</option>
                <option value="serif" ${block.fontFamily === 'serif' ? 'selected' : ''}>Clásica (Serif)</option>
                <option value="monospace" ${block.fontFamily === 'monospace' ? 'selected' : ''}>Monoespaciada</option>
                <option value="Arial, sans-serif" ${block.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                <option value="'Times New Roman', serif" ${block.fontFamily === "'Times New Roman', serif" ? 'selected' : ''}>Times New Roman</option>
                <option value="Impact, sans-serif" ${block.fontFamily === 'Impact, sans-serif' ? 'selected' : ''}>Impact</option>
            </select>
        `;
    } else if (block.type === 'youtube') {
        html += `<label>URL de YouTube</label><input type="text" value="${block.url}" oninput="updateProp('url', this.value)" placeholder="https://youtube.com/watch?v=...">`;
    } else if (block.type === 'banner') {
        html += `
            <label>Subir Imagen (desde tu PC)</label>
            <input type="file" accept="image/*" onchange="uploadBannerImage(event)" style="margin-bottom: 10px;">
            <label>O pega una URL</label>
            <input type="text" value="${block.url}" oninput="updateProp('url', this.value)" placeholder="https://ejemplo.com/imagen.jpg">
        `;
    }
    html += `<button class="btn-danger" onclick="deleteBlock('${block.id}')">Eliminar Bloque</button>`;
    panel.innerHTML = html;
}

function updateProp(key, value) {
    const block = config.landing.find(b => b.id === selectedId);
    if (!block) return;
    block[key] = value;
    const el = document.getElementById('block-' + block.id);
    if (!el) return;
    if (block.type === 'text') {
        const d = el.querySelector('.text-content');
        if (d) {
            d.textContent = block.content;
            d.style.fontSize = (block.fontSize || 24) + 'px';
            d.style.fontFamily = block.fontFamily || 'sans-serif';
        }
    }
    else if (block.type === 'youtube') { const vid = value && value.includes('v=') ? value.split('v=')[1].split('&')[0] : ''; const i = el.querySelector('iframe'); if (vid && i) i.src = `https://www.youtube.com/embed/${vid}`; }
    else if (block.type === 'banner') { const img = el.querySelector('img'); if (img) img.src = value; }
}

async function uploadBannerImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        event.target.style.opacity = '0.5';
        const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'X-Admin-Token': SECURE_TOKEN }, body: formData });
        if (!res.ok) throw new Error('Error al subir la imagen');
        const data = await res.json();
        const fullUrl = 'https://pdf.teclingoingles.com' + data.url;
        updateProp('url', fullUrl);
        alert('¡Imagen subida con éxito!');
    } catch (e) { alert('Error al subir: ' + e.message); }
    finally { event.target.style.opacity = '1'; }
}

function deleteBlock(id) { config.landing = config.landing.filter(b => b.id !== id); selectedId = null; renderCanvas(); }
function clearAll() { if(confirm('¿Seguro que quieres borrar todo?')) { config.landing = []; selectedId = null; renderCanvas(); } }

async function saveConfig(preview) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': SECURE_TOKEN },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error('Error al guardar');
        alert('¡Configuración guardada en el servidor!');
        if (preview) window.location.href = 'index.html';
    } catch (e) { alert('Error: ' + e.message); }
}

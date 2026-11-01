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
    } catch (e) { console.log('Error cargando', e); }
    
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
        id: generateId(), type: type, 
        x: 30, y: 30, w: 40, h: 15, 
        content: type === 'text' ? 'Texto de ejemplo' : '', url: '',
        fontSize: 24, fontFamily: 'sans-serif', color: '#ffffff'
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
        el.style.left = block.x + '%'; el.style.top = block.y + '%';
        el.style.width = block.w + '%'; el.style.height = block.h + '%';
        el.id = 'block-' + block.id;

        if (block.type === 'text') {
            el.innerHTML = `<div class="text-content" style="font-size:${block.fontSize || 24}px; font-family:${block.fontFamily || 'sans-serif'}; color:${block.color || '#ffffff'};">${block.content}</div>`;
            } else if (block.type === 'youtube') {
        html += `<label>URL de YouTube</label><input type="text" value="\" oninput="updateProp('url', this.value)" placeholder="https://youtube.com/watch?v=...">`;
        html += `<label>Tamaño Predefinido</label>
        <select onchange="applyVideoRatio(this.value)">
            <option value="free" \>Libre (Ajuste manual)</option>
            <option value="16:9" \>Horizontal (16:9 - YouTube Normal)</option>
            <option value="9:16" \>Vertical (9:16 - Shorts/TikTok)</option>
            <option value="1:1" \>Cuadrado (1:1)</option>
        </select>`;
    } else if (block.type === 'banner') {
            el.innerHTML = block.url ? `<img src="${block.url}">` : 'Sin imagen';
        }

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        el.appendChild(resizeHandle);
        
        setupDragAndDrop(el, resizeHandle, block);
        
        el.addEventListener('mousedown', (e) => { 
            if(e.target !== resizeHandle && selectedId !== block.id) { 
                selectedId = block.id; 
                document.querySelectorAll('.draggable-block').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                renderProperties(); 
            } 
        });
        canvas.appendChild(el);
    });
}

function setupDragAndDrop(el, resizeHandle, block) {
    let isDragging = false, isResizing = false, startX, startY, startLeft, startTop, startW, startH;

    const handleStart = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (e.target === resizeHandle) isResizing = true; else isDragging = true;
        startX = clientX; startY = clientY; startLeft = block.x; startTop = block.y; startW = block.w; startH = block.h;
        if(e.cancelable) e.preventDefault();
    };

    const handleMove = (e) => {
        if (!isDragging && !isResizing) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const canvasW = el.parentElement.offsetWidth;
        const canvasH = el.parentElement.offsetHeight;
        
        if (isDragging) { 
            block.x = startLeft + ((clientX - startX) / canvasW) * 100; 
            block.y = startTop + ((clientY - startY) / canvasH) * 100; 
            el.style.left = block.x + '%'; el.style.top = block.y + '%'; 
        }
        if (isResizing) { 
            block.w = Math.max(5, startW + ((clientX - startX) / canvasW) * 100); 
            block.h = Math.max(5, startH + ((clientY - startY) / canvasH) * 100); 
            block.ratio = null; 
            el.style.width = block.w + '%'; el.style.height = block.h + '%'; 
        }
        if(e.cancelable) e.preventDefault();
    };

    const handleEnd = () => { if (isDragging || isResizing) { isDragging = false; isResizing = false; renderProperties(); } };

    el.addEventListener('mousedown', handleStart);
    el.addEventListener('touchstart', handleStart, {passive: false});
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, {passive: false});
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
}

function applyVideoRatio(ratioStr) {
    const block = config.landing.find(b => b.id === selectedId);
    if (!block) return;
    block.ratio = ratioStr === 'free' ? null : ratioStr;

    if (ratioStr !== 'free') {
        const parts = ratioStr.split(':');
        const rw = parseFloat(parts[0]);
        const rh = parseFloat(parts[1]);
        
        // Ancho base según si es horizontal o vertical
        let w = 40;
        if (rh > rw) w = 25; // Si es vertical, un poco más angosto

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = rw / rh;
        
        const px_w = (w / 100) * vw;
        const px_h = px_w / aspect;
        const h = (px_h / vh) * 100;

        block.w = w;
        block.h = h;
        block.x = (100 - w) / 2;
        block.y = (100 - h) / 2;
    }
    renderCanvas();
}

function renderProperties() {
    const panel = document.getElementById('properties-panel');
    if (!selectedId) { panel.innerHTML = '<p style="text-align: center; color: #999; font-size: 14px;">Selecciona un bloque para editar.</p>'; return; }
    const block = config.landing.find(b => b.id === selectedId);
    if (!block) return;
    
    let html = `<h3>Propiedades del Bloque</h3>`;
    
    html += `
        <div style="display:flex; gap:5px; margin-bottom:10px;">
            <div style="flex:1;"><label>X (%)</label><input type="number" value="${Math.round(block.x)}" oninput="updateProp('x', parseFloat(this.value))"></div>
            <div style="flex:1;"><label>Y (%)</label><input type="number" value="${Math.round(block.y)}" oninput="updateProp('y', parseFloat(this.value))"></div>
        </div>
        <div style="display:flex; gap:5px; margin-bottom:10px;">
            <div style="flex:1;"><label>Ancho (%)</label><input type="number" value="${Math.round(block.w)}" oninput="updateProp('w', parseFloat(this.value))"></div>
            <div style="flex:1;"><label>Alto (%)</label><input type="number" value="${Math.round(block.h)}" oninput="updateProp('h', parseFloat(this.value))"></div>
        </div>
        <hr style="border:0; border-top:1px solid #ddd; margin:10px 0;">
    `;

    if (block.type === 'text') {
        html += `
            <label>Texto</label>
            <input type="text" value="${block.content}" oninput="updateProp('content', this.value)">
            <label>Tamaño de letra (px)</label>
            <input type="number" value="${block.fontSize || 24}" oninput="updateProp('fontSize', this.value)" min="10" max="100">
            <label>Color de Letra</label>
            <input type="color" value="${block.color || '#ffffff'}" oninput="updateProp('color', this.value)" style="height: 40px; cursor: pointer;">
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
        html += `<label>URL de YouTube</label><input type="text" value="\" oninput="updateProp('url', this.value)" placeholder="https://youtube.com/watch?v=...">`;
        html += `<label>Tamaño Predefinido</label>
        <select onchange="applyVideoRatio(this.value)">
            <option value="free" \>Libre (Ajuste manual)</option>
            <option value="16:9" \>Horizontal (16:9 - YouTube Normal)</option>
            <option value="9:16" \>Vertical (9:16 - Shorts/TikTok)</option>
            <option value="1:1" \>Cuadrado (1:1)</option>
        </select>`;
    } else if (block.type === 'banner') {
        html += `
            <label>Subir Imagen (desde tu PC/Cel)</label>
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
    
    if (['x','y','w','h'].includes(key)) {
        const el = document.getElementById('block-' + block.id);
        if (el) {
            el.style.left = block.x + '%'; el.style.top = block.y + '%';
            el.style.width = block.w + '%'; el.style.height = block.h + '%';
        }
        return;
    }

    const el = document.getElementById('block-' + block.id);
    if (!el) return;
    if (block.type === 'text') {
        const d = el.querySelector('.text-content');
        if (d) {
            d.textContent = block.content;
            d.style.fontSize = (block.fontSize || 24) + 'px';
            d.style.fontFamily = block.fontFamily || 'sans-serif';
            d.style.color = block.color || '#ffffff';
        }
    }
    else if (block.type === 'youtube') { 
        const vid = value && value.includes('v=') ? value.split('v=')[1].split('&')[0] : (value && value.includes('youtu.be/') ? value.split('youtu.be/')[1].split('?')[0] : ''); 
        const i = el.querySelector('iframe'); if (vid && i) i.src = `https://www.youtube.com/embed/${vid}`; 
    }
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




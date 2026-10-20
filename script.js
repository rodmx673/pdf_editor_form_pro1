// Lógica del Header Auto-Ocultable
const headerElement = document.querySelector('header');
let headerTimeout;

function showHeaderTemporarily() {
    if (!headerElement) return;
    headerElement.classList.remove('header-hidden');
    document.body.classList.remove('header-hidden'); // Restaura el espacio del PDF
    
    clearTimeout(headerTimeout);
    headerTimeout = setTimeout(() => {
        headerElement.classList.add('header-hidden');
        document.body.classList.add('header-hidden'); // El PDF sube y ocupa todo
    }, 3500); 
}

// Botón manual para ocultar/mostrar
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleHeaderBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (headerElement.classList.contains('header-hidden')) {
                headerElement.classList.remove('header-hidden');
                document.body.classList.remove('header-hidden');
            } else {
                headerElement.classList.add('header-hidden');
                document.body.classList.add('header-hidden');
            }
        });
    }
});

// Modificar updateStepper para que muestre el header temporalmente al avanzar
const originalUpdateStepper = updateStepper;
updateStepper = function(step) {
    originalUpdateStepper(step);
    showHeaderTemporarily();
};
// Inicializar PDF.js
try {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
} catch (e) { console.error('Error PDF.js:', e); }

const API_URL = '';

// DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadView = document.getElementById('uploadView');
const editorView = document.getElementById('editorView');
const pdfPages = document.getElementById('pdfPages');
const fieldCounter = document.getElementById('fieldCounter');
const bottomGlassBar = document.getElementById('bottomGlassBar');
const fieldProperties = document.getElementById('fieldProperties');
const downloadBtn = document.getElementById('downloadBtn');

// Estado
let selectedFile = null;
let currentSession = null;
let currentFields = [];
let originalFields = [];
let selectedFieldName = null;
let currentScale = 1;
let pdfDoc = null;
let isZoomed = false;
let isDrawingMode = false;
let isDrawing = false;
let drawStartX, drawStartY;

// Stepper
function updateStepper(step) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`step-${i}`);
        if (!el) continue;
        if (i <= step) {
            el.classList.add('active');
            el.querySelector('span').style.background = '#0071e3';
        } else {
            el.classList.remove('active');
            el.querySelector('span').style.background = '#d2d2d7';
        }
    }
}

// Tema
const themeToggle = document.getElementById('themeToggle');
let currentTheme = localStorage.getItem('theme') || 'light';
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '🌙';
    }
    localStorage.setItem('theme', theme);
}
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
    });
}
applyTheme(currentTheme);

// Manejo de Archivo y Procesamiento
if (fileInput) fileInput.addEventListener('change', (e) => { if (e.target.files[0]) selectFile(e.target.files[0]); });

if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#0071e3'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#d2d2d7'; });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault(); uploadArea.style.borderColor = '#d2d2d7';
        if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
    });
}

function selectFile(file) {
    selectedFile = file;
    uploadArea.querySelector('p').textContent = '⏳ Analizando PDF...';
    uploadArea.classList.add('processing');
    document.getElementById('appIconSpinner').classList.add('processing');
    updateStepper(2);
    setTimeout(() => { ejecutarProcesamiento(); }, 500);
}

async function ejecutarProcesamiento() {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        const response = await fetch(API_URL + '/api/process', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Error del servidor');
        const data = await response.json();
        
        currentSession = data.session_id;
        currentFields = data.fields.map(f => ({...f, type: f.type || 'text', font_size: 10, align: 'left', show_lines: f.show_lines !== false}));
        originalFields = JSON.parse(JSON.stringify(currentFields));
        
        pdfDoc = await pdfjsLib.getDocument(API_URL + data.pdf_url).promise;
        
        uploadView.style.display = 'none'; document.body.classList.add('editing-mode');
        editorView.style.display = 'flex'; showHeaderTemporarily();
        await renderPdf();
        
        fieldCounter.textContent = currentFields.length + ' campos';
        updateStepper(3);
        document.getElementById('zoomBtn').style.display = 'flex';
    } catch (error) {
        alert("Error: " + error.message);
        uploadArea.classList.remove('processing');
        uploadArea.querySelector('p').textContent = '❌ Error. Intenta de nuevo.';
        document.getElementById('appIconSpinner').classList.remove('processing');
        updateStepper(1);
    }
}

// Renderizar PDF

async function renderPdf() {
    if (!pdfDoc) return;
    pdfPages.innerHTML = '';
    
    const firstPage = await pdfDoc.getPage(1);
    const pdfContainer = document.querySelector('.pdf-container');
    
    // Escala base adaptada al ancho de la pantalla
    const margin = window.innerWidth <= 768 ? 20 : 40;
    const containerWidth = pdfContainer.clientWidth - margin;
    const baseScale = Math.max(0.5, Math.min(2, containerWidth / firstPage.getViewport({ scale: 1 }).width));
    
    // Aplicar Zoom del 200% si está activo
    currentScale = isZoomed ? baseScale * 2 : baseScale;

    // Activar o desactivar el scroll horizontal
    if (isZoomed) {
        pdfContainer.classList.add('zoomed');
    } else {
        pdfContainer.classList.remove('zoomed');
    }
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });
        
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.dataset.pageNum = pageNum - 1;
        pageDiv.style.width = viewport.width + 'px';
        pageDiv.style.height = viewport.height + 'px';
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageDiv.appendChild(canvas);
        pdfPages.appendChild(pageDiv);
        
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        
        const pageFields = currentFields.filter(f => f.page === pageNum - 1);
        pageFields.forEach(field => createFieldElement(field, pageDiv));
        setupDrawingEvents(pageDiv, pageNum - 1);
    }
}


function createFieldElement(field, pageDiv) {
    const div = document.createElement('div');
    div.className = 'field-rect';
    if (field.max_len > 0) div.classList.add('comb');
    
    div.style.left = (field.rect[0] * currentScale) + 'px';
    div.style.top = (field.rect[1] * currentScale) + 'px';
    div.style.width = ((field.rect[2] - field.rect[0]) * currentScale) + 'px';
    div.style.height = ((field.rect[3] - field.rect[1]) * currentScale) + 'px';
    
    div.dataset.fieldName = field.name;
    div.addEventListener('click', (e) => { e.stopPropagation(); if (!isDrawingMode) selectField(field.name); });
    makeDraggable(div, field);
    pageDiv.appendChild(div);
}

// Selección y Menú de Cristal

document.getElementById('zoomBtn').addEventListener('click', () => {
    isZoomed = !isZoomed;
    const btn = document.getElementById('zoomBtn');
    
    // Mostrar feedback visual en el botón
    btn.innerHTML = isZoomed ? '🔍 100%' : '🔍 +';
    btn.style.background = isZoomed ? 'rgba(40, 167, 69, 0.9)' : 'rgba(0, 113, 227, 0.9)';
    
    const pdfContainer = document.querySelector('.pdf-container');
    const scrollY = pdfContainer.scrollTop;
    
    renderPdf().then(() => {
        pdfContainer.scrollTop = scrollY; 
    });
});

function selectField(fieldName) {

    selectedFieldName = fieldName;
    const field = currentFields.find(f => f.name === fieldName);
    if (!field) return;
    
    document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`[data-field-name="${CSS.escape(fieldName)}"]`);
    if (el) el.classList.add('selected');
    
    bottomGlassBar.classList.add('active');
    document.getElementById('zoomBtn').style.display = 'none'; if (headerElement) { headerElement.classList.add('header-hidden'); document.body.classList.add('header-hidden'); clearTimeout(headerTimeout); }
    fieldProperties.style.display = 'flex';
    
    document.getElementById('propName').value = field.name;
    document.getElementById('propCells').value = field.max_len || 0;
    document.getElementById('propFontSize').value = field.font_size || 10;
    document.getElementById('propAlign').value = field.align || 'left';
    document.getElementById('propShowLines').checked = field.show_lines !== false;
}

function clearSelection() {
    selectedFieldName = null;
    document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
    bottomGlassBar.classList.remove('active');
    document.getElementById('zoomBtn').style.display = 'flex';
    fieldProperties.style.display = 'none';
}

document.addEventListener('mousedown', (e) => {
    if (bottomGlassBar.classList.contains('active') && !e.target.closest('.field-rect') && !e.target.closest('.glass-bar') && !e.target.closest('#floatingToolbar')) {
        clearSelection();
    }
});
document.getElementById('closeBottomBar').addEventListener('click', clearSelection);

// Propiedades
document.getElementById('propCells').addEventListener('input', (e) => {
    const f = currentFields.find(f => f.name === selectedFieldName);
    if (f) { f.max_len = parseInt(e.target.value) || 0; renderPdf(); selectField(f.name); }
});
document.getElementById('propFontSize').addEventListener('input', (e) => {
    const f = currentFields.find(f => f.name === selectedFieldName);
    if (f) f.font_size = parseInt(e.target.value) || 10;
});
document.getElementById('propAlign').addEventListener('change', (e) => {
    const f = currentFields.find(f => f.name === selectedFieldName);
    if (f) f.align = e.target.value;
});
document.getElementById('propShowLines').addEventListener('change', (e) => {
    const f = currentFields.find(f => f.name === selectedFieldName);
    if (f) f.show_lines = e.target.checked;
});

// Eliminar
document.getElementById('deleteField').addEventListener('click', () => {
    if (!selectedFieldName) return;
    currentFields = currentFields.filter(f => f.name !== selectedFieldName);
    renderPdf(); clearSelection(); fieldCounter.textContent = currentFields.length + ' campos';
});

// Dibujar
document.getElementById('addFieldBtn').addEventListener('click', () => {
    isDrawingMode = !isDrawingMode;
    document.body.style.cursor = isDrawingMode ? 'crosshair' : 'default';
});

function setupDrawingEvents(pageDiv, pageIndex) {
    pageDiv.addEventListener('mousedown', (e) => {
        if (!isDrawingMode) return;
        const rect = pageDiv.getBoundingClientRect();
        drawStartX = e.clientX - rect.left; drawStartY = e.clientY - rect.top;
        isDrawing = true;
        
        let box = document.getElementById('tempDrawBox');
        if (!box) { box = document.createElement('div'); box.id = 'tempDrawBox'; box.style.cssText = 'position:absolute;border:2px dashed #ff6b00;background:rgba(255,107,0,0.2);pointer-events:none;'; pageDiv.appendChild(box); }
        box.style.left = drawStartX + 'px'; box.style.top = drawStartY + 'px'; box.style.width = '0px'; box.style.height = '0px'; box.style.display = 'block';
    });
    pageDiv.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const box = document.getElementById('tempDrawBox');
        const rect = pageDiv.getBoundingClientRect();
        const curX = e.clientX - rect.left, curY = e.clientY - rect.top;
        const w = curX - drawStartX, h = curY - drawStartY;
        box.style.left = (w < 0 ? curX : drawStartX) + 'px'; box.style.top = (h < 0 ? curY : drawStartY) + 'px';
        box.style.width = Math.abs(w) + 'px'; box.style.height = Math.abs(h) + 'px';
    });
    pageDiv.addEventListener('mouseup', () => {
        if (!isDrawing) return; isDrawing = false;
        const box = document.getElementById('tempDrawBox');
        if (!box) return;
        const w = parseFloat(box.style.width), h = parseFloat(box.style.height);
        if (w > 10 && h > 5) {
            const newField = {
                page: pageIndex, name: `manual_${Date.now()}`, type: 'text', type_input: 'text',
                rect: [parseFloat(box.style.left)/currentScale, parseFloat(box.style.top)/currentScale, (parseFloat(box.style.left)+w)/currentScale, (parseFloat(box.style.top)+h)/currentScale],
                max_len: 0, font_size: 10, align: 'left', show_lines: false
            };
            currentFields.push(newField);
            renderPdf(); selectField(newField.name);
            isDrawingMode = false; document.body.style.cursor = 'default';
        }
        box.style.display = 'none';
    });
}

// Arrastrar
let dragEl, dragField, startX, startY, startL, startT;
function makeDraggable(el, field) {
    el.addEventListener('mousedown', (e) => {
        if (isDrawingMode) return;
        e.preventDefault(); e.stopPropagation();
        dragEl = el; dragField = field;
        startX = e.clientX; startY = e.clientY; startL = parseFloat(el.style.left); startT = parseFloat(el.style.top);
    });
}
document.addEventListener('mousemove', (e) => {
    if (!dragEl) return;
    dragEl.style.left = (startL + e.clientX - startX) + 'px';
    dragEl.style.top = (startT + e.clientY - startY) + 'px';
});
document.addEventListener('mouseup', () => {
    if (!dragEl) return;
    const newX = parseFloat(dragEl.style.left) / currentScale;
    const newY = parseFloat(dragEl.style.top) / currentScale;
    const w = dragField.rect[2] - dragField.rect[0], h = dragField.rect[3] - dragField.rect[1];
    dragField.rect = [newX, newY, newX + w, newY + h];
    dragEl = null; dragField = null;
});

// Guardar
document.getElementById('saveBtn').addEventListener('click', async () => {
    if (!currentSession) return;
    const updates = currentFields.map(f => ({ 
        name: f.name, rect: f.rect, page: f.page, max_len: f.max_len || 0,
        font_size: f.font_size || 10, align: f.align || 'left', type_input: f.type_input || 'text', show_lines: f.show_lines !== false
    }));
    
    try {
        const res = await fetch(API_URL + '/api/session/' + currentSession + '/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates })
        });
        if (!res.ok) throw new Error('Error al guardar');
        alert('✅ Cambios guardados correctamente');
        downloadBtn.href = API_URL + '/api/session/' + currentSession + '/download';
        downloadBtn.style.display = 'inline-block';
        updateStepper(4);
    } catch (e) { alert('❌ Error al guardar'); }
});

document.getElementById('toggleFields').addEventListener('click', () => {
    const isHidden = document.querySelectorAll('.field-rect')[0]?.style.display === 'none';
    document.querySelectorAll('.field-rect').forEach(el => el.style.display = isHidden ? 'block' : 'none');
});


window.addEventListener('resize', () => {
    if (pdfDoc && editorView.style.display !== 'none') {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => { renderPdf(); }, 300);
    }
});



// Evento para el botón de zoom
document.getElementById('zoomBtn').addEventListener('click', () => {
    isZoomed = !isZoomed;
    const btn = document.getElementById('zoomBtn');
    
    // Cambiar icono para indicar el estado
    btn.innerHTML = isZoomed ? '🔍 -' : '🔍 +';
    
    // Guardar la posición actual del scroll para no perder el lugar
    const pdfContainer = document.querySelector('.pdf-container');
    const scrollY = pdfContainer.scrollTop;
    
    renderPdf().then(() => {
        // Restaurar la posición (o centrar un poco)
        pdfContainer.scrollTop = scrollY; 
    });
});


// ==========================================
// BARRA FLOTANTE Y ATAJOS DE EDICIÓN (RESTAURADO)
// ==========================================
const floatingToolbar = document.createElement('div');
floatingToolbar.id = 'floatingToolbar';
floatingToolbar.innerHTML = `
    <button id="ft-split" title="Separar texto en celdas">.X</button>
    <button id="ft-dup" title="Duplicar (Ctrl+D)">⧉</button>
    <button id="ft-del" class="danger" title="Eliminar (Suprimir)">🗑️</button>
`;
document.body.appendChild(floatingToolbar);

// Botón .X (Separar celdas)

document.getElementById('ft-split').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedFieldName) return;
    
    // 1. Asegurarnos de que el menú inferior esté abierto
    bottomGlassBar.classList.add('active');
    
    // 2. Ocultar la barra flotante y el botón de zoom temporalmente
    document.getElementById('floatingToolbar').style.display = 'none';
    if (zoomBtn) zoomBtn.style.display = 'none';
    
    // 3. Mostrar las propiedades si estaban ocultas
    fieldProperties.style.display = 'flex';
    
    // 4. Poner el foco en el input de celdas para que el usuario escriba directamente
    const cellsInput = document.getElementById('propCells');
    cellsInput.focus();
    cellsInput.select(); // Selecciona el texto actual para que se sobrescriba fácil
});


// Botón ⧉ (Duplicar)
document.getElementById('ft-dup').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedFieldName) return;
    const field = currentFields.find(f => f.name === selectedFieldName);
    if (!field) return;
    
    const newField = JSON.parse(JSON.stringify(field));
    newField.name = 'copy_' + Date.now();
    newField.rect = [field.rect[0] + 15, field.rect[1] + 15, field.rect[2] + 15, field.rect[3] + 15];
    
    currentFields.push(newField);
    renderPdf();
    selectField(newField.name);
    fieldCounter.textContent = currentFields.length + ' campos';
});

// Botón 🗑️ (Eliminar)
document.getElementById('ft-del').addEventListener('click', (e) => {
    e.stopPropagation();
    if (document.getElementById('deleteField')) document.getElementById('deleteField').click();
});

// Mostrar barra flotante al seleccionar un campo
const originalSelectField = selectField;
selectField = function(fieldName) {
    originalSelectField(fieldName);
    const el = document.querySelector(`[data-field-name="${CSS.escape(fieldName)}"]`);
    if (el) {
        const rect = el.getBoundingClientRect();
        floatingToolbar.style.display = 'flex';
        floatingToolbar.style.left = (rect.left + rect.width / 2 - floatingToolbar.offsetWidth / 2) + 'px';
        floatingToolbar.style.top = (rect.top - 45) + 'px';
    }
};

// Ocultar barra flotante al deseleccionar
const originalClearSelection = clearSelection;
clearSelection = function() {
    originalClearSelection();
    if (floatingToolbar) floatingToolbar.style.display = 'none';
};

// Mover la barra flotante cuando se arrastra un campo
document.addEventListener('mousemove', () => {
    if (dragEl && floatingToolbar.style.display === 'flex') {
        const rect = dragEl.getBoundingClientRect();
        floatingToolbar.style.left = (rect.left + rect.width / 2 - floatingToolbar.offsetWidth / 2) + 'px';
        floatingToolbar.style.top = (rect.top - 45) + 'px';
    }
});

// Atajos de teclado (Suprimir y Ctrl+D)
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldName) {
        e.preventDefault();
        const delBtn = document.getElementById('deleteField');
        if (delBtn) delBtn.click();
    }
    
    if (e.ctrlKey && e.key.toLowerCase() === 'd' && selectedFieldName) {
        e.preventDefault();
        const dupBtn = document.getElementById('ft-dup');
        if (dupBtn) dupBtn.click();
    }
});

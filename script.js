// Inicializar PDF.js
try {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
} catch (e) { console.error('Error PDF.js:', e); }

const API_URL = '';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadView = document.getElementById('uploadView');
const editorView = document.getElementById('editorView');
const pdfPages = document.getElementById('pdfPages');
const floatingToolbar = document.getElementById('floatingToolbar');
const headerElement = document.getElementById('mainHeader');

// Estado
let selectedFile = null;
let currentSession = null;
let currentFields = [];
let selectedFieldName = null;
let currentScale = 1;
let pdfDoc = null;
let isZoomed = false;
let isDrawingMode = false;
let isDrawing = false;
let drawStartX, drawStartY;
let resizeTimeout = null;
let headerTimeout = null;

// ==========================================
// HEADER Y STEPPER
// ==========================================
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
    showHeaderTemporarily();
}

function showHeaderTemporarily() {
    if (!headerElement) return;
    headerElement.classList.remove('header-hidden');
    document.body.classList.remove('header-hidden');
    clearTimeout(headerTimeout);
    headerTimeout = setTimeout(() => {
        headerElement.classList.add('header-hidden');
        document.body.classList.add('header-hidden');
    }, 3500); 
}

const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
if (toggleHeaderBtn) {
    toggleHeaderBtn.addEventListener('click', () => {
        if (headerElement.classList.contains('header-hidden')) {
            headerElement.classList.remove('header-hidden');
            document.body.classList.remove('header-hidden');
        } else {
            headerElement.classList.add('header-hidden');
            document.body.classList.add('header-hidden');
        }
    });
}

// ==========================================
// TEMA (MODO OSCURO)
// ==========================================
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

// ==========================================
// SUBIDA DE ARCHIVO Y PROCESAMIENTO
// ==========================================
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
    const spinner = document.getElementById('appIconSpinner');
    if (spinner) spinner.classList.add('processing');
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
        currentFields = data.fields.map(f => ({...f, type: f.type || 'text', font_size: 10, align: 'left'}));
        
        pdfDoc = await pdfjsLib.getDocument(API_URL + data.pdf_url).promise;
        
        uploadView.style.display = 'none'; 
        document.body.classList.add('editing-mode');
        editorView.style.display = 'flex'; 
        document.getElementById('hamburgerMenu').style.display = 'block';
        showHeaderTemporarily();
        
        await renderPdf();
        updateStepper(3);
    } catch (error) {
        alert("Error: " + error.message);
        uploadArea.classList.remove('processing');
        uploadArea.querySelector('p').textContent = '❌ Error. Intenta de nuevo.';
        const spinner = document.getElementById('appIconSpinner');
        if (spinner) spinner.classList.remove('processing');
        updateStepper(1);
    }
}

// ==========================================
// RENDERIZADO Y ZOOM
// ==========================================
async function renderPdf() {
    if (!pdfDoc) return;
    pdfPages.innerHTML = '';
    
    const firstPage = await pdfDoc.getPage(1);
    const pdfContainer = document.querySelector('.pdf-container');
    const margin = window.innerWidth <= 768 ? 20 : 40;
    const containerWidth = pdfContainer.clientWidth - margin;
    const baseScale = Math.max(0.5, Math.min(2, containerWidth / firstPage.getViewport({ scale: 1 }).width));
    
    currentScale = isZoomed ? baseScale * 2 : baseScale;
    if (isZoomed) pdfContainer.classList.add('zoomed');
    else pdfContainer.classList.remove('zoomed');
    
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

const zoomBtn = document.getElementById('zoomBtn');
if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
        isZoomed = !isZoomed;
        zoomBtn.innerHTML = isZoomed ? '🔍 100%' : '🔍 +';
        zoomBtn.style.background = isZoomed ? 'rgba(40, 167, 69, 0.9)' : 'rgba(0, 113, 227, 0.9)';
        const pdfContainer = document.querySelector('.pdf-container');
        const scrollY = pdfContainer.scrollTop;
        renderPdf().then(() => { pdfContainer.scrollTop = scrollY; });
    });
}

// ==========================================
// CAMPOS Y POPOVER
// ==========================================
function createFieldElement(field, pageDiv) {
    const div = document.createElement('div');
    div.className = 'field-rect';
    if (field.max_len > 0) div.classList.add('comb');
    
    div.style.left = (field.rect[0] * currentScale) + 'px';
    div.style.top = (field.rect[1] * currentScale) + 'px';
    div.style.width = ((field.rect[2] - field.rect[0]) * currentScale) + 'px';
    div.style.height = ((field.rect[3] - field.rect[1]) * currentScale) + 'px';
    
    div.dataset.fieldName = field.name;
    div.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        if (!isDrawingMode) selectField(field.name); 
    });
    
    makeDraggable(div, field);
    pageDiv.appendChild(div);
}

function selectField(fieldName) {
    selectedFieldName = fieldName;
    const field = currentFields.find(f => f.name === fieldName);
    if (!field) return;
    
    document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`[data-field-name="${CSS.escape(fieldName)}"]`);
    if (el) el.classList.add('selected');
    
    const popoverTitle = document.getElementById('popoverTitle');
    if (popoverTitle) popoverTitle.textContent = field.name.substring(0, 20);
    
    const pType = document.getElementById('propType');
    if (pType) pType.value = field.type_input || 'text';
    const pCells = document.getElementById('propCells');
    if (pCells) pCells.value = field.max_len || 0;
    const pFont = document.getElementById('propFontSize');
    if (pFont) pFont.value = field.font_size || 10;
    const pAlign = document.getElementById('propAlign');
    if (pAlign) pAlign.value = field.align || 'left';
    
    const isCheckbox = field.type && (field.type.toLowerCase().includes('check') || field.type.toLowerCase().includes('radio'));
    document.querySelectorAll('.text-only-option').forEach(opt => {
        opt.style.display = isCheckbox ? 'none' : 'flex';
    });

    floatingToolbar.style.display = 'flex';
    if (zoomBtn) zoomBtn.style.display = 'none';
    if (document.getElementById('addFieldBtn')) document.getElementById('addFieldBtn').style.display = 'none';
    if (headerElement) {
        headerElement.classList.add('header-hidden');
        document.body.classList.add('header-hidden');
        clearTimeout(headerTimeout);
    }

    if (el) {
        const rect = el.getBoundingClientRect();
        let topPos = rect.top;
        if (topPos < 200) topPos = 200; 
        
        floatingToolbar.style.left = (rect.left + rect.width / 2) + 'px';
        floatingToolbar.style.top = topPos + 'px';
    }
}

function clearSelection() {
    selectedFieldName = null;
    document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
    floatingToolbar.style.display = 'none';
    const helpTip = document.getElementById('helpTooltip');
    if (helpTip) helpTip.style.display = 'none';
    
    if (zoomBtn && document.body.classList.contains('editing-mode')) zoomBtn.style.display = 'flex';
    if (document.getElementById('addFieldBtn') && document.body.classList.contains('editing-mode')) document.getElementById('addFieldBtn').style.display = 'flex';
}

const closePopover = document.getElementById('closePopover');
if (closePopover) closePopover.addEventListener('click', clearSelection);

document.addEventListener('mousedown', (e) => {
    if (floatingToolbar.style.display === 'flex' && !e.target.closest('.field-rect') && !e.target.closest('.floating-popover')) {
        clearSelection();
    }
});

// ==========================================
// PROPIEDADES DEL POPOVER
// ==========================================
const pCells = document.getElementById('propCells');
if (pCells) {
    pCells.addEventListener('input', (e) => {
        const f = currentFields.find(f => f.name === selectedFieldName);
        if (f) { f.max_len = parseInt(e.target.value) || 0; renderPdf(); selectField(f.name); }
    });
}
const pFont = document.getElementById('propFontSize');
if (pFont) {
    pFont.addEventListener('input', (e) => {
        const f = currentFields.find(f => f.name === selectedFieldName);
        if (f) f.font_size = parseInt(e.target.value) || 10;
    });
}
const pAlign = document.getElementById('propAlign');
if (pAlign) {
    pAlign.addEventListener('change', (e) => {
        const f = currentFields.find(f => f.name === selectedFieldName);
        if (f) f.align = e.target.value;
    });
}
const pType = document.getElementById('propType');
if (pType) {
    pType.addEventListener('change', (e) => {
        const f = currentFields.find(f => f.name === selectedFieldName);
        if (f) f.type_input = e.target.value;
    });
}

const deleteBtn = document.getElementById('deleteField');
if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        if (!selectedFieldName) return;
        currentFields = currentFields.filter(f => f.name !== selectedFieldName);
        renderPdf(); clearSelection();
    });
}

const helpBtn = document.getElementById('helpBtn');
if (helpBtn) {
    helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tt = document.getElementById('helpTooltip');
        if (tt) tt.style.display = tt.style.display === 'block' ? 'none' : 'block';
    });
}

// ==========================================
// DIBUJAR CAMPOS NUEVOS
// ==========================================
const addFieldBtn = document.getElementById('addFieldBtn');
if (addFieldBtn) {
    addFieldBtn.addEventListener('click', () => {
        isDrawingMode = !isDrawingMode;
        document.body.style.cursor = isDrawingMode ? 'crosshair' : 'default';
        addFieldBtn.classList.toggle('active', isDrawingMode);
    });
}

function setupDrawingEvents(pageDiv, pageIndex) {
    pageDiv.addEventListener('mousedown', (e) => {
        if (!isDrawingMode) return;
        const rect = pageDiv.getBoundingClientRect();
        drawStartX = e.clientX - rect.left; drawStartY = e.clientY - rect.top;
        isDrawing = true;
        
        let box = document.getElementById('tempDrawBox');
        if (!box) { 
            box = document.createElement('div'); 
            box.id = 'tempDrawBox'; 
            box.style.cssText = 'position:absolute;border:2px dashed #ff6b00;background:rgba(255,107,0,0.2);pointer-events:none;z-index:100;'; 
            pageDiv.appendChild(box); 
        }
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
                max_len: 0, font_size: 10, align: 'left'
            };
            currentFields.push(newField);
            renderPdf(); selectField(newField.name);
            isDrawingMode = false; document.body.style.cursor = 'default';
            addFieldBtn.classList.remove('active');
        }
        box.style.display = 'none';
    });
}

// ==========================================
// ARRASTRAR CAMPOS
// ==========================================
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
    
    if (floatingToolbar.style.display === 'flex') {
        const rect = dragEl.getBoundingClientRect();
        let topPos = rect.top; if (topPos < 200) topPos = 200;
        floatingToolbar.style.left = (rect.left + rect.width / 2) + 'px';
        floatingToolbar.style.top = topPos + 'px';
    }
});
document.addEventListener('mouseup', () => {
    if (!dragEl) return;
    const newX = parseFloat(dragEl.style.left) / currentScale;
    const newY = parseFloat(dragEl.style.top) / currentScale;
    const w = dragField.rect[2] - dragField.rect[0], h = dragField.rect[3] - dragField.rect[1];
    dragField.rect = [newX, newY, newX + w, newY + h];
    dragEl = null; dragField = null;
});

// ==========================================
// MENÚ HAMBURGUESA Y GUARDADO
// ==========================================
const hamburgerBtn = document.getElementById('hamburgerBtn');
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('hamburgerDropdown');
        if (dropdown) dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    });
}
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('hamburgerDropdown');
    if (dropdown && dropdown.style.display === 'flex' && !e.target.closest('#hamburgerMenu')) {
        dropdown.style.display = 'none';
    }
});

const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        if (!currentSession) return;
        const updates = currentFields.map(f => ({ 
            name: f.name, rect: f.rect, page: f.page, max_len: f.max_len || 0,
            font_size: f.font_size || 10, align: f.align || 'left', type_input: f.type_input || 'text'
        }));
        
        try {
            const res = await fetch(API_URL + '/api/session/' + currentSession + '/update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates })
            });
            if (!res.ok) throw new Error('Error al guardar');
            alert('✅ Cambios guardados correctamente');
            const dlBtn = document.getElementById('downloadBtn');
            if (dlBtn) {
                dlBtn.href = API_URL + '/api/session/' + currentSession + '/download';
                dlBtn.style.display = 'block';
            }
            updateStepper(4);
        } catch (e) { alert('❌ Error al guardar'); }
    });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de reiniciar? Perderás los cambios.')) {
            window.location.reload();
        }
    });
}

window.addEventListener('resize', () => {
    if (pdfDoc && editorView.style.display !== 'none') {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => { renderPdf(); }, 300);
    }
});

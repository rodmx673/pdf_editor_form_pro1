try { if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) { console.error('Error PDF.js:', e); }
const API_URL = '';
const uploadArea = document.getElementById('uploadArea'), fileInput = document.getElementById('fileInput'), uploadView = document.getElementById('uploadView'), editorView = document.getElementById('editorView'), pdfPages = document.getElementById('pdfPages'), floatingToolbar = document.getElementById('floatingToolbar'), headerElement = document.getElementById('mainHeader');
let hasFieldEdits = false;
let originalFieldBackup = null;
function showToast(message, type = 'optimal') {
const container = document.getElementById('toastContainer');
if (!container) return;
const toast = document.createElement('div');
toast.className = 'toast ' + type;
let icon = 'ℹ️';
if (type === 'optimal') icon = '';
if (type === 'low') icon = '⚠️';
if (type === 'medium' || type === 'high') icon = '';
toast.innerHTML = '<span>' + icon + '</span> <span>' + message + '</span>';
container.appendChild(toast);
setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
}, 4000);
}
let selectedFile = null, currentSession = null, currentFields = [], selectedFieldName = null, currentScale = 1, pdfDoc = null, isZoomed = false, isFillMode = false, isDrawingMode = false, isDrawing = false, drawStartX, drawStartY, resizeTimeout = null, headerTimeout = null, saveTimeout = null;
let sessionIsPaid = false;
let paywallShown = false;
let isDraggingPopover = false, popoverStartX, popoverStartY, popoverStartLeft, popoverStartTop;
document.addEventListener('DOMContentLoaded', () => {
const popover = document.getElementById('floatingToolbar');
const header = popover ? popover.querySelector('.popover-header') : null;
if (header) {
     const startDrag = (clientX, clientY) => {
         isDraggingPopover = true;
         const rect = popover.getBoundingClientRect();
         popoverStartX = clientX;
         popoverStartY = clientY;
         popoverStartLeft = rect.left;
         popoverStartTop = rect.top;
         popover.style.transform = 'none';
         popover.style.margin = '0';
     };
     header.addEventListener('mousedown', (e) => {
         if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
         startDrag(e.clientX, e.clientY);
     });
     header.addEventListener('touchstart', (e) => {
         if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
         startDrag(e.touches[0].clientX, e.touches[0].clientY);
     }, {passive: true});
 }
});
document.addEventListener('mousemove', (e) => {
if (!isDraggingPopover) return;
const popover = document.getElementById('floatingToolbar');
const dx = e.clientX - popoverStartX;
const dy = e.clientY - popoverStartY;
popover.style.left = (popoverStartLeft + dx) + 'px';
popover.style.top = (popoverStartTop + dy) + 'px';
});
document.addEventListener('touchmove', (e) => {
if (!isDraggingPopover) return;
const popover = document.getElementById('floatingToolbar');
const dx = e.touches[0].clientX - popoverStartX;
const dy = e.touches[0].clientY - popoverStartY;
popover.style.left = (popoverStartLeft + dx) + 'px';
popover.style.top = (popoverStartTop + dy) + 'px';
}, {passive: true});
document.addEventListener('mouseup', () => { isDraggingPopover = false; });
document.addEventListener('touchend', () => { isDraggingPopover = false; });
function updateStepper(step) {
for (let i=1; i<=4; i++) {
const el = document.getElementById('step-' + i);
if(!el) continue;
el.classList.remove('active', 'completed');
    if (i < step) {
        el.classList.add('completed');
        el.querySelector('span').style.background = '#0071e3';
    } else if (i === step) {
        el.classList.add('active');
        el.querySelector('span').style.background = '#0071e3';
    } else {
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
document.getElementById('toggleHeaderBtn')?.addEventListener('click', () => {
if (headerElement.classList.contains('header-hidden')) {
headerElement.classList.remove('header-hidden');
document.body.classList.remove('header-hidden');
} else {
headerElement.classList.add('header-hidden');
document.body.classList.add('header-hidden');
}
});
const themeToggle = document.getElementById('themeToggle');
let currentTheme = localStorage.getItem('theme') || 'light';
function applyTheme(theme) {
if (theme === 'dark') {
document.body.classList.add('dark-mode');
if (themeToggle) themeToggle.innerHTML = '🌙';
} else {
document.body.classList.remove('dark-mode');
if (themeToggle) themeToggle.innerHTML = '☀️';
}
localStorage.setItem('theme', theme);
}
if (themeToggle) themeToggle.addEventListener('click', () => { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(currentTheme); });
applyTheme(currentTheme);
if (fileInput) fileInput.addEventListener('change', (e) => { if (e.target.files[0]) selectFile(e.target.files[0]); });
if (uploadArea) {
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#0071e3'; });
uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#d2d2d7'; });
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#d2d2d7'; if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]); });
}
function selectFile(file) {
selectedFile = file;
uploadArea.querySelector('p').textContent = '⏳ Analizando calidad del PDF...';
uploadArea.classList.add('processing');
const spinner = document.getElementById('appIconSpinner');
if (spinner) spinner.classList.add('processing');
updateStepper(2);
setTimeout(() => { analizarYProcesar(); }, 500);
}
async function analizarYProcesar() {
if (!selectedFile) return;
const formData = new FormData(); formData.append('file', selectedFile);
try {
const resAnalyze = await fetch(API_URL + '/api/analyze', { method: 'POST', body: formData });
if (!resAnalyze.ok) throw new Error('Error al analizar el PDF');
const dataAnalyze = await resAnalyze.json();
    let continuar = true;
     if (dataAnalyze.quality.status === 'low') {
         continuar = confirm('️ Advertencia: El documento parece ser de baja resolución (' + dataAnalyze.quality.dpi + ' DPI).\n\nEl texto podría verse borroso. ¿Deseas continuar de todos modos?');
     }
     if (!continuar) {
        uploadArea.classList.remove('processing');
         uploadArea.querySelector('p').textContent = 'Arrastra tu PDF aquí o haz clic para seleccionar';
         const spinner = document.getElementById('appIconSpinner');
         if (spinner) spinner.classList.remove('processing');
         updateStepper(1);
         return;
     }
     uploadArea.querySelector('p').textContent = '⏳ Procesando documento con IA...';
     const resProcess = await fetch(API_URL + '/api/process/' + dataAnalyze.session_id, { method: 'POST' });
     if (!resProcess.ok) throw new Error('Error al procesar el PDF');
     const dataProcess = await resProcess.json();
     currentSession = dataProcess.session_id;
     currentFields = dataProcess.fields.map(f => ({...f, type: f.type || 'text', font_size: f.font_size || 10, align: f.align || 'left', is_edited: false, font_manual: false}));
     pdfDoc = await pdfjsLib.getDocument(API_URL + dataProcess.pdf_url).promise;
     uploadView.style.display = 'none';
     document.body.classList.add('editing-mode');
     editorView.style.display = 'flex';
     showHeaderTemporarily();
     isFillMode = true;
     const fillBtn = document.getElementById('fillModeBtn');
     if (fillBtn) {
         fillBtn.textContent = '✏️ Modo Edición';
         fillBtn.style.color = '#28a745';
     }
     await renderPdf();
     updateStepper(3);
     if (typeof window.__maybeAutoTour === 'function') {
         window.__maybeAutoTour();
     }
 } catch (error) {
     alert("Error: " + error.message);
     uploadArea.classList.remove('processing');
     uploadArea.querySelector('p').textContent = '❌ Error. Intenta de nuevo.';
     const spinner = document.getElementById('appIconSpinner');
     if (spinner) spinner.classList.remove('processing');
     updateStepper(1);
 }
}
async function renderPdf() {
if (!pdfDoc) return;
const pdfContainer = document.querySelector('.pdf-container');
const scrollTop = pdfContainer.scrollTop;
pdfPages.innerHTML = '';
const firstPage = await pdfDoc.getPage(1);
const margin = window.innerWidth <= 768 ? 20 : 40;
const containerWidth = pdfContainer.clientWidth - margin;
const baseScale = Math.max(0.5, Math.min(2, containerWidth / firstPage.getViewport({ scale: 1 }).width));
currentScale = isZoomed ? baseScale * 2 : baseScale;
if (isZoomed) pdfContainer.classList.add('zoomed');
else pdfContainer.classList.remove('zoomed');
const outputScale = Math.max(window.devicePixelRatio || 1, 2);
const totalFieldsCount = currentFields.length;
const freeThreshold = Math.ceil(totalFieldsCount * 0.3);
for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
     const page = await pdfDoc.getPage(pageNum);
     const viewport = page.getViewport({ scale: currentScale });
     const pageDiv = document.createElement('div');
     pageDiv.className = 'pdf-page';
     pageDiv.dataset.pageNum = pageNum - 1;
     pageDiv.style.width = viewport.width + 'px';
     pageDiv.style.height = viewport.height + 'px';
     const canvas = document.createElement('canvas');
     const context = canvas.getContext('2d');
     const renderContext = { canvasContext: context, transform: [outputScale, 0, 0, outputScale, 0, 0], viewport: viewport };
     canvas.width = Math.floor(viewport.width * outputScale);
     canvas.height = Math.floor(viewport.height * outputScale);
     canvas.style.width = Math.floor(viewport.width) + "px";
     canvas.style.height = Math.floor(viewport.height) + "px";
     pageDiv.appendChild(canvas);
     pdfPages.appendChild(pageDiv);
     await page.render(renderContext).promise;
     const pageFields = currentFields.filter(f => f.page === pageNum - 1);
     if (!sessionIsPaid) { const overlay = document.createElement("div"); overlay.className = "paywall-overlay"; overlay.style.cssText = "position:absolute;bottom:0;left:0;right:0;height:66%;background:rgba(0,0,0,0.35);pointer-events:auto;z-index:40;border-radius:0 0 8px 8px;display:flex;align-items:center;justify-content:center;"; overlay.innerHTML = "<div style=\"background:rgba(255,255,255,0.95);padding:20px 30px;border-radius:12px;text-align:center;\"><p style=\"margin:0 0 10px 0;font-weight:bold;color:#333;\">🔒 Contenido bloqueado</p><p style=\"margin:0;color:#666;font-size:13px;\">Llena el 30% para desbloquear el resto</p></div>"; pageDiv.appendChild(overlay); } pageFields.forEach(field => { const fieldIndex = currentFields.indexOf(field); const shouldLock = !sessionIsPaid && fieldIndex >= freeThreshold; createFieldElement(field, pageDiv, shouldLock); });
     setupDrawingEvents(pageDiv, pageNum - 1);
 }
 pdfContainer.scrollTop = scrollTop;
}
document.getElementById('zoomBtn')?.addEventListener('click', () => {
isZoomed = !isZoomed;
const btn = document.getElementById('zoomBtn');
btn.innerHTML = isZoomed ? '🔍 100%' : ' +';
btn.style.background = isZoomed ? 'rgba(40, 167, 69, 0.9)' : 'rgba(0, 113, 227, 0.9)';
renderPdf();
});
function createFieldElement(field, pageDiv, shouldLock = false) {
if (shouldLock) {
const lockedDiv = document.createElement('div');
lockedDiv.className = 'field-rect locked';
lockedDiv.style.position = 'absolute';
lockedDiv.style.left = (field.rect[0] * currentScale) + 'px';
lockedDiv.style.top = (field.rect[1] * currentScale) + 'px';
lockedDiv.style.width = ((field.rect[2] - field.rect[0]) * currentScale) + 'px';
lockedDiv.style.height = ((field.rect[3] - field.rect[1]) * currentScale) + 'px';
lockedDiv.style.background = 'repeating-linear-gradient(45deg, rgba(255,107,0,0.15), rgba(255,107,0,0.15) 10px, rgba(255,107,0,0.35) 10px, rgba(255,107,0,0.35) 20px)';
lockedDiv.style.border = '2px solid #ff6b00';
lockedDiv.style.borderRadius = '3px';
lockedDiv.style.display = 'flex';
lockedDiv.style.alignItems = 'center';
lockedDiv.style.justifyContent = 'center';
lockedDiv.style.cursor = 'not-allowed';
lockedDiv.style.zIndex = '45';
lockedDiv.innerHTML = '<span style="font-size:18px;">🔒</span>';
lockedDiv.dataset.fieldName = field.name;
lockedDiv.addEventListener('click', function() { showPaywallModal(); });
pageDiv.appendChild(lockedDiv);
return;
}
const div = document.createElement('div');
div.className = 'field-rect';
if (field.max_len > 0 && !isFillMode) {
div.classList.add('comb');
div.style.backgroundImage = 'linear-gradient(to right, rgba(0, 113, 227, 0.6) 1px, transparent 1px)';
div.style.backgroundSize = 'calc(100% / ' + field.max_len + ') 100%';
} else if (!isFillMode) {
div.style.backgroundImage = 'none';
}
if (field.is_edited) div.classList.add('edited-field');
const boxWidthPx = (field.rect[2] - field.rect[0]) * currentScale;
const boxHeightPx = (field.rect[3] - field.rect[1]) * currentScale;
div.style.left = (field.rect[0] * currentScale) + 'px';
div.style.top = (field.rect[1] * currentScale) + 'px';
div.style.width = boxWidthPx + 'px';
div.style.height = boxHeightPx + 'px';
div.dataset.fieldName = field.name;
if (isFillMode) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    const editBtnWrapper = document.createElement('div');
    editBtnWrapper.style.cssText = 'position:absolute;top:-40px;right:-12px;width:26px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;z-index:120;pointer-events:none;opacity:0;visibility:hidden;transition:opacity 0.2s ease,visibility 0.2s ease;';
    const btnEdit = document.createElement('button');
    btnEdit.innerHTML = '+';
    btnEdit.className = 'inline-edit-btn';
    btnEdit.title = 'Editar / agregar campo';
    btnEdit.style.cssText = 'width:26px;height:26px;padding:0;border:2px solid #ffffff;border-radius:50%;background:#ff6b00;color:#ffffff;font-size:17px;font-weight:bold;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.35);pointer-events:auto;transition:transform 0.15s ease,background 0.15s ease;';
    btnEdit.addEventListener('mouseenter', () => {
        btnEdit.style.transform = 'scale(1.15)';
        btnEdit.style.background = '#e65c00';
    });
    btnEdit.addEventListener('mouseleave', () => {
        btnEdit.style.transform = 'scale(1)';
        btnEdit.style.background = '#ff6b00';
    });
    btnEdit.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectField(field.name);
    });
    const connector = document.createElement('div');
    connector.style.cssText = 'width:2px;height:14px;background:#ff6b00;border-radius:1px;';
    editBtnWrapper.appendChild(btnEdit);
    editBtnWrapper.appendChild(connector);
    div.addEventListener('mouseenter', () => {
        editBtnWrapper.style.opacity = '1';
        editBtnWrapper.style.visibility = 'visible';
    });
    div.addEventListener('mouseleave', () => {
        editBtnWrapper.style.opacity = '0';
        editBtnWrapper.style.visibility = 'hidden';
    });
    wrapper.appendChild(editBtnWrapper);
    const _effectiveType = ((field.type_input || field.type || 'text') + '').toLowerCase();
    const isCheckboxVisual = _effectiveType.includes('check') || _effectiveType.includes('radio') || (field.type && (field.type.toLowerCase().includes('check') || field.type.toLowerCase().includes('radio')));
    if (isCheckboxVisual) {
        div.style.border = 'none';
        div.style.background = 'transparent';
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.style.cssText = 'width:14px;height:14px;min-width:14px;cursor:pointer;margin:0;transform:scale(1);transform-origin:center;accent-color:#000000;';
        input.checked = field.checked || false;
        input.addEventListener('change', (e) => {
            field.checked = e.target.checked;
            field.is_edited = true;
            hasFieldEdits = true;
            updateUnsavedBadge();
            triggerAutoSave(); updatePaywallProgress();
        });
        checkboxContainer.appendChild(input);
        wrapper.appendChild(checkboxContainer);
    } else if (field.max_len > 0) {
        div.style.border = 'none';
        div.style.background = 'transparent';
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.gap = '0px';
        for (let i = 0; i < field.max_len; i++) {
            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 1;
            cell.style.flex = '1';
            cell.style.width = '0';
            cell.style.textAlign = 'center';
            cell.style.border = '1px solid #0071e3';
            cell.style.background = 'rgba(255,255,255,0.9)';
            cell.style.padding = '0';
            cell.style.fontFamily = 'Courier';
            cell.style.color = '#333';
            cell.style.fontSize = ((field.font_size || 10) * currentScale) + 'px';
            cell.value = field.value ? (field.value[i] || '') : '';
            cell.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && i < field.max_len - 1) container.children[i + 1].focus();
                let val = '';
                for(let j = 0; j < field.max_len; j++) val += container.children[j].value || '';
                field.value = val;
                field.is_edited = true;
                hasFieldEdits = true;
                updateUnsavedBadge();
                triggerAutoSave(); updatePaywallProgress();
            });
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) container.children[i - 1].focus();
            });
            container.appendChild(cell);
        }
        wrapper.appendChild(container);
    } else {
        div.style.border = '1px solid #0071e3';
        div.style.background = 'rgba(255,255,255,0.9)';
        const input = document.createElement('input');
        const _useNumber = ((field.type_input || 'text') + '').toLowerCase() === 'number';
        input.type = _useNumber ? 'number' : 'text';
        if (_useNumber) input.setAttribute('inputmode', 'decimal');
        input.value = field.value || '';
        input.maxLength = 524288;
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.padding = '0 2px';
        input.style.color = '#333';
        let finalSize = (field.font_size || 10) * currentScale;
        if (!field.font_manual && finalSize > boxHeightPx * 0.75) finalSize = boxHeightPx * 0.75;
        input.style.fontSize = Math.max(8, finalSize) + 'px';
        input.addEventListener('input', (e) => {
            field.value = e.target.value;
            field.is_edited = true;
            hasFieldEdits = true;
            updateUnsavedBadge();
            triggerAutoSave(); updatePaywallProgress();
        });
        wrapper.appendChild(input);
    }
    div.appendChild(wrapper);
    pageDiv.appendChild(div);
} else {
    div.addEventListener('click', (e) => { e.stopPropagation(); if (!isDrawingMode) selectField(field.name); });
    makeDraggable(div, field);
    const __preview = document.createElement('span');
    __preview.textContent = 'Aa';
    __preview.style.position = 'absolute';
    __preview.style.left = '2px';
    __preview.style.top = '0';
    __preview.style.lineHeight = (field.rect[3] - field.rect[1]) * currentScale + 'px';
    __preview.style.fontSize = ((field.font_size || 10) * currentScale) + 'px';
    __preview.style.color = 'rgba(0,113,227,0.45)';
    __preview.style.pointerEvents = 'none';
    div.appendChild(__preview);
    pageDiv.appendChild(div);
}
}
function triggerShake() {
const popover = document.getElementById('floatingToolbar');
if (popover) {
popover.classList.remove('shake-effect');
void popover.offsetWidth;
popover.classList.add('shake-effect');
setTimeout(() => popover.classList.remove('shake-effect'), 500);
}
}
function validateBeforeDownload(e) {
let missing = 0;
currentFields.forEach(f => {
const isCheckbox = f.type && (f.type.toLowerCase().includes('check') || f.type.toLowerCase().includes('radio'));
if (isCheckbox) {
if (!f.checked) missing++;
} else {
if (!f.value || f.value.trim() === '') missing++;
}
});
if (missing > 0) {
     const proceed = confirm('⚠️ Hay ' + missing + ' campo(s) sin llenar.\n\nSi descargas ahora, el PDF estará incompleto.\n\n¿Deseas descargarlo de todos modos?');
     if (!proceed) {
         if(e) e.preventDefault();
         document.querySelectorAll('.field-rect').forEach(el => {
             const f = currentFields.find(x => x.name === el.dataset.fieldName);
             if (f) {
                 const isCheckbox = f.type && (f.type.toLowerCase().includes('check') || f.type.toLowerCase().includes('radio'));
                 if ((isCheckbox && !f.checked) || (!isCheckbox && (!f.value || f.value.trim() === ''))) {
                     el.style.border = '3px solid red';
                     el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                     setTimeout(() => {
                         el.style.border = '';
                         el.style.backgroundColor = '';
                     }, 3000);
                 }
             }
         });
         return false;
     }
 }
 return true;
}
async function forceDownload(url, filename) {
if (hasFieldEdits) {
const proceed = confirm('⚠️ TIENES CAMBIOS SIN GUARDAR\n\nSi descargas ahora, tus ediciones recientes NO aparecerán en el PDF.\n\n¿Quieres descargar de todos modos?');
if (!proceed) {
showToast('💾 Guarda tus cambios primero', 'low');
return;
}
}
try {
showToast('⏳ Preparando descarga...', 'medium');
const response = await fetch(url);
if (!response.ok) throw new Error('Error en la respuesta del servidor');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
    showToast('✅ Archivo descargado con éxito', 'optimal');
} catch (error) {
    console.error('Error de descarga:', error);
    alert('❌ Error al descargar el archivo. Intenta de nuevo.');
}
}
function triggerAutoSave() {
clearTimeout(saveTimeout);
saveTimeout = setTimeout(async () => {
if (!currentSession) return;
const updates = currentFields.map(f => ({ name: f.name, rect: f.rect, page: f.page, max_len: f.max_len || 0, font_size: f.font_size || 10, align: f.align || 'left', type_input: f.type_input || 'text', value: f.value || '', checked: f.checked || false, font_manual: f.font_manual || false }));
try { await fetch(API_URL + '/api/session/' + currentSession + '/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) }); } catch (e) { console.error('Error autosave', e); }
}, 1500);
}
function checkUnsavedBeforeDownload() {
if (hasFieldEdits || currentFields.some(f => f.is_edited)) {
const proceed = confirm('⚠️ TIENES CAMBIOS SIN GUARDAR\n\nSi descargas ahora, tus ediciones recientes NO aparecerán en el PDF.\n\n¿Quieres descargar de todos modos (sin guardar)?\n\nRecomendación: cancela, presiona Guardar, y luego descarga.');
if (!proceed) {
showToast('💾 Guarda tus cambios primero y vuelve a descargar', 'low', 5000);
return false;
}
}
return true;
}
async function performSave() {
if (!currentSession) return false;
const updates = currentFields.map(f => ({ name: f.name, rect: f.rect, page: f.page, max_len: f.max_len || 0, font_size: f.font_size || 10, align: f.align || 'left', type_input: f.type_input || 'text', value: f.value || '', checked: f.checked || false, font_manual: f.font_manual || false }));
try {
const res = await fetch(API_URL + '/api/session/' + currentSession + '/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
if (!res.ok) throw new Error();
currentFields.forEach(f => f.is_edited = false);
hasFieldEdits = false;
updateUnsavedBadge();
document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('edited-field'));
const dlBtn = document.getElementById('downloadBtn');
if (dlBtn) {
dlBtn.href = '#';
dlBtn.style.display = 'block';
dlBtn.onclick = (e) => {
e.preventDefault();
if (!checkUnsavedBeforeDownload()) return;
if (validateBeforeDownload(e) !== false) {
forceDownload(API_URL + '/api/session/' + currentSession + '/download', 'formulario_lleno.pdf');
}
};
}
    const sealedBtn = document.getElementById('downloadSealedBtn');
    if (sealedBtn) {
        sealedBtn.style.display = 'block';
        sealedBtn.onclick = (e) => {
            e.preventDefault();
            if (!checkUnsavedBeforeDownload()) return;
            if (validateBeforeDownload(e) !== false) {
                forceDownload(API_URL + '/api/session/' + currentSession + '/download?sealed=true', 'formulario_sellado.pdf');
            }
        };
    }
    updateStepper(4);
    return true;
} catch (e) { alert(' Error al guardar'); return false; }
}
document.getElementById('saveBtn')?.addEventListener('click', async () => {
const success = await performSave();
if (success) alert('✅ Cambios guardados');
});
document.getElementById('fillModeBtn')?.addEventListener('click', async () => {
const hasUnsavedChanges = currentFields.some(f => f.is_edited);
if (!isFillMode && hasUnsavedChanges) {
const confirmSave = confirm('Tienes cambios de diseño sin guardar. ¿Deseas guardarlos antes de llenar el formulario?');
if (confirmSave) { const success = await performSave(); if (!success) return; }
}
isFillMode = !isFillMode;
const btn = document.getElementById('fillModeBtn');
btn.textContent = isFillMode ? '️ Modo Edición' : '✍️ Modo Llenado';
btn.style.color = isFillMode ? '#28a745' : '#0071e3';
clearSelection();
renderPdf();
});
document.getElementById('resetBtn')?.addEventListener('click', () => {
if (confirm('¿Reiniciar? Perderás los cambios.')) window.location.reload();
});
function selectField(fieldName) {
if (hasFieldEdits && selectedFieldName !== fieldName) {
triggerShake();
showToast('⚠️ Termina de editar este campo. Presiona Guardar o Cancelar.', 'low');
return;
}
selectedFieldName = fieldName;
const field = currentFields.find(f => f.name === fieldName);
if (!field) return;
originalFieldBackup = JSON.parse(JSON.stringify(field));
hasFieldEdits = false;
updateUnsavedBadge();
document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
const el = document.querySelector('[data-field-name="' + CSS.escape(fieldName) + '"]');
if (el) el.classList.add('selected');
document.getElementById('popoverTitle').textContent = field.name.substring(0, 20);
document.getElementById('propType').value = field.type_input || 'text';
document.getElementById('propCells').value = field.max_len || 0;
document.getElementById('propFontSize').value = field.font_size || 10;
document.getElementById('propAlign').value = field.align || 'left';
const isCheckbox = field.type && (field.type.toLowerCase().includes('check') || field.type.toLowerCase().includes('radio'));
document.querySelectorAll('.text-only-option').forEach(opt => { opt.style.display = isCheckbox ? 'none' : 'flex'; });
floatingToolbar.style.display = 'flex';
floatingToolbar.classList.add('user-editing');
floatingToolbar.classList.remove('preview-mode');
floatingToolbar.style.pointerEvents = 'auto';
if (document.getElementById('zoomBtn')) document.getElementById('zoomBtn').style.display = 'none';
if (headerElement) { headerElement.classList.add('header-hidden'); document.body.classList.add('header-hidden'); clearTimeout(headerTimeout); }
if (el) {
    const rect = el.getBoundingClientRect();
    const popoverHeight = 150;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (window.innerWidth <= 768) {
        floatingToolbar.style.left = '50%';
        if (spaceAbove > popoverHeight + 20) {
            floatingToolbar.style.top = rect.top + 'px';
            floatingToolbar.style.transform = 'translate(-50%, -100%)';
            floatingToolbar.style.marginTop = '-10px';
        } else if (spaceBelow > popoverHeight + 20) {
            floatingToolbar.style.top = rect.bottom + 'px';
            floatingToolbar.style.transform = 'translate(-50%, 0)';
            floatingToolbar.style.marginTop = '10px';
        } else {
            floatingToolbar.style.top = '50%';
            floatingToolbar.style.transform = 'translate(-50%, -50%)';
            floatingToolbar.style.marginTop = '0px';
        }
    } else {
        let topPos = rect.top - 100;
        let leftPos = rect.left + rect.width / 2;
        if (topPos < 20) topPos = rect.bottom + 20;
        if (leftPos < 200) leftPos = 200;
        if (leftPos > window.innerWidth - 200) leftPos = window.innerWidth - 200;
        floatingToolbar.style.transform = 'translate(-50%, 0)';
        floatingToolbar.style.left = leftPos + 'px';
        floatingToolbar.style.top = topPos + 'px';
        floatingToolbar.style.marginTop = '0px';
    }
}
}
function clearSelection() {
selectedFieldName = null;
if (!currentFields.some(f => f.is_edited)) {
hasFieldEdits = false;
}
updateUnsavedBadge();
document.querySelectorAll('.field-rect').forEach(el => el.classList.remove('selected'));
floatingToolbar.style.display = 'none';
const helpTip = document.getElementById('helpTooltip');
if (helpTip) helpTip.style.display = 'none';
if (document.getElementById('zoomBtn') && document.body.classList.contains('editing-mode')) document.getElementById('zoomBtn').style.display = 'flex';
}
document.getElementById('closePopover')?.addEventListener('click', (e) => {
if (hasFieldEdits) {
e.preventDefault();
e.stopPropagation();
triggerShake();
showToast('⚠️ Tienes cambios sin guardar. Presiona Guardar o Cancelar.', 'low');
} else {
clearSelection();
}
});
document.addEventListener('mousedown', (e) => {
if (floatingToolbar.style.display === 'flex' && !e.target.closest('.field-rect') && !e.target.closest('.floating-popover')) {
if (hasFieldEdits) {
triggerShake();
showToast('⚠️ Tienes cambios sin guardar. Presiona Guardar o Cancelar.', 'low');
} else {
clearSelection();
}
}
});
function updateUnsavedBadge() {
const badge = document.getElementById('unsavedBadge');
if (!badge) return;
if (hasFieldEdits) {
badge.style.display = 'block';
badge.title = 'Tienes cambios sin guardar. Debes guardar antes de descargar el PDF.';
} else {
badge.style.display = 'none';
}
}
function markAsEdited(field) {
field.is_edited = true;
hasFieldEdits = true;
updateUnsavedBadge();
const el = document.querySelector('[data-field-name="' + CSS.escape(field.name) + '"]');
if (el) el.classList.add('edited-field');
}
document.getElementById('propCells')?.addEventListener('input', (e) => {
const f = currentFields.find(f => f.name === selectedFieldName);
if (f) {
const newMaxLen = parseInt(e.target.value) || 0;
    if (newMaxLen > 0) {
         const fieldWidth = f.rect[2] - f.rect[0];
         const fontSize = f.font_size || 10;
         const minCellWidth = fontSize * 0.65;
         if ((fieldWidth / newMaxLen) < minCellWidth) {
             triggerShake();
             setTimeout(() => alert('⚠️ El espacio es demasiado pequeño para tantas celdas.\n\nPor favor, reduce el tamaño de la fuente para poder agregar más celdas.'), 400);
             e.target.value = f.max_len;
             return;
         }
     }
     f.max_len = newMaxLen;
     const el = document.querySelector('[data-field-name="' + CSS.escape(f.name) + '"]');
     if (el) {
         if (f.max_len > 0) {
             el.classList.add('comb');
             el.style.backgroundImage = 'linear-gradient(to right, rgba(0, 113, 227, 0.6) 1px, transparent 1px)';
             el.style.backgroundSize = 'calc(100% / ' + f.max_len + ') 100%';
         } else {
             el.classList.remove('comb');
             el.style.backgroundImage = 'none';
         }
     }
     markAsEdited(f);
 }
});
document.getElementById('propFontSize')?.addEventListener('input', (e) => {
const f = currentFields.find(f => f.name === selectedFieldName);
if (!f) return;
const newFontSize = parseInt(e.target.value) || 10;
if (f.max_len > 0) {
const fieldWidth = f.rect[2] - f.rect[0];
const minCellWidth = newFontSize * 0.65;
if ((fieldWidth / f.max_len) < minCellWidth) {
triggerShake();
setTimeout(() => alert('⚠️ Esta fuente es demasiado grande para la cantidad de celdas actual.\n\nPor favor, reduce el número de celdas o usa una fuente más pequeña.'), 400);
e.target.value = f.font_size;
return;
}
}
f.font_size = newFontSize;
f.font_manual = true;
const _fEl = document.querySelector('[data-field-name="' + CSS.escape(f.name) + '"]');
if (_fEl) {
_fEl.querySelectorAll('input[type="text"]').forEach(inp => {
inp.style.fontSize = Math.max(8, newFontSize * currentScale) + 'px';
});
}
markAsEdited(f);
});
document.getElementById('propAlign')?.addEventListener('change', (e) => {
const f = currentFields.find(f => f.name === selectedFieldName);
if (f) {
f.align = e.target.value;
const el = document.querySelector('[data-field-name="' + CSS.escape(f.name) + '"]');
if (el) {
el.querySelectorAll('input[type="text"]').forEach(inp => {
inp.style.textAlign = f.align;
});
}
markAsEdited(f);
hasFieldEdits = true;
}
});
document.getElementById('propType')?.addEventListener('change', (e) => {
const f = currentFields.find(f => f.name === selectedFieldName);
if (f) {
f.type_input = e.target.value;
const el = document.querySelector('[data-field-name="' + CSS.escape(f.name) + '"]');
if (el) {
const parent = el.parentNode;
el.remove();
createFieldElement(f, parent);
const newEl = parent.querySelector('[data-field-name="' + CSS.escape(f.name) + '"]');
if (newEl) newEl.classList.add('selected');
}
markAsEdited(f);
hasFieldEdits = true;
}
});
document.getElementById('saveFieldBtn')?.addEventListener('click', async (e) => {
e.preventDefault();
const success = await performSave();
if (success) {
hasFieldEdits = false;
clearSelection();
renderPdf();
showToast('✅ Cambios guardados. Ya puedes descargar el PDF con tus ediciones.', 'optimal', 6000);
}
});
document.getElementById('cancelFieldBtn')?.addEventListener('click', (e) => {
e.preventDefault();
if (originalFieldBackup && selectedFieldName) {
const f = currentFields.find(f => f.name === selectedFieldName);
if (f) {
f.max_len = originalFieldBackup.max_len;
f.font_size = originalFieldBackup.font_size;
f.align = originalFieldBackup.align;
f.type_input = originalFieldBackup.type_input;
f.font_manual = originalFieldBackup.font_manual;
f.rect = [...originalFieldBackup.rect];
}
}
hasFieldEdits = false;
clearSelection();
renderPdf();
});
document.getElementById('deleteField')?.addEventListener('click', (e) => {
e.preventDefault();
if (!selectedFieldName) return;
const el = document.querySelector('[data-field-name="' + CSS.escape(selectedFieldName) + '"]');
if (el) el.remove();
currentFields = currentFields.filter(f => f.name !== selectedFieldName);
clearSelection();
});
document.getElementById('helpBtn')?.addEventListener('click', (e) => {
e.stopPropagation();
const tt = document.getElementById('helpTooltip');
if (tt) tt.style.display = tt.style.display === 'block' ? 'none' : 'block';
});
function setupDrawingEvents(pageDiv, pageIndex) {
pageDiv.addEventListener('mousedown', (e) => {
if (!isDrawingMode) return;
const rect = pageDiv.getBoundingClientRect();
drawStartX = e.clientX - rect.left;
drawStartY = e.clientY - rect.top;
isDrawing = true;
let box = document.getElementById('tempDrawBox');
if (!box) {
box = document.createElement('div');
box.id = 'tempDrawBox';
box.style.cssText = 'position:absolute;border:2px dashed #ff6b00;background:rgba(255,107,0,0.2);pointer-events:none;z-index:100;';
pageDiv.appendChild(box);
}
box.style.left = drawStartX + 'px';
box.style.top = drawStartY + 'px';
box.style.width = '0px';
box.style.height = '0px';
box.style.display = 'block';
});
pageDiv.addEventListener('mousemove', (e) => {
if (!isDrawing) return;
const box = document.getElementById('tempDrawBox');
const rect = pageDiv.getBoundingClientRect();
const curX = e.clientX - rect.left, curY = e.clientY - rect.top;
const w = curX - drawStartX, h = curY - drawStartY;
box.style.left = (w < 0 ? curX : drawStartX) + 'px';
box.style.top = (h < 0 ? curY : drawStartY) + 'px';
box.style.width = Math.abs(w) + 'px';
box.style.height = Math.abs(h) + 'px';
});
pageDiv.addEventListener('mouseup', () => {
if (!isDrawing) return;
isDrawing = false;
const box = document.getElementById('tempDrawBox');
if (!box) return;
const w = parseFloat(box.style.width), h = parseFloat(box.style.height);
if (w > 10 && h > 5) {
const newField = {
page: pageIndex,
name: 'manual_' + Date.now(),
type: 'text',
type_input: 'text',
rect: [parseFloat(box.style.left)/currentScale, parseFloat(box.style.top)/currentScale, (parseFloat(box.style.left)+w)/currentScale, (parseFloat(box.style.top)+h)/currentScale],
max_len: 0,
font_size: 10,
align: 'left',
is_edited: true,
font_manual: false
};
currentFields.push(newField);
            renderPdf();
            selectField(newField.name);
            isDrawingMode = false;
            document.body.style.cursor = 'default';

            // ⚡ AUTO-GUARDADO AL CREAR: Evita el estado "naranja" y los bugs visuales
            performSave().then(() => {
                showToast('✅ Nuevo recuadro guardado automáticamente', 'optimal');
            });
}
box.style.display = 'none';
});
}
let dragEl, dragField, startX, startY, startL, startT;
function makeDraggable(el, field) {
el.addEventListener('mousedown', (e) => {
if (isDrawingMode) return;
e.preventDefault();
e.stopPropagation();
dragEl = el;
dragField = field;
startX = e.clientX;
startY = e.clientY;
startL = parseFloat(el.style.left);
startT = parseFloat(el.style.top);
});
}
document.addEventListener('mousemove', (e) => {
if (!dragEl) return;
dragEl.style.left = (startL + e.clientX - startX) + 'px';
dragEl.style.top = (startT + e.clientY - startY) + 'px';
if (floatingToolbar.style.display === 'flex') {
const rect = dragEl.getBoundingClientRect();
let topPos = rect.top;
if (topPos < 150) topPos = rect.bottom + 10;
else topPos = topPos - 100;
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
markAsEdited(dragField);
if (floatingToolbar.style.display !== 'flex') {
triggerAutoSave(); updatePaywallProgress();
hasFieldEdits = false;
}
dragEl = null;
dragField = null;
});
window.addEventListener('resize', () => {
if (pdfDoc && editorView.style.display !== 'none') {
clearTimeout(resizeTimeout);
resizeTimeout = setTimeout(() => { renderPdf(); }, 300);
}
});
let fieldsHidden = false;
const toggleFieldsBtn = document.getElementById('toggleFieldsBtn');
if (toggleFieldsBtn) {
toggleFieldsBtn.addEventListener('click', () => {
fieldsHidden = !fieldsHidden;
if (fieldsHidden) {
document.body.classList.add('fields-hidden');
toggleFieldsBtn.innerHTML = '👁️ Mostrar Campos';
toggleFieldsBtn.classList.add('active');
} else {
document.body.classList.remove('fields-hidden');
toggleFieldsBtn.innerHTML = '👁️ Ocultar Campos';
toggleFieldsBtn.classList.remove('active');
}
});
}
document.addEventListener('DOMContentLoaded', () => {
const openBtn = document.getElementById('openPricingBtn');
const modal = document.getElementById('pricingModal');
const closeBtn = document.getElementById('closePricingBtn');
if (openBtn && modal) {
     openBtn.addEventListener('click', () => {
         modal.style.display = 'flex';
     });
 }
 if (closeBtn && modal) {
     closeBtn.addEventListener('click', () => {
         modal.style.display = 'none';
     });
 }
 if (modal) {
     modal.addEventListener('click', (e) => {
         if (e.target === modal) {
             modal.style.display = 'none';
         }
     });
 }
});
const headerPeekTab = document.getElementById('headerPeekTab');
if (headerPeekTab) {
headerPeekTab.addEventListener('click', () => {
if (headerElement) headerElement.classList.remove('header-hidden');
document.body.classList.remove('header-hidden');
document.body.classList.remove('header-unpinned');
    const pinCheckbox = document.getElementById('pinHeaderCheckbox');
    if (pinCheckbox) {
        pinCheckbox.checked = true;
        pinCheckbox.dispatchEvent(new Event('change'));
    }
});
}
const pinHeaderCheckbox = document.getElementById('pinHeaderCheckbox');
function applyHeaderPin(pinned) {
if (pinned) {
document.body.classList.add('header-pinned');
document.body.classList.remove('header-unpinned');
if (headerElement) headerElement.classList.remove('header-hidden');
document.body.classList.remove('header-hidden');
} else {
document.body.classList.remove('header-pinned');
document.body.classList.add('header-unpinned');
}
localStorage.setItem('header_pinned', pinned ? 'true' : 'false');
}
if (pinHeaderCheckbox) {
const savedState = localStorage.getItem('header_pinned');
const isPinned = savedState === 'false' ? false : true;
pinHeaderCheckbox.checked = isPinned;
applyHeaderPin(isPinned);
pinHeaderCheckbox.addEventListener('change', (e) => {
    applyHeaderPin(e.target.checked);
});
}
if (typeof showHeaderTemporarily === 'function') {
const originalShowHeaderTemporarily = showHeaderTemporarily;
window.showHeaderTemporarily = function() {
if (localStorage.getItem('header_pinned') === 'true') {
if (headerElement) headerElement.classList.remove('header-hidden');
document.body.classList.remove('header-hidden');
return;
}
originalShowHeaderTemporarily.apply(this, arguments);
};
}
const TOUR_VERSION = 'v1';
function runTour(mode) {
if (typeof window.driver === 'undefined') {
console.warn('Driver.js no cargado. Reintentando en 500ms...');
setTimeout(() => {
if (typeof window.driver !== 'undefined') runTour(mode);
}, 500);
return;
}
const driverFactory = window.driver.js.driver;
let tour;
if (mode === 'fill') {
     tour = driverFactory({
         showProgress: true,
         showButtons: ['next', 'previous', 'close'],
         progressText: 'Paso {{current}} de {{total}}',
         nextBtnText: 'Siguiente →',
         prevBtnText: '← Anterior',
         doneBtnText: '¡Entendido! ✓',
         steps: [
             { element: '.pdf-container', popover: { title: '📄 Tu formulario', description: 'Aquí ves el PDF con los campos listos para llenar. Haz clic en cualquier campo y escribe.', side: 'top', align: 'center' } },
             { element: '#toggleFieldsBtn', popover: { title: '👁️ Mostrar/Ocultar recuadros', description: 'Si los recuadros azules no te dejan ver las líneas del documento original, usa este botón para volverlos transparentes.', side: 'left', align: 'center' } },
             { element: '#headerActions', popover: { title: ' Acciones rápidas', description: 'Aquí están todas las acciones: Guardar, Descargar, Modo Edición, Tutorial y más.', side: 'bottom', align: 'center' } },
             { element: '#saveBtn', popover: { title: '💾 Guardar (IMPORTANTE)', description: 'Antes de descargar, SIEMPRE presiona Guardar. Sin esto, tus datos no aparecerán en el PDF final.', side: 'bottom', align: 'center' } },
             { element: '#downloadBtn', popover: { title: '⬇ Descargar', description: 'Descarga tu PDF con los datos llenos. Puedes elegir Editable o Sellado.', side: 'bottom', align: 'center' } }
         ]
     });
 } else {
     tour = driverFactory({
         showProgress: true,
         showButtons: ['next', 'previous', 'close'],
         progressText: 'Paso {{current}} de {{total}}',
         nextBtnText: 'Siguiente →',
         prevBtnText: '← Anterior',
         doneBtnText: '¡Entendido! ✓',
         steps: [
             { element: '.pdf-container', popover: { title: '📄 Tu documento', description: 'Aquí ves el PDF con los campos detectados por la IA. Puedes moverlos, redimensionarlos o crear nuevos.', side: 'top', align: 'center' } },
             { element: '.pdf-page .field-rect', popover: { title: '➕ Editar o crear campo', description: 'Haz clic en el botón + de cada campo para ajustar su tipo, tamaño de fuente, alineación o celdas.', side: 'bottom', align: 'center' } },
             { element: '#headerActions', popover: { title: '⚡ Acciones rápidas', description: 'Aquí están todas las acciones: Guardar, Descargar, Modo Llenado, Tutorial y más.', side: 'bottom', align: 'center' } },
             { element: '#saveBtn', popover: { title: '💾 Guardar (CRÍTICO)', description: 'Cada vez que edites un campo, presiona Guardar. Si no lo haces, tus cambios NO se aplicarán al PDF descargado.', side: 'bottom', align: 'center' } },
             { element: '#downloadBtn', popover: { title: '⬇ Descargar', description: 'Una vez guardado, descarga el PDF con los campos nuevos.', side: 'bottom', align: 'center' } }
         ]
     });
 }
 tour.drive();
}
const TOUR_WELCOME_VERSION = 'v1';
function showTourWelcome() {
if (localStorage.getItem('tour_welcome_visto') === TOUR_WELCOME_VERSION) {
return;
}
const modal = document.getElementById('tourWelcomeModal');
if (!modal) return;
modal.style.display = 'flex';
}
function hideTourWelcome() {
const modal = document.getElementById('tourWelcomeModal');
if (modal) modal.style.display = 'none';
}
document.addEventListener('DOMContentLoaded', () => {
const startBtn = document.getElementById('tourStartBtn');
const cancelBtn = document.getElementById('tourCancelBtn');
if (startBtn) {
     startBtn.addEventListener('click', () => {
         hideTourWelcome();
         setTimeout(() => { runTour(isFillMode ? 'fill' : 'edit'); }, 300);
     });
 }
 if (cancelBtn) {
     cancelBtn.addEventListener('click', () => {
         hideTourWelcome();
     });
 }
});
function maybeAutoTour() { setTimeout(() => { showTourWelcome(); }, 1500); }
document.getElementById('tourBtnMenu')?.addEventListener('click', (e) => { e.preventDefault(); setTimeout(() => runTour(isFillMode ? 'fill' : 'edit'), 200); });
document.getElementById('tourBtnFloating')?.addEventListener('click', (e) => { e.preventDefault(); runTour(isFillMode ? 'fill' : 'edit'); });
window.__maybeAutoTour = maybeAutoTour;
function updatePaywallProgress() {
if (sessionIsPaid) return;
const totalFields = currentFields.length;
if (totalFields === 0) return;
const filledFields = currentFields.filter(function(f) {
const isCheckbox = f.type && (f.type.toLowerCase().indexOf('check') !== -1 || f.type.toLowerCase().indexOf('radio') !== -1);
if (isCheckbox) return f.checked;
return f.value && f.value.trim() !== '';
}).length;
const percentage = (filledFields / totalFields) * 100;
if (percentage >= 30 && !paywallShown) { showPaywallModal(); }
}
function showPaywallModal() {
if (sessionIsPaid || paywallShown) return;
paywallShown = true;
const overlay = document.createElement('div');
overlay.id = 'paywallOverlay';
overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:50000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
overlay.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);"><div style="font-size:64px;margin-bottom:20px;"></div><h2 style="margin:0 0 10px 0;color:#1d1d1f;font-size:24px;">Has alcanzado el límite de prueba</h2><p style="color:#666;font-size:15px;margin-bottom:25px;line-height:1.6;">Has completado el 30% de los campos. Para desbloquear el resto del documento y descargarlo, adquiere uno de nuestros planes.</p><div style="display:flex;gap:12px;margin-bottom:20px;"><button onclick="purchasePlan(\'basico\')" style="flex:1;padding:14px;background:#ff6b00;color:white;border:none;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;">Plan Básico<br><span style="font-size:20px;">$1.99</span></button><button onclick="purchasePlan(\'pro\')" style="flex:1;padding:14px;background:#0071e3;color:white;border:none;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;">Plan Pro<br><span style="font-size:20px;">$4.99</span></button></div><button onclick="document.getElementById(\'paywallOverlay\').remove();paywallShown=false;" style="background:none;border:none;color:#999;font-size:13px;cursor:pointer;text-decoration:underline;">Seguir explorando (sin editar)</button></div>';
document.body.appendChild(overlay);
}
function purchasePlan(plan) { alert('🚧 El sistema de pago con PayPal estará disponible pronto.\n\nPlan seleccionado: ' + plan.toUpperCase()); }
window._paywallStatus = function() {
const total = currentFields.length;
const filled = currentFields.filter(function(f) {
const isCb = f.type && (f.type.toLowerCase().indexOf('check') !== -1 || f.type.toLowerCase().indexOf('radio') !== -1);
return isCb ? f.checked : (f.value && f.value.trim() !== '');
}).length;
return { total: total, filled: filled, percentage: ((filled/total)*100).toFixed(1) + '%', isPaid: sessionIsPaid };
};




// ═══════════════════════════════════════════════════════
// FUNCIÓN PÚBLICA PARA CARGAR UNA SESIÓN POR ID (Para el retorno de PayPal)
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// FUNCIÓN CORREGIDA: Carga el PDF y recupera los campos guardados
// ═══════════════════════════════════════════════════════
window.cargarSesionPorId = async function(sessionId) {
    try {
        console.log("🔄 Restaurando sesión completa para:", sessionId);
        
        // 🧹 LIMPIAR CAMPOS EXISTENTES
        document.querySelectorAll('.field-rect').forEach(el => el.remove());
        document.querySelectorAll('.field-rect.locked').forEach(el => el.remove());
        document.querySelectorAll('.paywall-overlay').forEach(el => el.remove());
        
        // ⚡ MARCAR COMO PREMIUM
        if (localStorage.getItem('usuario_premium') === 'true') {
            sessionIsPaid = true;
        }
        
        // 🚫 NO DIBUJAR CAMPOS (evita doble capa)
        // El PDF ya tiene los datos quemados por el servidor.
        currentFields = [];
        
        // 🧹 LIMPIAR CUALQUIER CAMPO EXISTENTE ANTES DE RESTAURAR
        document.querySelectorAll('.field-rect').forEach(el => el.remove());
        document.querySelectorAll('.field-rect.locked').forEach(el => el.remove());
        document.querySelectorAll('.paywall-overlay').forEach(el => el.remove());
        
        // ⚡ VERIFICAR SI YA PAGÓ Y ACTUALIZAR EL ESTADO GLOBAL
        if (localStorage.getItem('usuario_premium') === 'true') {
            sessionIsPaid = true;
            console.log("✅ Usuario Premium detectado. Desbloqueando campos.");
        }
        
        // 🧹 LIMPIAR CAMPOS DUPLICADOS ANTES DE RESTAURAR
        document.querySelectorAll('.field-rect').forEach(el => el.remove());
        document.querySelectorAll('.field-rect.locked').forEach(el => el.remove());
        
        // ⚡ VERIFICAR SI YA PAGÓ Y ACTUALIZAR EL ESTADO GLOBAL
        if (localStorage.getItem('usuario_premium') === 'true') {
            sessionIsPaid = true;
            console.log("✅ Usuario Premium detectado. Desbloqueando campos.");
        }
        
        // 1. Recuperar los campos guardados del localStorage
        var camposGuardados = localStorage.getItem('pdf_pendiente_campos');
        if (camposGuardados) {
            currentFields = JSON.parse(camposGuardados);
            console.log("✅ Campos recuperados:", currentFields.length);
        } else {
            currentFields = [];
            console.warn("⚠️ No se encontraron campos guardados.");
        }
        
        // 2. Cargar el PDF
        pdfDoc = await pdfjsLib.getDocument(API_URL + '/api/session/' + sessionId + '/pdf').promise;
        currentSession = sessionId;
        
        // 3. Ocultar upload, mostrar editor
        uploadView.style.display = 'none';
        document.body.classList.add('editing-mode');
        editorView.style.display = 'flex';
        
        // 4. Activar modo llenado
        isFillMode = true;
        const fillBtn = document.getElementById('fillModeBtn');
        if (fillBtn) {
            fillBtn.textContent = '✏️ Modo Edición';
            fillBtn.style.color = '#28a745';
        }
        
        // 5. Renderizar el PDF con los campos recuperados
        await renderPdf();
        updateStepper(3);
        showToast("✅ Documento restaurado. Puedes continuar editando.", "optimal");
        
    } catch (error) {
        console.error("❌ Error al restaurar sesión:", error);
        showToast("⚠️ No se pudo restaurar el documento. Súbelo de nuevo.", "low");
        uploadView.style.display = 'flex';
        editorView.style.display = 'none';
    }
};









// ═══════════════════════════════════════════════════════
// HERRAMIENTA LÁPIZ (Dibujar recuadros nuevos)
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const drawBtn = document.getElementById('drawModeBtn');
    if (drawBtn) {
        drawBtn.addEventListener('click', () => {
            isDrawingMode = !isDrawingMode;
            if (isDrawingMode) {
                document.body.style.cursor = 'crosshair';
                drawBtn.style.background = '#ff6b00';
                drawBtn.style.color = '#fff';
                drawBtn.innerHTML = '✏️ Dibujando... (Clic para cancelar)';
                showToast('✏️ Haz clic y arrastra sobre el PDF para dibujar un recuadro nuevo.', 'optimal');
            } else {
                document.body.style.cursor = 'default';
                drawBtn.style.background = '';
                drawBtn.style.color = '';
                drawBtn.innerHTML = '✏️ Lápiz';
            }
        });
    }
    
    // Mostrar el botón Lápiz solo en el editor
    const observer = new MutationObserver(() => {
        if (drawBtn) {
            if (document.body.classList.contains('editing-mode')) {
                drawBtn.style.display = 'block';
            } else {
                drawBtn.style.display = 'none';
            }
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});




// Lógica de Deshacer con Auto Save al 30% (Usando Modal en lugar de alert)
let historialCambios = [];
let botonDeshacerVisible = false;
const PORCENTAJE_MINIMO = 30;

function iniciarAutoSaveUndo() {
    setInterval(() => {
        const campos = document.querySelectorAll('input[type="text"], textarea');
        let llenos = 0;
        campos.forEach(c => { if(c.value.trim() !== '') llenos++; });
        
        const porcentaje = (llenos / campos.length) * 100;
        
        if (porcentaje >= PORCENTAJE_MINIMO && !botonDeshacerVisible) {
            botonDeshacerVisible = true;
            
            // EN LUGAR DE ALERT, ABRIMOS EL MODAL BONITO
            const modal = document.getElementById('pricingModal');
            if (modal) {
                modal.style.display = 'flex';
            }

            const btnUndo = document.getElementById('btn-undo');
            if (btnUndo) {
                btnUndo.style.display = 'inline-block';
            }
            
            // Empezar a guardar historial
            campos.forEach(campo => {
                campo.addEventListener('focus', function() {
                    historialCambios.push({ elemento: this, valorAnterior: this.value });
                    if (historialCambios.length > 50) historialCambios.shift();
                });
            });
        }
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarAutoSaveUndo();
    const btn = document.getElementById('btn-undo');
    if(btn) {
        btn.addEventListener('click', () => {
            if (historialCambios.length > 0) {
                const ultimo = historialCambios.pop();
                ultimo.elemento.value = ultimo.valorAnterior;
                ultimo.elemento.focus();
            }
        });
    }
});


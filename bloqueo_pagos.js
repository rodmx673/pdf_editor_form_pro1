document.addEventListener('DOMContentLoaded', () => {
    const esPremium = localStorage.getItem('usuario_premium') === 'true';
    const campos = document.querySelectorAll('input[type="text"], textarea');
    const totalCampos = campos.length;
    const limite = Math.floor(totalCampos * 0.30);
    
    let camposLlenos = 0;
    let yaAviso = false;

    // 1. Monitorear el llenado
    campos.forEach(campo => {
        campo.addEventListener('input', function() {
            if (esPremium) return; // Si ya pagó, no hay límites

            // Contar cuántos campos tienen texto
            let llenosAhora = 0;
            campos.forEach(c => { if (c.value.trim() !== '') llenosAhora++; });

            // Si supera el 30%, le avisamos y bloqueamos
            if (llenosAhora > limite && !yaAviso) {
                yaAviso = true;
                
                // Abrir el modal de pago (tu diseño bonito)
                const modal = document.getElementById('pricingModal');
                if (modal) modal.style.display = 'flex';

                // Bloquear el campo actual para que no escriba más
                this.value = this.value.substring(0, this.value.length - 1); // Borra la última letra
                
                // Opcional: Bloquear todos los campos (o dejarlos libres pero sin guardar)
                // campos.forEach(c => c.disabled = true); 
            }
        });
    });

    // 2. Bloquear la descarga
    const btnDescargarEditable = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Descargar Editable'));
    const btnDescargarSellado = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Descargar Sellado'));

    function interceptarDescarga(evento) {
        if (!esPremium) {
            evento.preventDefault(); 
            evento.stopPropagation(); 
            const modal = document.getElementById('pricingModal');
            if (modal) modal.style.display = 'flex';
            return false;
        }
    }

    if (btnDescargarEditable) btnDescargarEditable.addEventListener('click', interceptarDescarga, true);
    if (btnDescargarSellado) btnDescargarSellado.addEventListener('click', interceptarDescarga, true);
});

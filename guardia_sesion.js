document.addEventListener('click', function(e) {
    // Detecta clics en botones de "Comprar" dentro del modal de precios
    var btn = e.target.closest('#pricingModal button');
    if (btn && btn.innerText.includes('Comprar')) {
        // Guardar el plan seleccionado
        var plan = btn.innerText.includes('Básico') ? 'basico' : 'pro';
        localStorage.setItem('plan_comprado', plan);
        
        // Guardar el ID de la sesión actual del PDF
        if (typeof window.currentSession !== 'undefined' && window.currentSession) {
            localStorage.setItem('pdf_pendiente_id', window.currentSession);
            console.log('💾 [GUARDIA] ID de sesión guardado:', window.currentSession);
        }
    }
}, true);

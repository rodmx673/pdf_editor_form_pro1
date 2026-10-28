// ESCUDO DE DESCARGA V2 - Intercepta el fetch de descarga
(function() {
    console.log('🛡️ Escudo de descarga V2 activado');
    
    // Guardar fetch original
    const originalFetch = window.fetch;
    
    // Reemplazar fetch con versión que verifica pago
    window.fetch = function(url, options) {
        // Detectar si es una petición de descarga
        const urlStr = url.toString();
        if (urlStr.includes('/download')) {
            console.log('🛡️ Interceptada petición de descarga:', urlStr);
            
            // Verificar si está pagado
            if (typeof window.sessionIsPaid !== 'undefined' && !window.sessionIsPaid) {
                console.log('🛡️ Descarga bloqueada - Usuario no ha pagado');
                
                // Mostrar modal de pago
                if (typeof window.showPaywallModal === 'function') {
                    // Resetear paywallShown para que pueda mostrarse de nuevo
                    window.paywallShown = false;
                    window.showPaywallModal();
                } else {
                    alert('🔒 Debes completar el pago para descargar el PDF.');
                }
                
                // Retornar respuesta de error para cancelar la descarga
                return Promise.resolve({
                    ok: false,
                    status: 403,
                    statusText: 'Forbidden',
                    blob: () => Promise.resolve(new Blob()),
                    json: () => Promise.resolve({ error: 'Payment required' })
                });
            }
            
            console.log('✅ Descarga permitida - Usuario ha pagado');
        }
        
        // Si no es descarga o está pagado, ejecutar fetch normal
        return originalFetch.apply(this, arguments);
    };
    
    console.log('🛡️ Fetch interceptor instalado');
})();

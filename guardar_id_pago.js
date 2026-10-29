document.addEventListener('DOMContentLoaded', function() {
    // Buscamos los botones de compra en el modal de precios
    var botonesComprar = document.querySelectorAll('#pricingModal button');
    
    botonesComprar.forEach(function(boton) {
        if (boton.innerText.includes('Comprar')) {
            boton.addEventListener('click', function() {
                // Guardar el ID de la sesión actual (si existe)
                if (typeof currentSession !== 'undefined' && currentSession) {
                    localStorage.setItem('pdf_pendiente_id', currentSession);
                    console.log("💾 ID de sesión guardado para el pago:", currentSession);
                } else {
                    console.log("⚠️ No hay sesión activa para guardar.");
                }
            });
        }
    });
});

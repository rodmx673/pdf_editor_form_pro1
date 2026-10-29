document.addEventListener('DOMContentLoaded', function() {
    // Buscamos los botones de compra en el modal de precios
    var botonesComprar = document.querySelectorAll('#pricingModal button');
    
    botonesComprar.forEach(function(boton) {
        if (boton.innerText.includes('Comprar')) {
            boton.addEventListener('click', function() {
                // Guardar el ID y los CAMPOS actuales en localStorage
                if (typeof currentSession !== 'undefined' && currentSession) {
                    localStorage.setItem('pdf_pendiente_id', currentSession);
                    console.log("💾 ID de sesión guardado:", currentSession);
                }
                if (typeof currentFields !== 'undefined' && currentFields.length > 0) {
                    localStorage.setItem('pdf_pendiente_campos', JSON.stringify(currentFields));
                    console.log("💾 Campos guardados:", currentFields.length);
                }
            });
        }
    });
});

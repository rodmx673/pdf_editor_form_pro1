document.addEventListener('DOMContentLoaded', function() {
    // Buscamos los botones de compra dentro del modal de precios
    var botonesComprar = document.querySelectorAll('#pricingModal button');
    
    botonesComprar.forEach(function(boton) {
        // Si el botón dice "Comprar Plan..."
        if (boton.innerText.includes('Comprar')) {
            boton.addEventListener('click', function() {
                // 1. Intentar obtener el ID de la sesión del PDF de la URL actual
                // Tu app usa URLs como: /api/session/XXXX-XXXX-XXXX/pdf
                // O guarda el ID en una variable global.
                // Por seguridad, buscaremos el ID en la URL actual o en el localStorage.
                
                var urlActual = window.location.href;
                var match = urlActual.match(/session\/([a-zA-Z0-9-]+)/);
                
                if (match && match[1]) {
                    // Si lo encontramos en la URL
                    localStorage.setItem('pdf_pendiente_id', match[1]);
                    console.log("💾 ID de sesión guardado para después del pago: " + match[1]);
                } else {
                    // Si no está en la URL, quizás tu script.js lo tiene en una variable global
                    // (Puedes ajustar esto si conoces el nombre de la variable)
                    console.log("No se encontró ID en la URL. Intentando buscar en memoria...");
                }
            });
        }
    });
});

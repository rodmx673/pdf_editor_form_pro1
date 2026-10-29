document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('pago') === 'exitoso') {
        console.log("✅ Pago detectado. Activando modo Premium...");
        localStorage.setItem('usuario_premium', 'true');
        
        // Mostrar mensaje de éxito
        var toast = document.getElementById('toastContainer');
        if (toast) {
            var msg = document.createElement('div');
            msg.style.cssText = 'background: #28a745; color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; z-index: 99999;';
            msg.innerHTML = '🎉 ¡Pago exitoso! Restaurando tu documento...';
            toast.appendChild(msg);
            setTimeout(function() { msg.remove(); }, 5000);
        }

        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Intentar cargar el PDF pendiente si existe
        var idPendiente = localStorage.getItem('pdf_pendiente_id');
        if (idPendiente) {
            console.log("🔄 Recuperando sesión del PDF: " + idPendiente);
            // Si tu script.js tiene una función para cargar por ID, la llamamos
            if (typeof window.cargarSesionPorId === 'function') {
                window.cargarSesionPorId(idPendiente);
            } else {
                console.log("⚠️ No se encontró la función cargarSesionPorId. El usuario debe subir el PDF de nuevo (pero ya es Premium).");
            }
        }
    }
});

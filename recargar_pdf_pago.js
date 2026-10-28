document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('pago') === 'exitoso') {
        // 1. Activar Premium
        localStorage.setItem('usuario_premium', 'true');
        
        // 2. Leer el ID del PDF que guardamos antes de ir a pagar
        var idPendiente = localStorage.getItem('pdf_pendiente_id');
        
        // 3. Mostrar mensaje de bienvenida
        var toast = document.getElementById('toastContainer');
        if (toast) {
            var msg = document.createElement('div');
            msg.style.cssText = 'background: #28a745; color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; z-index: 99999;';
            msg.innerHTML = '🎉 ¡Pago exitoso! Restaurando tu documento...';
            toast.appendChild(msg);
        }

        // 4. Si tenemos un ID pendiente, intentar restaurar la vista
        if (idPendiente) {
            console.log("🔄 Restaurando sesión del PDF: " + idPendiente);
            
            // Ocultamos la vista de subida y mostramos el editor
            var uploadView = document.getElementById('uploadView');
            var editorView = document.getElementById('editorView');
            
            if (uploadView) uploadView.style.display = 'none';
            if (editorView) editorView.style.display = 'block';
            
            // Opcional: Si tu script.js tiene una función para cargar un PDF por ID, la llamamos
            // if (typeof cargarPdfPorId === 'function') {
            //     cargarPdfPorId(idPendiente);
            // }
        } else {
            console.log("⚠️ No se encontró un PDF pendiente. El usuario deberá subirlo de nuevo (pero ya es Premium).");
        }

        // 5. Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 1. Detectar si la URL trae el parámetro de pago exitoso
    var urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('pago') === 'exitoso') {
        console.log("✅ Pago detectado. Activando modo Premium...");
        
        // 2. Guardar en localStorage que el usuario ya pagó
        localStorage.setItem('usuario_premium', 'true');
        
        // 3. Mostrar un mensaje de bienvenida (Toast)
        var toast = document.getElementById('toastContainer');
        if (toast) {
            var msg = document.createElement('div');
            msg.style.cssText = 'background: #28a745; color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            msg.innerHTML = '🎉 ¡Pago exitoso! Ahora puedes descargar tu documento.';
            toast.appendChild(msg);
            setTimeout(function() { msg.remove(); }, 5000);
        }

        // 4. Limpiar la URL (quitar el ?pago=exitoso...) para que no se quede ahí
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 5. Intentar "despertar" el editor de PDF si es que ya estaba cargado
        // (Si el usuario ya había subido un PDF, el editor debería estar en el DOM)
        var editorView = document.getElementById('editorView');
        if (editorView && editorView.style.display === 'none') {
            // Si el editor está oculto, asumimos que necesitamos mostrarlo
            // (Esto es un parche, lo ideal es que la app recuerde el estado)
            console.log("El editor estaba oculto. El usuario deberá subir el PDF de nuevo, pero ya es Premium.");
        }
    } else if (urlParams.get('pago') === 'cancelado') {
        console.log("❌ Pago cancelado por el usuario.");
        var toast = document.getElementById('toastContainer');
        if (toast) {
            var msg = document.createElement('div');
            msg.style.cssText = 'background: #dc3545; color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px;';
            msg.innerHTML = '❌ Pago cancelado. Puedes intentarlo de nuevo.';
            toast.appendChild(msg);
            setTimeout(function() { msg.remove(); }, 5000);
        }
        // Limpiamos la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

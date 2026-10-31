document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pago') === 'exitoso') {
        // 1. Marcar como premium
        localStorage.setItem('usuario_premium', 'true');
        
        var idPendiente = localStorage.getItem('pdf_pendiente_id');
        var planGuardado = localStorage.getItem('plan_comprado') || 'pro';
        var monto = planGuardado === 'basico' ? '1.99' : '4.99';
        
        // 2. Registrar el pago en Google Sheets (a través de Node)
        fetch('/api/log-pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: 'pago',
                datos: {
                    email: 'usuario@ejemplo.com', 
                    plan: planGuardado,
                    monto: monto,
                    moneda: 'USD',
                    pasarela: 'PayPal',
                    estado: 'Completado',
                    sessionId: idPendiente || 'N/A',
                    detalles: 'Pago desde la web'
                }
            })
        }).then(() => console.log('✅ Log de pago enviado a Google Sheets'))
          .catch(err => console.error('Error al registrar log:', err));

        // 3. Restaurar la sesión del PDF
        if (idPendiente) {
            if (document.getElementById('uploadView')) document.getElementById('uploadView').style.display = 'none';
            if (document.getElementById('editorView')) document.getElementById('editorView').style.display = 'flex';
            
            if (typeof window.cargarSesionPorId === 'function') {
                window.cargarSesionPorId(idPendiente);
            } else {
                console.log("⚠️ Función cargarSesionPorId no encontrada.");
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

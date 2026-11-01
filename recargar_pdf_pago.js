document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get('pago');

    if (estado === 'cancelado') {
        mostrarAviso('Pago cancelado. No se realizó ningún cargo.', 'low');
        limpiarUrl();
        return;
    }

    if (estado !== 'exitoso') return;

    const orderId = params.get('token');
    const sessionId = params.get('session_id') || localStorage.getItem('pdf_pendiente_id');

    if (!orderId || !sessionId) {
        mostrarAviso('No se pudo identificar el pago. Contacta a soporte.', 'low');
        limpiarUrl();
        return;
    }

    mostrarAviso('Confirmando pago con PayPal...', 'medium');

    try {
        const res = await fetch('/api/capturar-pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, session_id: sessionId, plan: localStorage.getItem('plan_comprado') || 'basico' })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.paid) {
            throw new Error(data.error || data.detail || 'No se pudo confirmar el pago');
        }

        localStorage.setItem('usuario_premium', 'true');
        localStorage.setItem('pdf_pendiente_id', sessionId);
        localStorage.setItem('pago_order_id', orderId);

        const planGuardado = localStorage.getItem('plan_comprado') || 'pro';
        const monto = planGuardado === 'basico' ? '1.99' : '4.99';

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
                    sessionId: sessionId,
                    orderId: orderId,
                    detalles: 'Pago verificado con PayPal'
                }
            })
        }).catch(err => console.error('Error al registrar log:', err));

        limpiarUrl();

        if (document.getElementById('uploadView')) document.getElementById('uploadView').style.display = 'none';
        if (document.getElementById('editorView')) document.getElementById('editorView').style.display = 'flex';

        if (typeof window.cargarSesionPorId === 'function') {
            await window.cargarSesionPorId(sessionId);
        }

        mostrarAviso('Pago confirmado. Documento desbloqueado.', 'optimal');
    } catch (error) {
        localStorage.removeItem('usuario_premium');
        mostrarAviso('No se pudo confirmar el pago: ' + error.message, 'low');
        limpiarUrl();
        
        if (document.getElementById('uploadView')) document.getElementById('uploadView').style.display = 'none';
        if (document.getElementById('editorView')) document.getElementById('editorView').style.display = 'flex';
        if (typeof window.cargarSesionPorId === 'function') {
            await window.cargarSesionPorId(sessionId);
        }
    }
});

function mostrarAviso(mensaje, tipo) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(mensaje);
        return;
    }

    const colores = {
        optimal: '#28a745',
        medium: '#0071e3',
        low: '#dc3545'
    };

    const toast = document.createElement('div');
    toast.style.cssText = 'background:' + (colores[tipo] || '#333') + ';color:white;padding:14px 22px;border-radius:8px;font-weight:bold;font-size:15px;box-shadow:0 4px 15px rgba(0,0,0,0.2);';
    toast.textContent = mensaje;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
}

function limpiarUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
}


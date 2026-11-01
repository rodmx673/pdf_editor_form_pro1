window.iniciarPago = async function(plan) {
    const sessionId = localStorage.getItem('pdf_pendiente_id');
    if (!sessionId) {
        alert('No se encontró una sesión activa. Sube un PDF primero.');
        return;
    }

    localStorage.setItem('plan_comprado', plan);
    logEvent('payment_initiated', { plan: plan, price: plan === 'basico' ? '1.99' : '4.99' });
    
    // Cambiar el texto del botón si es posible (opcional)
    const btns = document.querySelectorAll('#pricingModal button');
    btns.forEach(b => { if (b.innerText.includes(plan === 'basico' ? '1.99' : '4.99')) b.innerText = 'Conectando...'; });

    try {
        const res = await fetch('/api/crear-sesion-pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan, session_id: sessionId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear sesión de pago');

        // Redirigir a PayPal
        window.location.href = data.url;
    } catch (error) {
        console.error('Error al iniciar pago:', error);
        alert(error.message);
        btns.forEach(b => { b.innerText = b.innerText.replace('Conectando...', 'Comprar'); });
    }
};


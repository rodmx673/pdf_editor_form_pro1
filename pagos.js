window.iniciarPago = async function(plan) {
    const sessionId = localStorage.getItem('pdf_pendiente_id');
    if (!sessionId) {
        alert('No se encontró una sesión activa. Sube un PDF primero.');
        return;
    }

    localStorage.setItem('plan_comprado', plan);
    
    if (typeof window.logEvent === 'function') {
        window.logEvent('payment_initiated', { plan: plan, price: plan === 'basico' ? '1.99' : '4.99' });
    }

    const btns = document.querySelectorAll('#pricingModal button');
    btns.forEach(b => { 
        if (b.innerText.includes('Básico') || b.innerText.includes('1.99')) b.innerText = 'Conectando...'; 
        if (b.innerText.includes('Pro') || b.innerText.includes('4.99')) b.innerText = 'Conectando...'; 
    });

    try {
        const res = await fetch('/api/crear-sesion-pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan, session_id: sessionId })
        });

        const raw = await res.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }

        if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
        if (!data.url) throw new Error('El servidor no devolvió una URL de pago');

        window.location.href = data.url;
    } catch (error) {
        console.error('Error al iniciar pago:', error);
        alert(error.message);
        btns.forEach(b => { b.innerText = b.innerText.replace('Conectando...', 'Comprar'); });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const planButtons = document.querySelectorAll('#pricingModal button');
    planButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const text = btn.innerText;
            if (text.includes('Básico') || text.includes('1.99')) {
                window.iniciarPago('basico');
            } else if (text.includes('Pro') || text.includes('4.99')) {
                window.iniciarPago('pro');
            }
        });
    });
});

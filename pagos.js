document.addEventListener('DOMContentLoaded', () => {
    // Tu botón original se llama openPricingBtn
    const btnPlanes = document.getElementById('openPricingBtn'); 
    const modal = document.getElementById('pricingModal');
    const cerrar = document.getElementById('closePricingBtn');

    if(btnPlanes && modal) {
        btnPlanes.addEventListener('click', () => modal.style.display = 'flex');
        if(cerrar) cerrar.addEventListener('click', () => modal.style.display = 'none');
        
        // Buscamos TODOS los botones de compra dentro de tu modal
        const botonesComprar = modal.querySelectorAll('button');
        
        botonesComprar.forEach(boton => {
            // Si el botón es de compra, le conectamos PayPal
            if (boton.innerText.includes('Comprar')) {
                boton.addEventListener('click', async function() {
                    const esBasico = this.innerText.includes('Básico');
                    const plan = esBasico ? 'basico' : 'pro';
                    
                    const textoOriginal = this.innerText;
                    this.innerText = "Conectando con PayPal...";
                    this.disabled = true;
                    
                    try {
                        const res = await fetch('/api/crear-sesion-pago', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ plan: plan })
                        });
                        
                        const data = await res.json();
                        if(data.url) {
                            window.location.href = data.url;
                        } else {
                            throw new Error("No se recibió URL de pago");
                        }
                    } catch (e) {
                        console.error("Error:", e);
                        alert("Error al conectar con PayPal. Revisa la consola (F12).");
                        this.innerText = textoOriginal;
                        this.disabled = false;
                    }
                });
            }
        });
    }
});

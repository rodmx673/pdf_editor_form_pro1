document.addEventListener('DOMContentLoaded', () => {
    const btnPlanes = document.getElementById('openPricingBtn'); 
    const modal = document.getElementById('pricingModal');
    const cerrar = document.getElementById('closePricingBtn');

    if(btnPlanes && modal) {
        btnPlanes.addEventListener('click', () => modal.style.display = 'flex');
        if(cerrar) cerrar.addEventListener('click', () => modal.style.display = 'none');
        
        const botonesComprar = modal.querySelectorAll('button');
        
        botonesComprar.forEach(boton => {
            if (boton.innerText.includes('Comprar')) {
                boton.addEventListener('click', async function() {
                    const esBasico = this.innerText.includes('Básico');
                    const plan = esBasico ? 'basico' : 'pro';
                    
                    // 🔥 ESTO ES LO QUE FALTABA: GUARDAR SESIÓN Y CAMPOS
                    if (typeof currentSession !== 'undefined' && currentSession) {
                        localStorage.setItem('pdf_pendiente_id', currentSession);
                    }
                    if (typeof currentFields !== 'undefined' && currentFields.length > 0) {
                        localStorage.setItem('pdf_pendiente_campos', JSON.stringify(currentFields));
                    }
                    localStorage.setItem('plan_comprado', plan);

                    const textoOriginal = this.innerText;
                    this.innerText = "Conectando...";
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
                        alert("Error al conectar con PayPal.");
                        this.innerText = textoOriginal;
                        this.disabled = false;
                    }
                });
            }
        });
    }
});

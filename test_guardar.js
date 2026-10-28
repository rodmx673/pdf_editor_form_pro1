document.addEventListener('DOMContentLoaded', () => {
    const btnGuardar = document.getElementById('saveBtn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Guardar'));
    
    if (btnGuardar) {
        btnGuardar.addEventListener('click', (e) => {
            // Solo para probar si el botón detecta el clic
            console.log("¡El botón Guardar fue presionado!");
            
            // Si tu script.js tiene una función global, la llamamos aquí:
            if (typeof window.savePdfData === 'function') {
                window.savePdfData();
            } else if (typeof window.guardar === 'function') {
                window.guardar();
            } else {
                // Si no encontramos la función, mostramos una alerta para avisar
                alert("Botón presionado, pero no encuentro la función de guardado en el código.");
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    var btnGuardar = document.getElementById('saveBtn');
    
    if (btnGuardar) {
        // ¡ESTA ES LA MAGIA! Sobrescribimos el evento original
        btnGuardar.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation(); // Detiene la propagación al script.js original
            
            var textoOriginal = this.innerHTML;
            this.innerHTML = '💾 Guardando...';
            
            try {
                // 1. Recolectar los datos
                var datos = {};
                var inputs = document.querySelectorAll('input, textarea');
                
                inputs.forEach(function(input, index) {
                    var key = input.id || ('campo_' + index);
                    datos[key] = input.value || input.checked;
                });

                // 2. Guardar en localStorage
                localStorage.setItem('formularioDatos', JSON.stringify(datos));
                
                // 3. Mostrar éxito
                this.innerHTML = '✅ Guardado local';
                
                // 4. Quitar el badge rojo
                var badge = document.getElementById('unsavedBadge');
                if (badge) badge.style.display = 'none';
                
                // 5. Mostrar un toast (notificación pequeña)
                var toast = document.getElementById('toastContainer');
                if (toast) {
                    var msg = document.createElement('div');
                    msg.style.cssText = 'background: #28a745; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold;';
                    msg.innerText = 'Datos guardados en memoria local';
                    toast.appendChild(msg);
                    setTimeout(() => { msg.remove(); }, 3000);
                }

            } catch (error) {
                console.error("Error:", error);
                this.innerHTML = '❌ Error';
            }
            
            setTimeout(() => { this.innerHTML = textoOriginal; }, 2000);
        };
    }
});

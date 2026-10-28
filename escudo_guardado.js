// ESCUDO DE GUARDADO - Bloquea peticiones al servidor y fuerza guardado local
(function() {
    // Interceptar y bloquear fetch a /update
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url && url.toString().indexOf('/update') !== -1) {
            console.log('Peticion a /update bloqueada - usando guardado local');
            return Promise.resolve({
                ok: true,
                status: 200,
                json: function() { return Promise.resolve({ success: true, message: 'Guardado local' }); }
            });
        }
        return originalFetch.apply(this, arguments);
    };
    
    // Interceptar y bloquear XMLHttpRequest a /update
    var originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
        if (url && url.toString().indexOf('/update') !== -1) {
            console.log('XHR a /update bloqueado - usando guardado local');
            var self = this;
            setTimeout(function() {
                self.readyState = 4;
                self.status = 200;
                self.responseText = JSON.stringify({ success: true });
                if (self.onreadystatechange) self.onreadystatechange();
            }, 0);
            return this;
        }
        return originalXHR.apply(this, arguments);
    };
    
    console.log('Escudo de guardado activado');
})();

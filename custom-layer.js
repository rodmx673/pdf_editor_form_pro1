window.CustomLayer = (() => {
    let overlay, container, config = null, countdownInterval = null;

    async function getConfig() {
        try {
            const res = await fetch('https://pdf.teclingoingles.com/api/overlay-config?t=' + Date.now());
            if (res.ok) return await res.json();
        } catch (e) { console.error('Error cargando config', e); }
        return { active: true, background: 'dark', adDuration: 10, landing: [], editing: [] };
    }

    function createDOM() {
        if (document.getElementById('custom-ui-overlay')) return;
        overlay = document.createElement('div');
        overlay.id = 'custom-ui-overlay';
        overlay.style.cssText = "position:fixed; inset:0; z-index:99999; display:none; transition: opacity 0.4s ease; opacity: 0; pointer-events:none;";
        
        // Contenedor de los botones de cierre (arriba derecha)
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "position:absolute; top:20px; right:20px; display:flex; flex-direction:column; align-items:flex-end; gap:5px; pointer-events:auto; z-index:100000;";

        const closeBtn = document.createElement('button');
        closeBtn.id = 'custom-close-btn';
        closeBtn.innerHTML = '🔒 Cierre en 10s...';
        closeBtn.style.cssText = "background:rgba(0,0,0,0.6); color:white; border:1px solid rgba(255,255,255,0.3); padding:10px 15px; border-radius:20px; cursor:not-allowed; font-weight:bold; transition:all 0.2s; opacity:0.7;";
        
        const skipBtn = document.createElement('button');
        skipBtn.id = 'custom-skip-btn';
        skipBtn.innerHTML = 'Saltar anuncio >';
        skipBtn.style.cssText = "background:transparent; color:rgba(255,255,255,0.6); border:none; font-size:11px; text-decoration:underline; cursor:pointer; padding:0; margin-right:5px; display:none;";
        
        skipBtn.onclick = () => { localStorage.setItem('overlay_disabled', 'true'); CustomLayer.stop(); };

        btnContainer.appendChild(closeBtn);
        btnContainer.appendChild(skipBtn);
        overlay.appendChild(btnContainer);

        container = document.createElement('div');
        container.style.cssText = "position:absolute; inset:0; overflow:hidden; z-index: 99999;";
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    function startCountdown(seconds) {
        const closeBtn = document.getElementById('custom-close-btn');
        const skipBtn = document.getElementById('custom-skip-btn');
        let timeLeft = parseInt(seconds) || 10;
        
        closeBtn.disabled = true;
        closeBtn.innerHTML = `🔒 Cierre en ${timeLeft}s...`;
        closeBtn.style.cursor = 'not-allowed';
        closeBtn.style.opacity = '0.7';
        skipBtn.style.display = 'none';

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                closeBtn.innerHTML = `🔒 Cierre en ${timeLeft}s...`;
                if (timeLeft <= 5) skipBtn.style.display = 'block'; // Mostrar "Saltar" a los 5 segundos
            } else {
                clearInterval(countdownInterval);
                closeBtn.innerHTML = '✕ Ocultar anuncios';
                closeBtn.disabled = false;
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.opacity = '1';
                closeBtn.style.background = 'rgba(0,0,0,0.6)';
                closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(0,0,0,0.9)';
                closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(0,0,0,0.6)';
                closeBtn.onclick = () => { localStorage.setItem('overlay_disabled', 'true'); CustomLayer.stop(); };
                skipBtn.style.display = 'none'; // Ocultar el "Saltar" porque ya puede cerrar
            }
        }, 1000);
    }

    function renderBlocks() {
        container.innerHTML = '';
        if (!config.landing || config.landing.length === 0) return;
        
        const isMobile = window.innerWidth < 768;

        config.landing.forEach(block => {
            let safeX = (typeof block.x === 'number' && !isNaN(block.x) && block.x <= 100) ? block.x : 10;
            let safeY = (typeof block.y === 'number' && !isNaN(block.y) && block.y <= 100) ? block.y : 10;
            let safeW = (typeof block.w === 'number' && !isNaN(block.w) && block.w <= 100) ? block.w : 80;
            let safeH = (typeof block.h === 'number' && !isNaN(block.h) && block.h <= 100) ? block.h : 20;

            const el = document.createElement('div');
            
            if (isMobile && (block.type === 'youtube' || block.type === 'banner')) {
                el.style.cssText = `position:absolute; left:5%; top:${safeY}%; width:90%; pointer-events:auto; z-index: 100000; display:flex; justify-content:center;`;
                if (block.type === 'youtube') el.style.aspectRatio = '16 / 9';
            } else {
                el.style.cssText = `position:absolute; left:${safeX}%; top:${safeY}%; width:${safeW}%; height:${safeH}%; pointer-events:${(block.type === 'youtube' || block.type === 'banner') ? 'auto' : 'none'}; z-index: 100000;`;
            }
            
            if (block.type === 'text') {
                let baseSize = parseInt(block.fontSize) || 24;
                const fontSize = isMobile ? Math.max(14, baseSize * 0.5) : baseSize;
                const textColor = block.color || '#ffffff';
                el.innerHTML = `<div style="color:${textColor}; font-family:${block.fontFamily || 'sans-serif'}; font-size:${fontSize}px; font-weight:bold; text-shadow:0px 2px 4px rgba(0,0,0,0.9), 0px 0px 8px rgba(0,0,0,0.6); width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; padding:10px; word-break: break-word;">${block.content}</div>`;
            } else if (block.type === 'youtube') {
                const vid = block.url ? (block.url.includes('v=') ? block.url.split('v=')[1].split('&')[0] : (block.url.includes('youtu.be/') ? block.url.split('youtu.be/')[1].split('?')[0] : '')) : '';
                if (vid) el.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&playsinline=1&rel=0&controls=1" style="width:100%; height:100%; border:none; border-radius:8px;" allow="autoplay; fullscreen"></iframe>`;
            } else if (block.type === 'banner') {
                if (block.url) el.innerHTML = `<img src="${block.url}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
            }
            container.appendChild(el);
        });
    }

    return {
        start: async (pageName) => {
            if (localStorage.getItem('overlay_disabled') === 'true') return;
            createDOM();
            config = await getConfig();
            if (config.active === false) return; 
            if (!config[pageName] || config[pageName].length === 0) return;

            if (config.background === 'transparent') {
                overlay.style.background = 'transparent';
                overlay.style.backdropFilter = 'none';
            } else {
                overlay.style.background = 'rgba(0,0,0,0.85)';
                overlay.style.backdropFilter = 'blur(8px)';
            }
            renderBlocks();
            
            // Iniciar el temporizador
            startCountdown(config.adDuration || 10);

            overlay.style.display = 'block';
            setTimeout(() => overlay.style.opacity = 1, 10);
        },
        stop: () => {
            clearInterval(countdownInterval);
            if (overlay) {
                overlay.style.opacity = 0;
                setTimeout(() => { overlay.style.display = 'none'; if (container) container.innerHTML = ''; }, 400);
            }
        }
    };
})();

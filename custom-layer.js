window.CustomLayer = (() => {
    let overlay, container, config = null;

    async function getConfig() {
        try {
            const res = await fetch('https://pdf.teclingoingles.com/api/overlay-config?t=' + Date.now());
            if (res.ok) return await res.json();
        } catch (e) { console.error('Error cargando config', e); }
        return { active: true, background: 'dark', landing: [], editing: [] };
    }

    function createDOM() {
        if (document.getElementById('custom-ui-overlay')) return;
        overlay = document.createElement('div');
        overlay.id = 'custom-ui-overlay';
        overlay.style.cssText = "position:fixed; inset:0; z-index:99999; display:none; transition: opacity 0.4s ease; opacity: 0; pointer-events:none;";
        
        const isMobile = window.innerWidth < 768;
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ Ocultar anuncios';
        // En móviles, lo mandamos abajo a la derecha para que no tape el contenido
        const btnPos = isMobile ? 'bottom:20px; right:20px;' : 'top:20px; right:20px;';
        
        closeBtn.style.cssText = `position:absolute; ${btnPos} background:rgba(0,0,0,0.6); color:white; border:1px solid rgba(255,255,255,0.3); padding:10px 15px; border-radius:20px; cursor:pointer; font-weight:bold; pointer-events:auto; z-index:100000; transition:background 0.2s;`;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(0,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(0,0,0,0.6)';
        closeBtn.onclick = () => { localStorage.setItem('overlay_disabled', 'true'); CustomLayer.stop(); };
        overlay.appendChild(closeBtn);

        container = document.createElement('div');
        container.style.cssText = "position:absolute; inset:0; overflow:hidden; z-index: 99999;";
        overlay.appendChild(container);
        document.body.appendChild(overlay);
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
            
            // MAGIA PARA MÓVILES: Si es video o imagen, lo hacemos ancho (90%) y centrado
            if (isMobile && (block.type === 'youtube' || block.type === 'banner')) {
                el.style.cssText = `position:absolute; left:5%; top:${safeY}%; width:90%; pointer-events:auto; z-index: 100000; display:flex; justify-content:center;`;
                if (block.type === 'youtube') {
                    // Forzamos la proporción 16:9 para que el reproductor respire
                    el.style.aspectRatio = '16 / 9';
                }
            } else {
                // En PC, respetamos tu diseño al milímetro
                el.style.cssText = `position:absolute; left:${safeX}%; top:${safeY}%; width:${safeW}%; height:${safeH}%; pointer-events:${(block.type === 'youtube' || block.type === 'banner') ? 'auto' : 'none'}; z-index: 100000;`;
            }
            
            if (block.type === 'text') {
                let baseSize = parseInt(block.fontSize) || 24;
                // Reducimos un poco más la letra en móvil para que no se vea gigante
                const fontSize = isMobile ? Math.max(14, baseSize * 0.5) : baseSize;
                const textColor = block.color || '#ffffff';
                
                el.innerHTML = `<div style="color:${textColor}; font-family:${block.fontFamily || 'sans-serif'}; font-size:${fontSize}px; font-weight:bold; text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 8px rgba(0,0,0,0.6); width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; padding:10px; word-break: break-word;">${block.content}</div>`;
            } else if (block.type === 'youtube') {
                const vid = block.url ? (block.url.includes('v=') ? block.url.split('v=')[1].split('&')[0] : (block.url.includes('youtu.be/') ? block.url.split('youtu.be/')[1].split('?')[0] : '')) : '';
                // width 100% y height 100% dentro del contenedor
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
            overlay.style.display = 'block';
            setTimeout(() => overlay.style.opacity = 1, 10);
        },
        stop: () => {
            if (overlay) {
                overlay.style.opacity = 0;
                setTimeout(() => { overlay.style.display = 'none'; if (container) container.innerHTML = ''; }, 400);
            }
        }
    };
})();

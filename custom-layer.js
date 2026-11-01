window.CustomLayer = (() => {
    let overlay, container, config = null;

    async function getConfig() {
        try {
            // Anti-caché para siempre traer lo último
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
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ Ocultar anuncios';
        closeBtn.style.cssText = "position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.5); color:white; border:1px solid rgba(255,255,255,0.3); padding:10px 15px; border-radius:20px; cursor:pointer; font-weight:bold; pointer-events:auto; z-index:10; transition:background 0.2s;";
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(0,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(0,0,0,0.5)';
        closeBtn.onclick = () => {
            localStorage.setItem('overlay_disabled', 'true');
            CustomLayer.stop();
        };
        overlay.appendChild(closeBtn);

        container = document.createElement('div');
        container.style.cssText = "position:absolute; inset:0; overflow:hidden;";
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    function renderBlocks() {
        container.innerHTML = '';
        if (!config.landing || config.landing.length === 0) return;
        
        const isMobile = window.innerWidth < 768;

        config.landing.forEach(block => {
            const el = document.createElement('div');
            
            // PROTECCIÓN: Si por alguna razón los valores son muy grandes (píxeles viejos), los forzamos a un mínimo visible
            let safeX = block.x > 100 ? 10 : block.x;
            let safeY = block.y > 100 ? 10 : block.y;
            let safeW = block.w > 100 ? 80 : block.w;
            let safeH = block.h > 100 ? 20 : block.h;

            el.style.cssText = `position:absolute; left:${safeX}%; top:${safeY}%; width:${safeW}%; height:${safeH}%; pointer-events:${(block.type === 'youtube' || block.type === 'banner') ? 'auto' : 'none'}; z-index: 2;`;
            
            if (block.type === 'text') {
                // PROTECCIÓN: Evitar que el tamaño de la letra sea NaN o indefinido
                let baseSize = parseInt(block.fontSize) || 24;
                const fontSize = isMobile ? Math.max(16, baseSize * 0.6) : baseSize;
                
                el.innerHTML = `<div style="color:white; font-family:${block.fontFamily || 'sans-serif'}; font-size:${fontSize}px; font-weight:bold; text-shadow:0 2px 4px rgba(0,0,0,0.8); width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; padding:10px; word-break: break-word;">${block.content}</div>`;
            } else if (block.type === 'youtube') {
                const vid = block.url && block.url.includes('v=') ? block.url.split('v=')[1].split('&')[0] : '';
                if (vid) el.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1" style="width:100%; height:100%; border:none; border-radius:8px;" allow="autoplay"></iframe>`;
            } else if (block.type === 'banner') {
                if (block.url) el.innerHTML = `<img src="${block.url}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
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


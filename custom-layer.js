window.CustomLayer = (() => {
    let overlay, container, config = null;

    async function getConfig() {
        try {
            const res = await fetch('https://pdf.teclingoingles.com/api/overlay-config');
            if (res.ok) return await res.json();
        } catch (e) { console.error('Error cargando config', e); }
        return { landing: [], editing: [] };
    }

    function createDOM() {
        if (document.getElementById('custom-ui-overlay')) return;
        overlay = document.createElement('div');
        overlay.id = 'custom-ui-overlay';
        overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; display:none; backdrop-filter:blur(8px); pointer-events:none;";
        container = document.createElement('div');
        container.style.cssText = "position:absolute; inset:0; overflow:hidden;";
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    function renderBlocks() {
        container.innerHTML = '';
        if (!config.landing || config.landing.length === 0) return;
        config.landing.forEach(block => {
            const el = document.createElement('div');
            el.style.cssText = `position:absolute; left:${block.x}px; top:${block.y}px; width:${block.w}px; height:${block.h}px; pointer-events:${(block.type === 'youtube' || block.type === 'banner') ? 'auto' : 'none'};`;
            if (block.type === 'text') el.innerHTML = `<div style="color:white; font-family:-apple-system, sans-serif; font-size:20px; font-weight:bold; text-shadow:0 2px 4px rgba(0,0,0,0.5); width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; padding:10px;">${block.content}</div>`;
            else if (block.type === 'youtube') {
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
            createDOM();
            config = await getConfig();
            if (!config[pageName] || config[pageName].length === 0) return;
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

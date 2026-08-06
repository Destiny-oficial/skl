// Anime Offis Ads SDK - Edición Privada (Corregida y Optimizada)
(function(window, document) {
    const CONFIG = {
        projectId: "ads-offis",
        databaseURL: "https://ads-offis-default-rtdb.firebaseio.com",
        listaAds: "https://anime-offisvd.pages.dev/ads/lista.json"
    };

    // SISTEMA DE SEGUIMIENTO INTERNO
    const Tracker = {
        _increment(adId, field) {
            if (!adId) return;
            const rtdbUrl = `${CONFIG.databaseURL}/analytics/metricas_ads/${adId}/${field}.json`;
            
            fetch(rtdbUrl)
                .then(res => res.json())
                .then(current => {
                    const nextValue = (current || 0) + 1;
                    fetch(rtdbUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(nextValue)
                    });
                }).catch(() => {});
        },

        registrarVista(adId) { this._increment(adId, 'vistas'); },
        registrarClic(adId) { this._increment(adId, 'clics'); }
    };

    // SDK PRINCIPAL
    window.AnimeOffisSDK = {
        esAnuncio: false,

        // Obtener anuncio filtrado de forma estricta por formato y tipo de archivo
        async _obtenerAnuncio(formatoDeseado = null) {
            try {
                // Anti-Caché: Agrega Timestamp para obtener siempre datos frescos de lista.json
                const urlAntiCache = `${CONFIG.listaAds}?_nc=${Date.now()}`;
                const response = await fetch(urlAntiCache);
                const anuncios = await response.json();
                
                let filtrados = [];

                if (formatoDeseado === 'video') {
                    // Filtrar SOLO archivos de video (.mp4)
                    filtrados = anuncios.filter(a => 
                        (a.formato === 'video' || a.tipo === 'video') || 
                        (a.url && a.url.toLowerCase().endsWith('.mp4'))
                    );
                } else {
                    // Para Banners, Overlay y Popups: Filtrar SOLO IMÁGENES (excluir .mp4)
                    filtrados = anuncios.filter(a => {
                        const esImagen = a.url && !a.url.toLowerCase().endsWith('.mp4');
                        const coincideFormato = (a.formato === formatoDeseado || a.tipo === formatoDeseado);
                        return esImagen && coincideFormato;
                    });

                    // Fallback: Si no hay del formato exacto, usar cualquier IMAGEN disponible
                    if (filtrados.length === 0) {
                        filtrados = anuncios.filter(a => a.url && !a.url.toLowerCase().endsWith('.mp4'));
                    }
                }

                // Si de plano no hay elementos compatibles
                if (filtrados.length === 0) {
                    console.warn(`[Anime Offis SDK] No hay anuncios disponibles para: ${formatoDeseado}`);
                    return null;
                }
                
                const elegido = filtrados[Math.floor(Math.random() * filtrados.length)];
                return {
                    id: elegido.id || "ad_desconocido",
                    url: elegido.url || elegido.imagen_url,
                    link: elegido.link || elegido.url_destino || "#"
                };
            } catch (e) {
                console.error("[Anime Offis SDK] Error al cargar lista.json:", e);
                return null;
            }
        },

        // 1. VIDEO PRE-ROLL (Para el reproductor)
        async solicitarAnuncio(playerElementId) {
            const contenedor = document.getElementById(playerElementId);
            if (!contenedor) return;
            const videoElement = contenedor.tagName.toLowerCase() === 'video' ? contenedor : contenedor.querySelector('video');
            if (!videoElement) return;

            const elegido = await this._obtenerAnuncio('video');
            if (!elegido) return;

            this.esAnuncio = true;
            const sourceOriginal = videoElement.currentSrc || videoElement.src;

            // Botón Visitar Sitio
            let visitBtn = document.createElement('a');
            visitBtn.href = elegido.link;
            visitBtn.target = "_blank";
            visitBtn.innerText = "VISITAR SITIO ↗";
            Object.assign(visitBtn.style, {
                position: 'absolute', top: '20px', right: '20px', background: '#00aaff',
                color: 'black', padding: '10px 20px', borderRadius: '5px', zIndex: '10000',
                textDecoration: 'none', fontWeight: 'bold', fontFamily: 'sans-serif'
            });

            visitBtn.onclick = () => Tracker.registrarClic(elegido.id);

            // Botón Omitir Anuncio
            let skipBtn = document.createElement('button');
            skipBtn.innerText = "Omitir Anuncio ►";
            Object.assign(skipBtn.style, {
                position: 'absolute', bottom: '20%', right: '20px', background: 'rgba(0,0,0,0.8)',
                color: 'white', border: '1px solid #00aaff', padding: '10px 20px',
                borderRadius: '5px', cursor: 'pointer', zIndex: '9999', display: 'none'
            });

            videoElement.parentNode.style.position = 'relative';
            videoElement.parentNode.appendChild(visitBtn);
            videoElement.parentNode.appendChild(skipBtn);

            const finalizar = () => {
                if (!this.esAnuncio) return;
                this.esAnuncio = false;
                visitBtn.remove();
                skipBtn.remove();

                Tracker.registrarVista(elegido.id);

                videoElement.src = sourceOriginal;
                videoElement.load();
                videoElement.play();
            };

            videoElement.addEventListener('ended', finalizar, { once: true });
            skipBtn.onclick = finalizar;

            videoElement.onloadedmetadata = () => {
                if (videoElement.duration > 5) {
                    setTimeout(() => { if(this.esAnuncio) skipBtn.style.display = 'block'; }, 5000);
                }
            };

            videoElement.src = elegido.url;
            videoElement.load();
            videoElement.play();
        },

        // 2. BANNERS (Fijos / Dentro de publicaciones)
        async renderBanner(containerId, formato = 'banner') {
            const container = document.getElementById(containerId);
            if (!container) return;

            const ad = await this._obtenerAnuncio(formato);
            if (!ad) return;

            container.innerHTML = `
                <div style="text-align:center; margin: 10px 0;">
                    <a href="${ad.link}" target="_blank" rel="noopener sponsored" id="ao-banner-${ad.id}">
                        <img src="${ad.url}" style="max-width:100%; height:auto; border-radius:6px; border:1px solid #00aaff33;" />
                    </a>
                </div>
            `;

            Tracker.registrarVista(ad.id);
            document.getElementById(`ao-banner-${ad.id}`).addEventListener('click', () => Tracker.registrarClic(ad.id));
        },

        // 3. OVERLAY EN VIDEO (Barra flotante sobre el video)
        async renderOverlay(videoContainerId) {
            const container = document.getElementById(videoContainerId);
            if (!container) return;

            const ad = await this._obtenerAnuncio('overlay');
            if (!ad) return;

            container.style.position = 'relative';
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.95); padding: 8px; border-radius: 8px; z-index: 99;
                max-width: 85%; text-align: center; border: 1px solid #00aaff;
            `;

            overlay.innerHTML = `
                <span id="close-ao-${ad.id}" style="position:absolute; top:-10px; right:-10px; background:#ff00aa; color:white; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:12px; line-height:22px; font-weight:bold;">✕</span>
                <a href="${ad.link}" target="_blank" rel="noopener sponsored" id="ao-overlay-${ad.id}">
                    <img src="${ad.url}" style="max-width:100%; max-height:80px; border-radius:4px;" />
                </a>
            `;

            container.appendChild(overlay);
            Tracker.registrarVista(ad.id);

            document.getElementById(`ao-overlay-${ad.id}`).addEventListener('click', () => Tracker.registrarClic(ad.id));
            document.getElementById(`close-ao-${ad.id}`).addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.remove();
            });
        },

        // 4. POPUP EMERGENTE
        async renderPopup() {
            const ad = await this._obtenerAnuncio('popup');
            if (!ad) return;

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top:0; left:0; width:100vw; height:100vh;
                background: rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center;
                z-index: 99999; backdrop-filter: blur(4px);
            `;

            modal.innerHTML = `
                <div style="background:#0f172a; border:2px solid #00aaff; padding:15px; border-radius:12px; position:relative; max-width:90%; width:400px; text-align:center;">
                    <span id="close-pop-${ad.id}" style="position:absolute; top:-12px; right:-12px; background:#ff00aa; color:white; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:28px; font-weight:bold;">✕</span>
                    <a href="${ad.link}" target="_blank" rel="noopener sponsored" id="ao-pop-${ad.id}">
                        <img src="${ad.url}" style="width:100%; border-radius:6px;" />
                    </a>
                </div>
            `;

            document.body.appendChild(modal);
            Tracker.registrarVista(ad.id);

            document.getElementById(`ao-pop-${ad.id}`).addEventListener('click', () => Tracker.registrarClic(ad.id));
            document.getElementById(`close-pop-${ad.id}`).addEventListener('click', () => modal.remove());
        }
    };
})(window, document);

// Anime Offis Ads SDK - Universal Multi-Format & Multi-Tracking Edition
(function(window, document) {
    const scriptSrc = document.currentScript ? document.currentScript.src : '';
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
    
    // Captura dinámicamente la clave del partner desde la URL (ej: AO-882065 o AO-82939)
    const publisherID = urlParams.get('id') || 'AO-82939'; 

    const CONFIG = {
        projectId: "ads-offis",
        databaseURL: "https://ads-offis-default-rtdb.firebaseio.com",
        listaAds: "https://anime-offisvd.pages.dev/ads/lista.json" // Tu CDN de anuncios
    };

    // MOTOR DE MONETIZACIÓN Y SEGUIMIENTO (Sin dependencias externas)
    const Tracker = {
        // Tracker Firestore REST API (Carga instantánea)
        async _incrementFirestore(collection, docId, field) {
            if (!docId) return;
            try {
                // Usamos la API REST de Firestore para no depender de scripts pesados
                const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=${field}`;
                
                // Primero leemos el valor actual o incrementamos vía Realtime DB
                const rtdbUrl = `${CONFIG.databaseURL}/analytics/${collection}/${docId}/${field}.json`;
                
                // Transacción ultra-rápida en Realtime DB
                fetch(rtdbUrl)
                    .then(res => res.json())
                    .then(current => {
                        const nextValue = (current || 0) + 1;
                        fetch(rtdbUrl, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(nextValue)
                        });
                    }).catch(()=>{});

            } catch (e) { console.error("[Anime Offis Track Error]", e); }
        },

        registrarVistaAd(adId) { this._incrementFirestore('metricas_ads', adId, 'vistas'); },
        registrarClicAd(adId) { this._incrementFirestore('metricas_ads', adId, 'clics'); },
        registrarPartner(pubId) { this._incrementFirestore('partners', pubId, 'views'); }
    };

    // EL SDK UNIFICADO
    window.AnimeOffisSDK = {
        esAnuncio: false,
        publisherID: publisherID,

        // Obtener lista de anuncios filtrada por formato
        async _obtenerAnuncio(formatoDeseado = null) {
            try {
                const response = await fetch(CONFIG.listaAds);
                const anuncios = await response.json();
                
                let filtrados = anuncios;
                if (formatoDeseado) {
                    filtrados = anuncios.filter(a => a.formato === formatoDeseado || a.tipo === formatoDeseado);
                    if (filtrados.length === 0) filtrados = anuncios; // Fallback
                }
                
                const elegido = filtrados[Math.floor(Math.random() * filtrados.length)];
                return {
                    id: elegido.id || "ad_desconocido",
                    url: elegido.url || elegido.imagen_url,
                    link: elegido.link || elegido.url_destino || "#",
                    formato: elegido.formato || "video"
                };
            } catch (e) {
                console.error("[Anime Offis SDK] Error cargando lista de anuncios JSON:", e);
                return null;
            }
        },

        // ==========================================
        // 1. ANUNCIO DE VIDEO PRE-ROLL (TU MÉTODO ORIGINAL MEJORADO)
        // ==========================================
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

            visitBtn.onclick = () => Tracker.registrarClicAd(elegido.id);

            // Botón Omitir
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

                // Doble rastreo
                Tracker.registrarVistaAd(elegido.id);
                Tracker.registrarPartner(this.publisherID);

                // Volver al Anime
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

        // ==========================================
        // 2. NUEVO: BANNERS (BARRAS Y PUBLICACIONES)
        // ==========================================
        async renderBanner(containerId, formato = 'banner') {
            const container = document.getElementById(containerId);
            if (!container) return;

            const ad = await this._obtenerAnuncio(formato);
            if (!ad) return;

            container.innerHTML = `
                <div style="text-align:center; margin: 10px 0; position:relative;">
                    <a href="${ad.link}" target="_blank" rel="noopener sponsored" id="ao-banner-${ad.id}">
                        <img src="${ad.url}" alt="Publicidad" style="max-width:100%; height:auto; border-radius:6px; border:1px solid #00aaff33;" />
                    </a>
                </div>
            `;

            // Registrar Vista + Partner
            Tracker.registrarVistaAd(ad.id);
            Tracker.registrarPartner(this.publisherID);

            // Registrar Clic
            document.getElementById(`ao-banner-${ad.id}`).addEventListener('click', () => {
                Tracker.registrarClicAd(ad.id);
            });
        },

        // ==========================================
        // 3. NUEVO: OVERLAY EN VIDEO (Flotante sobre el player)
        // ==========================================
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

            Tracker.registrarVistaAd(ad.id);
            Tracker.registrarPartner(this.publisherID);

            document.getElementById(`ao-overlay-${ad.id}`).addEventListener('click', () => Tracker.registrarClicAd(ad.id));
            document.getElementById(`close-ao-${ad.id}`).addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.remove();
            });
        },

        // ==========================================
        // 4. NUEVO: POPUP / VENTANA EMERGENTE
        // ==========================================
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

            Tracker.registrarVistaAd(ad.id);
            Tracker.registrarPartner(this.publisherID);

            document.getElementById(`ao-pop-${ad.id}`).addEventListener('click', () => Tracker.registrarClicAd(ad.id));
            document.getElementById(`close-pop-${ad.id}`).addEventListener('click', () => modal.remove());
        }
    };
})(window, document);

// Anime Offis Ads SDK - v1.1.0
// Hosting sugerido: https://cdn.animeoffis.com/sdk.js
(function() {
    const scriptSrc = document.currentScript.src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    const publisherID = urlParams.get('id');

    window.AnimeOffisSDK = {
        esAnuncio: false,
        listaAds: "https://vdaf.animeoffis.com/ads/lista.json",

        async solicitarAnuncio(playerElementId) {
            if (!publisherID) {
                console.error("[Anime Offis] Error: Falta Publisher ID.");
                return;
            }

            const player = videojs(playerElementId);
            const adLabel = document.getElementById('ad-label');

            try {
                // 1. Obtener tu lista de anuncios JSON
                const response = await fetch(this.listaAds);
                const anuncios = await response.json();

                // 2. Selección aleatoria
                const anuncioElegido = anuncios[Math.floor(Math.random() * anuncios.length)];
                
                // 3. Preparar transición
                this.esAnuncio = true;
                const sourceOriginal = player.currentSrc();

                // 4. Cargar anuncio
                player.src({ type: 'video/mp4', src: anuncioElegido.url });
                if (adLabel) adLabel.style.display = 'block';

                // Evitar que el usuario adelante el anuncio
                player.on('seeking', () => {
                    if (this.esAnuncio) {
                        const currentTime = player.currentTime();
                        if (currentTime > player.bufferedEnd()) {
                            player.currentTime(player.bufferedEnd() || 0);
                        }
                    }
                });

                // 5. Evento al finalizar el anuncio
                player.one('ended', () => {
                    this.esAnuncio = false;
                    if (adLabel) adLabel.style.display = 'none';
                    
                    // Volver al contenido original (capítulo de anime)
                    player.src({ type: 'video/mp4', src: sourceOriginal });
                    player.play();

                    // Registrar impresión (Análisis futuro)
                    this.registrarImpresion(publisherID, anuncioElegido.id);
                });

                player.play();

            } catch (e) {
                console.error("[Anime Offis] Error al cargar anuncios, saltando al contenido.");
                this.esAnuncio = false;
            }
        },

        registrarImpresion(pubId, adId) {
            // Aquí enviarías los datos a tu Cloudflare Worker de análisis
            console.log(`[Analytics] Registro: Pub:${pubId} | Ad:${adId}`);
        }
    };
})();
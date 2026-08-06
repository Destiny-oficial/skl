/**
 * 📢 Anime Offis Ads SDK
 * Gestor de campañas Pre-Roll con Respaldo Visual (Fallback) e impresiones
 */
(function (window) {
  'use strict';

  // Configuración por defecto
  const CONFIG = {
    firebaseDbUrl: 'https://ads-offis-default-rtdb.firebaseio.com/analytics/metricas_ads',
    defaultAd: {
      id: 'ad_preroll_default',
      title: 'Patrocinado por Anime Offis',
      description: 'Descubre el catálogo y las novedades de la comunidad.',
      videoUrl: 'https://anime-offisvd.pages.dev/ads/anuncio2.mp4',
      targetUrl: 'https://alianza.animeoffis.com',
      skipDelay: 7 // Segundos antes de mostrar botón Omitir
    }
  };

  const AnimeOffisSDK = {
    /**
     * Registra las métricas de visualización en Firebase Realtime DB
     * Maneja errores internamente para evitar que peticiones fallidas bloqueen los anuncios
     */
    async _registrarVista(adId) {
      if (!adId) return;
      const endpoint = `${CONFIG.firebaseDbUrl}/${adId}/vistas.json`;

      try {
        // 1. Obtener vistas actuales
        const resGet = await fetch(endpoint);
        let vistasActuales = 0;

        if (resGet.ok) {
          const data = await resGet.json();
          vistasActuales = typeof data === 'number' ? data : (data?.vistas || 0);
        }

        // 2. Incrementar vista
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vistasActuales + 1)
        });
      } catch (err) {
        console.warn('AnimeOffisSDK (Analytics Warning):', err.message);
      }
    },

    /**
     * Muestra un anuncio Pre-Roll dentro del reproductor
     * @param {string} containerId - ID del contenedor (ej. 'playerContainer')
     * @param {object|function} optionsOrCallback - Configuración del anuncio o callback
     */
    solicitarAnuncio(containerId, optionsOrCallback) {
      return new Promise((resolve) => {
        let callback = null;
        let adData = { ...CONFIG.defaultAd };

        if (typeof optionsOrCallback === 'function') {
          callback = optionsOrCallback;
        } else if (typeof optionsOrCallback === 'object') {
          adData = { ...adData, ...optionsOrCallback };
        }

        const container = document.getElementById(containerId);
        if (!container) {
          console.warn(`AnimeOffisSDK: No se encontró el contenedor '#${containerId}'`);
          if (callback) callback();
          return resolve();
        }

        // Registrar analítica silenciosa
        this._registrarVista(adData.id);

        // Prevenir duplicados de overlays
        const existingOverlay = document.getElementById('animeoffis-ad-overlay');
        if (existingOverlay) existingOverlay.remove();

        // 1. Crear el contenedor Overlay con Glassmorphism
        const overlay = document.createElement('div');
        overlay.id = 'animeoffis-ad-overlay';
        overlay.style.cssText = `
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          z-index: 9999;
          background: #05070a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, sans-serif;
        `;

        // 2. Estructura HTML Interna del Ad (Video + Tarjeta de Respaldo)
        overlay.innerHTML = `
          <!-- Elemento de Video Publicitario -->
          <video id="animeoffis-ad-video" src="${adData.videoUrl}" autoplay playsinline style="width:100%; height:100%; object-fit:contain;"></video>

          <!-- Tarjeta de Respaldo Visual (se activa si el video falla) -->
          <div id="animeoffis-ad-fallback" style="display:none; text-align:center; padding:30px; border-radius:24px; background:rgba(255,255,255,0.03); border:1px solid rgba(0,170,255,0.3); backdrop-filter:blur(15px); max-width:80%; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
            <div style="font-size:40px; margin-bottom:10px;">📢</div>
            <h3 style="margin:0 0 10px 0; color:#00aaff; font-size:1.2rem;">${adData.title}</h3>
            <p style="margin:0 0 15px 0; color:#94a3b8; font-size:0.85rem; line-height:1.4;">${adData.description}</p>
          </div>

          <!-- Badge Publicitario Superior -->
          <div style="position:absolute; top:15px; left:15px; background:rgba(5,7,10,0.85); border:1px solid rgba(0,170,255,0.4); padding:6px 12px; border-radius:20px; font-size:12px; color:#00aaff; backdrop-filter:blur(10px); z-index:10001; font-weight:600;">
            Anuncio • ${adData.title}
          </div>

          <!-- Botón Visitar Sitio -->
          <a href="${adData.targetUrl}" target="_blank" rel="noopener" style="position:absolute; bottom:20px; left:20px; background:rgba(0,170,255,0.25); border:1px solid #00aaff; color:#fff; text-decoration:none; padding:10px 18px; border-radius:12px; font-size:13px; font-weight:700; backdrop-filter:blur(10px); z-index:10001; transition:0.2s; display:flex; align-items:center; gap:6px;">
            Visitar sitio ↗
          </a>

          <!-- Botón / Contador Omitir -->
          <button id="animeoffis-skip-btn" disabled style="position:absolute; bottom:20px; right:20px; background:rgba(5,7,10,0.85); border:1px solid rgba(255,255,255,0.2); color:#aaa; padding:10px 18px; border-radius:12px; font-size:13px; font-weight:700; z-index:10001; cursor:not-allowed; transition:0.3s; backdrop-filter:blur(10px);">
            Omitir en <span id="animeoffis-ad-timer">${adData.skipDelay}</span>s
          </button>
        `;

        container.style.position = 'relative';
        container.appendChild(overlay);

        const videoElem = overlay.querySelector('#animeoffis-ad-video');
        const fallbackCard = overlay.querySelector('#animeoffis-ad-fallback');
        const skipBtn = overlay.querySelector('#animeoffis-skip-btn');
        const timerSpan = overlay.querySelector('#animeoffis-ad-timer');

        let countdown = adData.skipDelay;

        // Función para limpiar el overlay y entregar el control al capítulo
        const finalizarAnuncio = () => {
          clearInterval(timerInterval);
          if (container.contains(overlay)) {
            container.removeChild(overlay);
          }
          if (callback) callback();
          resolve();
        };

        // Temporizador independiente que corre siempre
        const timerInterval = setInterval(() => {
          countdown--;
          if (timerSpan) timerSpan.innerText = countdown;

          if (countdown <= 0) {
            clearInterval(timerInterval);
            skipBtn.disabled = false;
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.color = '#ffffff';
            skipBtn.style.borderColor = '#ff00aa';
            skipBtn.style.background = 'rgba(255,0,170,0.3)';
            skipBtn.innerHTML = 'Omitir Anuncio ➔';
          }
        }, 1000);

        // Activa la tarjeta visual si el video falla
        const activarFallbackVisual = () => {
          if (videoElem) videoElem.style.display = 'none';
          if (fallbackCard) fallbackCard.style.display = 'block';
        };

        // Escuchadores de eventos para el video
        videoElem.onerror = activarFallbackVisual;
        
        videoElem.play().catch(() => {
          // Si el navegador bloquea el Autoplay del anuncio
          activarFallbackVisual();
        });

        skipBtn.onclick = () => {
          if (!skipBtn.disabled) finalizarAnuncio();
        };

        videoElem.onended = finalizarAnuncio;
      });
    }
  };

  // Exponer globalmente en window
  window.AnimeOffisSDK = AnimeOffisSDK;

})(window);

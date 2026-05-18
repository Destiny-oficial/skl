// Anime Offis Ads SDK - Universal Premium (Multi-Tracking Edition)
(function() {
    const scriptSrc = document.currentScript.src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    
    // Captura dinámicamente la clave del partner desde la URL (ej: AO-882065 o AO-82939)
    const publisherID = urlParams.get('id') || 'AO-82939'; 

    // INTEGRACIÓN AVANZADA CON FIREBASE (Vistas y Clics Cruzados)
    const firebaseScript = document.createElement('script');
    firebaseScript.type = 'module';
    firebaseScript.innerHTML = `
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAnSRgfkxpyAJG4qN-vIlTqXArCEeD6oLc",
            authDomain: "ads-offis.firebaseapp.com",
            projectId: "ads-offis",
            storageBucket: "ads-offis.firebasestorage.app",
            appId: "1:390082810870:web:3be23e5fc5f516567eadd7"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // REGLA 1: REGISTRAR VISTA DEL ANUNCIO INDEPENDIENTE (Para el Panel del Anunciante)
        window.registrarVistaAnuncioIndependiente = async function(adId) {
            if (!adId) return;
            try {
                const adRef = doc(db, "metricas_ads", adId);
                await setDoc(adRef, { vistas: increment(1) }, { merge: true });
                console.log("[Anime Offis Ads] +1 Vista en el anuncio: " + adId);
            } catch (e) { console.error("Error al registrar vista del anuncio:", e); }
        };

        // REGLA 2: REGISTRAR CLIC DEL ANUNCIO INDEPENDIENTE (Para el Panel del Anunciante)
        window.registrarClicAnuncioIndependiente = async function(adId) {
            if (!adId) return;
            try {
                const adRef = doc(db, "metricas_ads", adId);
                await setDoc(adRef, { clics: increment(1) }, { merge: true });
                console.log("[Anime Offis Ads] +1 Clic en el anuncio: " + adId);
            } catch (e) { console.error("Error al registrar clic del anuncio:", e); }
        };

        // REGLA 3: REGISTRAR MONETIZACIÓN DEL PUBLISHER (Para tu control de socios y webs)
        window.registrarMonetizacionPartner = async function(pubId) {
            if (!pubId) return;
            try {
                const partnerRef = doc(db, "partners", pubId);
                await setDoc(partnerRef, { views: increment(1) }, { merge: true });
                console.log("[Anime Offis Network] +1 Vista de monetización para socio: " + pubId);
            } catch (e) { console.error("Error al registrar monetización de socio:", e); }
        };
    `;
    document.head.appendChild(firebaseScript);

    window.AnimeOffisSDK = {
        esAnuncio: false,
        listaAds: "https://anime-offisvd.pages.dev/ads/lista.json", // Tu CDN de anuncios

        async solicitarAnuncio(playerElementId) {
            const contenedor = document.getElementById(playerElementId);
            const videoElement = contenedor.tagName.toLowerCase() === 'video' ? contenedor : contenedor.querySelector('video');
            if (!videoElement) return;

            try {
                const response = await fetch(this.listaAds);
                const anuncios = await response.json();
                const elegido = anuncios[Math.floor(Math.random() * anuncios.length)];
                
                // Extrae el ID del anuncio de tu lista.json (ej: "ad5")
                const adIdReal = elegido.id || "ad_desconocido";

                this.esAnuncio = true;
                const sourceOriginal = videoElement.currentSrc || videoElement.src;

                // 1. CONTROL DEL BOTÓN "VISITAR SITIO"
                let visitBtn = document.createElement('a');
                visitBtn.href = elegido.link || "#";
                visitBtn.target = "_blank";
                visitBtn.innerText = "VISITAR SITIO ↗";
                Object.assign(visitBtn.style, {
                    position: 'absolute', top: '20px', right: '20px', background: '#00aaff',
                    color: 'black', padding: '10px 20px', borderRadius: '5px', zIndex: '10000',
                    textDecoration: 'none', fontWeight: 'bold', fontFamily: 'sans-serif'
                });

                // Si hacen clic en Visitar Sitio, registra el clic de forma independiente
                visitBtn.onclick = function() {
                    if (window.registrarClicAnuncioIndependiente) {
                        window.registrarClicAnuncioIndependiente(adIdReal);
                    }
                };

                // 2. CONTROL DEL BOTÓN "OMITIR ANUNCIO"
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

                // FINALIZACIÓN INTEGRAL DEL ANUNCIO
                const finalizar = async () => {
                    if (!this.esAnuncio) return;
                    this.esAnuncio = false;
                    visitBtn.remove();
                    skipBtn.remove();

                    // --- INICIO DEL DOBLE RASTREO EN FIRESTORE ---
                    
                    // Acción A: Registra la vista en el anuncio del cliente para que aparezca en su panel (ad5)
                    if (window.registrarVistaAnuncioIndependiente) {
                        await window.registrarVistaAnuncioIndependiente(adIdReal);
                    }
                    
                    // Acción B: Registra la vista en el partner que reprodujo el reproductor (ej: AO-82939)
                    if (window.registrarMonetizacionPartner && publisherID) {
                        await window.registrarMonetizacionPartner(publisherID);
                    }

                    // Regresar al video original del anime
                    videoElement.src = sourceOriginal;
                    videoElement.load();
                    videoElement.play();
                };

                videoElement.addEventListener('ended', finalizar, { once: true });
                skipBtn.onclick = finalizar;

                // Mostrar el botón de omitir a los 5 segundos de reproducción
                videoElement.onloadedmetadata = () => {
                    if (videoElement.duration > 5) {
                        setTimeout(() => { if(this.esAnuncio) skipBtn.style.display = 'block'; }, 5000);
                    }
                };

                // Iniciar la reproducción del anuncio elegido por el CDN
                videoElement.src = elegido.url;
                videoElement.load();
                videoElement.play();

            } catch (e) { console.error("[Anime Offis SDK Error]", e); }
        }
    };
})();
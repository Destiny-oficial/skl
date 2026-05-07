// Anime Offis Ads SDK - Universal Premium Edition
(function() {
    const scriptSrc = document.currentScript.src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    const publisherID = urlParams.get('id');

    // IMPORTAMOS FIREBASE DINÁMICAMENTE DENTRO DEL SDK
    const firebaseScript = document.createElement('script');
    firebaseScript.type = 'module';
    firebaseScript.innerHTML = `
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAnSRgfkxpyAJG4qN-vIlTqXArCEeD6oLc",
            authDomain: "ads-offis.firebaseapp.com",
            projectId: "ads-offis",
            storageBucket: "ads-offis.firebasestorage.app",
            messagingSenderId: "390082810870",
            appId: "1:390082810870:web:3be23e5fc5f516567eadd7"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Función global para que el SDK la llame
        window.registrarVistaAds = async function(id) {
            try {
                const partnerRef = doc(db, "partners", id);
                await updateDoc(partnerRef, {
                    views: increment(1) // SUMA +1 A LAS VISTAS EN FIREBASE
                });
                console.log("[Anime Offis] Monetización registrada exitosamente.");
            } catch (e) {
                console.error("[Anime Offis] Error al registrar monetización:", e);
            }
        };
    `;
    document.head.appendChild(firebaseScript);

    window.AnimeOffisSDK = {
        esAnuncio: false,
        listaAds: "https://vdaf.animeoffis.com/ads/lista.json",

        async solicitarAnuncio(playerElementId) {
            // 1. UNIVERSAL: Obtenemos el elemento (sea contenedor o etiqueta video directamente)
            const contenedor = document.getElementById(playerElementId);
            if (!contenedor) return console.error("[Anime Offis] No se encontró el reproductor.");
            
            // Buscamos la etiqueta <video> real (por si usan Video.js que envuelve el video en un div)
            const videoElement = contenedor.tagName.toLowerCase() === 'video' ? contenedor : contenedor.querySelector('video');
            if (!videoElement) return console.error("[Anime Offis] Etiqueta <video> no encontrada.");

            const adLabel = document.getElementById('ad-label');

            try {
                const response = await fetch(this.listaAds);
                const anuncios = await response.json();
                const anuncioElegido = anuncios[Math.floor(Math.random() * anuncios.length)];

                this.esAnuncio = true;
                
                // Guardar la fuente original en HTML5 puro
                const sourceOriginal = videoElement.currentSrc || videoElement.src;

                // 2. CREAR BOTÓN DE OMITIR (Si no existe)
                let skipBtn = document.getElementById('ao-skip-btn');
                if (!skipBtn) {
                    skipBtn = document.createElement('button');
                    skipBtn.id = 'ao-skip-btn';
                    skipBtn.innerText = "Omitir Anuncio ►";
                    // Estilos del botón flotante
                    Object.assign(skipBtn.style, {
                        position: 'absolute', bottom: '20%', right: '20px',
                        background: 'rgba(0, 0, 0, 0.8)', color: 'white',
                        border: '1px solid #00aaff', padding: '10px 20px',
                        borderRadius: '5px', cursor: 'pointer', zIndex: '9999',
                        display: 'none', fontFamily: 'sans-serif', fontWeight: 'bold'
                    });
                    
                    // Nos aseguramos que el contenedor sea relativo para que el botón flote dentro del video
                    videoElement.parentNode.style.position = 'relative';
                    videoElement.parentNode.appendChild(skipBtn);
                }

                // 3. FUNCIÓN PARA FINALIZAR EL ANUNCIO (Por omisión o término natural)
                const finalizarAnuncio = async () => {
                    if (!this.esAnuncio) return; // Evitar que se ejecute dos veces
                    this.esAnuncio = false;
                    
                    if (adLabel) adLabel.style.display = 'none';
                    skipBtn.style.display = 'none';

                    // --- LLAMADA A FIREBASE (Anota la ganancia) ---
                    if (window.registrarVistaAds && publisherID) {
                        await window.registrarVistaAds(publisherID);
                    }

                    // Restaurar el video del anime
                    videoElement.src = sourceOriginal;
                    videoElement.load();
                    videoElement.play();

                    // Limpiamos los eventos para el siguiente capítulo
                    videoElement.removeEventListener('ended', finalizarAnuncio);
                    skipBtn.removeEventListener('click', finalizarAnuncio);
                };

                // Asignar eventos de finalización
                videoElement.addEventListener('ended', finalizarAnuncio);
                skipBtn.addEventListener('click', finalizarAnuncio);

                // 4. LÓGICA DE TIEMPO PARA MOSTRAR EL BOTÓN (Solo si dura > 50s)
                videoElement.addEventListener('loadedmetadata', function onLoaded() {
                    if (videoElement.duration > 50) {
                        // Aparece a los 5 segundos de haber empezado
                        setTimeout(() => {
                            if (window.AnimeOffisSDK.esAnuncio) skipBtn.style.display = 'block';
                        }, 5000); 
                    }
                    videoElement.removeEventListener('loadedmetadata', onLoaded);
                });

                // Cargar y reproducir el anuncio
                videoElement.src = anuncioElegido.url;
                videoElement.load();
                if (adLabel) adLabel.style.display = 'block';
                videoElement.play();

            } catch (e) {
                this.esAnuncio = false;
                console.error("[Anime Offis] Error SDK:", e);
            }
        }
    };
})();
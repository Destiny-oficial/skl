// Anime Offis Ads SDK - Universal Premium (VDAF Edition)
(function() {
    const scriptSrc = document.currentScript.src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    const publisherID = urlParams.get('id');

    // INTEGRACIÓN CON FIREBASE
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
            appId: "1:390082810870:web:3be23e5fc5f516567eadd7"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        window.registrarVistaAds = async function(id) {
            try {
                const partnerRef = doc(db, "partners", id);
                await updateDoc(partnerRef, { views: increment(1) });
                console.log("[Anime Offis] Monetización registrada +1");
            } catch (e) { console.error("Error Firebase:", e); }
        };
    `;
    document.head.appendChild(firebaseScript);

    window.AnimeOffisSDK = {
        esAnuncio: false,
        // Usamos la lista JSON como base de datos
        listaAds: "https://vdaf.animeoffis.com/ads/lista.json",

        async solicitarAnuncio(playerElementId) {
            const contenedor = document.getElementById(playerElementId);
            const videoElement = contenedor.tagName.toLowerCase() === 'video' ? contenedor : contenedor.querySelector('video');
            if (!videoElement) return;

            try {
                const response = await fetch(this.listaAds);
                const anuncios = await response.json();
                const elegido = anuncios[Math.floor(Math.random() * anuncios.length)];

                this.esAnuncio = true;
                const sourceOriginal = videoElement.currentSrc || videoElement.src;

                // 1. CREAR BOTÓN VISITAR SITIO
                let visitBtn = document.createElement('a');
                visitBtn.href = elegido.link || "#";
                visitBtn.target = "_blank";
                visitBtn.innerText = "VISITAR SITIO ↗";
                Object.assign(visitBtn.style, {
                    position: 'absolute', top: '20px', right: '20px', background: '#00aaff',
                    color: 'black', padding: '10px 20px', borderRadius: '5px', zIndex: '10000',
                    textDecoration: 'none', fontWeight: 'bold', fontFamily: 'sans-serif'
                });

                // 2. CREAR BOTÓN OMITIR
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

                const finalizar = async () => {
                    if (!this.esAnuncio) return;
                    this.esAnuncio = false;
                    visitBtn.remove();
                    skipBtn.remove();
                    
                    // Registro de monetización
                    if (window.registrarVistaAds && publisherID) await window.registrarVistaAds(publisherID);

                    videoElement.src = sourceOriginal;
                    videoElement.load();
                    videoElement.play();
                };

                videoElement.addEventListener('ended', finalizar, { once: true });
                skipBtn.onclick = finalizar;

                // Mostrar omitir después de 5s si el anuncio es largo
                videoElement.onloadedmetadata = () => {
                    if (videoElement.duration > 50) {
                        setTimeout(() => { if(this.esAnuncio) skipBtn.style.display = 'block'; }, 5000);
                    }
                };

                // Cambiar al anuncio
                videoElement.src = elegido.url;
                videoElement.load();
                videoElement.play();

            } catch (e) { console.error("[SDK Error]", e); }
        }
    };
})();
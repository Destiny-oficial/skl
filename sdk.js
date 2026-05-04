// Anime Offis Ads SDK - Firebase Edition
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
                console.log("[Anime Offis] Monetización registrada +$0.20");
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
            const player = videojs(playerElementId);
            const adLabel = document.getElementById('ad-label');

            try {
                const response = await fetch(this.listaAds);
                const anuncios = await response.json();
                const anuncioElegido = anuncios[Math.floor(Math.random() * anuncios.length)];

                this.esAnuncio = true;
                const sourceOriginal = player.currentSrc();

                player.src({ type: 'video/mp4', src: anuncioElegido.url });
                if (adLabel) adLabel.style.display = 'block';

                player.one('ended', async () => {
                    this.esAnuncio = false;
                    if (adLabel) adLabel.style.display = 'none';

                    // --- LLAMADA A FIREBASE ---
                    if (window.registrarVistaAds && publisherID) {
                        await window.registrarVistaAds(publisherID);
                    }

                    player.src({ type: 'video/mp4', src: sourceOriginal });
                    player.play();
                });

                player.play();
            } catch (e) {
                this.esAnuncio = false;
                console.error("Error SDK:", e);
            }
        }
    };
})();

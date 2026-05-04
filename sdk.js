// Anime Offis Ads SDK - v1.0.0
(function() {
    const scriptSrc = document.currentScript.src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    const publisherID = urlParams.get('id');

    if (!publisherID) {
        console.error("[Anime Offis] Error: ID de monetización no encontrado.");
        return;
    }

    // Configuración inicial
    const API_URL = "https://api.animeoffis.com/validate"; 

    async function initSDK() {
        try {
            // 1. Validar el ID con tu backend
            const response = await fetch(`${API_URL}?id=${publisherID}`);
            const data = await response.json();

            if (data.active) {
                console.log(`[Anime Offis] SDK Activo para: ${data.siteName}`);
                // 2. Aquí va tu lógica de VAST 3.0 para renderizar el anuncio
                renderAd(data.vastUrl);
            }
        } catch (err) {
            console.error("[Anime Offis] Error al conectar con el servidor de anuncios.");
        }
    }

    function renderAd(vastUrl) {
        // Lógica para buscar el nodo <MediaFile> en el XML de VAST
        console.log("Cargando anuncio desde: " + vastUrl);
    }

    initSDK();
})();

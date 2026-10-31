/**
 * Download Reels - Multi-Language i18n Dictionary & Locale Engine
 * Supports 8 languages with auto-detection (browser locale / cookie / query param)
 * and RTL (Right-to-Left) support for Arabic.
 */

const DR_LANGUAGES = {
  en: { name: "English", flag: "🇺🇸", dir: "ltr" },
  es: { name: "Español", flag: "🇪🇸", dir: "ltr" },
  pt: { name: "Português", flag: "🇧🇷", dir: "ltr" },
  id: { name: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
  hi: { name: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  ar: { name: "العربية", flag: "🇸🇦", dir: "rtl" },
  ru: { name: "Русский", flag: "🇷🇺", dir: "ltr" },
  fr: { name: "Français", flag: "🇫🇷", dir: "ltr" }
};

const DR_TRANSLATIONS = {
  en: {
    "nav.fastCdn": "Fast CDN",
    "nav.blog": "Blog & Guides",
    "hero.badge": "SaveFrom.net Alternative",
    "hero.badgeFree": "Ad-Free & 100% Free",
    "hero.title": "Universal Video Downloader & YouTube to MP3",
    "hero.desc": "Save Instagram Reels, TikTok without watermark, and YouTube videos in up to 1080p MP4. Features built-in <strong class=\"text-foreground\">320kbps MP3 Audio conversion</strong> and client-side FFmpeg processing.",
    "tab.single": "Single Video",
    "tab.bulk": "Bulk URLs",
    "bulk.title": "Batch Video Links (one URL per line)",
    "bulk.extractAll": "Extract All Links",
    "bulk.downloadZip": "Download All as ZIP",
    "bulk.clear": "Clear",
    "input.placeholder": "Paste Instagram, TikTok, YouTube, or video URL...",
    "input.paste": "Paste",
    "input.download": "Download",
    "sample.label": "Sample:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (No Watermark)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "Direct MP4",
    "loading.status": "Extracting video streams...",
    "loading.resolving": "Resolving",
    "loading.buffering": "Buffering preview...",
    "error.title": "Unable to extract video",
    "result.formats": "Formats:",
    "result.downloadMp4": "Download MP4",
    "result.convertFfmpeg": "Convert Format / 320k MP3 (Client FFmpeg)",
    "result.clipReels": "Clip into Multiple Reels (Client Studio)",
    "result.audio": "Audio",
    "result.copy": "Copy",
    "result.tab": "Tab",
    "result.qr": "QR",
    "history.title": "Recent Downloads",
    "history.clear": "Clear",
    "features.f1Title": "No Watermarks",
    "features.f1Desc": "Direct clean video streams without added platform logos or stamps.",
    "features.f2Title": "Client Fast Resolvers",
    "features.f2Desc": "Direct streaming via CORS endpoints for YouTube and TikTok.",
    "features.f3Title": "Mobile QR Handoff",
    "features.f3Desc": "Scan with your camera to download directly to phone storage.",
    "howto.title": "How to Download Reels & Videos in 3 Simple Steps",
    "howto.subtitle": "Save public reels, shorts, and video clips directly to your PC, Mac, iPhone, or Android device.",
    "howto.s1Title": "Copy Video Link",
    "howto.s1Desc": "Open Instagram, TikTok, or YouTube. Click the \"Share\" button on any reel or short and copy the link.",
    "howto.s2Title": "Paste URL Above",
    "howto.s2Desc": "Paste the copied link into the input bar at the top of this page and click the Download button.",
    "howto.s3Title": "Save Clean MP4",
    "howto.s3Desc": "Choose your preferred quality (1080p Full HD, 720p, or MP3 audio) and download with zero watermark.",
    "matrix.title": "Supported Platforms & Quality Matrix",
    "matrix.subtitle": "Universal media resolution with watermark suppression and audio separation.",
    "matrix.thPlatform": "Platform",
    "matrix.thQuality": "Max Quality",
    "matrix.thWatermark": "Watermark",
    "matrix.thAudio": "Audio (MP3)",
    "matrix.thSpeed": "Speed",
    "matrix.removed": "Removed",
    "matrix.noWatermark": "No Watermark",
    "matrix.none": "None",
    "matrix.original": "Original",
    "matrix.supported": "Supported",
    "matrix.instant": "Instant",
    "matrix.directStream": "Direct Stream",
    "matrix.maximum": "Maximum",
    "guides.title": "Engineering Guides & Technical Blogs",
    "guides.subtitle": "Learn how to extract, encode, and download video streams programmatically.",
    "guides.allArticles": "All 7 Articles",
    "faq.title": "Frequently Asked Questions",
    "faq.subtitle": "Everything you need to know about downloading reels and videos online.",
    "faq.q1": "Is this a working alternative to SaveFrom.net?",
    "faq.a1": "Yes! With SaveFrom.net shutting down and suffering from domain seizures and intrusive adware, Download Reels was created as a clean, open-source replacement. There are 0 ads, 0 popups, no tracking cookies, and full support for 1080p MP4 video and 320kbps MP3 audio downloads.",
    "faq.q2": "Can I convert YouTube videos and shorts to 320kbps MP3?",
    "faq.a2": "Yes. When you paste any YouTube video or short, select the \"MP3 Audio (320 kbps Ultra HQ)\" pill or click \"Convert Format\" to encode the stream directly in your browser using our client-side FFmpeg WebAssembly engine.",
    "faq.q3": "How does the client-side FFmpeg conversion work?",
    "faq.a3": "Download Reels loads a WebAssembly compilation of FFmpeg directly inside your web browser. This processes, transcodes, trims, and converts video/audio on your own computer CPU without uploading your files to any remote server, guaranteeing 100% privacy and zero server queues.",
    "faq.q4": "How do I download Instagram Reels without a watermark?",
    "faq.a4": "Copy the reel link directly from the Instagram mobile app or desktop browser, paste it into the URL bar above, and click Download. You will receive the original high-resolution MP4 video file with no added stamps or watermarks.",
    "faq.q5": "Can I download TikTok videos without the TikTok watermark?",
    "faq.a5": "Yes! Download Reels connects directly to clean CDN streams via TikWM API, extracting the pure 1080p/720p HD MP4 video with no floating TikTok logo or username stamps.",
    "faq.q6": "How do I save YouTube Shorts in 1080p MP4 format?",
    "faq.a6": "Paste any YouTube Shorts or standard YouTube URL into Download Reels. Our client stream resolver instantly extracts the progressive MP4 streams and audio tracks for immediate download.",
    "faq.q7": "Is Download Reels completely free and safe to use?",
    "faq.a7": "Yes, 100% free and open-source. There is no software to install, no sign-up or registration required, and no tracking cookies stored on your device.",
    "faq.q8": "How do I download reels on iPhone or Android mobile devices?",
    "faq.a8": "You can either open download-reels.github.io in your mobile Safari/Chrome browser, or generate a Mobile QR code on your computer screen using the QR button and scan it with your phone camera to download directly.",
    "faq.q9": "How do I split a video into multiple reels with a 1st-second hook frame?",
    "faq.a9": "After resolving any video, click 'Clip into Multiple Reels (Client Studio)'. Add multiple start and end timestamps, optionally enable a 1st-second viral Hook Frame banner or upload your brand logo watermark, and export all reels simultaneously using our multi-core WebAssembly studio.",
    "footer.desc": "Free universal online video downloader for Instagram Reels, TikTok, YouTube Shorts, and X.",
    "footer.platforms": "Platforms",
    "footer.guides": "Engineering Guides",
    "footer.resources": "Resources & SEO",
    "footer.copyright": "© 2026 Download Reels. Open-source under MIT License. Hosted on GitHub Pages.",
    "modal.convertTitle": "Client-Side Conversion Studio (FFmpeg)",
    "modal.convertDesc": "Transcode media directly inside your browser via WebAssembly. Zero files uploaded to any server.",
    "modal.targetFormat": "Target Format",
    "modal.audioBitrate": "Audio Bitrate",
    "modal.startTrim": "Start Trim (sec)",
    "modal.endTrim": "End Trim (sec)",
    "modal.startConvert": "Start Conversion",
    "modal.qrTitle": "Scan with Smartphone",
    "modal.qrDesc": "Open your phone's camera app and point at the QR code to save directly.",
    "toast.linkDetected": "Link detected — resolving stream...",
    "toast.linkPasted": "Link pasted — extracting media...",
    "toast.clipboardPasted": "Pasted from clipboard — resolving...",
    "toast.previewLoaded": "Preview loaded! Ready to download.",
    "toast.copied": "Direct video URL copied to clipboard!",
    "toast.downloading": "Downloading audio MP3...",
    "toast.downloadTriggered": "Download triggered successfully!",
    "toast.historyCleared": "Download history cleared."
  },
  es: {
    "nav.fastCdn": "CDN Rápida",
    "nav.blog": "Blog y Guías",
    "hero.badge": "Alternativa a SaveFrom.net",
    "hero.badgeFree": "Sin Publicidad y 100% Gratis",
    "hero.title": "Descargador Universal de Videos y YouTube a MP3",
    "hero.desc": "Descarga Reels de Instagram, TikTok sin marca de agua y videos de YouTube en hasta 1080p MP4. Incluye <strong class=\"text-foreground\">conversión a MP3 de 320kbps</strong> y procesamiento FFmpeg en el navegador.",
    "input.placeholder": "Pega el enlace de Instagram, TikTok, YouTube o video...",
    "input.paste": "Pegar",
    "input.download": "Descargar",
    "sample.label": "Ejemplo:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (Sin Marca)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "MP4 Directo",
    "loading.status": "Extrayendo transmisiones de video...",
    "loading.resolving": "Resolviendo",
    "loading.buffering": "Cargando vista previa...",
    "error.title": "No se pudo extraer el video",
    "result.formats": "Formatos:",
    "result.downloadMp4": "Descargar MP4",
    "result.convertFfmpeg": "Convertir Formato / MP3 320k (FFmpeg)",
    "result.audio": "Audio",
    "result.copy": "Copiar",
    "result.tab": "Pestaña",
    "result.qr": "QR",
    "history.title": "Descargas Recientes",
    "history.clear": "Borrar",
    "features.f1Title": "Sin Marcas de Agua",
    "features.f1Desc": "Videos limpios directos sin logos añadidos de la plataforma.",
    "features.f2Title": "Resolutores Rápidos",
    "features.f2Desc": "Transmisión directa mediante endpoints CORS para YouTube y TikTok.",
    "features.f3Title": "Transferencia QR Móvil",
    "features.f3Desc": "Escanea con la cámara para descargar directo a tu teléfono móvil.",
    "howto.title": "Cómo Descargar Reels y Videos en 3 Simples Pasos",
    "howto.subtitle": "Guarda reels, shorts y videos públicos directamente en tu PC, Mac, iPhone o Android.",
    "howto.s1Title": "Copiar Enlace del Video",
    "howto.s1Desc": "Abre Instagram, TikTok o YouTube. Toca \"Compartir\" en cualquier reel y copia el enlace.",
    "howto.s2Title": "Pegar URL Arriba",
    "howto.s2Desc": "Pega el enlace copiado en la barra superior y pulsa el botón de Descargar.",
    "howto.s3Title": "Guardar MP4 Limpio",
    "howto.s3Desc": "Elige tu calidad preferida (1080p HD, 720p o audio MP3) y descarga sin marcas.",
    "matrix.title": "Plataformas Compatibles y Matriz de Calidad",
    "matrix.subtitle": "Resolución universal con supresión de marcas y separación de audio.",
    "matrix.thPlatform": "Plataforma",
    "matrix.thQuality": "Calidad Máx",
    "matrix.thWatermark": "Marca de Agua",
    "matrix.thAudio": "Audio (MP3)",
    "matrix.thSpeed": "Velocidad",
    "matrix.removed": "Eliminada",
    "matrix.noWatermark": "Sin Marca",
    "matrix.none": "Ninguna",
    "matrix.original": "Original",
    "matrix.supported": "Compatible",
    "matrix.instant": "Instantáneo",
    "matrix.directStream": "Directo",
    "matrix.maximum": "Máxima",
    "guides.title": "Guías de Ingeniería y Blogs Técnicos",
    "guides.subtitle": "Aprende a extraer, codificar y descargar transmisiones de video mediante código.",
    "guides.allArticles": "Los 7 Artículos",
    "faq.title": "Preguntas Frecuentes",
    "faq.subtitle": "Todo lo que necesitas saber sobre descargar reels y videos en línea.",
    "faq.q1": "¿Es este un reemplazo funcional de SaveFrom.net?",
    "faq.a1": "¡Sí! Tras el cierre y problemas de SaveFrom.net, Download Reels se creó como una alternativa limpia y de código abierto: sin anuncios, sin ventanas emergentes y con soporte para MP4 1080p y MP3 320kbps.",
    "faq.q2": "¿Puedo convertir videos y shorts de YouTube a MP3 de 320kbps?",
    "faq.a2": "Sí. Al pegar cualquier video de YouTube, selecciona la opción \"MP3 Audio (320 kbps)\" o haz clic en \"Convertir Formato\" para procesarlo en tu navegador con FFmpeg WebAssembly.",
    "faq.q3": "¿Cómo funciona la conversión FFmpeg en el navegador?",
    "faq.a3": "Download Reels ejecuta FFmpeg compilado en WebAssembly directamente en tu navegador, procesando y convirtiendo medios en tu propio dispositivo sin subir archivos a servidores externos.",
    "faq.q4": "¿Cómo descargo Reels de Instagram sin marca de agua?",
    "faq.a4": "Copia el enlace del Reel desde Instagram, pégalo en la barra superior y haz clic en Descargar. Obtendrás el archivo MP4 original en alta resolución sin añadidos.",
    "faq.q5": "¿Puedo descargar videos de TikTok sin marca de agua?",
    "faq.a5": "¡Sí! Conectamos directamente a streams CDN limpios a través de la API TikWM, extrayendo video HD 1080p/720p sin logos flotantes ni nombres de usuario.",
    "faq.q6": "¿Cómo guardo YouTube Shorts en MP4 1080p?",
    "faq.a6": "Pega cualquier enlace de YouTube Shorts en Download Reels. Nuestro extractor obtiene de inmediato las pistas de video y audio para su descarga directa.",
    "faq.q7": "¿Download Reels es gratis y seguro?",
    "faq.a7": "Sí, 100% gratuito y de código abierto. No requiere instalación de software, no pide registro y no almacena cookies de rastreo.",
    "faq.q8": "¿Cómo descargo reels en iPhone o Android?",
    "faq.a8": "Puedes abrir download-reels.github.io en tu navegador móvil, o generar un código QR en tu pantalla y escanearlo con la cámara para descargar en el teléfono.",
    "footer.desc": "Descargador de videos gratuito para Instagram Reels, TikTok, YouTube Shorts y X.",
    "footer.platforms": "Plataformas",
    "footer.guides": "Guías Técnicas",
    "footer.resources": "Recursos y SEO",
    "footer.copyright": "© 2026 Download Reels. Código abierto bajo Licencia MIT. Alojado en GitHub Pages.",
    "modal.convertTitle": "Estudio de Conversión en Navegador (FFmpeg)",
    "modal.convertDesc": "Transcodifica medios en tu navegador mediante WebAssembly. Cero archivos subidos a servidores.",
    "modal.targetFormat": "Formato de Salida",
    "modal.audioBitrate": "Bitrate de Audio",
    "modal.startTrim": "Recorte Inicio (seg)",
    "modal.endTrim": "Recorte Fin (seg)",
    "modal.startConvert": "Iniciar Conversión",
    "modal.qrTitle": "Escanear con Smartphone",
    "modal.qrDesc": "Abre la cámara de tu teléfono y apunta al código QR para guardarlo de inmediato.",
    "toast.linkDetected": "Enlace detectado — resolviendo...",
    "toast.linkPasted": "Enlace pegado — extrayendo video...",
    "toast.clipboardPasted": "Pegado del portapapeles — procesando...",
    "toast.previewLoaded": "¡Vista previa lista! Listo para descargar.",
    "toast.copied": "¡Enlace directo copiado al portapapeles!",
    "toast.downloading": "Descargando audio MP3...",
    "toast.downloadTriggered": "¡Descarga iniciada con éxito!",
    "toast.historyCleared": "Historial de descargas borrado."
  },
  pt: {
    "nav.fastCdn": "CDN Rápida",
    "nav.blog": "Blog e Guias",
    "hero.badge": "Alternativa ao SaveFrom.net",
    "hero.badgeFree": "Sem Anúncios e 100% Grátis",
    "hero.title": "Baixador Universal de Vídeos e YouTube para MP3",
    "hero.desc": "Baixe Reels do Instagram, TikTok sem marca d'água e vídeos do YouTube em até 1080p MP4. Inclui <strong class=\"text-foreground\">conversão para MP3 de 320kbps</strong> e FFmpeg no navegador.",
    "input.placeholder": "Cole o link do Instagram, TikTok, YouTube ou vídeo...",
    "input.paste": "Colar",
    "input.download": "Baixar",
    "sample.label": "Exemplo:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (Sem Marca)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "MP4 Direto",
    "loading.status": "Extraindo transmissões de vídeo...",
    "loading.resolving": "Resolvendo",
    "loading.buffering": "Carregando prévia...",
    "error.title": "Não foi possível extrair o vídeo",
    "result.formats": "Formatos:",
    "result.downloadMp4": "Baixar MP4",
    "result.convertFfmpeg": "Converter Formato / MP3 320k (FFmpeg)",
    "result.audio": "Áudio",
    "result.copy": "Copiar",
    "result.tab": "Aba",
    "result.qr": "QR",
    "history.title": "Downloads Recentes",
    "history.clear": "Limpar",
    "features.f1Title": "Sem Marca d'Água",
    "features.f1Desc": "Vídeos limpos diretamente da fonte sem logos ou carimbos de rede social.",
    "features.f2Title": "Processamento Rápido",
    "features.f2Desc": "Transmissão direta via endpoints CORS para YouTube e TikTok.",
    "features.f3Title": "Transferência QR Celular",
    "features.f3Desc": "Aponte a câmera do celular para baixar direto na memória do aparelho.",
    "howto.title": "Como Baixar Reels e Vídeos em 3 Passos Simples",
    "howto.subtitle": "Salve reels, shorts e vídeos públicos diretamente no seu PC, Mac, iPhone ou Android.",
    "howto.s1Title": "Copiar Link do Vídeo",
    "howto.s1Desc": "Abra o Instagram, TikTok ou YouTube. Toque em \"Compartilhar\" e copie o link.",
    "howto.s2Title": "Colar URL Acima",
    "howto.s2Desc": "Cole o link copiado na barra de pesquisa no topo desta página e clique em Baixar.",
    "howto.s3Title": "Salvar MP4 Limpo",
    "howto.s3Desc": "Escolha a resolução desejada (1080p HD, 720p ou MP3) e baixe sem marcas.",
    "matrix.title": "Plataformas Compatíveis e Matriz de Qualidade",
    "matrix.subtitle": "Resolução universal com remoção de marcas d'água e separação de áudio.",
    "matrix.thPlatform": "Plataforma",
    "matrix.thQuality": "Qualidade Máx",
    "matrix.thWatermark": "Marca d'Água",
    "matrix.thAudio": "Áudio (MP3)",
    "matrix.thSpeed": "Velocidade",
    "matrix.removed": "Removida",
    "matrix.noWatermark": "Sem Marca",
    "matrix.none": "Nenhuma",
    "matrix.original": "Original",
    "matrix.supported": "Suportado",
    "matrix.instant": "Instantâneo",
    "matrix.directStream": "Direto",
    "matrix.maximum": "Máxima",
    "guides.title": "Guias Técnicos e Blog de Engenharia",
    "guides.subtitle": "Aprenda a extrair, codificar e baixar streams de vídeo programaticamente.",
    "guides.allArticles": "Todos os 7 Artigos",
    "faq.title": "Perguntas Frequentes",
    "faq.subtitle": "Tudo o que você precisa saber sobre download de reels e vídeos online.",
    "faq.q1": "Esta é uma alternativa real ao SaveFrom.net?",
    "faq.a1": "Sim! Com os bloqueios do SaveFrom.net, criamos o Download Reels como substituto limpo e livre de anúncios, com suporte a MP4 1080p e MP3 320kbps.",
    "faq.q2": "Posso converter vídeos do YouTube para MP3 de 320kbps?",
    "faq.a2": "Sim. Cole o link do YouTube e selecione \"MP3 Audio (320 kbps)\" para converter direto no navegador via FFmpeg WebAssembly.",
    "faq.q3": "Como funciona a conversão no navegador?",
    "faq.a3": "O FFmpeg roda diretamente na CPU do seu navegador via WebAssembly, sem enviar nenhum arquivo para servidores remotos.",
    "faq.q4": "Como baixar Instagram Reels sem marca d'água?",
    "faq.a4": "Copie o link do Reel, cole no campo acima e clique em Baixar para obter o arquivo MP4 original em alta resolução.",
    "faq.q5": "Dá para baixar vídeos do TikTok sem a logo?",
    "faq.a5": "Sim! Conectamos à API TikWM para extrair o fluxo MP4 limpo em 1080p/720p sem logotipo nem identificador de usuário.",
    "faq.q6": "Como salvar YouTube Shorts em 1080p?",
    "faq.a6": "Cole o link de qualquer Short no Download Reels para carregar instantaneamente as opções de download em MP4 ou áudio.",
    "faq.q7": "O Download Reels é gratuito e seguro?",
    "faq.a7": "100% gratuito e open-source. Sem cadastro, sem instalações e sem cookies espiões.",
    "faq.q8": "Como baixar em celulares iPhone ou Android?",
    "faq.a8": "Abra download-reels.github.io no Safari ou Chrome do celular, ou escaneie o código QR gerado no computador.",
    "footer.desc": "Baixador gratuito de vídeos para Instagram Reels, TikTok, YouTube Shorts e X.",
    "footer.platforms": "Plataformas",
    "footer.guides": "Guias Técnicos",
    "footer.resources": "Recursos e SEO",
    "footer.copyright": "© 2026 Download Reels. Código aberto sob Licença MIT. Hospedado no GitHub Pages.",
    "modal.convertTitle": "Estúdio de Conversão FFmpeg",
    "modal.convertDesc": "Converta mídia no seu próprio navegador via WebAssembly. Zero arquivos enviados a servidores.",
    "modal.targetFormat": "Formato de Saída",
    "modal.audioBitrate": "Taxa de Bits de Áudio",
    "modal.startTrim": "Corte Início (seg)",
    "modal.endTrim": "Corte Fim (seg)",
    "modal.startConvert": "Iniciar Conversão",
    "modal.qrTitle": "Escanear com Celular",
    "modal.qrDesc": "Aponte a câmera do smartphone para o QR Code para salvar no aparelho.",
    "toast.linkDetected": "Link detectado — resolvendo vídeo...",
    "toast.linkPasted": "Link colado — extraindo streams...",
    "toast.clipboardPasted": "Colado da área de transferência...",
    "toast.previewLoaded": "Prévia carregada! Pronto para baixar.",
    "toast.copied": "Link direto copiado!",
    "toast.downloading": "Baixando áudio MP3...",
    "toast.downloadTriggered": "Download iniciado com sucesso!",
    "toast.historyCleared": "Histórico de downloads limpo."
  },
  id: {
    "nav.fastCdn": "CDN Cepat",
    "nav.blog": "Blog & Panduan",
    "hero.badge": "Alternatif SaveFrom.net",
    "hero.badgeFree": "Tanpa Iklan & 100% Gratis",
    "hero.title": "Pengunduh Video Universal & YouTube ke MP3",
    "hero.desc": "Unduh Instagram Reels, TikTok tanpa watermark, dan YouTube hingga 1080p MP4. Dilengkapi fitur <strong class=\"text-foreground\">konversi MP3 320kbps</strong> dan pemrosesan FFmpeg langsung di browser.",
    "input.placeholder": "Tempel URL Instagram, TikTok, YouTube, atau video...",
    "input.paste": "Tempel",
    "input.download": "Unduh",
    "sample.label": "Contoh:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (Tanpa Watermark)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "MP4 Langsung",
    "loading.status": "Mengekstrak stream video...",
    "loading.resolving": "Memproses",
    "loading.buffering": "Memuat pratinjau...",
    "error.title": "Gagal mengekstrak video",
    "result.formats": "Format:",
    "result.downloadMp4": "Unduh MP4",
    "result.convertFfmpeg": "Konversi Format / MP3 320k (FFmpeg)",
    "result.audio": "Audio",
    "result.copy": "Salin",
    "result.tab": "Tab",
    "result.qr": "QR",
    "history.title": "Unduhan Terakhir",
    "history.clear": "Hapus",
    "features.f1Title": "Tanpa Watermark",
    "features.f1Desc": "Stream video bersih tanpa logo atau cap nama akun.",
    "features.f2Title": "Resolver Klien Cepat",
    "features.f2Desc": "Streaming langsung via CORS untuk YouTube dan TikTok.",
    "features.f3Title": "QR Handoff Seluler",
    "features.f3Desc": "Pindai dengan kamera ponsel untuk unduh langsung ke penyimpanan HP.",
    "howto.title": "Cara Mengunduh Reels & Video dalam 3 Langkah Mudah",
    "howto.subtitle": "Simpan reels, shorts, dan video publik langsung ke PC, Mac, iPhone, atau Android Anda.",
    "howto.s1Title": "Salin Tautan Video",
    "howto.s1Desc": "Buka Instagram, TikTok, atau YouTube. Tekan tombol \"Bagikan\" dan salin tautannya.",
    "howto.s2Title": "Tempel URL di Atas",
    "howto.s2Desc": "Tempel tautan ke kotak input di bagian atas halaman ini lalu klik tombol Unduh.",
    "howto.s3Title": "Simpan MP4 Bersih",
    "howto.s3Desc": "Pilih kualitas yang diinginkan (1080p HD, 720p, atau MP3) dan unduh tanpa watermark.",
    "matrix.title": "Matriks Platform & Kualitas",
    "matrix.subtitle": "Resolusi media universal dengan penghapusan watermark dan pemisahan audio.",
    "matrix.thPlatform": "Platform",
    "matrix.thQuality": "Kualitas Maks",
    "matrix.thWatermark": "Watermark",
    "matrix.thAudio": "Audio (MP3)",
    "matrix.thSpeed": "Kecepatan",
    "matrix.removed": "Dihapus",
    "matrix.noWatermark": "Tanpa Watermark",
    "matrix.none": "Tidak ada",
    "matrix.original": "Asli",
    "matrix.supported": "Didukung",
    "matrix.instant": "Instan",
    "matrix.directStream": "Stream Langsung",
    "matrix.maximum": "Maksimum",
    "guides.title": "Panduan Teknis & Blog",
    "guides.subtitle": "Pelajari cara mengekstrak dan mengonversi video secara terprogram.",
    "guides.allArticles": "Semua 7 Artikel",
    "faq.title": "Pertanyaan yang Sering Diajukan",
    "faq.subtitle": "Semua yang perlu Anda ketahui tentang mengunduh video dan reels online.",
    "faq.q1": "Apakah ini alternatif SaveFrom.net yang berfungsi?",
    "faq.a1": "Ya! Karena SaveFrom.net sering diblokir dan penuh iklan berbahaya, Download Reels dibuat sebagai alternatif open-source tanpa iklan dan aman.",
    "faq.q2": "Bisakah saya mengonversi YouTube ke MP3 320kbps?",
    "faq.a2": "Bisa. Cukup tempel link YouTube dan pilih opsi \"MP3 Audio (320 kbps)\" atau gunakan Studio Konversi FFmpeg di browser.",
    "faq.q3": "Bagaimana cara kerja konversi FFmpeg di browser?",
    "faq.a3": "FFmpeg berjalan langsung di browser via WebAssembly, mengonversi media menggunakan prosesor perangkat Anda tanpa unggah file ke server mana pun.",
    "faq.q4": "Bagaimana cara unduh Instagram Reel tanpa watermark?",
    "faq.a4": "Salin tautan Reel dari aplikasi Instagram, tempel di atas dan klik Unduh. Anda akan menerima file MP4 asli beresolusi tinggi.",
    "faq.q5": "Bisakah unduh TikTok tanpa watermark?",
    "faq.a5": "Ya! Kami mengambil stream langsung dari CDN TikWM untuk menyediakan video MP4 HD 1080p/720p tanpa watermark.",
    "faq.q6": "Bagaimana cara simpan YouTube Shorts dalam format 1080p?",
    "faq.a6": "Tempel tautan YouTube Shorts apa pun di Download Reels untuk memuat stream video MP4 berkecepatan tinggi.",
    "faq.q7": "Apakah Download Reels gratis dan aman?",
    "faq.a7": "100% gratis dan open-source. Tanpa perlu daftar akun, tanpa instalasi aplikasi, dan tanpa pelacak.",
    "faq.q8": "Bagaimana cara unduh di HP iPhone atau Android?",
    "faq.a8": "Buka download-reels.github.io di Chrome atau Safari ponsel, atau pindai kode QR yang muncul di layar laptop.",
    "footer.desc": "Pengunduh video gratis untuk Instagram Reels, TikTok, YouTube Shorts, dan X.",
    "footer.platforms": "Platform",
    "footer.guides": "Panduan Teknis",
    "footer.resources": "Sumber Daya & SEO",
    "footer.copyright": "© 2026 Download Reels. Open-source Lisensi MIT. Dihosting di GitHub Pages.",
    "modal.convertTitle": "Studio Konversi Klien (FFmpeg)",
    "modal.convertDesc": "Konversi media langsung di browser via WebAssembly. Privasi 100% terjamin.",
    "modal.targetFormat": "Format Tujuan",
    "modal.audioBitrate": "Bitrate Audio",
    "modal.startTrim": "Potong Awal (dtk)",
    "modal.endTrim": "Potong Akhir (dtk)",
    "modal.startConvert": "Mulai Konversi",
    "modal.qrTitle": "Pindai dengan Ponsel",
    "modal.qrDesc": "Arahkan kamera smartphone ke kode QR untuk mengunduh langsung.",
    "toast.linkDetected": "Tautan terdeteksi — memproses stream...",
    "toast.linkPasted": "Tautan ditempel — mengekstrak video...",
    "toast.clipboardPasted": "Ditempel dari papan klip...",
    "toast.previewLoaded": "Pratinjau siap! Silakan unduh.",
    "toast.copied": "Tautan video berhasil disalin!",
    "toast.downloading": "Mengunduh file audio MP3...",
    "toast.downloadTriggered": "Unduhan berhasil dimulai!",
    "toast.historyCleared": "Riwayat unduhan telah dibersihkan."
  },
  hi: {
    "nav.fastCdn": "फास्ट CDN",
    "nav.blog": "ब्लॉग और गाइड",
    "hero.badge": "SaveFrom.net का बेहतरीन विकल्प",
    "hero.badgeFree": "बिना विज्ञापन और 100% मुफ्त",
    "hero.title": "यूनिवर्सल वीडियो डाउनलोडर और यूट्यूब से MP3",
    "hero.desc": "इंस्टाग्राम रील्स, टिकटॉक (बिना वॉटरमार्क) और यूट्यूब वीडियो 1080p MP4 में डाउनलोड करें। इसमें शामिल है <strong class=\"text-foreground\">320kbps MP3 ऑडियो रूपांतरण</strong> और ब्राउज़र में FFmpeg प्रोसेसिंग।",
    "input.placeholder": "इंस्टाग्राम, टिकटॉक, यूट्यूब या वीडियो का लिंक पेस्ट करें...",
    "input.paste": "पेस्ट करें",
    "input.download": "डाउनलोड करें",
    "sample.label": "उदाहरण:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (बिना वॉटरमार्क)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "Direct MP4",
    "loading.status": "वीडियो स्ट्रीम निकाला जा रहा है...",
    "loading.resolving": "प्रोसेसिंग",
    "loading.buffering": "प्रीव्यू लोड हो रहा है...",
    "error.title": "वीडियो निकालने में असमर्थ",
    "result.formats": "फॉर्मैट्स:",
    "result.downloadMp4": "MP4 डाउनलोड करें",
    "result.convertFfmpeg": "कन्वर्ट फॉर्मैट / 320k MP3 (FFmpeg)",
    "result.audio": "ऑडियो",
    "result.copy": "कॉपी",
    "result.tab": "टैब",
    "result.qr": "QR",
    "history.title": "हालिया डाउनलोड",
    "history.clear": "हटाएं",
    "features.f1Title": "बिना वॉटरमार्क",
    "features.f1Desc": "प्लेटफ़ॉर्म लोगो या स्टैम्प के बिना साफ़ और ओरिजिनल वीडियो स्ट्रीम।",
    "features.f2Title": "सुपर-फास्ट रिजॉल्वर",
    "features.f2Desc": "यूट्यूब और टिकटॉक के लिए डायरेक्ट ब्राउज़र स्ट्रीमिंग।",
    "features.f3Title": "मोबाइल QR स्कैन",
    "features.f3Desc": "फोन कैमरे से QR स्कैन करें और सीधे मोबाइल में सेव करें।",
    "howto.title": "3 आसान चरणों में रील्स और वीडियो कैसे डाउनलोड करें",
    "howto.subtitle": "सार्वजनिक रील्स, शॉर्ट्स और वीडियो क्लिप्स सीधे अपने PC, Mac, iPhone या Android पर सेव करें।",
    "howto.s1Title": "वीडियो लिंक कॉपी करें",
    "howto.s1Desc": "इंस्टाग्राम, टिकटॉक या यूट्यूब खोलें। 'Share' बटन दबाकर लिंक कॉपी करें।",
    "howto.s2Title": "ऊपर लिंक पेस्ट करें",
    "howto.s2Desc": "कॉपी किया गया लिंक ऊपर दिए गए सर्च बॉक्स में पेस्ट करें और डाउनलोड बटन दबाएं।",
    "howto.s3Title": "क्लीन MP4 सेव करें",
    "howto.s3Desc": "अपनी पसंदीदा क्वालिटी (1080p Full HD, 720p या MP3) चुनें और तुरंत डाउनलोड करें।",
    "matrix.title": "सपोर्टेड प्लेटफॉर्म और क्वालिटी मैट्रिक्स",
    "matrix.subtitle": "वॉटरमार्क हटाने और ऑडियो अलग करने के साथ यूनिवर्सल डाउनलोड।",
    "matrix.thPlatform": "प्लेटफॉर्म",
    "matrix.thQuality": "अधिकतम क्वालिटी",
    "matrix.thWatermark": "वॉटरमार्क",
    "matrix.thAudio": "ऑडियो (MP3)",
    "matrix.thSpeed": "स्पीड",
    "matrix.removed": "हटाया गया",
    "matrix.noWatermark": "बिना वॉटरमार्क",
    "matrix.none": "कोई नहीं",
    "matrix.original": "ओरिजिनल",
    "matrix.supported": "सपोर्टेड",
    "matrix.instant": "तुरंत",
    "matrix.directStream": "डायरेक्ट स्ट्रीम",
    "matrix.maximum": "अधिकतम",
    "guides.title": "इंजीनियरिंग गाइड और टेक्निकल ब्लॉग",
    "guides.subtitle": "प्रोग्रामिंग के ज़रिए वीडियो स्ट्रीम्स को प्रोसेस और डाउनलोड करना सीखें।",
    "guides.allArticles": "सभी 7 लेख",
    "faq.title": "अक्सर पूछे जाने वाले सवाल",
    "faq.subtitle": "ऑनलाइन रील्स और वीडियो डाउनलोड करने के बारे में पूरी जानकारी।",
    "faq.q1": "क्या यह SaveFrom.net का सही विकल्प है?",
    "faq.a1": "हाँ! SaveFrom.net के बंद होने और विज्ञापनों की समस्याओं के बाद, Download Reels एक साफ़, बिना विज्ञापन वाला और ओपन-सोर्स समाधान है।",
    "faq.q2": "क्या मैं यूट्यूब वीडियो को 320kbps MP3 में बदल सकता हूँ?",
    "faq.a2": "हाँ! किसी भी यूट्यूब लिंक को पेस्ट करें और 'MP3 Audio (320 kbps)' चुनें या इन-ब्राउज़र FFmpeg कनवर्टर का उपयोग करें।",
    "faq.q3": "ब्राउज़र में FFmpeg कन्वर्जन कैसे काम करता है?",
    "faq.a3": "यह WebAssembly के माध्यम से आपके कंप्यूटर/मोबाइल के CPU पर प्रोसेस करता है, जिससे आपका डेटा किसी भी बाहरी सर्वर पर अपलोड नहीं होता।",
    "faq.q4": "इंस्टाग्राम रील्स बिना वॉटरमार्क के कैसे डाउनलोड करें?",
    "faq.a4": "इंस्टाग्राम से रील लिंक कॉपी करें, ऊपर पेस्ट करें और डाउनलोड दबाएं। आपको बिना किसी वॉटरमार्क के ओरिजिनल MP4 वीडियो मिलेगा।",
    "faq.q5": "क्या टिकटॉक वीडियो बिना वॉटरमार्क के डाउनलोड हो सकते हैं?",
    "faq.a5": "हाँ! हम TikWM API के ज़रिए बिना लोगो और बिना यूजरनेम वाला 1080p/720p HD MP4 वीडियो डाउनलोड करते हैं।",
    "faq.q6": "यूट्यूब शॉर्ट्स 1080p MP4 में कैसे सेव करें?",
    "faq.a6": "यूट्यूब शॉर्ट्स का लिंक पेस्ट करें, हमारा रिजॉल्वर तुरंत हाई-क्वालिटी MP4 स्ट्रीम उपलब्ध कराता है।",
    "faq.q7": "क्या Download Reels पूरी तरह मुफ्त और सुरक्षित है?",
    "faq.a7": "हाँ, 100% मुफ्त और सुरक्षित। किसी ऐप को इंस्टॉल करने या लॉगिन करने की आवश्यकता नहीं है।",
    "faq.q8": "iPhone या Android मोबाइल पर रील्स कैसे डाउनलोड करें?",
    "faq.a8": "मोबाइल ब्राउज़र में download-reels.github.io खोलें या कंप्यूटर स्क्रीन पर QR कोड बनाकर मोबाइल कैमरे से स्कैन करें।",
    "footer.desc": "इंस्टाग्राम रील्स, टिकटॉक, यूट्यूब शॉर्ट्स और X के लिए मुफ्त ऑनलाइन वीडियो डाउनलोडर।",
    "footer.platforms": "प्लेटफॉर्म",
    "footer.guides": "गाइड्स",
    "footer.resources": "रिसोर्सेज और SEO",
    "footer.copyright": "© 2026 Download Reels. MIT लाइसेंस के तहत ओपन-सोर्स। GitHub Pages पर होस्टेड।",
    "modal.convertTitle": "क्लाइंट-साइड कन्वर्जन स्टूडियो (FFmpeg)",
    "modal.convertDesc": "ब्राउज़र के भीतर WebAssembly द्वारा वीडियो/ऑडियो बदलें। सर्वर पर कोई फाइल अपलोड नहीं होती।",
    "modal.targetFormat": "टारगेट फॉर्मेट",
    "modal.audioBitrate": "ऑडियो बिटरेट",
    "modal.startTrim": "स्टार्ट कट (सेकंड)",
    "modal.endTrim": "एंड कट (सेकंड)",
    "modal.startConvert": "कन्वर्जन शुरू करें",
    "modal.qrTitle": "स्मार्टफोन से स्कैन करें",
    "modal.qrDesc": "सीधे मोबाइल में सेव करने के लिए फोन कैमरा से QR कोड स्कैन करें।",
    "toast.linkDetected": "लिंक मिला — प्रोसेस हो रहा है...",
    "toast.linkPasted": "लिंक पेस्ट हुआ — वीडियो निकाला जा रहा है...",
    "toast.clipboardPasted": "क्लिपबोर्ड से पेस्ट किया गया...",
    "toast.previewLoaded": "प्रीव्यू तैयार है! डाउनलोड के लिए तैयार।",
    "toast.copied": "वीडियो लिंक क्लिपबोर्ड पर कॉपी हो गया!",
    "toast.downloading": "MP3 ऑडियो डाउनलोड हो रहा है...",
    "toast.downloadTriggered": "डाउनलोड सफलतापूर्वक शुरू हुआ!",
    "toast.historyCleared": "डाउनलोड हिस्ट्री हटा दी गई।"
  },
  ar: {
    "nav.fastCdn": "شبكة CDN سريعة",
    "nav.blog": "المدونة والأدلة",
    "hero.badge": "أفضل بديل لموقع SaveFrom.net",
    "hero.badgeFree": "بدون إعلانات ومجاني 100%",
    "hero.title": "محمل الفيديو الشامل وتحويل يوتيوب إلى MP3",
    "hero.desc": "تحميل ريلز إنستغرام، وتيك توك بدون علامة مائية، وفيديوهات يوتيوب حتى دقة 1080p MP4. يدعم <strong class=\"text-foreground\">تحويل الصوت إلى MP3 بجودة 320kbps</strong> ومعالجة FFmpeg المباشرة في المتصفح.",
    "input.placeholder": "الصق رابط إنستغرام أو تيك توك أو يوتيوب هنا...",
    "input.paste": "لصق",
    "input.download": "تحميل",
    "sample.label": "تجربة:",
    "sample.youtube": "يوتيوب",
    "sample.tiktok": "تيك توك (بدون علامة)",
    "sample.reel": "ريلز إنستغرام",
    "sample.mp4": "رابط مباشر MP4",
    "loading.status": "جاري استخراج مسارات الفيديو...",
    "loading.resolving": "معالجة",
    "loading.buffering": "تحميل المعاينة...",
    "error.title": "تعذر استخراج الفيديو",
    "result.formats": "الجودات المتاحة:",
    "result.downloadMp4": "تحميل MP4",
    "result.convertFfmpeg": "تحويل الصيغة / MP3 320k (FFmpeg)",
    "result.audio": "صوت",
    "result.copy": "نسخ",
    "result.tab": "تبويب",
    "result.qr": "QR",
    "history.title": "التنزيلات الأخيرة",
    "history.clear": "مسح",
    "features.f1Title": "بدون علامة مائية",
    "features.f1Desc": "فيديوهات أصلية ونقية بدون أي شعارات أو نصوص مضافة.",
    "features.f2Title": "استخراج فوري مباشر",
    "features.f2Desc": "اتصال فوري مباشر عبر CORS لمنصات يوتيوب وتيك توك.",
    "features.f3Title": "مسح QR للهاتف",
    "features.f3Desc": "امسح الرمز بكاميرا هاتفك للتحميل المباشر إلى الذاكرة.",
    "howto.title": "كيفية تنزيل الفيديوهات والريلز في 3 خطوات بسيطة",
    "howto.subtitle": "احفظ الريلز والشورتس ومقاطع الفيديو مباشرة على هاتفك أو حاسوبك.",
    "howto.s1Title": "نسخ رابط الفيديو",
    "howto.s1Desc": "افتح إنستغرام أو تيك توك أو يوتيوب، واضغط على زر \"مشاركة\" لنسخ الرابط.",
    "howto.s2Title": "لصق الرابط في الأعلى",
    "howto.s2Desc": "الصق الرابط المنسوخ في شريط البحث أعلى هذه الصفحة واضغط على زر التحميل.",
    "howto.s3Title": "حفظ الفيديو بجودة عالية",
    "howto.s3Desc": "اختر الجودة المفضلة (1080p HD أو 720p أو MP3) وحمّل بدون علامة مائية.",
    "matrix.title": "المنصات المدعومة وجودة التنزيل",
    "matrix.subtitle": "دعم شامل لجميع الشبكات مع إزالة العلامات المائية وفصل الصوت.",
    "matrix.thPlatform": "المنصة",
    "matrix.thQuality": "أقصى دقة",
    "matrix.thWatermark": "العلامة المائية",
    "matrix.thAudio": "الصوت (MP3)",
    "matrix.thSpeed": "السرعة",
    "matrix.removed": "مُزالة",
    "matrix.noWatermark": "بدون علامة",
    "matrix.none": "لا يوجد",
    "matrix.original": "أصلي",
    "matrix.supported": "مدعوم",
    "matrix.instant": "فوري",
    "matrix.directStream": "بث مباشر",
    "matrix.maximum": "القصوى",
    "guides.title": "أدلة الهندسة البرمجية والمدونة",
    "guides.subtitle": "تعلم كيفية استخراج وترميز وتنزيل مقاطع الفيديو برمجياً.",
    "guides.allArticles": "جميع المقالات السبعة",
    "faq.title": "الأسئلة الشائعة",
    "faq.subtitle": "كل ما تحتاج لمعرفته حول تنزيل الفيديوهات والريلز عبر الإنترنت.",
    "faq.q1": "هل هذا بديل حقيقي وفعّال لموقع SaveFrom.net؟",
    "faq.a1": "نعم! بعد حجب وإغلاق SaveFrom.net ومشاكل الإعلانات المزعجة، تم تصميم Download Reels كبديل مجاني تماماً ومفتوح المصدر وخالٍ من الإعلانات.",
    "faq.q2": "هل يمكنني تحويل فيديوهات يوتيوب إلى MP3 بجودة 320kbps؟",
    "faq.a2": "نعم، الصق رابط يوتيوب واختر خيار \"MP3 Audio (320 kbps)\" أو استخدم محول FFmpeg المدمج بالمتصفح.",
    "faq.q3": "كيف تعمل معالجة FFmpeg داخل المتصفح؟",
    "faq.a3": "يعمل FFmpeg عبر تقنية WebAssembly داخل متصفحك مباشرة بدون إرسال ملفاتك لأي خادم، مما يضمن خصوصية 100%.",
    "faq.q4": "كيف أحمّل ريلز إنستغرام بدون علامة مائية؟",
    "faq.a4": "انسخ رابط الريل من إنستغرام، واللصقه في الأعلى، واضغط تحميل لتحصل على ملف MP4 الأصلي بأعلى جودة.",
    "faq.q5": "هل يمكن تنزيل مقاطع تيك توك بدون الشعار؟",
    "faq.a5": "نعم! نحن نوفر اتصالاً مباشراً بمسارات CDN عبر TikWM لاستخراج الفيديو بجودة 1080p/720p بدون شعار تيك توك.",
    "faq.q6": "كيف أحفظ يوتيوب شورتس بجودة 1080p؟",
    "faq.a6": "الصق أي رابط YouTube Shorts للحصول فوراً على روابط التحميل المباشرة للفيديو والصوت.",
    "faq.q7": "هل أداة Download Reels مجانية وآمنة؟",
    "faq.a7": "نعم، مجانية 100% ومفتوحة المصدر. لا تتطلب تثبيت برامج أو تسجيل حساب ولا تستخدم ملفات تتبع.",
    "faq.q8": "كيف أقوم بالتنزيل على هواتف آيفون أو أندرويد؟",
    "faq.a8": "افتح الموقع مباشرة على متصفح الهاتف أو اعرض رمز QR على شاشة حاسوبك وامسحه بكاميرا هاتفك.",
    "footer.desc": "أداة تنزيل الفيديوهات المجانية لإنستغرام وتيك توك ويوتيوب شورتس وإكس.",
    "footer.platforms": "المنصات",
    "footer.guides": "أدلة المطورين",
    "footer.resources": "المصادر و SEO",
    "footer.copyright": "© 2026 Download Reels. مفتوح المصدر بترخيص MIT. مستضاف على GitHub Pages.",
    "modal.convertTitle": "استوديو التحويل المباشر (FFmpeg)",
    "modal.convertDesc": "تحويل الصيغ داخل المتصفح مباشرة عبر WebAssembly بدون رفع ملفاتك لأي سيرفر.",
    "modal.targetFormat": "الصيغة المطلوبة",
    "modal.audioBitrate": "معدل بت الصوت",
    "modal.startTrim": "بداية القص (ثانية)",
    "modal.endTrim": "نهاية القص (ثانية)",
    "modal.startConvert": "بدء التحويل",
    "modal.qrTitle": "المسح بالهاتف الذكي",
    "modal.qrDesc": "وجّه كاميرا هاتفك نحو رمز QR للتنزيل المباشر على ذاكرة الجهاز.",
    "toast.linkDetected": "تم رصد الرابط — جاري الاستخراج...",
    "toast.linkPasted": "تم لصق الرابط — معالجة الميديا...",
    "toast.clipboardPasted": "تم اللصق من الحافظة...",
    "toast.previewLoaded": "تم تجهيز المعاينة! جاهز للتحميل.",
    "toast.copied": "تم نسخ رابط الفيديو المباشر إلى الحافظة!",
    "toast.downloading": "جاري تنزيل ملف الصوت MP3...",
    "toast.downloadTriggered": "بدأ التنزيل بنجاح!",
    "toast.historyCleared": "تم مسح سجل التنزيلات."
  },
  ru: {
    "nav.fastCdn": "Быстрый CDN",
    "nav.blog": "Блог и инструкции",
    "hero.badge": "Альтернатива SaveFrom.net",
    "hero.badgeFree": "Без рекламы и 100% бесплатно",
    "hero.title": "Универсальный загрузчик видео и конвертер YouTube в MP3",
    "hero.desc": "Скачивайте Instagram Reels, TikTok без водяных знаков и YouTube видео до 1080p MP4. Встроена <strong class=\"text-foreground\">конвертация в 320kbps MP3</strong> и клиентский FFmpeg прямо в браузере.",
    "input.placeholder": "Вставьте ссылку на Instagram, TikTok, YouTube или видео...",
    "input.paste": "Вставить",
    "input.download": "Скачать",
    "sample.label": "Пример:",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (Без водяного знака)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "Прямой MP4",
    "loading.status": "Извлечение видеопотока...",
    "loading.resolving": "Обработка",
    "loading.buffering": "Загрузка превью...",
    "error.title": "Не удалось извлечь видео",
    "result.formats": "Форматы:",
    "result.downloadMp4": "Скачать MP4",
    "result.convertFfmpeg": "Конвертировать / 320k MP3 (FFmpeg)",
    "result.audio": "Аудио",
    "result.copy": "Копировать",
    "result.tab": "Вкладка",
    "result.qr": "QR",
    "history.title": "История загрузок",
    "history.clear": "Очистить",
    "features.f1Title": "Без водяных знаков",
    "features.f1Desc": "Чистые видеопотоки без логотипов платформ и надписей.",
    "features.f2Title": "Быстрые резолверы",
    "features.f2Desc": "Прямой стриминг через CORS-эндпоинты для YouTube и TikTok.",
    "features.f3Title": "QR-код для смартфона",
    "features.f3Desc": "Отсканируйте камерой телефона для прямой загрузки в память устройства.",
    "howto.title": "Как скачать Reels и видео за 3 простых шага",
    "howto.subtitle": "Сохраняйте рилс, шортс и видеоролики прямо на ваш ПК, Mac, iPhone или Android.",
    "howto.s1Title": "Скопируйте ссылку",
    "howto.s1Desc": "Откройте Instagram, TikTok или YouTube. Нажмите кнопку «Поделиться» и скопируйте ссылку.",
    "howto.s2Title": "Вставьте URL выше",
    "howto.s2Desc": "Вставьте ссылку в строку ввода вверху страницы и нажмите кнопку «Скачать».",
    "howto.s3Title": "Сохраните чистый MP4",
    "howto.s3Desc": "Выберите нужное качество (1080p HD, 720p или MP3) и скачивайте без водяных знаков.",
    "matrix.title": "Поддерживаемые платформы и качество",
    "matrix.subtitle": "Универсальное извлечение видео с удалением водяных знаков и выделением аудио.",
    "matrix.thPlatform": "Платформа",
    "matrix.thQuality": "Макс. качество",
    "matrix.thWatermark": "Водяной знак",
    "matrix.thAudio": "Аудио (MP3)",
    "matrix.thSpeed": "Скорость",
    "matrix.removed": "Удален",
    "matrix.noWatermark": "Без знака",
    "matrix.none": "Нет",
    "matrix.original": "Оригинал",
    "matrix.supported": "Поддерживается",
    "matrix.instant": "Мгновенно",
    "matrix.directStream": "Прямой поток",
    "matrix.maximum": "Максимум",
    "guides.title": "Технические руководства и статьи",
    "guides.subtitle": "Узнайте, как извлекать, кодировать и скачивать видео программно.",
    "guides.allArticles": "Все 7 статей",
    "faq.title": "Часто задаваемые вопросы",
    "faq.subtitle": "Все, что нужно знать о скачивании видео и Reels онлайн.",
    "faq.q1": "Это работающая замена SaveFrom.net?",
    "faq.a1": "Да! После блокировок и закрытия SaveFrom.net проект Download Reels создан как чистая альтернатива с открытым исходным кодом, без рекламы и вирусов.",
    "faq.q2": "Можно ли конвертировать YouTube в MP3 320 кбит/с?",
    "faq.a2": "Да! Вставьте ссылку на YouTube и выберите «MP3 Audio (320 kbps)» или используйте встроенную конвертацию FFmpeg в браузере.",
    "faq.q3": "Как работает конвертация FFmpeg в браузере?",
    "faq.a3": "FFmpeg скомпилирован в WebAssembly и работает на процессоре вашего устройства, не отправляя файлы на сторонние серверы.",
    "faq.q4": "Как скачать Instagram Reels без водяного знака?",
    "faq.a4": "Скопируйте ссылку на Reel, вставьте ее в поле выше и нажмите Скачать. Вы получите оригинальный MP4 файл в максимальном качестве.",
    "faq.q5": "Можно ли скачать TikTok без водяного знака?",
    "faq.a5": "Да! Мы подключаемся напрямую к потокам TikWM CDN и отдаем чистый 1080p/720p MP4 без логотипа TikTok.",
    "faq.q6": "Как сохранить YouTube Shorts в 1080p?",
    "faq.a6": "Вставьте ссылку на любой YouTube Shorts в поле поиска, и наш сервис мгновенно выдаст доступные варианты видео и аудио.",
    "faq.q7": "Сервис Download Reels бесплатный и безопасный?",
    "faq.a7": "100% бесплатно и безопасно. Без регистрации, без установки программ и без следящих cookies.",
    "faq.q8": "Как скачивать на iPhone или Android?",
    "faq.a8": "Откройте download-reels.github.io в Safari или Chrome на смартфоне, либо сгенерируйте QR-код на ПК и отсканируйте камерой телефона.",
    "footer.desc": "Бесплатный универсальный загрузчик видео для Instagram Reels, TikTok, YouTube Shorts и X.",
    "footer.platforms": "Платформы",
    "footer.guides": "Руководства",
    "footer.resources": "Ресурсы и SEO",
    "footer.copyright": "© 2026 Download Reels. Open-source под лицензией MIT. Хостинг на GitHub Pages.",
    "modal.convertTitle": "Браузерная студия конвертации (FFmpeg)",
    "modal.convertDesc": "Транскодирование прямо в браузере через WebAssembly без загрузки файлов на сервер.",
    "modal.targetFormat": "Целевой формат",
    "modal.audioBitrate": "Битрейт аудио",
    "modal.startTrim": "Начало обрезки (сек)",
    "modal.endTrim": "Конец обрезки (сек)",
    "modal.startConvert": "Начать конвертацию",
    "modal.qrTitle": "Сканировать смартфоном",
    "modal.qrDesc": "Наведите камеру смартфона на QR-код для мгновенной загрузки в память телефона.",
    "toast.linkDetected": "Ссылка обнаружена — обработка потока...",
    "toast.linkPasted": "Ссылка вставлена — извлечение видео...",
    "toast.clipboardPasted": "Вставлено из буфера обмена...",
    "toast.previewLoaded": "Превью готово! Можно скачивать.",
    "toast.copied": "Прямая ссылка на видео скопирована!",
    "toast.downloading": "Скачивание аудио MP3...",
    "toast.downloadTriggered": "Загрузка успешно запущена!",
    "toast.historyCleared": "История загрузок очищена."
  },
  fr: {
    "nav.fastCdn": "CDN Rapide",
    "nav.blog": "Blog & Guides",
    "hero.badge": "Alternative à SaveFrom.net",
    "hero.badgeFree": "Sans pub et 100% gratuit",
    "hero.title": "Téléchargeur Universel de Vidéos & YouTube en MP3",
    "hero.desc": "Téléchargez Instagram Reels, TikTok sans filigrane et YouTube jusqu'en 1080p MP4. Intègre la <strong class=\"text-foreground\">conversion MP3 320kbps</strong> et FFmpeg directement dans le navigateur.",
    "input.placeholder": "Collez l'URL Instagram, TikTok, YouTube ou vidéo...",
    "input.paste": "Coller",
    "input.download": "Télécharger",
    "sample.label": "Exemple :",
    "sample.youtube": "YouTube",
    "sample.tiktok": "TikTok (Sans filigrane)",
    "sample.reel": "Instagram Reel",
    "sample.mp4": "MP4 Direct",
    "loading.status": "Extraction des flux vidéo...",
    "loading.resolving": "Traitement",
    "loading.buffering": "Chargement de l'aperçu...",
    "error.title": "Impossible d'extraire la vidéo",
    "result.formats": "Formats :",
    "result.downloadMp4": "Télécharger MP4",
    "result.convertFfmpeg": "Convertir le format / MP3 320k (FFmpeg)",
    "result.audio": "Audio",
    "result.copy": "Copier",
    "result.tab": "Onglet",
    "result.qr": "QR",
    "history.title": "Téléchargements récents",
    "history.clear": "Effacer",
    "features.f1Title": "Sans filigrane",
    "features.f1Desc": "Flux vidéo propres et originaux sans logo de plateforme ni filigrane.",
    "features.f2Title": "Résolveurs rapides",
    "features.f2Desc": "Diffusion directe via des points de terminaison CORS pour YouTube et TikTok.",
    "features.f3Title": "Transfert QR mobile",
    "features.f3Desc": "Scannez avec l'appareil photo de votre smartphone pour enregistrer directement sur votre téléphone.",
    "howto.title": "Comment télécharger des Reels et vidéos en 3 étapes simples",
    "howto.subtitle": "Enregistrez des reels, shorts et vidéos publiques directement sur PC, Mac, iPhone ou Android.",
    "howto.s1Title": "Copier le lien vidéo",
    "howto.s1Desc": "Ouvrez Instagram, TikTok ou YouTube. Cliquez sur « Partager » et copiez le lien.",
    "howto.s2Title": "Coller l'URL ci-dessus",
    "howto.s2Desc": "Collez le lien dans la barre de recherche en haut de la page et cliquez sur Télécharger.",
    "howto.s3Title": "Enregistrer le MP4 propre",
    "howto.s3Desc": "Choisissez la qualité souhaitée (1080p HD, 720p ou MP3) et téléchargez sans filigrane.",
    "matrix.title": "Plateformes prises en charge et matrice de qualité",
    "matrix.subtitle": "Résolution multimédia universelle avec suppression du filigrane et séparation audio.",
    "matrix.thPlatform": "Plateforme",
    "matrix.thQuality": "Qualité max",
    "matrix.thWatermark": "Filigrane",
    "matrix.thAudio": "Audio (MP3)",
    "matrix.thSpeed": "Vitesse",
    "matrix.removed": "Supprimé",
    "matrix.noWatermark": "Sans filigrane",
    "matrix.none": "Aucun",
    "matrix.original": "Original",
    "matrix.supported": "Pris en charge",
    "matrix.instant": "Instantané",
    "matrix.directStream": "Flux direct",
    "matrix.maximum": "Maximum",
    "guides.title": "Guides d'ingénierie et blogs techniques",
    "guides.subtitle": "Apprenez à extraire, encoder et télécharger des flux vidéo par programmation.",
    "guides.allArticles": "Tous les 7 articles",
    "faq.title": "Foire Aux Questions",
    "faq.subtitle": "Tout ce que vous devez savoir sur le téléchargement de vidéos et de reels en ligne.",
    "faq.q1": "Est-ce une alternative fonctionnelle à SaveFrom.net ?",
    "faq.a1": "Oui ! Face aux fermetures et aux publicités envahissantes de SaveFrom.net, Download Reels a été créé comme une alternative open-source propre, sans pub et ultra rapide.",
    "faq.q2": "Puis-je convertir des vidéos YouTube en MP3 320kbps ?",
    "faq.a2": "Oui. Collez n'importe quel lien YouTube et choisissez « MP3 Audio (320 kbps) » ou utilisez le convertisseur FFmpeg WebAssembly dans votre navigateur.",
    "faq.q3": "Comment fonctionne la conversion FFmpeg côté client ?",
    "faq.a3": "FFmpeg s'exécute directement dans votre navigateur via WebAssembly sans envoyer vos fichiers vers un serveur distant, garantissant une confidentialité totale.",
    "faq.q4": "Comment télécharger des Instagram Reels sans filigrane ?",
    "faq.a4": "Copiez le lien du Reel depuis Instagram, collez-le ci-dessus et cliquez sur Télécharger pour recevoir le fichier MP4 haute résolution.",
    "faq.q5": "Peut-on télécharger des vidéos TikTok sans logo ?",
    "faq.a5": "Oui ! Nous nous connectons directement aux flux CDN via TikWM pour extraire la vidéo HD 1080p/720p sans le logo flottant TikTok.",
    "faq.q6": "Comment enregistrer des YouTube Shorts en 1080p ?",
    "faq.a6": "Collez le lien YouTube Shorts dans la barre de recherche pour obtenir immédiatement les liens de téléchargement MP4 et audio.",
    "faq.q7": "Download Reels est-il gratuit et sûr ?",
    "faq.a7": "100% gratuit et open-source. Aucun logiciel à installer, aucune inscription requise et aucun cookie de suivi.",
    "faq.q8": "Comment télécharger sur iPhone ou Android ?",
    "faq.a8": "Ouvrez download-reels.github.io dans le navigateur de votre mobile ou générez un code QR sur votre ordinateur et scannez-le avec votre appareil photo.",
    "footer.desc": "Téléchargeur universel de vidéos pour Instagram Reels, TikTok, YouTube Shorts et X.",
    "footer.platforms": "Plateformes",
    "footer.guides": "Guides techniques",
    "footer.resources": "Ressources & SEO",
    "footer.copyright": "© 2026 Download Reels. Open-source sous licence MIT. Hébergé sur GitHub Pages.",
    "modal.convertTitle": "Studio de conversion client (FFmpeg)",
    "modal.convertDesc": "Transcodez vos fichiers directement dans votre navigateur via WebAssembly. Zéro upload vers un serveur.",
    "modal.targetFormat": "Format cible",
    "modal.audioBitrate": "Débit audio",
    "modal.startTrim": "Début découpe (sec)",
    "modal.endTrim": "Fin découpe (sec)",
    "modal.startConvert": "Démarrer la conversion",
    "modal.qrTitle": "Scanner avec un smartphone",
    "modal.qrDesc": "Ouvrez l'appareil photo de votre smartphone et visez le QR code pour télécharger directement.",
    "toast.linkDetected": "Lien détecté — résolution du flux...",
    "toast.linkPasted": "Lien collé — extraction du média...",
    "toast.clipboardPasted": "Collé depuis le presse-papier...",
    "toast.previewLoaded": "Aperçu chargé ! Prêt à télécharger.",
    "toast.copied": "URL directe copiée dans le presse-papier !",
    "toast.downloading": "Téléchargement du fichier MP3...",
    "toast.downloadTriggered": "Téléchargement lancé avec succès !",
    "toast.historyCleared": "Historique des téléchargements effacé."
  }
};

class I18nEngine {
  constructor() {
    this.currentLang = "en";
    this.languages = DR_LANGUAGES;
    this.translations = DR_TRANSLATIONS;
  }

  init() {
    const lang = this.detectLanguage();
    this.setLanguage(lang, false);
    this.setupDropdown();
  }

  detectLanguage() {
    // 1. URL search parameter: ?lang=es
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get("lang");
      if (urlLang && this.languages[urlLang.toLowerCase()]) {
        return urlLang.toLowerCase();
      }
    } catch (_) {}

    // 2. Local storage
    try {
      const stored = localStorage.getItem("dr_lang");
      if (stored && this.languages[stored]) {
        return stored;
      }
    } catch (_) {}

    // 3. Cookie
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)dr_lang=([^;]+)/);
      if (cookieMatch && this.languages[cookieMatch[1]]) {
        return cookieMatch[1];
      }
    } catch (_) {}

    // 4. Browser navigator language (e.g. "es-ES" -> "es", "pt-BR" -> "pt", "ar-SA" -> "ar")
    try {
      const browserLocales = navigator.languages && navigator.languages.length 
        ? navigator.languages 
        : [navigator.language || navigator.userLanguage || "en"];

      for (const loc of browserLocales) {
        if (!loc) continue;
        const code = loc.toLowerCase().split("-")[0];
        if (this.languages[code]) {
          return code;
        }
      }
    } catch (_) {}

    return "en";
  }

  t(key, fallback = "") {
    const dict = this.translations[this.currentLang] || this.translations["en"];
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const enDict = this.translations["en"];
    if (enDict && enDict[key] !== undefined) {
      return enDict[key];
    }
    return fallback || key;
  }

  setLanguage(langCode, save = true) {
    if (!this.languages[langCode]) langCode = "en";
    this.currentLang = langCode;

    const langMeta = this.languages[langCode];

    // Set document lang & text direction
    document.documentElement.lang = langCode;
    document.documentElement.setAttribute("dir", langMeta.dir || "ltr");

    // Apply translations across DOM
    this.applyTranslations();

    // Synchronize canonical URL & meta tags for multilingual SEO indexing on homepage
    try {
      const path = window.location.pathname || "/";
      if (path === "/" || path.endsWith("/index.html")) {
        const canonicalHref = langCode === "en"
          ? "https://download-reels.github.io/"
          : `https://download-reels.github.io/?lang=${langCode}`;
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        if (canonicalEl) canonicalEl.setAttribute("href", canonicalHref);

        const ogUrlEl = document.querySelector('meta[property="og:url"]');
        if (ogUrlEl) ogUrlEl.setAttribute("content", canonicalHref);

        if (langCode !== "en") {
          const localTitle = `${this.t("hero.title")} — ${this.t("hero.badge")} | Download Reels`;
          const localDesc = this.t("hero.desc").replace(/<[^>]*>/g, "");
          document.title = localTitle;
          const descEl = document.querySelector('meta[name="description"]');
          if (descEl) descEl.setAttribute("content", localDesc);
          const ogTitleEl = document.querySelector('meta[property="og:title"]');
          if (ogTitleEl) ogTitleEl.setAttribute("content", localTitle);
          const ogDescEl = document.querySelector('meta[property="og:description"]');
          if (ogDescEl) ogDescEl.setAttribute("content", localDesc);
        }
      }
    } catch (_) {}

    // Update Language Dropdown button label & active item
    this.updateDropdownUI(langCode);

    if (save) {
      try {
        localStorage.setItem("dr_lang", langCode);
        document.cookie = `dr_lang=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
        
        // Update URL query parameter without reloading
        const url = new URL(window.location.href);
        if (langCode === "en") {
          url.searchParams.delete("lang");
        } else {
          url.searchParams.set("lang", langCode);
        }
        window.history.replaceState({}, "", url.toString());
      } catch (_) {}
    }

    // Dispatch event so other components (like toasts/format buttons) can react
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("dr_language_changed", { detail: { lang: langCode } }));
    }
  }

  applyTranslations() {
    // 1. Text elements: data-i18n
    const textEls = document.querySelectorAll("[data-i18n]");
    textEls.forEach(el => {
      const key = el.getAttribute("data-i18n");
      const translation = this.t(key);
      if (translation) {
        // If translation contains HTML tags (like <strong>), use innerHTML
        if (translation.includes("<") && translation.includes(">")) {
          el.innerHTML = translation;
        } else {
          el.textContent = translation;
        }
      }
    });

    // 2. Input placeholders: data-i18n-placeholder
    const placeholderEls = document.querySelectorAll("[data-i18n-placeholder]");
    placeholderEls.forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translation = this.t(key);
      if (translation) {
        el.setAttribute("placeholder", translation);
      }
    });

    // 3. Titles / tooltips: data-i18n-title
    const titleEls = document.querySelectorAll("[data-i18n-title]");
    titleEls.forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      const translation = this.t(key);
      if (translation) {
        el.setAttribute("title", translation);
      }
    });
  }

  setupDropdown() {
    const dropdownBtn = document.getElementById("langDropdownBtn");
    const dropdownMenu = document.getElementById("langDropdownMenu");
    if (!dropdownBtn || !dropdownMenu) return;

    // Populate dropdown items
    dropdownMenu.innerHTML = "";
    Object.entries(this.languages).forEach(([code, info]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition hover:bg-accent cursor-pointer ${
        code === this.currentLang ? "font-semibold text-primary bg-accent/40" : "text-foreground"
      }`;
      item.innerHTML = `
        <span class="flex items-center gap-2">
          <span>${info.flag}</span>
          <span>${info.name}</span>
        </span>
        <span class="font-mono text-[10px] text-muted-foreground uppercase">${code}</span>
      `;
      item.addEventListener("click", () => {
        this.setLanguage(code, true);
        dropdownMenu.classList.add("hidden");
        dropdownBtn.setAttribute("aria-expanded", "false");
      });
      dropdownMenu.appendChild(item);
    });

    // Toggle menu
    dropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = dropdownBtn.getAttribute("aria-expanded") === "true";
      dropdownBtn.setAttribute("aria-expanded", String(!isExpanded));
      dropdownMenu.classList.toggle("hidden", isExpanded);
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
        dropdownBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  updateDropdownUI(langCode) {
    const currentLangLabel = document.getElementById("currentLangLabel");
    const currentLangFlag = document.getElementById("currentLangFlag");
    const meta = this.languages[langCode] || this.languages["en"];

    if (currentLangLabel) {
      currentLangLabel.textContent = langCode.toUpperCase();
    }
    if (currentLangFlag) {
      currentLangFlag.textContent = meta.flag;
    }

    // Highlight active in menu
    const menu = document.getElementById("langDropdownMenu");
    if (menu) {
      const items = menu.querySelectorAll("button");
      items.forEach(btn => {
        const codeSpan = btn.querySelector("span.font-mono");
        if (codeSpan && codeSpan.textContent.toLowerCase() === langCode) {
          btn.className = "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition bg-accent/40 text-primary font-semibold cursor-pointer";
        } else {
          btn.className = "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition hover:bg-accent text-foreground cursor-pointer";
        }
      });
    }
  }
}

// Global instance
window.i18n = new I18nEngine();
document.addEventListener("DOMContentLoaded", () => {
  window.i18n.init();
});

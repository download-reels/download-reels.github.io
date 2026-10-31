/**
 * Clipper - Main Application Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const urlInput = document.getElementById("urlInput");
  const clearBtn = document.getElementById("clearBtn");
  const pasteBtn = document.getElementById("pasteBtn");
  const fetchBtn = document.getElementById("fetchBtn");
  const platformIcon = document.getElementById("platformIcon");
  const platformNameTag = document.getElementById("platformNameTag");

  // State & Loading
  const loadingState = document.getElementById("loadingState");
  const loadingStatusText = document.getElementById("loadingStatusText");
  const progressBar = document.getElementById("progressBar");
  const errorBanner = document.getElementById("errorBanner");
  const errorMessage = document.getElementById("errorMessage");

  // Result Card Elements
  const resultCard = document.getElementById("resultCard");
  const videoPlayer = document.getElementById("videoPlayer");
  const videoThumbnail = document.getElementById("videoThumbnail");
  const resultTitle = document.getElementById("resultTitle");
  const resultAuthor = document.getElementById("resultAuthor");
  const resultPlatformBadge = document.getElementById("resultPlatformBadge");
  const formatSelector = document.getElementById("formatSelector");
  const primaryDownloadBtn = document.getElementById("primaryDownloadBtn");
  const audioDownloadBtn = document.getElementById("audioDownloadBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const openTabBtn = document.getElementById("openTabBtn");
  const qrCodeBtn = document.getElementById("qrCodeBtn");

  // History Elements
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  // Modals
  const settingsModal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const apiEndpointInput = document.getElementById("apiEndpointInput");
  const testApiBtn = document.getElementById("testApiBtn");
  const apiStatusIndicator = document.getElementById("apiStatusIndicator");
  const autoDownloadToggle = document.getElementById("autoDownloadToggle");

  const qrModal = document.getElementById("qrModal");
  const closeQrBtn = document.getElementById("closeQrBtn");
  const qrcodeContainer = document.getElementById("qrcode");
  const qrTargetUrl = document.getElementById("qrTargetUrl");

  const platformsModal = document.getElementById("platformsModal");
  const openPlatformsBtn = document.getElementById("openPlatformsBtn");
  const closePlatformsBtn = document.getElementById("closePlatformsBtn");

  // Conversion Studio Elements
  const convertModal = document.getElementById("convertModal");
  const openConvertModalBtn = document.getElementById("openConvertModalBtn");
  const closeConvertBtn = document.getElementById("closeConvertBtn");
  const startConvertBtn = document.getElementById("startConvertBtn");
  const convertFormatSelect = document.getElementById("convertFormatSelect");
  const convertBitrateGroup = document.getElementById("convertBitrateGroup");
  const convertBitrateSelect = document.getElementById("convertBitrateSelect");
  const convertStartTime = document.getElementById("convertStartTime");
  const convertEndTime = document.getElementById("convertEndTime");
  const convertProgressGroup = document.getElementById("convertProgressGroup");
  const convertStatusText = document.getElementById("convertStatusText");
  const convertPercentText = document.getElementById("convertPercentText");
  const convertProgressBar = document.getElementById("convertProgressBar");

  // Active state
  let currentMedia = null;
  let selectedFormat = null;
  let qrcodeInstance = null;
  let isResolving = false;
  let lastResolvedUrl = "";
  let autoResolveTimeout = null;

  // Initialize
  initSettings();
  renderHistory();
  setupSamplePills();
  initModeSwitcher();
  initBulkDownloader();
  initReelClipper();
  
  // Auto-focus input on page load
  setTimeout(() => {
    if (urlInput) urlInput.focus();
  }, 100);

  // -------------------------------------------------------------
  // Input & Auto-Resolve Events (Zero Extra Clicks)
  // -------------------------------------------------------------

  function handleInputChange() {
    const val = urlInput.value.trim();
    
    // Toggle clear button
    clearBtn.classList.toggle("hidden", val.length === 0);

    if (!val) {
      resetPlatformBadge();
      return;
    }

    const platform = detectPlatform(val);
    if (platform) {
      platformIcon.innerHTML = platform.icon;
      platformNameTag.textContent = platform.name;
      platformNameTag.classList.remove("hidden");
    } else {
      resetPlatformBadge();
    }

    // Auto-resolve if a full URL was pasted/typed
    if (isValidVideoUrl(val) && val !== lastResolvedUrl && !isResolving) {
      clearTimeout(autoResolveTimeout);
      autoResolveTimeout = setTimeout(() => {
        startResolve();
      }, 350);
    }
  }

  function isValidVideoUrl(text) {
    if (!text || typeof text !== "string") return false;
    const trimmed = text.trim();
    return /^https?:\/\/.+/i.test(trimmed) && trimmed.length > 12;
  }

  function resetPlatformBadge() {
    platformIcon.innerHTML = `<svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
    </svg>`;
    platformNameTag.textContent = "";
    platformNameTag.classList.add("hidden");
  }

  urlInput.addEventListener("input", handleInputChange);
  
  // Instant Auto-Resolve on input paste
  urlInput.addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    if (text && isValidVideoUrl(text.trim())) {
      e.preventDefault();
      urlInput.value = text.trim();
      handleInputChange();
      showToast(window.i18n ? window.i18n.t("toast.linkDetected") : "Link detected — resolving stream...", "info");
      startResolve();
    }
  });

  // Global window paste listener (paste anywhere on screen to auto-resolve)
  window.addEventListener("paste", (e) => {
    if (document.activeElement && document.activeElement.tagName === "INPUT" && document.activeElement !== urlInput) {
      return; // User is typing inside settings modal
    }
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    if (text && isValidVideoUrl(text.trim())) {
      urlInput.value = text.trim();
      urlInput.focus();
      handleInputChange();
      showToast(window.i18n ? window.i18n.t("toast.linkPasted") : "Link pasted — extracting media...", "info");
      startResolve();
    }
  });
  
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startResolve();
    }
  });

  // Global Escape key shortcut
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!settingsModal.classList.contains("hidden")) {
        settingsModal.classList.add("hidden");
      } else if (convertModal && !convertModal.classList.contains("hidden")) {
        convertModal.classList.add("hidden");
      } else if (!qrModal.classList.contains("hidden")) {
        qrModal.classList.add("hidden");
      } else if (!platformsModal.classList.contains("hidden")) {
        platformsModal.classList.add("hidden");
      } else if (urlInput.value) {
        urlInput.value = "";
        handleInputChange();
        resultCard.classList.add("hidden");
        loadingState.classList.add("hidden");
        hideError();
        urlInput.focus();
      }
    }
  });

  clearBtn.addEventListener("click", () => {
    urlInput.value = "";
    handleInputChange();
    urlInput.focus();
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        handleInputChange();
        showToast(window.i18n ? window.i18n.t("toast.clipboardPasted") : "Pasted from clipboard — resolving...", "info");
        startResolve();
      }
    } catch (err) {
      urlInput.focus();
      showToast("Please allow clipboard permission or paste manually.", "error");
    }
  });

  fetchBtn.addEventListener("click", startResolve);

  // -------------------------------------------------------------
  // Resolving & Downloading Pipeline
  // -------------------------------------------------------------

  async function startResolve() {
    const url = urlInput.value.trim();
    if (!url) {
      showError("Please paste a valid video or reel URL first.");
      urlInput.focus();
      return;
    }

    if (isResolving) return;

    isResolving = true;
    lastResolvedUrl = url;
    hideError();
    resultCard.classList.add("hidden");
    loadingState.classList.remove("hidden");
    fetchBtn.disabled = true;
    progressBar.style.width = "35%";

    try {
      const media = await window.downloaderEngine.resolve(url, (status) => {
        loadingStatusText.textContent = status.message;
        if (status.stage === "resolving") progressBar.style.width = "65%";
        if (status.stage === "connecting") progressBar.style.width = "85%";
      });

      progressBar.style.width = "100%";
      setTimeout(() => {
        loadingState.classList.add("hidden");
        fetchBtn.disabled = false;
        isResolving = false;
        displayResult(media, url);
      }, 300);

    } catch (err) {
      loadingState.classList.add("hidden");
      fetchBtn.disabled = false;
      isResolving = false;
      showError(err.message || "Failed to extract video. Make sure the link is public.");
      showToast(err.message || "Extraction failed. Check link or settings.", "error");
    }
  }

  function displayResult(media, originalUrl) {
    currentMedia = media;
    selectedFormat = media.formats && media.formats.length > 0 ? media.formats[0] : null;

    // Set Title & Author
    resultTitle.textContent = media.title || "Video Stream";
    resultAuthor.textContent = media.author ? `By ${media.author}` : (media.authorHandle || "Public Media");

    // Platform Badge
    const platform = detectPlatform(originalUrl) || { name: media.platform || "Video", color: "#a1a1aa" };
    resultPlatformBadge.textContent = platform.name;

    // Instant Preview Frame Loading
    if (media.videoUrl) {
      videoPlayer.preload = "metadata";
      videoPlayer.poster = media.thumbnailUrl || "";
      videoPlayer.src = media.videoUrl;
      videoPlayer.load(); // Forces immediate preview frame load
      videoPlayer.classList.remove("hidden");
      videoThumbnail.classList.add("hidden");
    } else if (media.thumbnailUrl) {
      videoThumbnail.src = media.thumbnailUrl;
      videoThumbnail.onerror = function() {
        if (media.id) this.src = `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`;
      };
      videoThumbnail.classList.remove("hidden");
      videoPlayer.classList.add("hidden");
    }

    // Populate format buttons with rich badges & quality choices
    formatSelector.innerHTML = "";
    if (media.formats && media.formats.length > 0) {
      media.formats.forEach((fmt, index) => {
        const btn = document.createElement("button");
        const isAudio = fmt.quality === "audio" || fmt.ext === "mp3" || Boolean(fmt.isAudio);
        const isSelected = index === 0;

        btn.className = `group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-all cursor-pointer ${
          isSelected
            ? "border-primary bg-primary text-primary-foreground shadow-sm"
            : "border-border bg-secondary text-foreground hover:bg-accent"
        }`;

        // Format label & size tag
        const label = fmt.label || `${fmt.quality || "Standard"} (${fmt.ext ? fmt.ext.toUpperCase() : "MP4"})`;
        const sizeTag = fmt.size ? `<span class="opacity-70 font-mono text-[10px]">(${formatBytes(fmt.size)})</span>` : "";

        btn.innerHTML = `
          <span>${label}</span>
          ${sizeTag}
        `;
        
        btn.addEventListener("click", () => {
          selectedFormat = fmt;
          Array.from(formatSelector.children).forEach(b => {
            b.className = "group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-secondary text-foreground hover:bg-accent transition-all cursor-pointer";
          });
          btn.className = "group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-primary bg-primary text-primary-foreground shadow-sm transition-all cursor-pointer";
          
          // Switch video player stream immediately if video format
          if (fmt.url && !isAudio) {
            videoPlayer.src = fmt.url;
            videoPlayer.load();
            videoPlayer.classList.remove("hidden");
            videoThumbnail.classList.add("hidden");
          }

          // Update primary button text
          updateDownloadButtonLabel(fmt);
        });

        formatSelector.appendChild(btn);
      });
    }

    // Update primary download button label
    if (selectedFormat) {
      updateDownloadButtonLabel(selectedFormat);
    }

    // Audio download button visibility
    const hasAudio = media.audioUrl || (media.formats && media.formats.some(f => f.quality === "audio" || f.ext === "mp3" || f.isAudio));
    audioDownloadBtn.classList.toggle("hidden", !hasAudio);

    // Show result card with smooth entrance
    resultCard.classList.remove("hidden");
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

    showToast(window.i18n ? window.i18n.t("toast.previewLoaded") : "Preview loaded! Ready to download.", "success");

    // Save to history
    saveToHistory(media, originalUrl);

    // Auto-download check
    if (window.downloaderEngine.defaultSettings.autoDownload && selectedFormat) {
      triggerPrimaryDownload();
    }
  }

  function updateDownloadButtonLabel(fmt) {
    const isAudio = fmt.quality === "audio" || fmt.ext === "mp3" || Boolean(fmt.isAudio);
    const qualityLabel = fmt.quality && fmt.quality !== "Standard" ? fmt.quality : (fmt.ext ? fmt.ext.toUpperCase() : "MP4");
    const span = primaryDownloadBtn.querySelector("span");
    if (span) {
      if (fmt.needsConversion && isAudio) {
        span.textContent = `Convert & Download ${fmt.quality || "320kbps MP3"}`;
      } else {
        span.textContent = isAudio ? `Download ${fmt.quality || "MP3 Audio"}` : `Download ${qualityLabel}`;
      }
    }
  }

  // -------------------------------------------------------------
  // Download Handlers
  // -------------------------------------------------------------

  async function triggerPrimaryDownload() {
    if (!currentMedia || !selectedFormat) return;

    // If client-side conversion studio is required (e.g. 320kbps MP3 from YouTube audio stream)
    if (selectedFormat.needsConversion && convertModal) {
      convertModal.classList.remove("hidden");
      convertProgressGroup.classList.add("hidden");
      startConvertBtn.disabled = false;
      if (convertFormatSelect) convertFormatSelect.value = selectedFormat.ext || "mp3";
      if (convertBitrateSelect && selectedFormat.bitrate) convertBitrateSelect.value = selectedFormat.bitrate;
      showToast("Ready: Click 'Start Conversion' to encode client-side 320kbps MP3.", "info");
      return;
    }

    const cleanTitle = (currentMedia.title || "video")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 40);
    const filename = `${cleanTitle}_${selectedFormat.quality || "hd"}.${selectedFormat.ext || "mp4"}`;

    // If client-side WebAssembly remuxing is required (e.g. YouTube 1080p/720p/480p separate video + audio tracks)
    if (selectedFormat.needsMuxing && (selectedFormat.audioUrl || currentMedia.audioUrl) && window.mediaConverterEngine) {
      primaryDownloadBtn.disabled = true;
      const originalText = primaryDownloadBtn.innerHTML;
      const audioUrl = selectedFormat.audioUrl || currentMedia.audioUrl;
      const videoUrl = selectedFormat.url || currentMedia.videoUrl;

      showToast(window.i18n ? window.i18n.t("toast.downloading") : "Merging HD video & audio tracks in browser...", "info");

      try {
        const result = await window.mediaConverterEngine.mux(videoUrl, audioUrl, (p) => {
          primaryDownloadBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            ${p.message || p.percent + "%"}
          `;
        });

        window.downloaderEngine.triggerDownloadLink(result.url, filename);
        showToast("HD Video muxed & ready to enjoy!", "success");
        return;
      } catch (muxErr) {
        console.error("Client FFmpeg muxing error, attempting direct stream download:", muxErr);
        showToast("Remux failed in browser: downloading direct video stream...", "error");
      } finally {
        primaryDownloadBtn.disabled = false;
        primaryDownloadBtn.innerHTML = originalText;
      }
    }

    const downloadUrl = selectedFormat.url || currentMedia.videoUrl;

    primaryDownloadBtn.disabled = true;
    const originalText = primaryDownloadBtn.innerHTML;
    primaryDownloadBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Downloading...
    `;

    try {
      await window.downloaderEngine.downloadFile(downloadUrl, filename, (pct, statusText) => {
        primaryDownloadBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          ${pct}%
        `;
      });
      showToast("Download triggered successfully!");
    } catch (err) {
      showToast("Download error: Opening direct link in browser...");
      window.open(downloadUrl, "_blank");
    } finally {
      primaryDownloadBtn.disabled = false;
      primaryDownloadBtn.innerHTML = originalText;
    }
  }

  primaryDownloadBtn.addEventListener("click", triggerPrimaryDownload);

  audioDownloadBtn.addEventListener("click", () => {
    if (!currentMedia) return;
    const audioFmt = (currentMedia.formats || []).find(f => f.quality === "audio" || f.ext === "mp3");
    const audioUrl = currentMedia.audioUrl || (audioFmt ? audioFmt.url : null);
    
    if (audioUrl) {
      const cleanTitle = (currentMedia.title || "audio").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
      window.downloaderEngine.downloadFile(audioUrl, `${cleanTitle}.mp3`);
      showToast(window.i18n ? window.i18n.t("toast.downloading") : "Downloading audio MP3...");
    }
  });

  copyLinkBtn.addEventListener("click", async () => {
    if (!currentMedia) return;
    const url = selectedFormat?.url || currentMedia.videoUrl;
    if (url) {
      await navigator.clipboard.writeText(url);
      showToast(window.i18n ? window.i18n.t("toast.copied") : "Direct video URL copied to clipboard!");
    }
  });

  openTabBtn.addEventListener("click", () => {
    if (!currentMedia) return;
    const url = selectedFormat?.url || currentMedia.videoUrl;
    if (url) window.open(url, "_blank");
  });

  // QR Code generator for mobile downloading
  qrCodeBtn.addEventListener("click", () => {
    if (!currentMedia) return;
    const mediaUrl = selectedFormat?.url || currentMedia.videoUrl;
    if (!mediaUrl) return;

    qrcodeContainer.innerHTML = "";
    qrTargetUrl.textContent = mediaUrl;

    if (window.QRCode) {
      qrcodeInstance = new QRCode(qrcodeContainer, {
        text: mediaUrl,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    qrModal.classList.remove("hidden");
  });

  closeQrBtn.addEventListener("click", () => qrModal.classList.add("hidden"));

  // -------------------------------------------------------------
  // Client-Side Conversion Studio (FFmpeg WebAssembly)
  // -------------------------------------------------------------

  if (openConvertModalBtn) {
    openConvertModalBtn.addEventListener("click", () => {
      if (!currentMedia) return;
      convertModal.classList.remove("hidden");
      convertProgressGroup.classList.add("hidden");
      startConvertBtn.disabled = false;
    });
  }

  if (closeConvertBtn) {
    closeConvertBtn.addEventListener("click", () => {
      convertModal.classList.add("hidden");
    });
  }

  if (convertFormatSelect) {
    convertFormatSelect.addEventListener("change", () => {
      convertBitrateGroup.classList.toggle("hidden", convertFormatSelect.value !== "mp3");
    });
  }

  if (startConvertBtn) {
    startConvertBtn.addEventListener("click", async () => {
      if (!currentMedia) return;
      const mediaUrl = selectedFormat?.url || currentMedia.videoUrl;
      if (!mediaUrl) {
        showToast("No active media stream found to convert.", "error");
        return;
      }

      const format = convertFormatSelect.value;
      const bitrate = convertBitrateSelect.value;
      const startTime = convertStartTime.value ? `${convertStartTime.value}` : null;
      const endTime = convertEndTime.value ? `${convertEndTime.value}` : null;

      convertProgressGroup.classList.remove("hidden");
      startConvertBtn.disabled = true;

      try {
        const result = await window.mediaConverterEngine.convert(mediaUrl, {
          format,
          bitrate,
          startTime,
          endTime
        }, (p) => {
          convertStatusText.textContent = p.message;
          convertPercentText.textContent = `${p.percent}%`;
          convertProgressBar.style.width = `${p.percent}%`;
        });

        const cleanTitle = (currentMedia.title || "media").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
        const filename = `${cleanTitle}_converted_${bitrate}.${format}`;

        window.downloaderEngine.triggerDownloadLink(result.url, filename);
        showToast(`Conversion complete! Saved as ${format.toUpperCase()} (${bitrate}).`, "success");
        convertModal.classList.add("hidden");

      } catch (err) {
        console.error(err);
        showToast("Conversion error: " + (err.message || "Failed in-browser transcode"), "error");
      } finally {
        startConvertBtn.disabled = false;
      }
    });
  }

  // -------------------------------------------------------------
  // History Management
  // -------------------------------------------------------------

  function saveToHistory(media, originalUrl) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("clipper_history") || "[]");
    } catch (_) {}

    // Deduplicate
    history = history.filter(item => item.url !== originalUrl);

    // Prepend new item
    history.unshift({
      title: media.title || "Video Clip",
      author: media.author || "Creator",
      url: originalUrl,
      downloadUrl: media.videoUrl,
      thumbnail: media.thumbnailUrl,
      platform: media.platform || "video",
      timestamp: Date.now()
    });

    // Keep max 12 items
    history = history.slice(0, 12);
    localStorage.setItem("clipper_history", JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("clipper_history") || "[]");
    } catch (_) {}

    if (history.length === 0) {
      historySection.classList.add("hidden");
      return;
    }

    historySection.classList.remove("hidden");
    historyList.innerHTML = "";

    history.forEach(item => {
      const card = document.createElement("div");
      card.className = "flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-accent/50 transition group";
      
      const thumb = item.thumbnail
        ? `<img src="${item.thumbnail}" class="w-10 h-10 rounded object-cover bg-black flex-shrink-0" onerror="this.style.display='none'">`
        : `<div class="w-10 h-10 rounded border border-border bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
          </div>`;

      card.innerHTML = `
        ${thumb}
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-foreground truncate">${item.title}</p>
          <p class="text-[11px] text-muted-foreground truncate font-mono">${item.author} • ${timeAgo(item.timestamp)}</p>
        </div>
        <button class="h-7 w-7 rounded border border-border bg-secondary hover:bg-accent text-foreground flex items-center justify-center transition flex-shrink-0" title="Re-download">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        urlInput.value = item.url;
        handleInputChange();
        startResolve();
      });

      historyList.appendChild(card);
    });
  }

  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("clipper_history");
    renderHistory();
    showToast(window.i18n ? window.i18n.t("toast.historyCleared") : "Download history cleared.");
  });

  // Re-sync UI labels when language changes dynamically
  window.addEventListener("dr_language_changed", () => {
    if (selectedFormat) {
      updateDownloadButtonLabel(selectedFormat);
    }
  });

  // -------------------------------------------------------------
  // Settings & Configuration
  // -------------------------------------------------------------

  function initSettings() {
    apiEndpointInput.value = localStorage.getItem("clipper_api_url") || "https://clipper-resolver.download-reels.workers.dev";
    autoDownloadToggle.checked = localStorage.getItem("clipper_auto_download") === "true";
  }

  const useDefaultWorkerBtn = document.getElementById("useDefaultWorkerBtn");
  if (useDefaultWorkerBtn) {
    useDefaultWorkerBtn.addEventListener("click", () => {
      apiEndpointInput.value = "https://clipper-resolver.download-reels.workers.dev";
      showToast("Default Cloudflare Worker endpoint filled!");
    });
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      initSettings();
      settingsModal.classList.remove("hidden");
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      const customUrl = apiEndpointInput.value.trim();
      localStorage.setItem("clipper_api_url", customUrl);
      localStorage.setItem("clipper_auto_download", autoDownloadToggle.checked ? "true" : "false");

      window.downloaderEngine.defaultSettings.apiUrl = customUrl;
      window.downloaderEngine.defaultSettings.autoDownload = autoDownloadToggle.checked;

      settingsModal.classList.add("hidden");
      showToast("Settings saved successfully!");
    });
  }

  if (testApiBtn) {
    testApiBtn.addEventListener("click", async () => {
      const url = apiEndpointInput.value.trim();
      if (!url) {
        apiStatusIndicator.textContent = "Please enter an endpoint URL first";
        apiStatusIndicator.className = "text-xs text-amber-400 mt-2";
        return;
      }

      apiStatusIndicator.textContent = "Pinging endpoint...";
      apiStatusIndicator.className = "text-xs text-slate-400 mt-2";

      const startTime = performance.now();
      try {
        const res = await fetch(url, { method: "GET", mode: "cors" });
        const latency = Math.round(performance.now() - startTime);

        if (res.ok) {
          apiStatusIndicator.textContent = `🟢 Connected successfully (${latency} ms)`;
          apiStatusIndicator.className = "text-xs text-emerald-400 font-medium mt-2";
        } else {
          apiStatusIndicator.textContent = `⚠️ Endpoint responded with HTTP ${res.status}`;
          apiStatusIndicator.className = "text-xs text-amber-400 font-medium mt-2";
        }
      } catch (err) {
        apiStatusIndicator.textContent = `❌ Unable to reach endpoint (CORS or offline)`;
        apiStatusIndicator.className = "text-xs text-rose-400 font-medium mt-2";
      }
    });
  }

  // Platforms Modal
  if (openPlatformsBtn) {
    openPlatformsBtn.addEventListener("click", () => platformsModal.classList.remove("hidden"));
  }
  if (closePlatformsBtn) {
    closePlatformsBtn.addEventListener("click", () => platformsModal.classList.add("hidden"));
  }

  // -------------------------------------------------------------
  // Helpers & UI Utilities
  // -------------------------------------------------------------

  function setupSamplePills() {
    const pills = document.querySelectorAll("[data-sample-url]");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        const sample = pill.getAttribute("data-sample-url");
        urlInput.value = sample;
        handleInputChange();
        startResolve();
      });
    });
  }

  function showError(msg) {
    const cleanMsg = msg
      .replace(/Deploy the included Cloudflare Worker.*?Settings ⚙️\./g, "Please verify the post is public and contains video.")
      .replace(/Configure a backend proxy in Settings ⚙️ or check that the URL is a valid public video link\./g, "Please verify that the URL is a valid public video link.")
      .replace(/Configure a backend proxy in Settings ⚙️\./g, "");

    errorMessage.textContent = cleanMsg.trim();
    errorBanner.classList.remove("hidden");
  }

  function hideError() {
    errorBanner.classList.add("hidden");
    errorMessage.textContent = "";
  }

  function showToast(msg, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border bg-card/95 backdrop-blur text-foreground text-xs shadow-xl transform transition-all duration-300 translate-y-3 opacity-0 max-w-sm";
    
    let icon = `<svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    if (type === "info") {
      icon = `<svg class="w-4 h-4 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === "error") {
      icon = `<svg class="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    toast.innerHTML = `
      ${icon}
      <span class="font-medium text-foreground leading-snug">${msg}</span>
    `;

    container.appendChild(toast);

    // Slide up and fade in
    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-3", "opacity-0");
    });

    // Auto dismiss after 2.8s
    setTimeout(() => {
      toast.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return "";
    const b = parseInt(bytes, 10);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // -------------------------------------------------------------
  // Mode Switcher (Single URL vs Bulk URLs)
  // -------------------------------------------------------------
  function initModeSwitcher() {
    const modeSingleBtn = document.getElementById("modeSingleBtn");
    const modeBulkBtn = document.getElementById("modeBulkBtn");
    const singleInputSection = document.getElementById("singleInputSection");
    const bulkInputSection = document.getElementById("bulkInputSection");

    function setMode(mode) {
      if (!singleInputSection || !bulkInputSection || !modeSingleBtn || !modeBulkBtn) return;
      if (mode === "bulk") {
        singleInputSection.classList.add("hidden");
        bulkInputSection.classList.remove("hidden");
        modeSingleBtn.className = "h-7 px-3 rounded-full text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition cursor-pointer";
        modeBulkBtn.className = "h-7 px-3 rounded-full text-xs font-medium border border-primary bg-primary text-primary-foreground shadow-sm flex items-center gap-1.5 transition cursor-pointer";
        const bulkTextarea = document.getElementById("bulkTextarea");
        if (bulkTextarea) bulkTextarea.focus();
      } else {
        bulkInputSection.classList.add("hidden");
        singleInputSection.classList.remove("hidden");
        modeBulkBtn.className = "h-7 px-3 rounded-full text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition cursor-pointer";
        modeSingleBtn.className = "h-7 px-3 rounded-full text-xs font-medium border border-primary bg-primary text-primary-foreground shadow-sm flex items-center gap-1.5 transition cursor-pointer";
        if (urlInput) urlInput.focus();
      }
    }

    if (modeSingleBtn && modeBulkBtn) {
      modeSingleBtn.addEventListener("click", () => setMode("single"));
      modeBulkBtn.addEventListener("click", () => setMode("bulk"));
    }
  }

  // -------------------------------------------------------------
  // Bulk URLs Downloader & Queue Runner
  // -------------------------------------------------------------
  function initBulkDownloader() {
    const bulkTextarea = document.getElementById("bulkTextarea");
    const bulkUrlCount = document.getElementById("bulkUrlCount");
    const bulkPasteBtn = document.getElementById("bulkPasteBtn");
    const bulkClearBtn = document.getElementById("bulkClearBtn");
    const bulkExtractBtn = document.getElementById("bulkExtractBtn");
    const bulkResultsSection = document.getElementById("bulkResultsSection");
    const bulkQueueStats = document.getElementById("bulkQueueStats");
    const bulkDownloadZipBtn = document.getElementById("bulkDownloadZipBtn");
    const bulkProgressBarGroup = document.getElementById("bulkProgressBarGroup");
    const bulkProgressMsg = document.getElementById("bulkProgressMsg");
    const bulkProgressPct = document.getElementById("bulkProgressPct");
    const bulkProgressBar = document.getElementById("bulkProgressBar");
    const bulkQueueList = document.getElementById("bulkQueueList");

    let bulkItems = [];

    function parseBulkUrls() {
      if (!bulkTextarea) return [];
      return bulkTextarea.value
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 5 && (line.startsWith("http://") || line.startsWith("https://")));
    }

    function updateBulkUrlCount() {
      const urls = parseBulkUrls();
      if (bulkUrlCount) {
        bulkUrlCount.textContent = `${urls.length} link${urls.length === 1 ? "" : "s"} entered`;
      }
      if (bulkExtractBtn) {
        bulkExtractBtn.disabled = urls.length === 0;
      }
    }

    if (bulkTextarea) {
      bulkTextarea.addEventListener("input", updateBulkUrlCount);
    }

    if (bulkPasteBtn) {
      bulkPasteBtn.addEventListener("click", async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            bulkTextarea.value = (bulkTextarea.value ? bulkTextarea.value.trim() + "\n" : "") + text.trim();
            updateBulkUrlCount();
            showToast("Pasted links from clipboard!", "success");
          }
        } catch (err) {
          showToast("Clipboard permission required to paste.", "error");
        }
      });
    }

    if (bulkClearBtn) {
      bulkClearBtn.addEventListener("click", () => {
        if (bulkTextarea) bulkTextarea.value = "";
        updateBulkUrlCount();
        if (bulkResultsSection) bulkResultsSection.classList.add("hidden");
        bulkItems = [];
      });
    }

    if (bulkExtractBtn) {
      bulkExtractBtn.addEventListener("click", async () => {
        const urls = parseBulkUrls();
        if (urls.length === 0) {
          showToast("Please enter at least one valid video URL.", "warning");
          return;
        }

        bulkExtractBtn.disabled = true;
        const originalText = bulkExtractBtn.innerHTML;
        bulkExtractBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Extracting ${urls.length} links...
        `;

        bulkResultsSection.classList.remove("hidden");
        bulkProgressBarGroup.classList.remove("hidden");
        bulkProgressBar.style.width = "10%";
        bulkProgressPct.textContent = "10%";
        bulkProgressMsg.textContent = `Resolving ${urls.length} links in browser...`;

        // Initialize queue UI
        bulkItems = urls.map((u, idx) => ({
          id: `bulk_${idx}_${Date.now()}`,
          url: u,
          platform: detectPlatform(u),
          status: "pending",
          media: null,
          selectedFormat: null,
          error: null
        }));
        renderBulkQueue();

        try {
          const results = await window.downloaderEngine.resolveBatch(urls, (p) => {
            const pct = Math.round((p.completed / p.total) * 90);
            bulkProgressBar.style.width = `${Math.max(10, pct)}%`;
            bulkProgressPct.textContent = `${Math.max(10, pct)}%`;
            bulkProgressMsg.textContent = `Extracting ${p.completed}/${p.total} links...`;
            if (p.itemResult) {
              const matched = bulkItems.find(b => b.url === p.currentUrl);
              if (matched) {
                matched.status = p.itemResult.status;
                matched.media = p.itemResult.media;
                matched.selectedFormat = p.itemResult.media?.formats?.[0] || null;
                matched.error = p.itemResult.error;
                renderBulkQueue();
              }
            }
          });

          // Match results
          results.forEach((r, idx) => {
            if (bulkItems[idx]) {
              bulkItems[idx].status = r.status;
              bulkItems[idx].media = r.media;
              bulkItems[idx].selectedFormat = r.media?.formats?.[0] || null;
              bulkItems[idx].error = r.error;
            }
          });

          bulkProgressBar.style.width = "100%";
          bulkProgressPct.textContent = "100%";
          const successCount = bulkItems.filter(b => b.status === "success").length;
          bulkProgressMsg.textContent = `Completed! ${successCount}/${urls.length} links ready.`;
          setTimeout(() => bulkProgressBarGroup.classList.add("hidden"), 3000);

          renderBulkQueue();
          showToast(`Batch extraction complete: ${successCount} videos ready!`, "success");
        } catch (err) {
          showToast("Batch resolution error: " + err.message, "error");
        } finally {
          bulkExtractBtn.disabled = false;
          bulkExtractBtn.innerHTML = originalText;
        }
      });
    }

    function renderBulkQueue() {
      if (!bulkQueueList) return;
      bulkQueueList.innerHTML = "";

      const readyItems = bulkItems.filter(b => b.status === "success");
      if (bulkQueueStats) {
        bulkQueueStats.textContent = `(${readyItems.length}/${bulkItems.length} ready)`;
      }
      if (bulkDownloadZipBtn) {
        bulkDownloadZipBtn.disabled = readyItems.length === 0;
      }

      bulkItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between gap-3 text-xs";

        const platformName = item.platform ? item.platform.name : "Video";
        const thumb = item.media?.thumbnailUrl || "";
        const title = item.media?.title || item.url;

        let statusBadge = "";
        if (item.status === "pending") {
          statusBadge = `<span class="px-2 py-0.5 rounded font-mono text-[10px] bg-secondary text-muted-foreground animate-pulse">Resolving...</span>`;
        } else if (item.status === "error") {
          statusBadge = `<span class="px-2 py-0.5 rounded font-mono text-[10px] bg-destructive/20 text-rose-300" title="${item.error || 'Failed'}">Failed</span>`;
        } else {
          statusBadge = `<span class="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/20 text-emerald-300">Ready</span>`;
        }

        row.innerHTML = `
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 rounded bg-black/40 border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
              ${thumb ? `<img src="${thumb}" class="w-full h-full object-cover">` : `<span class="text-[10px] font-mono text-muted-foreground">${platformName}</span>`}
            </div>
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-secondary border border-border text-foreground uppercase">${platformName}</span>
                ${statusBadge}
              </div>
              <p class="font-medium text-foreground truncate text-xs" title="${title}">${title}</p>
              <p class="text-[10px] text-muted-foreground font-mono truncate">${item.url}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            ${item.status === "success" && item.media?.formats ? `
              <select class="bulk-format-select h-7 rounded border border-border bg-card px-2 text-[11px] font-mono text-foreground focus:outline-none">
                ${item.media.formats.map((f, fIdx) => `
                  <option value="${fIdx}">${f.quality || f.ext || "MP4"}</option>
                `).join("")}
              </select>
              <button class="bulk-download-single-btn h-7 w-7 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition cursor-pointer" title="Download this video">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </button>
            ` : ""}
          </div>
        `;

        if (item.status === "success" && item.media?.formats) {
          const select = row.querySelector(".bulk-format-select");
          const singleBtn = row.querySelector(".bulk-download-single-btn");
          if (select) {
            select.addEventListener("change", (e) => {
              const fIdx = parseInt(e.target.value, 10);
              item.selectedFormat = item.media.formats[fIdx];
            });
          }
          if (singleBtn) {
            singleBtn.addEventListener("click", () => {
              const fmt = item.selectedFormat || item.media.formats[0];
              const cleanTitle = (item.media.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
              const filename = `${cleanTitle}_${fmt.quality || "hd"}.${fmt.ext || "mp4"}`;
              window.downloaderEngine.downloadFile(fmt.url, filename);
            });
          }
        }

        bulkQueueList.appendChild(row);
      });
    }

    if (bulkDownloadZipBtn) {
      bulkDownloadZipBtn.addEventListener("click", async () => {
        const ready = bulkItems.filter(b => b.status === "success");
        if (ready.length === 0) return;

        bulkDownloadZipBtn.disabled = true;
        const originalText = bulkDownloadZipBtn.innerHTML;
        bulkDownloadZipBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Packaging ZIP...
        `;

        bulkProgressBarGroup.classList.remove("hidden");
        bulkProgressBar.style.width = "5%";
        bulkProgressPct.textContent = "5%";
        bulkProgressMsg.textContent = "Downloading streams into memory for ZIP...";

        const filesToZip = [];
        const total = ready.length;

        try {
          for (let i = 0; i < total; i++) {
            const item = ready[i];
            const fmt = item.selectedFormat || item.media.formats[0];
            const cleanTitle = (item.media.title || `video_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 35);
            const filename = `${cleanTitle}_${fmt.quality || "hd"}.${fmt.ext || "mp4"}`;

            bulkProgressMsg.textContent = `Downloading ${i + 1}/${total}: ${cleanTitle}...`;
            const pct = Math.round(((i) / total) * 70);
            bulkProgressBar.style.width = `${pct}%`;
            bulkProgressPct.textContent = `${pct}%`;

            const buffer = await window.mediaConverterEngine.fetchBufferWithProgress(
              fmt.url,
              cleanTitle,
              pct,
              pct + Math.round(70 / total),
              (p) => {
                bulkProgressMsg.textContent = p.message;
              }
            );

            filesToZip.push({
              name: filename,
              blob: new Blob([buffer], { type: fmt.ext === "mp3" ? "audio/mp3" : "video/mp4" })
            });
          }

          bulkProgressMsg.textContent = "Generating ZIP archive...";
          bulkProgressBar.style.width = "85%";
          bulkProgressPct.textContent = "85%";

          const zipBlob = await window.mediaConverterEngine.createZipArchive(filesToZip, (p) => {
            bulkProgressMsg.textContent = p.message;
            bulkProgressBar.style.width = `${p.percent}%`;
            bulkProgressPct.textContent = `${p.percent}%`;
          });

          const zipFilename = `clipper_bulk_${Date.now()}.zip`;
          window.downloaderEngine.triggerDownloadLink(URL.createObjectURL(zipBlob), zipFilename);
          showToast("Bulk ZIP archive downloaded successfully!", "success");
          setTimeout(() => bulkProgressBarGroup.classList.add("hidden"), 3000);
        } catch (zipErr) {
          console.error(zipErr);
          showToast("Failed to create ZIP: " + zipErr.message, "error");
        } finally {
          bulkDownloadZipBtn.disabled = false;
          bulkDownloadZipBtn.innerHTML = originalText;
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Reel Clipper & Multi-Segment Studio
  // -------------------------------------------------------------
  function initReelClipper() {
    const openClipModalBtn = document.getElementById("openClipModalBtn");
    const clipModal = document.getElementById("clipModal");
    const closeClipModalBtn = document.getElementById("closeClipModalBtn");
    const clipMiniPlayer = document.getElementById("clipMiniPlayer");
    const clipCurrentTimeText = document.getElementById("clipCurrentTimeText");
    const clipDurationText = document.getElementById("clipDurationText");
    const clipSetStartBtn = document.getElementById("clipSetStartBtn");
    const clipSetEndBtn = document.getElementById("clipSetEndBtn");
    const addSegmentBtn = document.getElementById("addSegmentBtn");
    const addPreset15Btn = document.getElementById("addPreset15Btn");
    const addPreset30Btn = document.getElementById("addPreset30Btn");
    const segmentsContainer = document.getElementById("segmentsContainer");
    const clipProgressBox = document.getElementById("clipProgressBox");
    const clipProgressStatus = document.getElementById("clipProgressStatus");
    const clipProgressPct = document.getElementById("clipProgressPct");
    const clipProgressBar = document.getElementById("clipProgressBar");
    const clipWorkerStatusGrid = document.getElementById("clipWorkerStatusGrid");
    const clipCoresBadge = document.getElementById("clipCoresBadge");
    const burnOverlaysLabel = document.getElementById("burnOverlaysLabel");
    const burnOverlaysToggle = document.getElementById("burnOverlaysToggle");
    const exportClipsBtn = document.getElementById("exportClipsBtn");
    const exportClipsBtnText = document.getElementById("exportClipsBtnText");

    // Studio Tabs
    const tabSegmentsBtn = document.getElementById("tabSegmentsBtn");
    const tabHookBtn = document.getElementById("tabHookBtn");
    const tabLogoBtn = document.getElementById("tabLogoBtn");
    const panelSegments = document.getElementById("panelSegments");
    const panelHook = document.getElementById("panelHook");
    const panelLogo = document.getElementById("panelLogo");

    // Live Overlays on Player
    const clipLogoOverlay = document.getElementById("clipLogoOverlay");
    const clipLogoImg = document.getElementById("clipLogoImg");
    const clipHookOverlay = document.getElementById("clipHookOverlay");
    const clipHookBannerBox = document.getElementById("clipHookBannerBox");
    const clipHookBannerText = document.getElementById("clipHookBannerText");

    // Hook Frame Controls
    const enableHookToggle = document.getElementById("enableHookToggle");
    const hookControlsGroup = document.getElementById("hookControlsGroup");
    const hookTextInput = document.getElementById("hookTextInput");
    const hookStyleSelect = document.getElementById("hookStyleSelect");
    const hookDurationSelect = document.getElementById("hookDurationSelect");
    const hookImageUpload = document.getElementById("hookImageUpload");

    // Logo & Branding Controls
    const enableLogoToggle = document.getElementById("enableLogoToggle");
    const logoControlsGroup = document.getElementById("logoControlsGroup");
    const logoFileInput = document.getElementById("logoFileInput");
    const logoPositionSelect = document.getElementById("logoPositionSelect");
    const logoOpacityRange = document.getElementById("logoOpacityRange");

    let clipSegments = [];
    let previewTimer = null;
    let uploadedLogoBuffer = null;
    let uploadedHookBuffer = null;

    // Tabs switching
    function switchTab(activeTab) {
      const tabs = [
        { btn: tabSegmentsBtn, panel: panelSegments, id: "segments" },
        { btn: tabHookBtn, panel: panelHook, id: "hook" },
        { btn: tabLogoBtn, panel: panelLogo, id: "logo" }
      ];

      tabs.forEach(t => {
        if (t.id === activeTab) {
          t.panel.classList.remove("hidden");
          t.btn.className = "flex-1 py-1.5 rounded-md font-medium text-foreground bg-card shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5";
        } else {
          t.panel.classList.add("hidden");
          t.btn.className = "flex-1 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center justify-center gap-1.5";
        }
      });
    }

    if (tabSegmentsBtn) tabSegmentsBtn.addEventListener("click", () => switchTab("segments"));
    if (tabHookBtn) tabHookBtn.addEventListener("click", () => switchTab("hook"));
    if (tabLogoBtn) tabLogoBtn.addEventListener("click", () => switchTab("logo"));

    // Hook Frame Live Updates
    function updateHookBannerPreview() {
      if (!clipHookOverlay || !clipHookBannerText || !clipHookBannerBox) return;
      const isEnabled = enableHookToggle && enableHookToggle.checked;
      
      if (isEnabled && (hookTextInput?.value?.trim() || uploadedHookBuffer)) {
        clipHookOverlay.classList.remove("hidden");
        const text = (hookTextInput?.value?.trim() || "WAIT FOR THE END 😱").toUpperCase();
        clipHookBannerText.textContent = text;

        const style = hookStyleSelect ? hookStyleSelect.value : "yellow";
        if (style === "red") {
          clipHookBannerBox.className = "px-4 py-2 rounded-lg bg-red-950/90 border border-red-500 shadow-xl max-w-sm text-center";
          clipHookBannerText.className = "font-extrabold text-xs sm:text-sm text-white uppercase tracking-wide leading-tight drop-shadow";
        } else if (style === "white") {
          clipHookBannerBox.className = "px-4 py-2 rounded-lg bg-white/95 border border-zinc-900 shadow-xl max-w-sm text-center";
          clipHookBannerText.className = "font-extrabold text-xs sm:text-sm text-black uppercase tracking-wide leading-tight";
        } else if (style === "gradient") {
          clipHookBannerBox.className = "px-4 py-2 rounded-lg bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border border-purple-400 shadow-xl max-w-sm text-center";
          clipHookBannerText.className = "font-extrabold text-xs sm:text-sm text-purple-200 uppercase tracking-wide leading-tight drop-shadow";
        } else {
          clipHookBannerBox.className = "px-4 py-2 rounded-lg bg-black/85 border border-yellow-400/60 shadow-xl max-w-sm text-center";
          clipHookBannerText.className = "font-extrabold text-xs sm:text-sm text-yellow-300 uppercase tracking-wide leading-tight drop-shadow";
        }
      } else {
        clipHookOverlay.classList.add("hidden");
      }
      if (typeof updateBurnOverlayUI === "function") updateBurnOverlayUI();
    }

    if (enableHookToggle) {
      enableHookToggle.addEventListener("change", () => {
        if (enableHookToggle.checked) {
          hookControlsGroup.classList.remove("opacity-50", "pointer-events-none");
          if (!hookTextInput.value) hookTextInput.value = "WAIT FOR THE END 😱";
        } else {
          hookControlsGroup.classList.add("opacity-50", "pointer-events-none");
        }
        updateHookBannerPreview();
      });
    }

    if (hookTextInput) {
      hookTextInput.addEventListener("input", updateHookBannerPreview);
    }
    if (hookStyleSelect) {
      hookStyleSelect.addEventListener("change", updateHookBannerPreview);
    }

    // Hook Viral Template Buttons
    document.querySelectorAll(".hook-template-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (hookTextInput) {
          hookTextInput.value = btn.textContent.trim();
          if (enableHookToggle && !enableHookToggle.checked) {
            enableHookToggle.checked = true;
            hookControlsGroup.classList.remove("opacity-50", "pointer-events-none");
          }
          updateHookBannerPreview();
        }
      });
    });

    // Custom Hook Image Upload
    if (hookImageUpload) {
      hookImageUpload.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          uploadedHookBuffer = new Uint8Array(reader.result);
          showToast("Custom hook cover loaded!");
          updateHookBannerPreview();
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // Logo & Branding Live Updates
    function updateLogoPosition() {
      if (!clipLogoOverlay) return;
      const pos = logoPositionSelect ? logoPositionSelect.value : "top-right";
      clipLogoOverlay.className = "absolute pointer-events-none transition-all duration-200 " + (
        pos === "top-left" ? "top-4 left-4" :
        pos === "bottom-right" ? "bottom-4 right-4" :
        pos === "bottom-left" ? "bottom-4 left-4" :
        "top-4 right-4"
      );
    }

    if (enableLogoToggle) {
      enableLogoToggle.addEventListener("change", () => {
        if (enableLogoToggle.checked) {
          logoControlsGroup.classList.remove("opacity-50", "pointer-events-none");
          clipLogoOverlay.classList.remove("hidden");
        } else {
          logoControlsGroup.classList.add("opacity-50", "pointer-events-none");
          clipLogoOverlay.classList.add("hidden");
        }
        if (typeof updateBurnOverlayUI === "function") updateBurnOverlayUI();
      });
    }

    if (logoFileInput) {
      logoFileInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // For live player preview
        const url = URL.createObjectURL(file);
        if (clipLogoImg) {
          clipLogoImg.src = url;
          clipLogoOverlay.classList.remove("hidden");
          if (enableLogoToggle && !enableLogoToggle.checked) {
            enableLogoToggle.checked = true;
            logoControlsGroup.classList.remove("opacity-50", "pointer-events-none");
          }
        }

        // For FFmpeg WASM processing
        const reader = new FileReader();
        reader.onload = () => {
          uploadedLogoBuffer = new Uint8Array(reader.result);
          showToast("Logo watermark ready!");
          if (typeof updateBurnOverlayUI === "function") updateBurnOverlayUI();
        };
        reader.readAsArrayBuffer(file);
      });
    }

    if (logoPositionSelect) {
      logoPositionSelect.addEventListener("change", updateLogoPosition);
    }
    if (logoOpacityRange) {
      logoOpacityRange.addEventListener("input", () => {
        if (clipLogoOverlay) {
          clipLogoOverlay.style.opacity = `${logoOpacityRange.value / 100}`;
        }
      });
    }

    // Helper: Generate crisp Canvas PNG Blob for Hook Banner
    async function generateHookCanvasBuffer(text, style = "yellow") {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");

      const themes = {
        yellow: { bg: "rgba(0,0,0,0.88)", border: "#facc15", text: "#fde047" },
        red: { bg: "rgba(153,27,27,0.92)", border: "#f87171", text: "#ffffff" },
        white: { bg: "rgba(255,255,255,0.96)", border: "#18181b", text: "#000000" },
        gradient: { bg: "rgba(88,28,135,0.92)", border: "#c084fc", text: "#ffffff" }
      };
      const theme = themes[style] || themes.yellow;

      const bannerW = 660;
      const bannerH = 100;
      const bannerX = (canvas.width - bannerW) / 2;
      const bannerY = 24;

      ctx.fillStyle = theme.bg;
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.text;
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.toUpperCase(), canvas.width / 2, bannerY + bannerH / 2);

      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const ab = await blob.arrayBuffer();
      return new Uint8Array(ab);
    }

    function updateBurnOverlayUI() {
      const hasHook = enableHookToggle && enableHookToggle.checked;
      const hasLogo = enableLogoToggle && enableLogoToggle.checked && uploadedLogoBuffer;
      const anyOverlay = Boolean(hasHook || hasLogo);
      const cores = Math.max(1, Math.min(6, navigator.hardwareConcurrency || 4));

      if (burnOverlaysLabel) {
        if (anyOverlay) {
          burnOverlaysLabel.classList.remove("hidden");
          burnOverlaysLabel.classList.add("flex");
        } else {
          burnOverlaysLabel.classList.add("hidden");
          burnOverlaysLabel.classList.remove("flex");
        }
      }

      if (clipCoresBadge) {
        const willBurn = anyOverlay && (!burnOverlaysToggle || burnOverlaysToggle.checked);
        clipCoresBadge.textContent = willBurn
          ? `${cores} CPU Cores • Parallel Overlay Encode`
          : `${cores} CPU Cores • Instant Lossless Cut`;
      }
    }

    if (burnOverlaysToggle) {
      burnOverlaysToggle.addEventListener("change", updateBurnOverlayUI);
    }

    if (openClipModalBtn) {
      openClipModalBtn.addEventListener("click", () => {
        if (!currentMedia) return;
        const streamUrl = selectedFormat?.url || currentMedia.videoUrl;
        if (!streamUrl) {
          showToast("No active video stream loaded.", "error");
          return;
        }

        clipMiniPlayer.src = streamUrl;
        clipMiniPlayer.load();
        clipModal.classList.remove("hidden");

        // Pre-warm FFmpeg Web Workers in the background so they are ready before user clicks Export
        if (window.mediaConverterEngine?.prewarmWorkerPool) {
          window.mediaConverterEngine.prewarmWorkerPool(2);
        }

        // Initialize default segments if empty
        if (clipSegments.length === 0) {
          clipSegments = [
            { id: "seg_1", label: "Reel 1", start: "00:15", end: "00:28" },
            { id: "seg_2", label: "Reel 2", start: "01:45", end: "02:20" }
          ];
        }
        renderSegments();
        updateLogoPosition();
        updateHookBannerPreview();
        updateBurnOverlayUI();
      });
    }

    if (closeClipModalBtn) {
      closeClipModalBtn.addEventListener("click", () => {
        clipMiniPlayer.pause();
        clipModal.classList.add("hidden");
        if (previewTimer) clearInterval(previewTimer);
      });
    }

    if (clipMiniPlayer) {
      clipMiniPlayer.addEventListener("timeupdate", () => {
        clipCurrentTimeText.textContent = window.mediaConverterEngine.formatSecondsToTime(clipMiniPlayer.currentTime);
        if (clipMiniPlayer.duration) {
          clipDurationText.textContent = window.mediaConverterEngine.formatSecondsToTime(clipMiniPlayer.duration);
        }
      });
      clipMiniPlayer.addEventListener("loadedmetadata", () => {
        clipDurationText.textContent = window.mediaConverterEngine.formatSecondsToTime(clipMiniPlayer.duration);
      });
    }

    if (clipSetStartBtn) {
      clipSetStartBtn.addEventListener("click", () => {
        if (clipSegments.length > 0) {
          const timeStr = window.mediaConverterEngine.formatSecondsToTime(clipMiniPlayer.currentTime);
          clipSegments[0].start = timeStr;
          renderSegments();
          showToast(`Set Start to ${timeStr}`);
        }
      });
    }

    if (clipSetEndBtn) {
      clipSetEndBtn.addEventListener("click", () => {
        if (clipSegments.length > 0) {
          const timeStr = window.mediaConverterEngine.formatSecondsToTime(clipMiniPlayer.currentTime);
          clipSegments[0].end = timeStr;
          renderSegments();
          showToast(`Set End to ${timeStr}`);
        }
      });
    }

    function addSegment(duration = 15) {
      const lastSeg = clipSegments[clipSegments.length - 1];
      let startSec = 0;
      if (lastSeg) {
        startSec = window.mediaConverterEngine.parseTimeToSeconds(lastSeg.end);
      } else {
        startSec = Math.floor(clipMiniPlayer.currentTime || 0);
      }
      const endSec = startSec + duration;

      clipSegments.push({
        id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: `Reel ${clipSegments.length + 1}`,
        start: window.mediaConverterEngine.formatSecondsToTime(startSec),
        end: window.mediaConverterEngine.formatSecondsToTime(endSec)
      });
      renderSegments();
    }

    if (addSegmentBtn) addSegmentBtn.addEventListener("click", () => addSegment(15));
    if (addPreset15Btn) addPreset15Btn.addEventListener("click", () => addSegment(15));
    if (addPreset30Btn) addPreset30Btn.addEventListener("click", () => addSegment(30));

    function renderSegments() {
      if (!segmentsContainer) return;
      segmentsContainer.innerHTML = "";

      exportClipsBtn.disabled = clipSegments.length === 0;
      if (exportClipsBtnText) {
        exportClipsBtnText.textContent = clipSegments.length > 1 ? `Export All ${clipSegments.length} Reels (ZIP)` : "Export Reel (MP4)";
      }

      clipSegments.forEach((seg, index) => {
        const card = document.createElement("div");
        card.className = "p-2.5 rounded-lg border border-border bg-card shadow-sm space-y-2";

        const startSec = window.mediaConverterEngine.parseTimeToSeconds(seg.start);
        const endSec = window.mediaConverterEngine.parseTimeToSeconds(seg.end);
        const diff = Math.max(0, endSec - startSec);

        card.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-1">
              <span class="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] flex items-center justify-center font-bold">${index + 1}</span>
              <input type="text" value="${seg.label}" class="seg-label-input bg-transparent border-b border-border/60 hover:border-border px-1 py-0.5 text-xs font-semibold text-foreground focus:outline-none w-28">
              <span class="text-[10px] font-mono text-muted-foreground">(${diff}s)</span>
            </div>
            
            <div class="flex items-center gap-1.5">
              <button class="seg-preview-btn h-6 px-2 rounded border border-border bg-secondary hover:bg-accent text-[10px] text-foreground font-mono transition cursor-pointer flex items-center gap-1" title="Play preview of this segment">
                <svg class="w-2.5 h-2.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <span>Preview</span>
              </button>
              <button class="seg-delete-btn h-6 w-6 rounded text-muted-foreground hover:text-rose-400 transition cursor-pointer flex items-center justify-center" title="Delete segment">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 font-mono text-xs">
            <div>
              <label class="block text-[10px] text-muted-foreground mb-0.5">Start Time (MM:SS or Sec)</label>
              <input type="text" value="${seg.start}" class="seg-start-input w-full rounded border border-input bg-secondary/50 px-2 py-1 text-xs text-foreground focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] text-muted-foreground mb-0.5">End Time (MM:SS or Sec)</label>
              <input type="text" value="${seg.end}" class="seg-end-input w-full rounded border border-input bg-secondary/50 px-2 py-1 text-xs text-foreground focus:outline-none">
            </div>
          </div>
        `;

        const labelInput = card.querySelector(".seg-label-input");
        const startInput = card.querySelector(".seg-start-input");
        const endInput = card.querySelector(".seg-end-input");
        const previewBtn = card.querySelector(".seg-preview-btn");
        const deleteBtn = card.querySelector(".seg-delete-btn");

        labelInput.addEventListener("input", (e) => { seg.label = e.target.value; });
        startInput.addEventListener("change", (e) => {
          seg.start = e.target.value;
          renderSegments();
        });
        endInput.addEventListener("change", (e) => {
          seg.end = e.target.value;
          renderSegments();
        });

        previewBtn.addEventListener("click", () => {
          const sSec = window.mediaConverterEngine.parseTimeToSeconds(seg.start);
          const eSec = window.mediaConverterEngine.parseTimeToSeconds(seg.end);
          clipMiniPlayer.currentTime = sSec;
          clipMiniPlayer.play();

          if (previewTimer) clearInterval(previewTimer);
          previewTimer = setInterval(() => {
            if (clipMiniPlayer.currentTime >= eSec || clipMiniPlayer.paused) {
              clipMiniPlayer.pause();
              clearInterval(previewTimer);
            }
          }, 100);
        });

        deleteBtn.addEventListener("click", () => {
          clipSegments.splice(index, 1);
          renderSegments();
        });

        segmentsContainer.appendChild(card);
      });
    }

    if (exportClipsBtn) {
      exportClipsBtn.addEventListener("click", async () => {
        if (!currentMedia || clipSegments.length === 0) return;
        const streamUrl = selectedFormat?.url || currentMedia.videoUrl;
        if (!streamUrl) return;

        exportClipsBtn.disabled = true;
        clipProgressBox.classList.remove("hidden");
        clipProgressBar.style.width = "5%";
        clipProgressPct.textContent = "5%";
        clipProgressStatus.textContent = "Preparing parallel multi-core studio...";
        if (clipWorkerStatusGrid) clipWorkerStatusGrid.innerHTML = "";

        try {
          // Prepare options (Logo watermark & Hook Frame banner, respecting burnOverlaysToggle)
          const shouldBurn = !burnOverlaysToggle || burnOverlaysToggle.checked;
          const sliceOptions = {
            videoDuration: clipMiniPlayer?.duration || 0,
          };

          if (shouldBurn && enableLogoToggle && enableLogoToggle.checked && uploadedLogoBuffer) {
            sliceOptions.logoBuffer = uploadedLogoBuffer;
            sliceOptions.logoPosition = logoPositionSelect ? logoPositionSelect.value : "top-right";
          }

          if (shouldBurn && enableHookToggle && enableHookToggle.checked) {
            if (uploadedHookBuffer) {
              sliceOptions.hookBuffer = uploadedHookBuffer;
            } else {
              const hookText = hookTextInput?.value?.trim() || "WAIT FOR THE END 😱";
              const hookStyle = hookStyleSelect ? hookStyleSelect.value : "yellow";
              sliceOptions.hookBuffer = await generateHookCanvasBuffer(hookText, hookStyle);
            }
            const durVal = hookDurationSelect ? hookDurationSelect.value : "2.5";
            sliceOptions.hookDuration = durVal === "always" ? "always" : parseFloat(durVal);
          }

          const clips = await window.mediaConverterEngine.sliceBatchParallel(streamUrl, clipSegments, sliceOptions, (p) => {
            clipProgressStatus.textContent = p.message;
            clipProgressBar.style.width = `${p.percent}%`;
            clipProgressPct.textContent = `${p.percent}%`;

            if (clipWorkerStatusGrid && p.workerStates) {
              clipWorkerStatusGrid.innerHTML = p.workerStates.map(ws => `
                <div class="flex items-center justify-between gap-2 text-[10px] font-mono bg-secondary/40 rounded px-2 py-1">
                  <span class="truncate text-foreground font-medium">${ws.label || `Reel #${ws.index + 1}`}</span>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="w-16 bg-secondary rounded-full h-1 overflow-hidden">
                      <div class="bg-emerald-500 h-1 rounded-full transition-all duration-200" style="width:${ws.percent}%"></div>
                    </div>
                    <span class="text-muted-foreground w-8 text-right">${ws.percent}%</span>
                  </div>
                </div>
              `).join("");
            }
          });

          if (clips.length === 1) {
            window.downloaderEngine.triggerDownloadLink(clips[0].url, clips[0].name);
            showToast(`Reel exported successfully: ${clips[0].name}`, "success");
          } else {
            clipProgressStatus.textContent = "Packaging all reels into ZIP archive...";
            clipProgressBar.style.width = "92%";
            clipProgressPct.textContent = "92%";

            const zipBlob = await window.mediaConverterEngine.createZipArchive(clips, (p) => {
              clipProgressStatus.textContent = p.message;
            });

            const cleanTitle = (currentMedia.title || "reels").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
            const zipName = `${cleanTitle}_exported_reels.zip`;
            window.downloaderEngine.triggerDownloadLink(URL.createObjectURL(zipBlob), zipName);
            showToast(`Exported all ${clips.length} reels into ${zipName}!`, "success");
          }

          clipProgressStatus.textContent = "Complete!";
          clipProgressBar.style.width = "100%";
          clipProgressPct.textContent = "100%";
          setTimeout(() => {
            clipProgressBox.classList.add("hidden");
            clipModal.classList.add("hidden");
          }, 1500);

        } catch (err) {
          console.error("Clipping error:", err);
          showToast("Clipping failed: " + err.message, "error");
          clipProgressStatus.textContent = "Error: " + err.message;
        } finally {
          exportClipsBtn.disabled = false;
        }
      });
    }
  }

  // Initialize GitHub Feature Request & Issue Reporter Modal
  initFeatureRequestModal();
  function initFeatureRequestModal() {
    const openBtn = document.getElementById("openFeatureRequestBtn");
    const footerBtn = document.getElementById("footerFeatureRequestBtn");
    const modal = document.getElementById("featureRequestModal");
    const closeBtn = document.getElementById("closeFeatureRequestBtn");
    const typeSelect = document.getElementById("frTypeSelect");
    const catSelect = document.getElementById("frCategorySelect");
    const titleInput = document.getElementById("frTitleInput");
    const descInput = document.getElementById("frDescInput");
    const submitBtn = document.getElementById("submitFeatureRequestBtn");

    if (!modal) return;

    const openModal = (e) => {
      if (e) e.preventDefault();
      modal.classList.remove("hidden");
      if (urlInput && urlInput.value.trim() && descInput && !descInput.value.trim()) {
        descInput.value = `Video URL: ${urlInput.value.trim()}\n\nDetails: `;
      }
    };

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (footerBtn) footerBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });

    document.querySelectorAll(".fr-preset-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (typeSelect) typeSelect.value = "feature";
        if (catSelect && chip.dataset.cat) catSelect.value = chip.dataset.cat;
        if (titleInput && chip.dataset.title) titleInput.value = chip.dataset.title;
        if (descInput && chip.dataset.desc) descInput.value = chip.dataset.desc;
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const isBug = typeSelect && typeSelect.value === "bug";
        const category = catSelect ? catSelect.value : "Reel Clipper Studio";
        const rawTitle = (titleInput?.value || "").trim() || (isBug ? "Video link failed to resolve" : `Enhancement for ${category}`);
        const rawDesc = (descInput?.value || "").trim() || "Please describe the feature or bug here.";

        const prefix = isBug ? "[Bug]" : "[Feature]";
        const label = isBug ? "bug" : "enhancement";
        const template = isBug ? "bug_report.yml" : "feature_request.yml";
        const fullTitle = `${prefix} (${category}): ${rawTitle}`;
        const fullBody = `### Category\n${category}\n\n### Description\n${rawDesc}\n\n---\n*Submitted via Download Reels Web Studio (${window.location.pathname})*`;

        const ghUrl = `https://github.com/download-reels/download-reels.github.io/issues/new?template=${encodeURIComponent(template)}&labels=${encodeURIComponent(label)}&title=${encodeURIComponent(fullTitle)}&body=${encodeURIComponent(fullBody)}`;
        window.open(ghUrl, "_blank", "noopener,noreferrer");
        modal.classList.add("hidden");
      });
    }
  }
});


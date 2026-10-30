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
      showToast("Link detected — resolving stream...", "info");
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
      showToast("Link pasted — extracting media...", "info");
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
        showToast("Pasted from clipboard — resolving...", "info");
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

    showToast("Preview loaded! Ready to download.", "success");

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

    const downloadUrl = selectedFormat.url || currentMedia.videoUrl;
    const cleanTitle = (currentMedia.title || "video")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 40);
    const filename = `${cleanTitle}_${selectedFormat.quality || "hd"}.${selectedFormat.ext || "mp4"}`;

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
      showToast("Downloading audio MP3...");
    }
  });

  copyLinkBtn.addEventListener("click", async () => {
    if (!currentMedia) return;
    const url = selectedFormat?.url || currentMedia.videoUrl;
    if (url) {
      await navigator.clipboard.writeText(url);
      showToast("Direct video URL copied to clipboard!");
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
    showToast("Download history cleared.");
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

  openSettingsBtn.addEventListener("click", () => {
    initSettings();
    settingsModal.classList.remove("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

  saveSettingsBtn.addEventListener("click", () => {
    const customUrl = apiEndpointInput.value.trim();
    localStorage.setItem("clipper_api_url", customUrl);
    localStorage.setItem("clipper_auto_download", autoDownloadToggle.checked ? "true" : "false");

    window.downloaderEngine.defaultSettings.apiUrl = customUrl;
    window.downloaderEngine.defaultSettings.autoDownload = autoDownloadToggle.checked;

    settingsModal.classList.add("hidden");
    showToast("Settings saved successfully!");
  });

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

  // Platforms Modal
  openPlatformsBtn.addEventListener("click", () => platformsModal.classList.remove("hidden"));
  closePlatformsBtn.addEventListener("click", () => platformsModal.classList.add("hidden"));

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
    if (msg.includes("Settings ⚙️")) {
      errorMessage.innerHTML = `
        <div class="space-y-2">
          <p>${msg}</p>
          <button id="errorOpenSettingsBtn" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-card hover:bg-accent text-foreground text-xs font-medium transition cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Open Engine Settings ⚙️</span>
          </button>
        </div>
      `;
      const btn = document.getElementById("errorOpenSettingsBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          initSettings();
          settingsModal.classList.remove("hidden");
        });
      }
    } else {
      errorMessage.textContent = msg;
    }
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
});


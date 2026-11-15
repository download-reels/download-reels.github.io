/**
 * Clipper - Channel & Profile Reels Bulk Downloader
 * Supports browsing & bulk-downloading up to 100 reels from Instagram accounts & YouTube channels.
 */

(function () {
  class ChannelDownloader {
    constructor() {
      this.currentProfile = null;
      this.reels = [];
      this.selectedIds = new Set();
      this.continuationToken = null;
      this.hasNextPage = false;
      this.isLoading = false;
      this.isDownloading = false;
      this.maxSelection = 100;

      this.init();
    }

    getApiUrl() {
      if (window.downloaderEngine && window.downloaderEngine.defaultSettings?.apiUrl) {
        return window.downloaderEngine.defaultSettings.apiUrl;
      }
      return localStorage.getItem("clipper_api_url") || "https://clipper-resolver.download-reels.workers.dev";
    }

    getIgSession() {
      return localStorage.getItem("clipper_ig_session") || "";
    }

    init() {
      document.addEventListener("DOMContentLoaded", () => {
        this.bindEvents();
      });
    }

    bindEvents() {
      const modeChannelBtn = document.getElementById("modeChannelBtn");
      const channelFetchBtn = document.getElementById("channelFetchBtn");
      const channelInput = document.getElementById("channelInput");
      const channelPasteBtn = document.getElementById("channelPasteBtn");
      const channelClearInputBtn = document.getElementById("channelClearInputBtn");
      const channelSelectAllBtn = document.getElementById("channelSelectAllBtn");
      const channelDeselectBtn = document.getElementById("channelDeselectBtn");
      const channelLoadMoreBtn = document.getElementById("channelLoadMoreBtn");
      const channelDownloadSelectedBtn = document.getElementById("channelDownloadSelectedBtn");
      const channelDownloadZipBtn = document.getElementById("channelDownloadZipBtn");
      const channelSendToClipperBtn = document.getElementById("channelSendToClipperBtn");

      if (channelFetchBtn && channelInput) {
        channelFetchBtn.addEventListener("click", () => {
          const val = channelInput.value.trim();
          if (val) this.fetchChannel(val);
        });

        channelInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const val = channelInput.value.trim();
            if (val) this.fetchChannel(val);
          }
        });
      }

      if (channelPasteBtn && channelInput) {
        channelPasteBtn.addEventListener("click", async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              channelInput.value = text.trim();
              this.fetchChannel(text.trim());
            }
          } catch (_) {
            channelInput.focus();
          }
        });
      }

      if (channelClearInputBtn && channelInput) {
        channelClearInputBtn.addEventListener("click", () => {
          channelInput.value = "";
          channelInput.focus();
        });
      }

      if (channelSelectAllBtn) {
        channelSelectAllBtn.addEventListener("click", () => this.selectAll());
      }

      if (channelDeselectBtn) {
        channelDeselectBtn.addEventListener("click", () => this.clearSelection());
      }

      if (channelLoadMoreBtn) {
        channelLoadMoreBtn.addEventListener("click", () => this.loadMore());
      }

      if (channelDownloadSelectedBtn) {
        channelDownloadSelectedBtn.addEventListener("click", () => this.downloadSelected(false));
      }

      if (channelDownloadZipBtn) {
        channelDownloadZipBtn.addEventListener("click", () => this.downloadSelected(true));
      }

      if (channelSendToClipperBtn) {
        channelSendToClipperBtn.addEventListener("click", () => this.sendSelectedToClipper());
      }
    }

    async fetchChannel(targetUrl, isContinuation = false) {
      if (this.isLoading) return;
      this.isLoading = true;

      const loadingEl = document.getElementById("channelLoading");
      const errorEl = document.getElementById("channelError");
      const errorMsg = document.getElementById("channelErrorMsg");
      const contentEl = document.getElementById("channelContentSection");
      const loadMoreBtn = document.getElementById("channelLoadMoreBtn");

      if (!isContinuation) {
        if (loadingEl) loadingEl.classList.remove("hidden");
        if (errorEl) errorEl.classList.add("hidden");
        if (contentEl) contentEl.classList.add("hidden");
        this.reels = [];
        this.selectedIds.clear();
      } else {
        if (loadMoreBtn) {
          loadMoreBtn.disabled = true;
          loadMoreBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin text-foreground inline-block mr-1.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg> Loading Next 100...
          `;
        }
      }

      try {
        const apiUrl = this.getApiUrl();
        const sessionId = this.getIgSession();

        const payload = {
          url: targetUrl,
          continuation: isContinuation ? this.continuationToken : null,
          sessionid: sessionId || null,
        };

        const res = await fetch(`${apiUrl}/api/channel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.details || data.error || `HTTP ${res.status}`);
        }

        if (data.status === "requires_session") {
          this.showSessionRequiredNotice(data.message, data.profile);
          return;
        }

        if (!isContinuation) {
          this.currentProfile = data.profile || { title: targetUrl };
          this.renderProfileBanner(this.currentProfile, data.platform);
        }

        const newItems = data.items || [];
        this.reels = isContinuation ? this.reels.concat(newItems) : newItems;
        this.continuationToken = data.pageInfo?.continuationToken || null;
        this.hasNextPage = Boolean(data.pageInfo?.hasNextPage && this.continuationToken);

        this.renderGrid(this.reels);
        this.updateCounters();

        if (contentEl) contentEl.classList.remove("hidden");
      } catch (err) {
        console.error("Channel fetch error:", err);
        if (errorEl && errorMsg) {
          errorMsg.textContent = err.message || "Failed to fetch channel reels. Please verify the URL.";
          errorEl.classList.remove("hidden");
        }
      } finally {
        this.isLoading = false;
        if (loadingEl) loadingEl.classList.add("hidden");
        if (loadMoreBtn) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = `<span>Load Next 100 Reels</span> <span class="text-xs">⏩</span>`;
          if (this.hasNextPage) {
            loadMoreBtn.classList.remove("hidden");
          } else {
            loadMoreBtn.classList.add("hidden");
          }
        }
      }
    }

    renderProfileBanner(profile, platform) {
      const banner = document.getElementById("channelProfileBanner");
      const avatarEl = document.getElementById("channelAvatar");
      const titleEl = document.getElementById("channelTitle");
      const badgeEl = document.getElementById("channelPlatformBadge");
      const bioEl = document.getElementById("channelBio");

      if (!banner) return;

      if (avatarEl) {
        if (profile.avatar) {
          avatarEl.src = profile.avatar;
          avatarEl.classList.remove("hidden");
        } else {
          avatarEl.classList.add("hidden");
        }
      }

      if (titleEl) {
        titleEl.textContent = profile.title || `@${profile.username}` || "Creator Channel";
      }

      if (badgeEl) {
        badgeEl.textContent = platform === "youtube" ? "YouTube Shorts" : "Instagram Reels";
        badgeEl.className = platform === "youtube" 
          ? "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-600/20 text-red-400 border border-red-500/30"
          : "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-pink-600/20 text-pink-400 border border-pink-500/30";
      }

      if (bioEl) {
        if (profile.bio) {
          bioEl.textContent = profile.bio;
          bioEl.classList.remove("hidden");
        } else {
          bioEl.classList.add("hidden");
        }
      }

      banner.classList.remove("hidden");
    }

    renderGrid(reels) {
      const grid = document.getElementById("channelReelsGrid");
      if (!grid) return;

      grid.innerHTML = "";

      if (reels.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-12 text-center text-muted-foreground text-sm">
            No public reels or shorts found on this channel.
          </div>
        `;
        return;
      }

      reels.forEach((item, index) => {
        const isSelected = this.selectedIds.has(item.id);
        const card = document.createElement("div");
        card.className = `group relative rounded-lg border overflow-hidden bg-card cursor-pointer transition select-none flex flex-col justify-between ${
          isSelected 
            ? "border-primary ring-2 ring-primary/40 bg-primary/5" 
            : "border-border hover:border-zinc-700"
        }`;
        card.dataset.id = item.id;

        const thumbnail = item.thumbnail || "assets/placeholder-reel.jpg";
        const title = item.title || `Reel #${index + 1}`;

        card.innerHTML = `
          <!-- Thumbnail Container (9:16 aspect ratio) -->
          <div class="relative w-full aspect-[9/16] bg-zinc-900 overflow-hidden">
            <img 
              src="${thumbnail}" 
              alt="${title.replace(/"/g, '&quot;')}" 
              loading="lazy"
              class="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'160\\' fill=\\'%2327272a\\'><rect width=\\'100\\' height=\\'160\\'/></svg>'"
            >

            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>

            <!-- Checkbox Badge (Top Right) -->
            <div class="absolute top-2 right-2 z-10">
              <div class="w-6 h-6 rounded-md border flex items-center justify-center transition ${
                isSelected 
                  ? "bg-primary border-primary text-primary-foreground shadow" 
                  : "bg-black/60 border-white/40 text-transparent group-hover:border-white"
              }">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>

            <!-- Duration or Reel Tag (Top Left) -->
            <div class="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono font-medium text-white/90">
              ${index + 1}
            </div>

            <!-- Bottom Caption Preview -->
            <div class="absolute bottom-2 left-2 right-2 z-10">
              <p class="text-xs font-medium text-white line-clamp-2 leading-snug drop-shadow-sm" title="${title.replace(/"/g, '&quot;')}">
                ${title}
              </p>
            </div>
          </div>

          <!-- Bottom Action Strip -->
          <div class="p-2 border-t border-border/50 bg-card/90 flex items-center justify-between gap-1 text-[11px]">
            <button 
              type="button" 
              class="quick-download-btn text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition"
              title="Download this single reel"
            >
              <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Download</span>
            </button>

            <a 
              href="${item.url}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="text-muted-foreground hover:text-foreground transition p-1"
              title="Open source on platform"
              onclick="event.stopPropagation();"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        `;

        // Card Click: Toggle Selection
        card.addEventListener("click", (e) => {
          if (e.target.closest(".quick-download-btn")) {
            e.stopPropagation();
            this.downloadSingle(item);
            return;
          }
          this.toggleSelection(item.id);
        });

        grid.appendChild(card);
      });
    }

    toggleSelection(id) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        if (this.selectedIds.size >= this.maxSelection) {
          alert(`Maximum ${this.maxSelection} reels can be selected at one time for download.`);
          return;
        }
        this.selectedIds.add(id);
      }
      this.renderGrid(this.reels);
      this.updateCounters();
    }

    selectAll() {
      const limit = Math.min(this.reels.length, this.maxSelection);
      for (let i = 0; i < limit; i++) {
        this.selectedIds.add(this.reels[i].id);
      }
      this.renderGrid(this.reels);
      this.updateCounters();
    }

    clearSelection() {
      this.selectedIds.clear();
      this.renderGrid(this.reels);
      this.updateCounters();
    }

    updateCounters() {
      const count = this.selectedIds.size;
      const countEls = [
        document.getElementById("channelSelectedCount"),
        document.getElementById("channelDownloadBtnCount"),
        document.getElementById("channelZipBtnCount"),
      ];

      countEls.forEach(el => {
        if (el) el.textContent = count;
      });

      const totalLoadedEl = document.getElementById("channelTotalLoaded");
      if (totalLoadedEl) {
        totalLoadedEl.textContent = this.reels.length;
      }

      const actionButtons = [
        document.getElementById("channelDownloadSelectedBtn"),
        document.getElementById("channelDownloadZipBtn"),
        document.getElementById("channelSendToClipperBtn"),
      ];

      actionButtons.forEach(btn => {
        if (btn) btn.disabled = count === 0;
      });
    }

    async loadMore() {
      const channelInput = document.getElementById("channelInput");
      const url = channelInput ? channelInput.value.trim() : null;
      if (url && this.continuationToken) {
        await this.fetchChannel(url, true);
      }
    }

    showSessionRequiredNotice(message, profile) {
      const errorEl = document.getElementById("channelError");
      const errorMsg = document.getElementById("channelErrorMsg");
      if (errorEl && errorMsg) {
        const username = profile?.username || "this account";
        errorMsg.innerHTML = `
          <div class="space-y-3 text-left">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                Instagram Protection
              </span>
              <p class="font-semibold text-foreground text-sm">Account Crawling Notice</p>
            </div>
            
            <p class="text-xs text-muted-foreground leading-relaxed">
              Instagram strictly restricts unauthenticated server crawling of complete creator profiles to prevent bot scraping. Single reels work anonymously without any login, but scraping all reels from <strong class="text-foreground">@${username}</strong> requires an Instagram session.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <!-- Option 1: Instant Bulk URLs (No login) -->
              <div class="p-3 rounded-md border border-border bg-card/60 flex flex-col justify-between">
                <div>
                  <div class="font-medium text-xs text-foreground mb-1 flex items-center gap-1.5">
                    <span>⚡ Option 1: Paste Reel Links</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">No Login</span>
                  </div>
                  <p class="text-[11px] text-muted-foreground leading-snug">
                    Paste multiple reel URLs directly into Bulk mode to download in 1080p or export as a ZIP without needing any cookie.
                  </p>
                </div>
                <button 
                  id="switchToBulkBtn" 
                  type="button" 
                  class="mt-3 w-full h-7 px-2.5 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  Switch to Bulk URLs
                </button>
              </div>

              <!-- Option 2: Add Instagram Session ID -->
              <div class="p-3 rounded-md border border-border bg-card/60 flex flex-col justify-between">
                <div>
                  <div class="font-medium text-xs text-foreground mb-1 flex items-center gap-1.5">
                    <span>🔑 Option 2: Add Session ID</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">Full 100 Grid</span>
                  </div>
                  <p class="text-[11px] text-muted-foreground leading-snug">
                    Provide your Instagram <code class="px-1 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">sessionid</code> cookie to unlock full 100-reel timeline browsing.
                  </p>
                </div>
                
                <div class="mt-2 space-y-1.5">
                  <div class="flex gap-1.5">
                    <input 
                      id="channelSessionInput" 
                      type="password" 
                      placeholder="Paste sessionid cookie..." 
                      class="flex-1 h-7 px-2 rounded bg-zinc-900 border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button 
                      id="saveSessionBtn" 
                      type="button" 
                      class="h-7 px-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
                    >
                      Save &amp; Fetch
                    </button>
                  </div>
                  <details class="text-[10px] text-muted-foreground">
                    <summary class="cursor-pointer hover:text-foreground">How to get sessionid in 15 seconds?</summary>
                    <ol class="mt-1 list-decimal list-inside space-y-0.5 text-zinc-400">
                      <li>Open instagram.com on your desktop browser.</li>
                      <li>Press F12 &rarr; Application (or Storage) &rarr; Cookies &rarr; instagram.com.</li>
                      <li>Double-click the <span class="font-mono text-zinc-200">sessionid</span> value, copy, and paste here.</li>
                    </ol>
                  </details>
                </div>
              </div>
            </div>
          </div>
        `;
        errorEl.classList.remove("hidden");

        const switchToBulkBtn = document.getElementById("switchToBulkBtn");
        if (switchToBulkBtn) {
          switchToBulkBtn.addEventListener("click", () => {
            const modeBulkBtn = document.getElementById("modeBulkBtn");
            if (modeBulkBtn) modeBulkBtn.click();
          });
        }

        const saveBtn = document.getElementById("saveSessionBtn");
        const sessionInput = document.getElementById("channelSessionInput");
        if (saveBtn && sessionInput) {
          saveBtn.addEventListener("click", () => {
            const val = sessionInput.value.trim();
            if (val) {
              localStorage.setItem("clipper_ig_session", val);
              const channelInput = document.getElementById("channelInput");
              if (channelInput && channelInput.value) {
                this.fetchChannel(channelInput.value.trim());
              }
            }
          });
        }
      }
    }

    async downloadSingle(item) {
      try {
        const apiUrl = this.getApiUrl();
        const resolveRes = await fetch(`${apiUrl}/api/resolve?url=${encodeURIComponent(item.url)}`);
        const data = await resolveRes.json();

        if (data.status === "success" && data.videoUrl) {
          const downloadUrl = `${apiUrl}/api/proxy?url=${encodeURIComponent(data.videoUrl)}&filename=${encodeURIComponent(item.id + ".mp4")}`;
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `${item.id}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.open(item.url, "_blank");
        }
      } catch (err) {
        console.error("Single download failed:", err);
        window.open(item.url, "_blank");
      }
    }

    async downloadSelected(asZip = false) {
      if (this.isDownloading || this.selectedIds.size === 0) return;
      this.isDownloading = true;

      const progressGroup = document.getElementById("channelProgressBarGroup");
      const progressMsg = document.getElementById("channelProgressMsg");
      const progressPct = document.getElementById("channelProgressPct");
      const progressBar = document.getElementById("channelProgressBar");

      if (progressGroup) progressGroup.classList.remove("hidden");

      const selectedItems = this.reels.filter(it => this.selectedIds.has(it.id));
      const total = selectedItems.length;
      let completed = 0;

      const apiUrl = this.getApiUrl();
      const zip = asZip && window.JSZip ? new window.JSZip() : null;

      try {
        for (let i = 0; i < total; i++) {
          const item = selectedItems[i];
          const pct = Math.round(((i) / total) * 100);

          if (progressMsg) progressMsg.textContent = `Processing reel ${i + 1} of ${total}: "${item.title.substring(0, 30)}..."`;
          if (progressPct) progressPct.textContent = `${pct}%`;
          if (progressBar) progressBar.style.width = `${pct}%`;

          try {
            // Resolve stream
            const res = await fetch(`${apiUrl}/api/resolve?url=${encodeURIComponent(item.url)}`);
            const data = await res.json();

            if (data.status === "success" && data.videoUrl) {
              const proxyUrl = `${apiUrl}/api/proxy?url=${encodeURIComponent(data.videoUrl)}&filename=${encodeURIComponent(item.id + ".mp4")}`;

              if (asZip && zip) {
                // Fetch blob for zip archive
                const blobRes = await fetch(proxyUrl);
                const blob = await blobRes.blob();
                const filename = `${String(i + 1).padStart(2, '0')}_${item.id}.mp4`;
                zip.file(filename, blob);
              } else {
                // Direct sequential download
                const a = document.createElement("a");
                a.href = proxyUrl;
                a.download = `${item.id}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // 400ms delay between consecutive browser downloads to prevent popup blocking
                await new Promise(r => setTimeout(r, 400));
              }
            }
          } catch (itemErr) {
            console.warn(`Failed downloading ${item.id}:`, itemErr);
          }

          completed++;
        }

        // Finalize ZIP
        if (asZip && zip) {
          if (progressMsg) progressMsg.textContent = "Compressing reels into ZIP archive...";
          if (progressPct) progressPct.textContent = "99%";
          if (progressBar) progressBar.style.width = "99%";

          const content = await zip.generateAsync({ type: "blob" });
          const zipUrl = URL.createObjectURL(content);
          const a = document.createElement("a");
          const safeName = (this.currentProfile?.username || this.currentProfile?.title || "reels").replace(/[^a-z0-9_-]/gi, "_");
          a.href = zipUrl;
          a.download = `${safeName}_${total}_reels.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(zipUrl);
        }

        if (progressMsg) progressMsg.textContent = `Completed ${completed} of ${total} reels successfully!`;
        if (progressPct) progressPct.textContent = "100%";
        if (progressBar) progressBar.style.width = "100%";

        setTimeout(() => {
          if (progressGroup) progressGroup.classList.add("hidden");
        }, 4000);
      } catch (err) {
        console.error("Bulk download error:", err);
        if (progressMsg) progressMsg.textContent = "Bulk download finished with some errors.";
      } finally {
        this.isDownloading = false;
      }
    }

    sendSelectedToClipper() {
      const selectedItems = this.reels.filter(it => this.selectedIds.has(it.id));
      if (selectedItems.length === 0) return;

      // Send the first selected video to the URL input and switch to studio mode
      const first = selectedItems[0];
      const urlInput = document.getElementById("urlInput");
      const modeStudioBtn = document.getElementById("modeStudioBtn");

      if (urlInput && modeStudioBtn) {
        urlInput.value = first.url;
        modeStudioBtn.click();
        const fetchBtn = document.getElementById("fetchBtn");
        if (fetchBtn) fetchBtn.click();
      }
    }
  }

  window.channelDownloader = new ChannelDownloader();
})();

/**
 * Clipper - Multi-Engine Downloader & Stream Resolver
 */

class DownloaderEngine {
  constructor() {
    this.defaultSettings = {
      // User can point to their own Cloudflare Worker or Python backend
      apiUrl: localStorage.getItem("clipper_api_url") || "",
      apiMode: localStorage.getItem("clipper_api_mode") || "smart", // "smart", "worker", "custom"
      autoDownload: localStorage.getItem("clipper_auto_download") === "true",
      maxRetries: 2
    };

    // Platform-specific error messages for unsupported client-side platforms
    this.backendRequiredMessages = {
      instagram: "Instagram requires a backend proxy to bypass CORS restrictions. Deploy the included Cloudflare Worker (free) and configure it in Settings ⚙️.",
      facebook: "Facebook requires a backend proxy to bypass CORS restrictions. Deploy the included Cloudflare Worker (free) and configure it in Settings ⚙️.",
      reddit: "Reddit video extraction requires a backend proxy. Deploy the included Cloudflare Worker (free) and configure it in Settings ⚙️."
    };
  }

  /**
   * Resolves a media URL to downloadable stream formats and metadata.
   * @param {string} rawUrl - The user-pasted link
   * @param {function} onProgress - Callback for status updates
   * @returns {Promise<object>} Video metadata and format links
   */
  async resolve(rawUrl, onProgress = () => {}) {
    const cleanUrl = cleanTrackingParams(rawUrl);
    const platform = detectPlatform(cleanUrl);

    onProgress({ stage: "detecting", message: `Detected ${platform ? platform.name : "URL"}...` });

    // 1. Direct Video Link Strategy
    if (platform && platform.id === "direct") {
      onProgress({ stage: "resolving", message: "Preparing direct media stream..." });
      return this.resolveDirectVideo(cleanUrl);
    }

    // 2. Custom Backend / Worker Strategy (if user configured one)
    if (this.defaultSettings.apiUrl) {
      try {
        onProgress({ stage: "connecting", message: "Connecting to configured backend..." });
        return await this.resolveViaBackend(cleanUrl, this.defaultSettings.apiUrl);
      } catch (backendErr) {
        console.warn("Configured backend failed, falling back to smart client resolvers:", backendErr);
      }
    }

    // 3. Platform-Specific High-Speed Resolvers
    if (platform && platform.id === "tiktok") {
      try {
        onProgress({ stage: "resolving", message: "Extracting TikTok HD stream (No Watermark)..." });
        return await this.resolveTikTok(cleanUrl);
      } catch (err) {
        console.warn("TikWM failed, trying fallback...", err);
      }
    }

    if (platform && platform.id === "twitter") {
      try {
        onProgress({ stage: "resolving", message: "Extracting X/Twitter video..." });
        return await this.resolveTwitter(cleanUrl);
      } catch (err) {
        console.warn("FxTwitter failed, trying fallback...", err);
      }
    }

    if (platform && platform.id === "youtube") {
      try {
        onProgress({ stage: "resolving", message: "Extracting YouTube stream..." });
        return await this.resolveYouTube(cleanUrl);
      } catch (err) {
        console.warn("YouTube client resolver failed, trying fallback...", err);
      }
    }

    // 4. No client-side resolver available — show platform-specific guidance
    const platformId = platform ? platform.id : "unknown";
    const backendMsg = this.backendRequiredMessages[platformId];
    if (backendMsg) {
      throw new Error(backendMsg);
    }

    throw new Error(
      `No client-side resolver available for this platform. Configure a backend proxy in Settings ⚙️ or check that the URL is a valid public video link.`
    );
  }

  /**
   * Directly resolves MP4/WebM files
   */
  resolveDirectVideo(url) {
    const filename = url.split("/").pop().split("?")[0] || "video.mp4";
    return {
      status: "success",
      platform: "direct",
      title: filename,
      author: "Direct Link",
      thumbnailUrl: null,
      videoUrl: url,
      audioUrl: null,
      formats: [
        { label: "Original MP4 Video", url: url, quality: "Original", ext: "mp4" }
      ]
    };
  }

  /**
   * TikTok Watermark-free resolver via TikWM API (CORS enabled)
   */
  async resolveTikTok(url) {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`TikTok API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data) {
      throw new Error(data.msg || "Failed to parse TikTok video");
    }

    const d = data.data;
    const formats = [];

    // HD watermark-free video
    if (d.hdplay) {
      formats.push({
        label: "HD (No Watermark)",
        url: d.hdplay,
        quality: "1080p HD",
        ext: "mp4",
        size: d.hd_size
      });
    }

    // Standard watermark-free video
    if (d.play) {
      formats.push({
        label: "Standard (No Watermark)",
        url: d.play,
        quality: "720p",
        ext: "mp4",
        size: d.size
      });
    }

    // Audio / Music track
    if (d.music) {
      formats.push({
        label: "Audio Track (MP3)",
        url: d.music,
        quality: "Audio MP3",
        ext: "mp3"
      });
    }

    return {
      status: "success",
      platform: "tiktok",
      id: d.id,
      title: d.title || "TikTok Video",
      author: d.author ? (d.author.nickname || d.author.unique_id) : "TikTok Creator",
      authorHandle: d.author?.unique_id ? `@${d.author.unique_id}` : null,
      thumbnailUrl: d.cover || d.origin_cover,
      duration: d.duration,
      videoUrl: d.hdplay || d.play,
      audioUrl: d.music || null,
      formats: formats
    };
  }

  /**
   * Twitter / X resolver via fxtwitter API
   */
  async resolveTwitter(url) {
    const match = url.match(/\/status\/(\d+)/);
    if (!match) throw new Error("Invalid Twitter / X post link.");
    
    const tweetId = match[1];
    const apiUrl = `https://api.fxtwitter.com/status/${tweetId}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Twitter API returned status ${response.status}`);
    
    const data = await response.json();
    if (!data.tweet) throw new Error("Tweet not found or private.");
    
    const tweet = data.tweet;
    const media = tweet.media;

    if (!media || !media.videos || media.videos.length === 0) {
      throw new Error("This tweet does not contain any video media.");
    }

    const video = media.videos[0];
    const formats = [];

    if (video.variants && video.variants.length > 0) {
      video.variants.forEach((variant) => {
        if (variant.content_type === "video/mp4") {
          let quality = "Standard";
          if (variant.url.includes("1080")) quality = "1080p HD";
          else if (variant.url.includes("720")) quality = "720p HD";
          else if (variant.url.includes("480")) quality = "480p";
          else if (variant.url.includes("360")) quality = "360p";

          formats.push({
            label: `MP4 (${quality})`,
            url: variant.url,
            quality: quality,
            ext: "mp4"
          });
        }
      });
    }

    if (formats.length === 0 && video.url) {
      formats.push({
        label: "Direct MP4 Video",
        url: video.url,
        quality: "HD",
        ext: "mp4"
      });
    }

    return {
      status: "success",
      platform: "twitter",
      id: tweet.id,
      title: tweet.text || "X (Twitter) Video",
      author: tweet.author ? tweet.author.name : "X User",
      authorHandle: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : null,
      thumbnailUrl: video.thumbnail_url || null,
      duration: video.duration,
      videoUrl: formats[0]?.url || video.url,
      audioUrl: null,
      formats: formats
    };
  }

  /**
   * YouTube and Shorts resolver via CORS-enabled public Piped stream proxies
   */
  async resolveYouTube(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (!match) throw new Error("Invalid YouTube link format.");

    const videoId = match[1];
    const pipedInstances = [
      "https://api.piped.private.coffee",
      "https://pipedapi.kavin.rocks",
      "https://piped.video"
    ];

    let lastErr = null;
    for (const inst of pipedInstances) {
      try {
        const res = await fetch(`${inst}/streams/${videoId}`);
        if (!res.ok) continue;
        const data = await res.json();

        if (data && data.videoStreams && data.videoStreams.length > 0) {
          const formats = [];

          // Progressive muxed video streams
          data.videoStreams.forEach(s => {
            if (!s.videoOnly && s.url) {
              formats.push({
                label: `MP4 (${s.quality || "360p"})`,
                url: s.url,
                quality: s.quality || "Standard",
                ext: "mp4"
              });
            }
          });

          // Fallback to all video streams if none muxed
          if (formats.length === 0) {
            data.videoStreams.forEach(s => {
              if (s.url) {
                formats.push({
                  label: `${s.format || "MP4"} (${s.quality || "HD"})`,
                  url: s.url,
                  quality: s.quality || "HD",
                  ext: s.format ? s.format.toLowerCase() : "mp4"
                });
              }
            });
          }

          // Audio streams
          if (data.audioStreams && data.audioStreams.length > 0) {
            const bestAudio = data.audioStreams[0];
            formats.push({
              label: `Audio (${bestAudio.format || "M4A"} ${bestAudio.quality || ""})`.trim(),
              url: bestAudio.url,
              quality: "audio",
              ext: "mp3"
            });
          }

          if (formats.length > 0) {
            return {
              status: "success",
              platform: "youtube",
              id: videoId,
              title: data.title || "YouTube Video",
              author: data.uploader || "YouTube Creator",
              authorHandle: data.uploaderUrl ? data.uploaderUrl.split("/").pop() : null,
              thumbnailUrl: data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: data.duration,
              videoUrl: formats[0].url,
              audioUrl: data.audioStreams && data.audioStreams.length > 0 ? data.audioStreams[0].url : null,
              formats: formats
            };
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error("Unable to extract YouTube video stream directly.");
  }

  /**
   * Resolves via custom backend (Cloudflare Worker or Python FastAPI)
   */
  async resolveViaBackend(url, backendUrl) {
    let cleanEndpoint = backendUrl.trim().replace(/\/+$/, "");
    if (!cleanEndpoint.includes("/api/resolve")) {
      cleanEndpoint += "/api/resolve";
    }

    const target = `${cleanEndpoint}?url=${encodeURIComponent(url)}`;
    const res = await fetch(target);
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || errorJson.detail || `Backend responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return data;
  }

  /**
   * Forces the browser to download the file directly with a clean filename
   * @param {string} url - Direct media download link
   * @param {string} filename - Desired local file name
   * @param {function} onProgress - Progress reporting callback
   */
  async downloadFile(url, filename = "video.mp4", onProgress = () => {}) {
    onProgress(10, "Starting download stream...");

    try {
      // Try fetch blob method first (best for controlling file name and progress)
      const response = await fetch(url, { mode: "cors" });
      
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status}`);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let loaded = 0;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          const pct = Math.round((loaded / total) * 100);
          onProgress(pct, `Downloading... ${pct}%`);
        } else {
          onProgress(50, `Downloading (${(loaded / 1024 / 1024).toFixed(1)} MB)...`);
        }
      }

      onProgress(98, "Finishing file assembly...");
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);

      this.triggerDownloadLink(blobUrl, filename);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      onProgress(100, "Download Complete!");
      return true;

    } catch (corsErr) {
      console.warn("Direct blob download restricted by CORS, triggering native browser download:", corsErr);
      
      // Fallback: If configured with a worker proxy, use the proxy
      if (this.defaultSettings.apiUrl) {
        const proxyUrl = `${this.defaultSettings.apiUrl.replace(/\/+$/, "")}/api/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        this.triggerDownloadLink(proxyUrl, filename);
        onProgress(100, "Download triggered via proxy!");
        return true;
      }

      // Direct fallback: Anchor link trigger
      onProgress(100, "Opening browser download stream...");
      this.triggerDownloadLink(url, filename);
      return true;
    }
  }

  /**
   * Helper to trigger download via anchor tag
   */
  triggerDownloadLink(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Global instance
window.downloaderEngine = new DownloaderEngine();


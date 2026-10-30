/**
 * Clipper - Multi-Engine Downloader & Stream Resolver
 */

class DownloaderEngine {
  constructor() {
    this.defaultSettings = {
      // User can point to their own Cloudflare Worker or Python backend or Cobalt
      apiUrl: localStorage.getItem("clipper_api_url") || "",
      apiMode: localStorage.getItem("clipper_api_mode") || "smart", // "smart", "worker", "cobalt", "custom"
      autoDownload: localStorage.getItem("clipper_auto_download") === "true",
      maxRetries: 2
    };

    // Built-in public fallback instances
    this.cobaltInstances = [
      "https://cobalt.canine.tools",
      "https://api.cobalt.tools"
    ];
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

    // 4. Cobalt Resolver Strategy (for Instagram Reels, YouTube Shorts, Reddit, Facebook)
    onProgress({ stage: "resolving", message: `Resolving ${platform ? platform.name : "video"} stream...` });
    try {
      return await this.resolveViaCobalt(cleanUrl);
    } catch (cobaltErr) {
      console.warn("Cobalt resolution error:", cobaltErr);
      
      // If Instagram failed due to anti-bot restrictions, throw informative error with instructions
      if (platform && platform.id === "instagram") {
        throw new Error(
          "Instagram has strict anti-bot protections. To download Instagram Reels seamlessly, you can connect our free 1-click Cloudflare Worker or Python backend in the Settings menu (⚙️)!"
        );
      }
      
      throw new Error(
        cobaltErr.message || `Unable to fetch media from this link. Please check if the post is public and available.`
      );
    }
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
   * Resolves via Cobalt API specification
   */
  async resolveViaCobalt(url) {
    let lastError = null;

    // Try available instances
    for (const endpoint of this.cobaltInstances) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: url,
            vQuality: "1080",
            filenameStyle: "pretty"
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.code || `HTTP ${res.status}`);
        }

        const data = await res.json();

        // Handle Cobalt stream/redirect response
        if (data.status === "redirect" || data.status === "tunnel" || data.url) {
          const mediaUrl = data.url;
          return {
            status: "success",
            platform: "generic",
            title: data.filename || "Downloaded Video",
            author: "Media Creator",
            thumbnailUrl: null,
            videoUrl: mediaUrl,
            audioUrl: null,
            formats: [
              { label: "HD MP4 Video", url: mediaUrl, quality: "1080p/Best", ext: "mp4" }
            ]
          };
        }

        if (data.status === "picker" && Array.isArray(data.picker)) {
          const formats = data.picker.map((item, idx) => ({
            label: item.type === "photo" ? `Photo ${idx + 1}` : `Video Clip ${idx + 1}`,
            url: item.url,
            quality: "Original",
            ext: item.type === "photo" ? "jpg" : "mp4"
          }));

          return {
            status: "success",
            platform: "generic",
            title: "Media Carousel",
            author: "Media Creator",
            thumbnailUrl: data.picker[0]?.thumb || null,
            videoUrl: data.picker[0]?.url,
            formats: formats
          };
        }

        throw new Error(data.error?.code || "Cobalt returned unknown status");
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("All public extraction endpoints are currently busy.");
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

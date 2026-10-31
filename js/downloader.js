/**
 * Clipper - Multi-Engine Downloader & Stream Resolver
 */

class DownloaderEngine {
  constructor() {
    this.defaultSettings = {
      // Default to live Cloudflare Worker proxy or user-configured endpoint
      apiUrl: localStorage.getItem("clipper_api_url") || "https://clipper-resolver.download-reels.workers.dev",
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

    // 1. Direct Video Link Strategy (instant)
    if (platform && platform.id === "direct") {
      onProgress({ stage: "resolving", message: "Preparing direct media stream..." });
      return this.resolveDirectVideo(cleanUrl);
    }

    // 2. High-Speed Client Resolvers (TikTok & YouTube Invidious HD operate client-side with CORS enabled)
    if (platform && platform.id === "tiktok") {
      try {
        onProgress({ stage: "resolving", message: "Extracting TikTok HD stream (No Watermark)..." });
        return await this.resolveTikTok(cleanUrl);
      } catch (err) {
        console.warn("Client TikWM failed, trying backend fallback...", err);
      }
    }

    if (platform && platform.id === "youtube") {
      try {
        onProgress({ stage: "resolving", message: "Extracting YouTube HD streams..." });
        return await this.resolveYouTube(cleanUrl);
      } catch (err) {
        console.warn("Client YouTube resolver failed, trying backend fallback...", err);
      }
    }

    // 3. Custom Backend / Worker Strategy (for Instagram, Facebook, Reddit, YouTube)
    if (this.defaultSettings.apiUrl) {
      try {
        onProgress({ stage: "connecting", message: "Connecting to media resolver engine..." });
        return await this.resolveViaBackend(cleanUrl, this.defaultSettings.apiUrl);
      } catch (backendErr) {
        console.warn("Backend resolver returned error, trying client fallbacks:", backendErr);
        if (backendErr.message && (
          backendErr.message.includes("does not contain any video") ||
          backendErr.message.includes("private") ||
          backendErr.message.includes("restricted")
        )) {
          throw backendErr;
        }
      }
    }

    // 4. Platform-Specific High-Speed Client Fallbacks
    if (platform && platform.id === "twitter") {
      try {
        onProgress({ stage: "resolving", message: "Extracting X/Twitter video..." });
        return await this.resolveTwitter(cleanUrl);
      } catch (err) {
        if (err.message && (err.message.includes("does not contain any video") || err.message.includes("No video found"))) {
          throw err;
        }
        console.warn("Twitter client resolver failed...", err);
      }
    }

    if (platform && platform.id === "youtube") {
      try {
        onProgress({ stage: "resolving", message: "Extracting YouTube stream..." });
        return await this.resolveYouTube(cleanUrl);
      } catch (err) {
        console.warn("YouTube client resolver failed...", err);
      }
    }

    // 5. No resolver succeeded — show clear guidance
    const platformId = platform ? platform.id : "unknown";
    const backendMsg = this.backendRequiredMessages[platformId];
    if (backendMsg) {
      throw new Error(backendMsg);
    }

    throw new Error(
      `Unable to extract video from this link. Please verify the post is public and contains active video media.`
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

    // Audio / Music tracks (320kbps & original)
    if (d.music) {
      formats.push({
        label: "MP3 Audio (320 kbps Ultra HQ)",
        url: d.music,
        quality: "320kbps MP3",
        ext: "mp3",
        isAudio: true,
        bitrate: "320k"
      });
      formats.push({
        label: "Audio Track (Original MP3)",
        url: d.music,
        quality: "Audio MP3",
        ext: "mp3",
        isAudio: true
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
   * Twitter / X resolver via fxtwitter API and vxtwitter fallback
   */
  async resolveTwitter(url) {
    const match = url.match(/\/status\/(\d+)/);
    if (!match) throw new Error("Invalid Twitter / X post link.");
    
    const tweetId = match[1];
    let lastErr = null;

    // 1. Try FixTweet / FxTwitter API
    try {
      const response = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tweet) {
          const tweet = data.tweet;
          const media = tweet.media;

          if (!media || !media.videos || media.videos.length === 0) {
            throw new Error("This X/Twitter post does not contain any video media.");
          }

          const video = media.videos[0];
          const formats = [];

          if (video.variants && video.variants.length > 0) {
            video.variants.forEach((variant) => {
              if (variant.content_type === "video/mp4" || (variant.url && variant.url.includes(".mp4"))) {
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

          if (formats.length > 0) {
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
        }
      }
    } catch (fxErr) {
      if (fxErr.message && fxErr.message.includes("does not contain any video")) {
        throw fxErr;
      }
      lastErr = fxErr;
    }

    // 2. Try vxTwitter JSON fallback
    try {
      const vxRes = await fetch(`https://api.vxtwitter.com/status/${tweetId}`);
      if (vxRes.ok) {
        const vxData = await vxRes.json();
        if (vxData.hasMedia === false || (vxData.media_extended && vxData.media_extended.length === 0)) {
          throw new Error("This X/Twitter post does not contain any video media.");
        }
        if (vxData.media_extended && vxData.media_extended.length > 0) {
          const videoItem = vxData.media_extended.find(m => m.type === "video" || m.type === "gif");
          if (videoItem && videoItem.url) {
            return {
              status: "success",
              platform: "twitter",
              id: vxData.tweetID,
              title: vxData.text || "X (Twitter) Video",
              author: vxData.user_name || "X User",
              authorHandle: vxData.user_screen_name ? `@${vxData.user_screen_name}` : null,
              thumbnailUrl: videoItem.thumbnail_url || null,
              videoUrl: videoItem.url,
              formats: [
                { label: "Original MP4 Video (HD)", url: videoItem.url, quality: "HD", ext: "mp4" }
              ]
            };
          }
        }
      }
    } catch (vxErr) {
      if (vxErr.message && vxErr.message.includes("does not contain any video")) {
        throw vxErr;
      }
    }

    throw lastErr || new Error("Unable to extract video from this X/Twitter post. Ensure the tweet is public and contains video.");
  }

  /**
   * YouTube and Shorts resolver via Invidious (Adaptive HD) + CORS-enabled public Piped stream proxies
   */
  async resolveYouTube(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (!match) throw new Error("Invalid YouTube link format.");

    const videoId = match[1];
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // 1. First try Invidious for full adaptive 1080p / 720p / 480p / 360p & audio streams
    const invidiousInstances = [
      "https://yt.chocolatemoo53.com"
    ];

    for (const inst of invidiousInstances) {
      try {
        const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
          headers: {
            "Accept": "application/json"
          }
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (data && data.adaptiveFormats && data.adaptiveFormats.length > 0) {
          return this.buildYouTubeInvidiousResult(videoId, data, thumbnailUrl);
        }
      } catch (_) {}
    }

    // 2. Fallback to Piped for progressive streams
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

          // Progressive muxed video streams & adaptive qualities
          const seenQualities = new Set();
          
          data.videoStreams.forEach(s => {
            if (s.url) {
              const qualityStr = s.quality || "360p";
              const key = `${qualityStr}_${s.format || "mp4"}`;
              if (!seenQualities.has(key)) {
                seenQualities.add(key);
                formats.push({
                  label: `MP4 (${qualityStr})`,
                  url: s.url,
                  quality: qualityStr,
                  ext: "mp4",
                  videoOnly: Boolean(s.videoOnly)
                });
              }
            }
          });

          // Dedicated YouTube to MP3 Converter audio streams (320kbps, 192kbps, original)
          if (data.audioStreams && data.audioStreams.length > 0) {
            const bestAudio = data.audioStreams[0];
            
            // 320kbps HQ MP3
            formats.push({
              label: "MP3 Audio (320 kbps Ultra HQ)",
              url: bestAudio.url,
              quality: "320kbps MP3",
              ext: "mp3",
              isAudio: true,
              bitrate: "320k"
            });

            // 192kbps Standard MP3
            formats.push({
              label: "MP3 Audio (192 kbps Standard)",
              url: bestAudio.url,
              quality: "192kbps MP3",
              ext: "mp3",
              isAudio: true,
              bitrate: "192k"
            });

            // Original M4A track
            formats.push({
              label: `Original Audio (${bestAudio.format || "M4A"})`,
              url: bestAudio.url,
              quality: "Original Audio",
              ext: "m4a",
              isAudio: true
            });
          } else if (formats.length > 0 && !formats[0].videoOnly) {
            // Muxed video stream already contains full audio: expose client FFmpeg MP3 options
            formats.push({
              label: "MP3 Audio (320 kbps Ultra HQ)",
              url: formats[0].url,
              quality: "320kbps MP3",
              ext: "mp3",
              isAudio: true,
              bitrate: "320k",
              needsConversion: true
            });
            formats.push({
              label: "MP3 Audio (192 kbps Standard)",
              url: formats[0].url,
              quality: "192kbps MP3",
              ext: "mp3",
              isAudio: true,
              bitrate: "192k",
              needsConversion: true
            });
          }

          if (formats.length > 0) {
            const audioSourceUrl = data.audioStreams && data.audioStreams.length > 0
              ? data.audioStreams[0].url
              : (!formats[0].videoOnly ? formats[0].url : null);

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
              audioUrl: audioSourceUrl,
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
   * Helper to determine video format height tier (works universally for Shorts and Landscape)
   */
  getFormatHeight(v) {
    if (v.qualityLabel) {
      const qMatch = v.qualityLabel.match(/(\d+)p/i);
      if (qMatch) return parseInt(qMatch[1], 10);
    }
    if (v.size) {
      const parts = v.size.split("x").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.min(parts[0], parts[1]);
      }
    }
    if (v.resolution) {
      const rMatch = v.resolution.match(/(\d+)p/i);
      if (rMatch) {
        const val = parseInt(rMatch[1], 10);
        if (val >= 1920) return 1080;
        if (val >= 1280) return 720;
        if (val >= 854) return 480;
        if (val >= 640) return 360;
        return val;
      }
    }
    return 0;
  }

  /**
   * Constructs YouTube result with Adaptive 1080p/720p/480p formats from Invidious
   */
  buildYouTubeInvidiousResult(videoId, data, thumbnailUrl) {
    const formats = [];
    const adaptive = data.adaptiveFormats || [];

    // Extract best audio track (m4a AAC preferred for fast MP4 container remuxing)
    const audioStreams = adaptive.filter(f => {
      const isAudio = f.type && f.type.includes("audio");
      const isM4a = f.container === "m4a" || (f.mime && f.mime.includes("mp4")) || (f.type && f.type.includes("audio/mp4"));
      return isAudio && isM4a;
    });
    const bestAudio = audioStreams.sort((a, b) => (parseInt(b.bitrate || "0", 10) - parseInt(a.bitrate || "0", 10)))[0]
      || adaptive.find(f => f.type && f.type.includes("audio"));
    const audioUrl = bestAudio ? bestAudio.url : null;

    // Extract video streams (prioritizing MP4 H.264 for instant remuxing)
    const isMp4H264 = v => {
      const isMp4 = v.container === "mp4" || (v.mime && v.mime.includes("mp4")) || (v.type && v.type.includes("mp4"));
      const isH264 = !v.encoding || v.encoding === "h264" || (v.type && v.type.includes("avc1"));
      return isMp4 && isH264;
    };
    const videoStreams = adaptive.filter(f => f.type && f.type.includes("video") && isMp4H264(f));

    const tiers = [
      { label: "1080p Full HD", quality: "1080p", minHeight: 1080 },
      { label: "720p HD", quality: "720p", minHeight: 720 },
      { label: "480p", quality: "480p", minHeight: 480 },
      { label: "360p", quality: "360p", minHeight: 360 }
    ];

    const addedTiers = new Set();
    tiers.forEach(tier => {
      const candidate = videoStreams.find(v => {
        const h = this.getFormatHeight(v);
        return h === tier.minHeight && !addedTiers.has(tier.quality);
      });

      if (candidate && candidate.url) {
        addedTiers.add(tier.quality);
        formats.push({
          label: tier.label,
          url: candidate.url,
          audioUrl: audioUrl,
          quality: tier.quality,
          ext: "mp4",
          videoOnly: true,
          needsMuxing: Boolean(audioUrl),
          size: candidate.clen ? parseInt(candidate.clen, 10) : undefined
        });
      }
    });

    // Direct progressive streams if available
    if (data.formatStreams && data.formatStreams.length > 0) {
      data.formatStreams.forEach(fs => {
        if (fs.url) {
          formats.push({
            label: `MP4 ${fs.resolution || "360p"} (Direct Stream)`,
            url: fs.url,
            quality: fs.resolution || "360p",
            ext: "mp4",
            videoOnly: false
          });
        }
      });
    }

    // Audio / MP3 format choices
    if (audioUrl) {
      formats.push({
        label: "MP3 Audio (320 kbps Ultra HQ)",
        url: audioUrl,
        quality: "320kbps MP3",
        ext: "mp3",
        isAudio: true,
        bitrate: "320k",
        needsConversion: true
      });
      formats.push({
        label: "MP3 Audio (192 kbps Standard)",
        url: audioUrl,
        quality: "192kbps MP3",
        ext: "mp3",
        isAudio: true,
        bitrate: "192k",
        needsConversion: true
      });
      formats.push({
        label: "Original Audio (M4A)",
        url: audioUrl,
        quality: "Original Audio",
        ext: "m4a",
        isAudio: true
      });
    }

    const directStreamUrl = (data.formatStreams && data.formatStreams[0]?.url) || null;

    return {
      status: "success",
      platform: "youtube",
      id: videoId,
      title: data.title || "YouTube Video",
      author: data.author || "YouTube Creator",
      authorHandle: null,
      thumbnailUrl: (() => {
        let rawThumb = (data.videoThumbnails && (
          data.videoThumbnails.find(t => t.quality === "high" || t.quality === "medium" || t.url?.includes("hqdefault"))?.url ||
          data.videoThumbnails.find(t => !t.url?.includes("maxres"))?.url ||
          data.videoThumbnails[0]?.url
        )) || thumbnailUrl;
        if (rawThumb && rawThumb.startsWith("/")) rawThumb = `https://i.ytimg.com${rawThumb}`;
        return rawThumb;
      })(),
      duration: data.lengthSeconds,
      videoUrl: directStreamUrl || formats[0]?.url || null,
      audioUrl: audioUrl,
      formats,
      source: "invidious"
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

    // If YouTube stream returned without explicit audio/MP3 formats, synthesize them from muxed stream
    if (data && data.formats && data.platform === "youtube") {
      const hasAudioFmt = data.formats.some(f => f.isAudio || f.ext === "mp3");
      if (!hasAudioFmt && data.formats.length > 0 && !data.formats[0].videoOnly) {
        data.formats.push({
          label: "MP3 Audio (320 kbps Ultra HQ)",
          url: data.formats[0].url,
          quality: "320kbps MP3",
          ext: "mp3",
          isAudio: true,
          bitrate: "320k",
          needsConversion: true
        });
        data.formats.push({
          label: "MP3 Audio (192 kbps Standard)",
          url: data.formats[0].url,
          quality: "192kbps MP3",
          ext: "mp3",
          isAudio: true,
          bitrate: "192k",
          needsConversion: true
        });
        data.audioUrl = data.audioUrl || data.formats[0].url;
      }
    }

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
   * Resolves a batch of URLs with controlled concurrency
   * @param {string[]} rawUrls
   * @param {function} onProgress
   * @returns {Promise<Array<{ url: string, status: "success"|"error", media?: object, error?: string }>>}
   */
  async resolveBatch(rawUrls = [], onProgress = () => {}) {
    const cleanUrls = Array.from(new Set(
      rawUrls.map(u => u.trim()).filter(u => u.length > 5 && (u.startsWith("http://") || u.startsWith("https://")))
    ));

    const results = new Array(cleanUrls.length);
    const concurrency = 2;
    let index = 0;
    let completed = 0;

    const runWorker = async () => {
      while (index < cleanUrls.length) {
        const currentIndex = index++;
        const targetUrl = cleanUrls[currentIndex];
        
        onProgress({
          stage: "resolving_batch",
          total: cleanUrls.length,
          completed,
          currentUrl: targetUrl
        });

        try {
          const media = await this.resolve(targetUrl);
          results[currentIndex] = {
            url: targetUrl,
            status: "success",
            media,
            error: null
          };
        } catch (err) {
          results[currentIndex] = {
            url: targetUrl,
            status: "error",
            media: null,
            error: err.message || "Failed to resolve link"
          };
        }

        completed++;
        onProgress({
          stage: "batch_item_done",
          total: cleanUrls.length,
          completed,
          currentUrl: targetUrl,
          itemResult: results[currentIndex]
        });
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, cleanUrls.length); i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
    return results;
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


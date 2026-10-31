/**
 * Clipper - Cloudflare Worker Proxy & Video Resolver v2.1
 * Provides CORS bypass and metadata/stream extraction for GitHub Pages frontend.
 * Free tier friendly: handles up to 100,000 requests/day at zero cost.
 *
 * Endpoints:
 *   GET /                        → Health check
 *   GET /api/resolve?url=<url>   → Resolve video metadata + all format streams
 *   GET /api/proxy?url=<url>&filename=<name>  → Proxy/stream any media URL
 *   GET /api/audio?url=<url>&filename=<name>  → Proxy audio stream
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    const url = new URL(request.url);

    // Root / Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({
        status: "ok",
        name: "Clipper Resolver Worker",
        version: "2.1.0",
        message: "Send requests to /api/resolve?url=<video-url>",
        endpoints: ["/api/resolve", "/api/proxy", "/api/audio"],
      });
    }

    // Resolve Endpoint
    if (url.pathname === "/api/resolve") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return jsonResponse({ error: "Missing required query parameter: 'url'" }, 400);
      }

      try {
        const result = await resolveMediaUrl(targetUrl);
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({
          error: "Failed to resolve video",
          details: err.message || String(err),
        }, 500);
      }
    }

    // Direct Media Proxy / Stream
    if (url.pathname === "/api/proxy") {
      const mediaUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "video.mp4";
      if (!mediaUrl) {
        return jsonResponse({ error: "Missing required query parameter: 'url'" }, 400);
      }

      try {
        return await proxyMedia(mediaUrl, filename, true);
      } catch (err) {
        return jsonResponse({ error: "Stream proxy failed", details: err.message }, 502);
      }
    }

    // Audio Stream Proxy
    if (url.pathname === "/api/audio") {
      const mediaUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "audio.m4a";
      if (!mediaUrl) {
        return jsonResponse({ error: "Missing required query parameter: 'url'" }, 400);
      }

      try {
        return await proxyMedia(mediaUrl, filename, true);
      } catch (err) {
        return jsonResponse({ error: "Audio proxy failed", details: err.message }, 502);
      }
    }

    return jsonResponse({ error: "Endpoint not found" }, 404);
  },
};

/**
 * Proxy any media URL through this worker with forced download headers
 */
async function proxyMedia(mediaUrl, filename, forceDownload = false) {
  const response = await fetch(mediaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": (() => { try { return new URL(mediaUrl).origin; } catch { return "https://www.google.com"; } })(),
    },
  });

  const newHeaders = new Headers();
  const ct = response.headers.get("content-type");
  if (ct) newHeaders.set("content-type", ct);
  const cl = response.headers.get("content-length");
  if (cl) newHeaders.set("content-length", cl);
  const cr = response.headers.get("content-range");
  if (cr) newHeaders.set("content-range", cr);
  const ar = response.headers.get("accept-ranges");
  if (ar) newHeaders.set("accept-ranges", ar);

  Object.entries(getCorsHeaders()).forEach(([k, v]) => newHeaders.set(k, v));

  if (forceDownload) {
    newHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

/**
 * Resolves media links across supported social platforms
 */
async function resolveMediaUrl(rawUrl) {
  const cleanUrl = rawUrl.trim();
  const parsed = new URL(cleanUrl);
  const host = parsed.hostname.toLowerCase();

  // Instagram
  if (host.includes("instagram.com")) {
    return await resolveInstagram(cleanUrl);
  }

  // YouTube & Shorts
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return await resolveYouTube(cleanUrl);
  }

  // TikTok
  if (host.includes("tiktok.com")) {
    return await resolveTikTok(cleanUrl);
  }

  // Facebook
  if (host.includes("facebook.com") || host.includes("fb.watch")) {
    return await resolveFacebook(cleanUrl);
  }

  // Twitter / X
  if (host.includes("twitter.com") || host.includes("x.com")) {
    return await resolveTwitter(cleanUrl);
  }

  // Reddit
  if (host.includes("reddit.com") || host.includes("redd.it")) {
    return await resolveReddit(cleanUrl);
  }

  // Generic / Direct Video
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(cleanUrl)) {
    return {
      status: "success",
      platform: "direct",
      title: "Direct Video Stream",
      videoUrl: cleanUrl,
      thumbnailUrl: null,
      formats: [
        { label: "Original MP4", url: cleanUrl, quality: "original" }
      ]
    };
  }

  return await scrapeOpenGraphMedia(cleanUrl);
}

/**
 * Resolves Instagram Reel or Post via Embed extraction
 */
async function resolveInstagram(url) {
  const shortcodeMatch = url.match(/\/(?:reel|reels|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    throw new Error("Invalid Instagram link. Please paste a reel or post URL (e.g., https://www.instagram.com/reel/CODE/).");
  }

  const shortcode = shortcodeMatch[1];
  const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/captioned/`;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const res = await fetch(embedUrl, { headers });
  if (!res.ok) {
    throw new Error(`Instagram embed returned HTTP ${res.status}. Reel may be private or restricted.`);
  }

  const html = await res.text();

  // Extract video_url
  let videoUrl = null;
  const idx = html.indexOf("video_url");
  if (idx !== -1) {
    const startHttps = html.indexOf("https:", idx);
    if (startHttps !== -1 && (startHttps - idx) < 50) {
      let endQuote = html.indexOf('\\"', startHttps);
      if (endQuote === -1) endQuote = html.indexOf('"', startHttps);
      if (endQuote > startHttps) {
        let rawUrl = html.substring(startHttps, endQuote);
        videoUrl = rawUrl.replace(/\\u0026/g, "&").replace(/\\+/g, "");
      }
    }
  }

  // Fallback regex for video_url
  if (!videoUrl) {
    const vm = html.match(/video_url[\"\\':\s]+(https?:[^\"]+?)(?:\"|\\)/i);
    if (vm && vm[1]) {
      videoUrl = vm[1].replace(/\\u0026/g, "&").replace(/\\+/g, "");
    }
  }

  if (!videoUrl) {
    throw new Error("Unable to extract video stream from this Instagram Reel. Ensure the account is public.");
  }

  // Extract caption / title
  let title = "Instagram Reel";
  const captionMatch = html.match(/<div class="Caption">([\s\S]*?)<\/div>/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
  if (captionMatch && captionMatch[1]) {
    title = captionMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (title.length > 80) title = title.substring(0, 80) + "...";
  }

  // Extract thumbnail / poster
  let thumbnail = null;
  const displayIdx = html.indexOf("display_url");
  if (displayIdx !== -1) {
    const startHttps = html.indexOf("https:", displayIdx);
    if (startHttps !== -1 && (startHttps - displayIdx) < 50) {
      let endQuote = html.indexOf('\\"', startHttps);
      if (endQuote === -1) endQuote = html.indexOf('"', startHttps);
      if (endQuote > startHttps) {
        thumbnail = html.substring(startHttps, endQuote).replace(/\\u0026/g, "&").replace(/\\+/g, "");
      }
    }
  }

  return {
    status: "success",
    platform: "instagram",
    id: shortcode,
    title,
    author: "Instagram Creator",
    thumbnailUrl: thumbnail,
    videoUrl,
    formats: [
      { label: "Original Reel (MP4 HD)", url: videoUrl, quality: "1080p/HD", ext: "mp4" },
      { label: "Standard MP4", url: videoUrl, quality: "720p", ext: "mp4" }
    ],
  };
}

/**
 * YouTube resolver using Invidious for Adaptive HD (1080p/720p/480p) + Piped fallback
 */
async function resolveYouTube(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (!match) throw new Error("Invalid YouTube URL. Please paste a valid youtube.com or youtu.be link.");

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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (data && data.adaptiveFormats && data.adaptiveFormats.length > 0) {
        return buildYouTubeInvidiousResult(videoId, data, thumbnailUrl);
      }
    } catch (_) {}
  }

  // 2. Fallback to Piped for progressive streams
  const pipedInstances = [
    "https://api.piped.private.coffee",
    "https://pipedapi.tokhmi.xyz",
    "https://api.piped.yt"
  ];

  let lastErr = null;
  for (const inst of pipedInstances) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json"
        }
      });
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;

      const data = await res.json().catch(() => null);
      if (!data || data.error) continue;

      if (data && (data.videoStreams?.length > 0 || data.audioStreams?.length > 0)) {
        return buildYouTubeResult(videoId, data, thumbnailUrl);
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Unable to extract YouTube streams. Please verify the video is public.");
}

function getFormatHeight(v) {
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

function buildYouTubeInvidiousResult(videoId, data, thumbnailUrl) {
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
      const h = getFormatHeight(v);
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

function buildYouTubeResult(videoId, data, thumbnailUrl) {
  const formats = [];
  const seenQualities = new Set();

  (data.videoStreams || []).forEach(s => {
    if (s.url) {
      const qualityStr = s.quality || "360p";
      const ext = s.format?.toLowerCase() === "webm" ? "webm" : "mp4";
      const key = `${qualityStr}_${ext}`;
      if (!seenQualities.has(key)) {
        seenQualities.add(key);
        formats.push({
          label: `${ext.toUpperCase()} ${qualityStr}${s.videoOnly ? " (Video Only)" : ""}`,
          url: s.url,
          quality: qualityStr,
          ext,
          videoOnly: Boolean(s.videoOnly),
        });
      }
    }
  });

  if (data.audioStreams && data.audioStreams.length > 0) {
    const bestAudio = data.audioStreams[0];
    const audioExt = bestAudio.format?.toLowerCase().includes("webm") ? "webm" : "m4a";

    formats.push({
      label: "MP3 320kbps (Ultra HQ)",
      url: bestAudio.url,
      quality: "320kbps MP3",
      ext: "mp3",
      isAudio: true,
      bitrate: "320k",
      needsConversion: true,
    });
    formats.push({
      label: "MP3 192kbps (Standard)",
      url: bestAudio.url,
      quality: "192kbps MP3",
      ext: "mp3",
      isAudio: true,
      bitrate: "192k",
      needsConversion: true,
    });
    formats.push({
      label: `Original Audio (${audioExt.toUpperCase()})`,
      url: bestAudio.url,
      quality: "Original Audio",
      ext: audioExt,
      isAudio: true,
    });
  } else if (formats.length > 0 && !formats[0].videoOnly) {
    // When YouTube / Piped only returns the progressive 360p stream, audio is present inside the video container.
    // Expose FFmpeg client-side conversion pills for MP3 extraction.
    formats.push({
      label: "MP3 Audio (320 kbps Ultra HQ)",
      url: formats[0].url,
      quality: "320kbps MP3",
      ext: "mp3",
      isAudio: true,
      bitrate: "320k",
      needsConversion: true,
    });
    formats.push({
      label: "MP3 Audio (192 kbps Standard)",
      url: formats[0].url,
      quality: "192kbps MP3",
      ext: "mp3",
      isAudio: true,
      bitrate: "192k",
      needsConversion: true,
    });
  }

  const audioSourceUrl = (data.audioStreams && data.audioStreams.length > 0)
    ? data.audioStreams[0].url
    : (formats.length > 0 && !formats[0].videoOnly ? formats[0].url : null);

  return {
    status: "success",
    platform: "youtube",
    id: videoId,
    title: data.title || "YouTube Video",
    author: data.uploader || "YouTube Creator",
    authorHandle: data.uploaderUrl ? data.uploaderUrl.split("/").pop() : null,
    thumbnailUrl: data.thumbnailUrl || thumbnailUrl,
    duration: data.duration,
    videoUrl: formats[0]?.url || null,
    audioUrl: audioSourceUrl,
    formats,
    source: "piped",
  };
}

/**
 * Resolves TikTok video via TikWM
 */
async function resolveTikTok(url) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    }
  });
  const data = await res.json().catch(err => ({ code: -99, msg: err.message }));

  if (data && data.code === 0 && data.data) {
    const d = data.data;
    const formats = [];

    if (d.hdplay) {
      formats.push({ label: "HD No Watermark (1080p)", url: d.hdplay, quality: "1080p HD", ext: "mp4" });
    }
    if (d.play && d.play !== d.hdplay) {
      formats.push({ label: "Standard No Watermark (720p)", url: d.play, quality: "720p", ext: "mp4" });
    }
    if (d.wmplay) {
      formats.push({ label: "With Watermark", url: d.wmplay, quality: "720p WM", ext: "mp4" });
    }
    if (d.music) {
      formats.push({ label: "MP3 Audio (320kbps)", url: d.music, quality: "320kbps MP3", ext: "mp3", isAudio: true, bitrate: "320k" });
    }

    return {
      status: "success",
      platform: "tiktok",
      id: d.id,
      title: d.title || "TikTok Video",
      author: d.author ? (d.author.nickname || d.author.unique_id) : "TikTok Creator",
      thumbnailUrl: d.origin_cover || d.cover,
      duration: d.duration,
      videoUrl: d.hdplay || d.play,
      audioUrl: d.music || null,
      formats,
    };
  }

  throw new Error(`TikWM response: code=${data?.code}, msg=${data?.msg || "unknown"}`);
}

/**
 * Resolves Facebook Reel or Share link
 */
async function resolveFacebook(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const res = await fetch(url, { headers, redirect: "follow" });
  const html = await res.text();

  const hdMatch = html.match(/browser_native_hd_url":"([^"]+)"/) || html.match(/"playable_url_quality_hd":"([^"]+)"/);
  const sdMatch = html.match(/browser_native_sd_url":"([^"]+)"/) || html.match(/"playable_url":"([^"]+)"/);
  const ogVideo = html.match(/<meta\s+(?:property|name)="og:video(?::secure_url)?"\s+content="([^"]+)"/i);
  const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  const thumbMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);

  const cleanStream = (u) => u ? decodeHtml(u.replace(/\\u0025/g, "%").replace(/\\u0026/g, "&").replace(/\\\//g, "/")) : null;

  const hdUrl = cleanStream(hdMatch?.[1]);
  const sdUrl = cleanStream(sdMatch?.[1]);
  const ogUrl = cleanStream(ogVideo?.[1]);

  const targetVideoUrl = hdUrl || sdUrl || ogUrl;
  if (targetVideoUrl) {
    const formats = [];
    if (hdUrl) formats.push({ label: "HD MP4 (1080p)", url: hdUrl, quality: "1080p HD", ext: "mp4" });
    if (sdUrl && sdUrl !== hdUrl) formats.push({ label: "Standard MP4 (720p)", url: sdUrl, quality: "720p", ext: "mp4" });
    if (formats.length === 0 && targetVideoUrl) formats.push({ label: "MP4 Video", url: targetVideoUrl, quality: "Standard", ext: "mp4" });

    return {
      status: "success",
      platform: "facebook",
      title: titleMatch ? decodeHtml(titleMatch[1]) : "Facebook Reel",
      author: "Facebook Creator",
      thumbnailUrl: thumbMatch ? cleanStream(thumbMatch[1]) : null,
      videoUrl: targetVideoUrl,
      formats,
    };
  }

  throw new Error("Unable to extract video from Facebook. The post may be private or restricted.");
}

/**
 * Resolves Twitter / X video using fxtwitter API and vxtwitter fallback
 */
async function resolveTwitter(url) {
  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) throw new Error("Invalid Twitter / X status URL format");

  const tweetId = idMatch[1];

  // 1. Try fxtwitter API
  try {
    const fxRes = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (fxRes.ok) {
      const data = await fxRes.json();
      if (data && data.tweet) {
        if (!data.tweet.media || !data.tweet.media.videos || data.tweet.media.videos.length === 0) {
          throw new Error("This X/Twitter post does not contain any video media.");
        }

        const videos = data.tweet.media.videos;
        const bestVideo = videos[0];

        const formats = (bestVideo.variants || [])
          .filter(v => v.url)
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
          .map(v => ({
            label: `MP4 ${v.url.includes("1080") ? "1080p" : v.url.includes("720") ? "720p" : v.url.includes("480") ? "480p" : "360p"}`,
            url: v.url,
            quality: v.url.includes("1080") ? "1080p" : v.url.includes("720") ? "720p" : v.url.includes("480") ? "480p" : "360p",
            ext: "mp4",
          }));

        if (formats.length === 0 && bestVideo.url) {
          formats.push({ label: "MP4 Video", url: bestVideo.url, quality: "HD", ext: "mp4" });
        }

        return {
          status: "success",
          platform: "twitter",
          title: data.tweet.text || "X (Twitter) Video",
          author: data.tweet.author ? `@${data.tweet.author.screen_name}` : "X User",
          thumbnailUrl: bestVideo.thumbnail_url || null,
          videoUrl: bestVideo.url,
          formats,
        };
      }
    }
  } catch (e) {
    if (e.message && e.message.includes("does not contain any video")) throw e;
  }

  // 2. Try vxtwitter fallback
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
            title: vxData.text || "X (Twitter) Video",
            author: vxData.user_name || "X User",
            thumbnailUrl: videoItem.thumbnail_url || null,
            videoUrl: videoItem.url,
            formats: [{ label: "Original MP4 Video", url: videoItem.url, quality: "HD", ext: "mp4" }],
          };
        }
      }
    }
  } catch (vxErr) {
    if (vxErr.message && vxErr.message.includes("does not contain any video")) throw vxErr;
  }

  throw new Error("Unable to extract video from this X/Twitter post. Ensure the tweet is public and contains video.");
}

/**
 * Scrapes Reddit video via post JSON API
 */
async function resolveReddit(url) {
  let targetUrl = url;
  if (url.includes("v.redd.it")) {
    try {
      const headRes = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
      if (headRes.url && !headRes.url.includes("v.redd.it")) {
        targetUrl = headRes.url;
      }
    } catch (_) {}
  }

  let jsonUrl = targetUrl.split("?")[0];
  if (jsonUrl.endsWith("/")) jsonUrl = jsonUrl.slice(0, -1);
  if (!jsonUrl.endsWith(".json")) jsonUrl += ".json";

  const res = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json",
    }
  });
  if (!res.ok) throw new Error("Could not fetch Reddit post data.");
  const data = await res.json();

  const post = data[0]?.data?.children[0]?.data;
  if (!post) throw new Error("Could not fetch Reddit post data.");

  const media = post.secure_media?.reddit_video || post.media?.reddit_video;
  if (media && media.fallback_url) {
    const baseUrl = media.fallback_url.split("DASH_")[0];
    const formats = [];

    if (media.height >= 1080) formats.push({ label: "MP4 1080p", url: `${baseUrl}DASH_1080.mp4`, quality: "1080p", ext: "mp4" });
    if (media.height >= 720) formats.push({ label: "MP4 720p", url: `${baseUrl}DASH_720.mp4`, quality: "720p", ext: "mp4" });
    if (media.height >= 480) formats.push({ label: "MP4 480p", url: `${baseUrl}DASH_480.mp4`, quality: "480p", ext: "mp4" });
    formats.push({ label: `MP4 ${media.height}p (Original)`, url: media.fallback_url, quality: `${media.height}p`, ext: "mp4" });

    return {
      status: "success",
      platform: "reddit",
      title: post.title || "Reddit Video",
      author: `u/${post.author}`,
      thumbnailUrl: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : null,
      videoUrl: media.fallback_url,
      formats,
    };
  }

  throw new Error("Reddit post does not contain native video media.");
}

/**
 * Generic OpenGraph fallback scraper
 */
async function scrapeOpenGraphMedia(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();

  const videoMatch = html.match(/<meta\s+(?:property|name)="og:video(?::secure_url)?"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:video(?::secure_url)?"/i);

  const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);

  const imageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);

  if (videoMatch && videoMatch[1]) {
    const videoUrl = decodeHtml(videoMatch[1]);
    return {
      status: "success",
      platform: "generic",
      title: titleMatch ? decodeHtml(titleMatch[1]) : "Web Video",
      thumbnailUrl: imageMatch ? decodeHtml(imageMatch[1]) : null,
      videoUrl,
      formats: [{ label: "Original Video", url: videoUrl, quality: "original", ext: "mp4" }],
    };
  }

  throw new Error("Unable to detect video stream from this link. The page may require login or has anti-bot restrictions.");
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...getCorsHeaders(),
    },
  });
}

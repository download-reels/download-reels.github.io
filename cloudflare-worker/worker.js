/**
 * Clipper - Cloudflare Worker Proxy & Video Resolver
 * Provides CORS bypass and metadata/stream extraction for GitHub Pages frontend.
 * Free tier friendly: handles up to 100,000 requests/day at zero cost.
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
        version: "1.0.0",
        message: "Send requests to /api/resolve?url=<video-url>",
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

    // Direct Media Proxy / Stream (helps force download if remote server blocks direct browser downloads)
    if (url.pathname === "/api/proxy") {
      const mediaUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "video.mp4";
      if (!mediaUrl) {
        return jsonResponse({ error: "Missing required query parameter: 'url'" }, 400);
      }

      try {
        const response = await fetch(mediaUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": new URL(mediaUrl).origin,
          },
        });

        const newHeaders = new Headers(response.headers);
        Object.entries(getCorsHeaders()).forEach(([key, val]) => newHeaders.set(key, val));
        newHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);

        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      } catch (err) {
        return jsonResponse({ error: "Stream proxy failed", details: err.message }, 502);
      }
    }

    return jsonResponse({ error: "Endpoint not found" }, 404);
  },
};

/**
 * Resolves media links across supported social platforms
 */
async function resolveMediaUrl(rawUrl) {
  const cleanUrl = rawUrl.trim();
  const parsed = new URL(cleanUrl);
  const host = parsed.hostname.toLowerCase();

  // TikTok
  if (host.includes("tiktok.com")) {
    return await resolveTikTok(cleanUrl);
  }

  // Instagram
  if (host.includes("instagram.com")) {
    return await resolveInstagram(cleanUrl);
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

  // Fallback to OpenGraph scraper
  return await scrapeOpenGraphMedia(cleanUrl);
}

/**
 * Resolves TikTok video via TikWM or direct oembed
 */
async function resolveTikTok(url) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ClipperBot/1.0)" }
  });
  const data = await res.json();

  if (data && data.code === 0 && data.data) {
    const d = data.data;
    return {
      status: "success",
      platform: "tiktok",
      id: d.id,
      title: d.title || "TikTok Video",
      author: d.author ? d.author.nickname : "TikTok Creator",
      thumbnailUrl: d.cover || d.origin_cover,
      duration: d.duration,
      videoUrl: d.play, // Watermark-free
      hdVideoUrl: d.hdplay || d.play,
      audioUrl: d.music || null,
      formats: [
        { label: "HD No Watermark", url: d.hdplay || d.play, quality: "1080p/HD" },
        { label: "Standard MP4", url: d.play, quality: "720p" },
        ...(d.music ? [{ label: "Audio Only (MP3)", url: d.music, quality: "audio" }] : [])
      ]
    };
  }

  throw new Error("Unable to extract TikTok video. Please ensure the link is public.");
}

/**
 * Resolves Instagram Reel or Post via OpenGraph and GraphQL inspection
 */
async function resolveInstagram(url) {
  // Normalize URL to /reel/ or /p/
  let fetchUrl = url;
  if (!fetchUrl.endsWith("/")) fetchUrl += "/";

  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Mode": "navigate",
  };

  const res = await fetch(fetchUrl, { headers });
  const html = await res.text();

  // Extract og:video
  const videoMatch = html.match(/<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+content="([^"]+)"\s+property="og:video(?::secure_url)?"/i);
  
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
                     
  const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);

  if (videoMatch && videoMatch[1]) {
    const rawVideoUrl = decodeHtml(videoMatch[1]);
    const title = titleMatch ? decodeHtml(titleMatch[1]) : "Instagram Reel";
    const thumbnail = imageMatch ? decodeHtml(imageMatch[1]) : null;

    return {
      status: "success",
      platform: "instagram",
      title: title,
      videoUrl: rawVideoUrl,
      thumbnailUrl: thumbnail,
      formats: [
        { label: "Original Reel (MP4)", url: rawVideoUrl, quality: "HD" }
      ]
    };
  }

  // Check JSON scripts in page
  const jsonMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.video && parsed.video.contentUrl) {
        return {
          status: "success",
          platform: "instagram",
          title: parsed.caption || parsed.name || "Instagram Reel",
          videoUrl: parsed.video.contentUrl,
          thumbnailUrl: parsed.video.thumbnailUrl || null,
          formats: [
            { label: "Original Reel (MP4)", url: parsed.video.contentUrl, quality: "HD" }
          ]
        };
      }
    } catch (_) {}
  }

  throw new Error("Instagram restricted public access for this reel. Make sure the account is public, or connect a private Cobalt instance.");
}

/**
 * Resolves Facebook Reel or Share link
 */
async function resolveFacebook(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const res = await fetch(url, { headers, redirect: "follow" });
  const html = await res.text();

  // Extract HD/SD video stream URLs
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
    if (hdUrl) formats.push({ label: "HD MP4 Video", url: hdUrl, quality: "1080p HD", ext: "mp4" });
    if (sdUrl && sdUrl !== hdUrl) formats.push({ label: "Standard MP4", url: sdUrl, quality: "720p", ext: "mp4" });
    if (formats.length === 0 && targetVideoUrl) formats.push({ label: "MP4 Video", url: targetVideoUrl, quality: "Standard", ext: "mp4" });

    return {
      status: "success",
      platform: "facebook",
      title: titleMatch ? decodeHtml(titleMatch[1]) : "Facebook Reel",
      author: "Facebook Creator",
      thumbnailUrl: thumbMatch ? cleanStream(thumbMatch[1]) : null,
      videoUrl: targetVideoUrl,
      formats: formats
    };
  }

  throw new Error("Unable to extract video stream from Facebook link. The post may be private or restricted.");
}

/**
 * Resolves Twitter / X video using fxtwitter API
 */
async function resolveTwitter(url) {
  // Extract status id
  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) {
    throw new Error("Invalid Twitter / X status URL format");
  }

  const tweetId = idMatch[1];
  const fxRes = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
  const data = await fxRes.json();

  if (data && data.tweet && data.tweet.media && data.tweet.media.videos) {
    const videos = data.tweet.media.videos;
    const bestVideo = videos[0];

    const formats = (bestVideo.variants || []).map((v, i) => ({
      label: `MP4 (${v.content_type || "video"})`,
      url: v.url,
      quality: v.url.includes("1080") ? "1080p" : v.url.includes("720") ? "720p" : "standard"
    }));

    if (formats.length === 0 && bestVideo.url) {
      formats.push({ label: "MP4 Video", url: bestVideo.url, quality: "HD" });
    }

    return {
      status: "success",
      platform: "twitter",
      title: data.tweet.text || "X (Twitter) Video",
      author: data.tweet.author ? `@${data.tweet.author.screen_name}` : "X User",
      thumbnailUrl: bestVideo.thumbnail_url || null,
      videoUrl: bestVideo.url,
      formats: formats
    };
  }

  throw new Error("No video found in this tweet/post.");
}

/**
 * Scrapes Reddit video via post JSON
 */
async function resolveReddit(url) {
  let jsonUrl = url.split("?")[0];
  if (!jsonUrl.endsWith(".json")) {
    if (jsonUrl.endsWith("/")) jsonUrl = jsonUrl.slice(0, -1);
    jsonUrl += ".json";
  }

  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Clipper/1.0" }
  });
  const data = await res.json();

  const post = data[0]?.data?.children[0]?.data;
  if (!post) throw new Error("Could not fetch Reddit post data.");

  const media = post.secure_media?.reddit_video || post.media?.reddit_video;
  if (media && media.fallback_url) {
    return {
      status: "success",
      platform: "reddit",
      title: post.title || "Reddit Video",
      author: `u/${post.author}`,
      thumbnailUrl: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : null,
      videoUrl: media.fallback_url,
      formats: [
        { label: `Reddit MP4 (${media.height}p)`, url: media.fallback_url, quality: `${media.height}p` }
      ]
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
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
      videoUrl: videoUrl,
      formats: [{ label: "Original Video", url: videoUrl, quality: "Original" }]
    };
  }

  throw new Error("Unable to detect video stream from link. The page may require login or has anti-bot restrictions.");
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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


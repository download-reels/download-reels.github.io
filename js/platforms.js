/**
 * Clipper - Platform Detection & URL Utilities
 */

const PLATFORMS = {
  INSTAGRAM: {
    id: "instagram",
    name: "Instagram",
    type: "Reels & Posts",
    color: "#E1306C",
    gradient: "from-pink-500 via-purple-600 to-amber-500",
    badgeBg: "rgba(225, 48, 108, 0.15)",
    badgeBorder: "rgba(225, 48, 108, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:reel|reels|p|tv|stories)\/([a-zA-Z0-9_-]+)/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>`
  },
  TIKTOK: {
    id: "tiktok",
    name: "TikTok",
    type: "Videos & Shorts",
    color: "#00F2FE",
    gradient: "from-cyan-400 via-sky-500 to-rose-500",
    badgeBg: "rgba(0, 242, 254, 0.15)",
    badgeBorder: "rgba(0, 242, 254, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/(?:@[\w.-]+\/video\/(\d+)|v\/(\d+)|t\/(\w+)|(\w+))/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V8.98a6.38 6.38 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05c1.47 1.05 3.28 1.68 5.23 1.74v-3.5a4.83 4.83 0 01-1.46-.6z"/>
    </svg>`
  },
  YOUTUBE: {
    id: "youtube",
    name: "YouTube",
    type: "Shorts & Videos",
    color: "#FF0000",
    gradient: "from-red-600 to-rose-700",
    badgeBg: "rgba(255, 0, 0, 0.15)",
    badgeBorder: "rgba(255, 0, 0, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>`
  },
  TWITTER: {
    id: "twitter",
    name: "X / Twitter",
    type: "Videos & Clips",
    color: "#1DA1F2",
    gradient: "from-sky-400 to-blue-600",
    badgeBg: "rgba(29, 161, 242, 0.15)",
    badgeBorder: "rgba(29, 161, 242, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:[a-zA-Z0-9_]+)\/status\/(\d+)/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>`
  },
  FACEBOOK: {
    id: "facebook",
    name: "Facebook",
    type: "Reels & Watch",
    color: "#1877F2",
    gradient: "from-blue-600 to-indigo-700",
    badgeBg: "rgba(24, 119, 242, 0.15)",
    badgeBorder: "rgba(24, 119, 242, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.|m\.|fb\.)?(?:facebook\.com|fb\.watch)\/(?:watch\/?\?v=|reel\/|reels\/|[a-zA-Z0-9.]+\/videos\/|videos\/|share\/r\/|share\/v\/)?([a-zA-Z0-9_-]+)/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>`
  },
  REDDIT: {
    id: "reddit",
    name: "Reddit",
    type: "Videos & Clips",
    color: "#FF4500",
    gradient: "from-orange-500 to-red-600",
    badgeBg: "rgba(255, 69, 0, 0.15)",
    badgeBorder: "rgba(255, 69, 0, 0.4)",
    regex: /(?:https?:\/\/)?(?:www\.|old\.|new\.)?(?:reddit\.com\/r\/[a-zA-Z0-9_]+\/comments\/([a-zA-Z0-9]+)|redd\.it\/([a-zA-Z0-9]+))/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.466 3.99a.327.327 0 0 0-.231.096.35.35 0 0 0 0 .486c.749.75 2.174.782 2.947.002a.341.341 0 0 0 0-.485.341.341 0 0 0-.488 0c-.49.49-1.536.467-2.003-.004a.34.34 0 0 0-.225-.095z"/>
    </svg>`
  },
  DIRECT: {
    id: "direct",
    name: "Direct Video",
    type: "MP4 / WebM",
    color: "#10B981",
    gradient: "from-emerald-400 to-teal-600",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.4)",
    regex: /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i,
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>`
  }
};

/**
 * Detects the platform from a given URL string.
 * @param {string} url - Input URL to test
 * @returns {object|null} Platform definition or null if unrecognized
 */
function detectPlatform(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Check direct video first
  if (PLATFORMS.DIRECT.regex.test(trimmed)) {
    return PLATFORMS.DIRECT;
  }

  // Check each platform
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    if (key === "DIRECT") continue;
    if (platform.regex.test(trimmed)) {
      return platform;
    }
  }

  return null;
}

/**
 * Strips tracking parameters from video URLs to prevent caching and bot detection issues.
 * @param {string} rawUrl - Full URL string
 * @returns {string} Sanitized URL
 */
function cleanTrackingParams(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());
    const trackingParams = [
      "igsh", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "si", "feature", "fbclid", "gclid", "t", "_r", "sender_device", "is_from_webapp"
    ];
    
    // For TikTok, keep params if needed, but remove tracking
    trackingParams.forEach(param => url.searchParams.delete(param));
    return url.toString();
  } catch (e) {
    return rawUrl.trim();
  }
}

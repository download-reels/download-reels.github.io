# Download Reels — Universal Video Downloader & YouTube to MP3

> The clean, ad-free, high-speed open-source alternative to SaveFrom.net. Download Instagram Reels, TikTok without watermarks, YouTube Shorts, X/Twitter, and convert to 320kbps MP3 directly in your browser.

🌐 **Live Web Utility**: [**https://download-reels.github.io/**](https://download-reels.github.io/)

---

## 💡 Why This Project Was Created

For over fifteen years, **SaveFrom.net** was one of the most visited websites on the internet, relied on daily by hundreds of millions of students, editors, educators, journalists, and everyday internet users to save educational clips, archive memories, and download audio.

With **SaveFrom.net shutting down**, a massive void was left in the web ecosystem. In its place, the search results have been overrun by predatory download portals filled with:
- **Intrusive and deceptive advertising**: Aggressive pop-unders, fake "virus detected" alerts, and unwanted notifications.
- **Paywalls & Artificial Throttling**: Demanding subscription fees or forcing users to wait 30 seconds in artificial queues to unlock 720p or 1080p downloads.
- **Watermarks & Degradation**: Forcing platform logos or downgrading audio streams to tinny 128kbps quality.
- **Privacy Invasion**: Harvesting user IPs, cookies, and browsing behaviors through invasive tracking scripts.

**Download Reels** was engineered as an uncompromising, modern, community-first answer to this problem. It is designed to be the fastest, cleanest, and most reliable web tool for saving digital media — forever free, forever ad-free, and running entirely on modern open web standards.

---

## ✨ Key Benefits & Features

### 1. 🛡️ 100% Ad-Free, Privacy-First Architecture
- **No ads, no popups, no redirects**: No banners, no sponsored links, no pop-under windows. Just a sleek, distraction-free interface.
- **No data mining**: No accounts required, no tracking pixels, and no analytics cookies. 
- **Client-side execution**: Your media requests are processed directly in your browser and on lightweight serverless edge edge workers without retaining any user logs.

### 2. ⚡ Blazing Fast Speed (Sub-200ms Load Time)
- **Zero Framework Overhead**: Built with pure vanilla JavaScript and a minified 24KB static stylesheet. No bloated 500KB client-side frameworks (no React, no Next.js runtime).
- **Global Anycast Edge CDN**: Hosted globally on GitHub Pages and Fastly CDN edges, ensuring near-instantaneous First Contentful Paint (<200ms) from anywhere in the world.
- **Instant Auto-Resolve on Paste**: Zero unnecessary clicks. The millisecond you paste a link from your clipboard, the engine automatically detects the platform, resolves stream metadata, and pre-renders the live preview frame.

### 3. 🎧 Studio-Grade YouTube to MP3 Converter (320kbps)
- **Ultra-High-Fidelity Audio**: Unlike common downloaders that downgrade audio to muffled 128kbps or 64kbps, Download Reels provides dedicated **320kbps Ultra HQ MP3** and **192kbps Standard MP3** audio streams.
- **Client-Side FFmpeg WebAssembly Studio**: Powered by WebAssembly (`@ffmpeg/ffmpeg`), conversions happen directly inside your browser using your machine's hardware threads. Your audio is never uploaded to third-party conversion servers.
- **Precision Trimming**: Built-in start and end timestamp sliders allow you to trim ringtones, sample intros, or extract specific musical bars before saving.

### 4. 🎬 Full HD Multi-Platform Coverage (No Watermarks)
- **TikTok**: Pristine 1080p HD watermark-free video downloads, plus 1-click extraction of original creator background audio tracks.
- **Instagram Reels**: Full-resolution progressive MP4 video streams for public reels, posts, and IGTV clips.
- **YouTube & Shorts**: All available progressive muxed MP4 formats (1080p, 720p, 480p, 360p) with immediate in-player stream switching.
- **Facebook Reels & Watch**: Both high-definition (HD 1080p) and standard-definition (SD 720p) stream extraction.
- **X / Twitter**: Direct extraction of native video bitrates without third-party compression.
- **Reddit**: Automated assembly of native video and DASH audio streams.
- **Direct Video Links**: Instant downloading and conversion for any direct `.mp4`, `.webm`, or `.mov` URL.

### 5. 📱 Seamless Mobile QR Code Handoff
- Browse and resolve videos on your desktop or laptop, then click **QR Code** to generate a scannable token.
- Point your iPhone or Android camera at the screen to instantly download the video directly to your mobile camera roll without cables or cloud syncing.

---

## 📊 Comparison: Download Reels vs. Traditional Tools

| Feature | Download Reels | Traditional Downloader Sites | SaveFrom.net (Historical) |
| :--- | :---: | :---: | :---: |
| **Ads & Popups** | **Zero (Completely Ad-Free)** | ❌ Excessive (3–6 popups per click) | ❌ Heavy banners & redirects |
| **Download Speed** | **Fastest (Direct Edge Streams)** | ⚠️ Throttled (unless paying VIP) | ⚠️ Moderate |
| **Auto-Resolve on Paste** | **Yes (0 extra clicks)** | ❌ No (requires clicking "Search") | ❌ No |
| **TikTok Watermark** | **Clean (No Watermark)** | ⚠️ Often stamped or degraded | ⚠️ Stamped |
| **Audio Quality** | **320kbps Ultra HQ MP3** | ❌ 128kbps or lower | ❌ 128kbps |
| **Client-Side In-Browser Conversion**| **Yes (FFmpeg WebAssembly)** | ❌ No (Uploads to remote servers) | ❌ No |
| **Cost** | **100% Free Forever** | ❌ Paid subscriptions & throttles | ⚠️ Freemium with paid installer |
| **Privacy & Security** | **Open Source / No Logs** | ❌ Data harvesting & tracking scripts | ❌ Third-party tracking |

---

## 🛠️ The Technology Behind It

Download Reels is built on modern, open web standards designed for longevity:

- **Frontend**: Clean semantic HTML5, vanilla ECMAScript 2024, compiled Tailwind CSS (Zinc dark theme matching shadcn/ui design standards).
- **Conversion Engine**: FFmpeg compiled to WebAssembly (`@ffmpeg/core`), executing audio and video transcoding pipelines directly in browser memory using Web Workers and `SharedArrayBuffer`.
- **Edge Resolver Worker**: A distributed Cloudflare Worker running across 300+ edge locations worldwide on V8 isolates, providing ultra-low-latency CORS bridging and metadata extraction with zero server maintenance.

---

## 📄 License & Fair Use

Download Reels is dedicated to public utility and personal digital archiving. It is intended solely for personal, non-commercial use, such as archiving your own published content, educational research, and creative fair-use remixing. Please respect creators' intellectual property rights and the respective terms of service of each platform.

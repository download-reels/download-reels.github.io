# ⚡ Clipper — Universal Reel & Video Downloader

> A sleek, high-speed, watermark-free video and reel downloader built to be hosted directly on **GitHub Pages**.

![Clipper Preview](https://raw.githubusercontent.com/lonelywolf/clipper/main/assets/preview.png)

Clipper allows you to download public reels, shorts, and videos from **Instagram**, **TikTok**, **YouTube Shorts**, **X (Twitter)**, **Reddit**, and direct video files (`.mp4`, `.webm`, `.mov`).

---

## 🌟 Key Features

- **🚀 Hosted on GitHub Pages**: 100% static frontend — zero compilation, zero heavy node_modules build step required.
- **✨ No Watermarks**: Extracts clean original video streams (TikTok HD without watermark).
- **🎵 MP3 Audio Extraction**: Extract and download audio/music tracks directly from reels.
- **📱 Mobile QR Code Handoff**: Scan a dynamic QR code on your computer screen with your smartphone camera to save the video directly to your iOS / Android camera roll.
- **🎨 Modern Dark Glassmorphic UI**: Real-time platform logo detection as you type/paste, responsive aspect-ratio video player, and format pills.
- **📂 Download History**: Saves your recent downloads locally in your browser (`localStorage`) for 1-click re-downloading.
- **⚡ Multi-Tier Resolving Engine**:
  - **Client-Side High-Speed Resolvers**: Built-in support for TikWM (TikTok) and FXTwitter with CORS enabled.
  - **Direct Stream Engine**: Handles direct `.mp4`, `.webm`, and `.mov` links via browser Blob / MediaStream.
  - **Turnkey Free Serverless Backend**: Includes a ready-to-deploy **Cloudflare Worker** (100,000 requests/day for $0) and **Python FastAPI + yt-dlp** microservice to bypass Instagram anti-bot protections.

---

## 🚀 How to Host on GitHub Pages (Step-by-Step)

Deploying Clipper to GitHub Pages takes less than 2 minutes:

### Step 1: Push Repository to GitHub

If you haven't initialized Git yet:
```bash
git init
git add .
git commit -m "Initial commit: Clipper video downloader"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/clipper.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Navigate to your repository on GitHub.
2. Click **Settings** (top navigation tab).
3. In the left sidebar, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** > **Source**:
   - Select **GitHub Actions** (recommended, uses the included `.github/workflows/deploy.yml`).
   - *Or* select **Deploy from a branch** -> branch: `main` -> folder: `/ (root)`.
5. Click **Save**.

Within 30–60 seconds, your site will be live at:
```
https://<YOUR_USERNAME>.github.io/clipper/
```

---

## 🧠 Architectural Overview: How Video Downloading Works on GitHub Pages

Because **GitHub Pages is a static host**, web browsers enforce the **Same-Origin Policy (CORS)**:
1. **TikTok & X/Twitter**: Clipper connects directly from client JavaScript to CORS-enabled public APIs (TikWM, FXTwitter) with zero backend required.
2. **Direct Video URLs**: Raw `.mp4`, `.webm`, and `.mov` links are streamed and downloaded directly in-browser.
3. **Instagram Reels & YouTube**: Social platforms restrict direct browser requests (`CORS`) and block automated IP scrapers. To support Instagram Reels with 100% reliability, Clipper provides two turnkey backend solutions:

---

## 🛠️ Deploying the Free Cloudflare Worker (Recommended)

Cloudflare Workers gives you **100,000 free requests per day** at zero cost.

1. Install Wrangler (Cloudflare CLI):
   ```bash
   cd cloudflare-worker
   npx wrangler login
   ```
2. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```
3. Cloudflare will output your worker URL (e.g. `https://clipper-resolver.<your-subdomain>.workers.dev`).
4. Open your live Clipper website, click the **Settings** icon (⚙️) in the top-right corner, paste your worker URL, and click **Save Settings**.

---

## 🐳 Self-Hosting the Python `yt-dlp` Backend

If you want support for 1,000+ video websites using `yt-dlp`, run the included FastAPI microservice:

### Local:
```bash
cd python-backend
pip install -r requirements.txt
python app.py
```

### Docker:
```bash
cd python-backend
docker build -t clipper-backend .
docker run -p 8000:8000 clipper-backend
```

### Deploy to Render / Railway (Free):
1. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app).
2. Point it to the `python-backend/` directory.
3. Paste the deployed URL into Clipper's **Settings (⚙️)** panel.

---

## 📂 Project Structure

```
clipper/
├── index.html                  # Main responsive UI for GitHub Pages
├── .nojekyll                   # Prevents GitHub Pages Jekyll asset filtering
├── css/
│   └── styles.css              # Custom styling, animations, glassmorphism
├── js/
│   ├── app.js                  # Application controller, history, modals
│   ├── platforms.js            # Platform regex, detection & URL sanitizer
│   ├── downloader.js           # Multi-engine resolver & blob downloader
│   └── qrcode.min.js           # QR code generation for mobile handoff
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── cloudflare-worker/
│   ├── worker.js               # Free serverless proxy & video resolver
│   └── wrangler.toml           # Cloudflare deployment configuration
└── python-backend/
    ├── app.py                  # FastAPI + yt-dlp backend
    ├── requirements.txt        # Backend dependencies
    ├── Dockerfile              # Docker container
    └── README.md               # Backend documentation
```

---

## ⚖️ Disclaimer

This software is provided for personal archiving and educational fair-use purposes. Please respect the copyright, intellectual property rights, and terms of service of each platform.

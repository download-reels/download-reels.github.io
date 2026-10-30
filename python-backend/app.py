"""
Clipper Python Backend - FastAPI + yt-dlp Microservice
Deployable to Render, Railway, Fly.io, Docker, or Localhost.
Provides CORS-enabled media metadata extraction and direct streaming.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import yt_dlp
import urllib.request
import re

app = FastAPI(
    title="Clipper Video Resolver API",
    description="High-performance media stream extractor powered by yt-dlp",
    version="1.0.0"
)

# Enable CORS for all domains so GitHub Pages can call it directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Clipper yt-dlp backend",
        "version": "1.0.0",
        "supported_sites": "1000+ (YouTube, Instagram, TikTok, Twitter/X, Facebook, etc.)"
    }

@app.get("/api/resolve")
def resolve_video(url: str = Query(..., description="Target video URL")):
    if not url:
        raise HTTPException(status_code=400, detail="URL parameter is required")

    ydl_opts = {
        'format': 'best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,
        # Common social user agent
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Format selection
            formats = []
            if 'formats' in info:
                # Filter progressive mp4 formats with both audio and video
                for f in info['formats']:
                    # Only take formats with direct http url
                    f_url = f.get('url')
                    if not f_url:
                        continue
                    
                    height = f.get('height') or 'HD'
                    ext = f.get('ext') or 'mp4'
                    vcodec = f.get('vcodec', '')
                    acodec = f.get('acodec', '')
                    
                    # Video + Audio combined format
                    if vcodec != 'none' and acodec != 'none':
                        formats.append({
                            'format_id': f.get('format_id'),
                            'label': f"{ext.upper()} {height}p" if isinstance(height, int) else f"{ext.upper()} ({height})",
                            'quality': f"{height}p" if isinstance(height, int) else str(height),
                            'ext': ext,
                            'url': f_url,
                            'filesize': f.get('filesize') or f.get('filesize_approx')
                        })
                    # Audio only format
                    elif vcodec == 'none' and acodec != 'none':
                        formats.append({
                            'format_id': f.get('format_id'),
                            'label': f"Audio ({ext.upper()} {f.get('abr', 128)}k)",
                            'quality': 'audio',
                            'ext': ext,
                            'url': f_url,
                            'filesize': f.get('filesize')
                        })

            # Best single url
            best_video_url = info.get('url')
            if not best_video_url and formats:
                best_video_url = formats[0]['url']

            return {
                "status": "success",
                "platform": info.get('extractor_key', 'unknown').lower(),
                "id": info.get('id'),
                "title": info.get('title') or "Video",
                "author": info.get('uploader') or info.get('channel') or info.get('creator'),
                "thumbnailUrl": info.get('thumbnail'),
                "duration": info.get('duration'),
                "videoUrl": best_video_url,
                "formats": formats[:10]  # Return top 10 relevant formats
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")

@app.get("/api/proxy")
def proxy_download(url: str = Query(...), filename: str = Query("video.mp4")):
    """
    Stream video through the backend to avoid hotlink blocks
    """
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://www.google.com/"
        }
    )

    def iter_stream():
        with urllib.request.urlopen(req) as resp:
            while chunk := resp.read(64 * 1024):
                yield chunk

    return StreamingResponse(
        iter_stream(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Allow-Origin": "*"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

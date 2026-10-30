# Clipper Python Backend (FastAPI + yt-dlp)

A self-hostable REST API for extracting video metadata and direct media streams across 1,000+ websites.

## 🚀 Quick Run Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start server
python app.py
```
Server runs at `http://localhost:8000`.

## 🐳 Run with Docker

```bash
docker build -t clipper-backend .
docker run -p 8000:8000 clipper-backend
```

## 🌐 Deploy for Free to Render / Railway

1. Push this folder to a GitHub repository.
2. In [Render](https://render.com) or [Railway](https://railway.app), select **New Web Service**.
3. Choose Python environment, with build command: `pip install -r requirements.txt` and start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`.
4. Copy the public URL (e.g. `https://my-clipper-backend.onrender.com`) and paste it into the **Settings** modal in your Clipper GitHub Pages frontend!


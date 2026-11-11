/**
 * Clipper Web Worker — runs in a dedicated thread per CPU core.
 * Each worker loads its own FFmpeg WASM instance once, caches the source video in its
 * virtual filesystem, and slices assigned segments in parallel.
 *
 * Messages in:
 *   { type: "slice", payload: { segmentIndex, startSec, endSec, label, sourceId, videoData?, corePath, logoBuffer?, logoPosition?, hookBuffer?, hookDuration? } }
 * Messages out:
 *   { type: "progress"|"done"|"error", ... }
 */

/* global importScripts, FFmpeg */

let ffmpegLoaded = false;
let ffmpegInst = null;
let cachedSourceId = null;
const CACHED_SOURCE_FILE = "worker_source.mp4";

async function loadFFmpeg(corePath) {
  if (ffmpegLoaded && ffmpegInst) return ffmpegInst;

  importScripts("https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js");

  const { createFFmpeg } = FFmpeg;
  ffmpegInst = createFFmpeg({ log: false, corePath });

  try {
    await ffmpegInst.load();
  } catch (e) {
    const stPath = "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js";
    ffmpegInst = createFFmpeg({ log: false, corePath: stPath });
    await ffmpegInst.load();
  }

  ffmpegLoaded = true;
  return ffmpegInst;
}

function formatTime(sec) {
  const s = Math.floor(Math.max(0, sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

self.onmessage = async (evt) => {
  const { type, payload } = evt.data;
  if (type === "prewarm") {
    try {
      await loadFFmpeg(payload?.corePath);
      self.postMessage({ type: "prewarmed" });
    } catch (_) {}
    return;
  }
  if (type !== "slice") return;

  const {
    segmentIndex,
    startSec,
    endSec,
    label,
    sourceId,
    videoData,
    corePath,
    logoBuffer,
    logoPosition,
    hookBuffer,
    hookDuration,
    aspectRatio,   // "original", "9:16", "1:1"
    speedRatio,     // 1.0, 1.1, 1.15, 1.25
  } = payload;

  const duration = Math.max(0.5, endSec - startSec);
  const ts = Date.now();
  const safeLabel = (label || `Reel_${segmentIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const exportName = `${safeLabel}_${formatTime(startSec).replace(":", "m")}s_${formatTime(endSec).replace(":", "m")}s.mp4`;
  const outFilename = `clip_${segmentIndex}_${ts}.mp4`;
  const inLogo = `logo_${segmentIndex}_${ts}.png`;
  const inHook = `hook_${segmentIndex}_${ts}.png`;

  try {
    self.postMessage({
      type: "progress",
      segmentIndex,
      percent: 10,
      message: `[Reel ${segmentIndex + 1}] Engine ready...`
    });

    const ffmpeg = await loadFFmpeg(corePath);

    ffmpeg.setProgress(({ ratio }) => {
      const clamped = Math.max(0, Math.min(1, ratio || 0));
      const pct = 20 + Math.min(75, Math.round(clamped * 75));
      self.postMessage({
        type: "progress",
        segmentIndex,
        percent: pct,
        message: `[Reel ${segmentIndex + 1}] Processing: ${Math.round(clamped * 100)}%`
      });
    });

    // Write source to virtual FS only if not already cached for this sourceId
    if (videoData && cachedSourceId !== sourceId) {
      try { ffmpeg.FS("unlink", CACHED_SOURCE_FILE); } catch (_) {}
      ffmpeg.FS("writeFile", CACHED_SOURCE_FILE, videoData);
      cachedSourceId = sourceId;
    }

    const hasCrop = Boolean(aspectRatio && aspectRatio !== "original");
    const hasSpeed = Boolean(speedRatio && Math.abs(speedRatio - 1.0) > 0.02);
    const hasOverlays = Boolean(logoBuffer || hookBuffer || hasCrop || hasSpeed);

    if (logoBuffer) ffmpeg.FS("writeFile", inLogo, logoBuffer);
    if (hookBuffer) ffmpeg.FS("writeFile", inHook, hookBuffer);

    if (!hasOverlays) {
      // ⚡ Instant lossless stream copy (-ss before -i + -t duration)
      try {
        await ffmpeg.run(
          "-ss", String(startSec),
          "-i", CACHED_SOURCE_FILE,
          "-t", String(duration),
          "-c", "copy",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          outFilename
        );
      } catch (_) {
        await ffmpeg.run(
          "-ss", String(startSec),
          "-i", CACHED_SOURCE_FILE,
          "-t", String(duration),
          "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "24",
          "-c:a", "aac", "-b:a", "128k",
          "-movflags", "+faststart",
          outFilename
        );
      }
    } else {
      // 🎨 Filter-complex overlay/crop/speed path with ultrafast zerolatency encoding
      const args = ["-ss", String(startSec), "-t", String(duration), "-i", CACHED_SOURCE_FILE];
      const filterChains = [];
      let curV = "0:v";
      let inIdx = 1;

      // 1. Aspect Ratio Vertical Crop Filter (9:16 Shorts or 1:1 Square)
      if (hasCrop) {
        if (aspectRatio === "9:16") {
          // Crop to 9:16 vertical centered: width = min(iw, ih*9/16), height = ih
          filterChains.push(`[${curV}]crop=w='min(iw\\,ih*9/16)':h='ih':x='(iw-ow)/2':y=0[v_crop]`);
          curV = "v_crop";
        } else if (aspectRatio === "1:1") {
          // Crop to 1:1 square centered: min(iw, ih)
          filterChains.push(`[${curV}]crop=w='min(iw\\,ih)':h='min(iw\\,ih)':x='(iw-ow)/2':y='(ih-oh)/2'[v_crop]`);
          curV = "v_crop";
        }
      }

      // 2. Viral Hook Banner Overlay
      if (hookBuffer) {
        args.push("-i", inHook);
        const dur = hookDuration || 2.5;
        const durExpr = dur === "always" ? "" : `:enable='between(t,0,${dur})'`;
        filterChains.push(`[${curV}][${inIdx}]overlay=(W-w)/2:24${durExpr}[v_hook]`);
        curV = "v_hook";
        inIdx++;
      }

      // 3. Logo Watermark Overlay
      if (logoBuffer) {
        args.push("-i", inLogo);
        let pos = "W-w-16:16";
        if (logoPosition === "top-left") pos = "16:16";
        else if (logoPosition === "bottom-right") pos = "W-w-16:H-h-16";
        else if (logoPosition === "bottom-left") pos = "16:H-h-16";
        filterChains.push(`[${curV}][${inIdx}]overlay=${pos}[v_logo]`);
        curV = "v_logo";
        inIdx++;
      }

      // 4. Video Playback Speed Filter (setpts)
      if (hasSpeed) {
        const ptsMult = (1 / speedRatio).toFixed(4);
        filterChains.push(`[${curV}]setpts=${ptsMult}*PTS[v_speed]`);
        curV = "v_speed";
      }

      // 5. Audio Playback Speed Filter (atempo)
      let curA = "0:a?";
      if (hasSpeed) {
        filterChains.push(`[0:a]atempo=${speedRatio.toFixed(2)}[a_speed]`);
        curA = "[a_speed]";
      }

      args.push(
        "-filter_complex", filterChains.join(";"),
        "-map", `[${curV}]`,
        "-map", curA,
        "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "24",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outFilename
      );

      await ffmpeg.run(...args);
    }

    self.postMessage({ type: "progress", segmentIndex, percent: 96, message: `[Reel ${segmentIndex + 1}] Finalizing...` });

    const clipData = ffmpeg.FS("readFile", outFilename);

    try { ffmpeg.FS("unlink", outFilename); } catch (_) {}
    if (logoBuffer) { try { ffmpeg.FS("unlink", inLogo); } catch (_) {} }
    if (hookBuffer) { try { ffmpeg.FS("unlink", inHook); } catch (_) {} }

    const transferable = clipData.buffer;
    self.postMessage(
      { type: "done", segmentIndex, exportName, buffer: transferable, size: transferable.byteLength },
      [transferable]
    );

  } catch (err) {
    self.postMessage({ type: "error", segmentIndex, message: err.message || String(err) });
  }
};

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
  const isIsolated = Boolean(self.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined");
  const targetCorePath = (isIsolated && corePath && !corePath.includes("core-st"))
    ? corePath
    : "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js";

  try {
    ffmpegInst = createFFmpeg({ log: false, corePath: targetCorePath });
    await ffmpegInst.load();
  } catch (e) {
    console.warn("Primary FFmpeg load failed in worker, falling back to core-st:", e);
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
    audioData,
    isDashSlice,
    vFragStartSec,
    aFragStartSec,
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
  const inAudio = `audio_${segmentIndex}_${ts}.m4a`;
  const inLogo = `logo_${segmentIndex}_${ts}.png`;
  const inHook = `hook_${segmentIndex}_${ts}.png`;
  const hasSeparateAudio = Boolean(audioData && audioData.byteLength > 0);

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
    if (videoData && (isDashSlice || cachedSourceId !== sourceId)) {
      try { ffmpeg.FS("unlink", CACHED_SOURCE_FILE); } catch (_) {}
      ffmpeg.FS("writeFile", CACHED_SOURCE_FILE, videoData);
      cachedSourceId = isDashSlice ? null : sourceId;
    }

    if (hasSeparateAudio) {
      ffmpeg.FS("writeFile", inAudio, audioData);
    }

    const hasCrop = Boolean(aspectRatio && aspectRatio !== "original");
    const hasSpeed = Boolean(speedRatio && Math.abs(speedRatio - 1.0) > 0.02);
    const hasOverlays = Boolean(logoBuffer || hookBuffer || hasCrop || hasSpeed);

    if (logoBuffer) ffmpeg.FS("writeFile", inLogo, logoBuffer);
    if (hookBuffer) ffmpeg.FS("writeFile", inHook, hookBuffer);

    const dv = Math.max(0, startSec - (Number(vFragStartSec) || 0));
    const da = Math.max(0, startSec - (Number(aFragStartSec) || 0));

    if (!hasOverlays) {
      // ⚡ Instant lossless stream copy
      try {
        if (isDashSlice) {
          if (hasSeparateAudio) {
            await ffmpeg.run(
              "-i", CACHED_SOURCE_FILE,
              "-i", inAudio,
              "-copyts",
              "-ss", String(startSec),
              "-t", String(duration),
              "-map", "0:v:0",
              "-map", "1:a:0",
              "-c:v", "copy",
              "-c:a", "copy",
              "-avoid_negative_ts", "make_zero",
              "-movflags", "+faststart",
              outFilename
            );
          } else {
            await ffmpeg.run(
              "-i", CACHED_SOURCE_FILE,
              "-copyts",
              "-ss", String(startSec),
              "-t", String(duration),
              "-c", "copy",
              "-avoid_negative_ts", "make_zero",
              "-movflags", "+faststart",
              outFilename
            );
          }
        } else if (hasSeparateAudio) {
          await ffmpeg.run(
            "-ss", String(startSec),
            "-i", CACHED_SOURCE_FILE,
            "-ss", String(startSec),
            "-i", inAudio,
            "-t", String(duration),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "copy",
            "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart",
            outFilename
          );
        } else {
          await ffmpeg.run(
            "-ss", String(startSec),
            "-i", CACHED_SOURCE_FILE,
            "-t", String(duration),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart",
            outFilename
          );
        }
      } catch (_) {
        if (isDashSlice && hasSeparateAudio) {
          await ffmpeg.run(
            "-i", CACHED_SOURCE_FILE,
            "-i", inAudio,
            "-filter_complex",
            `[0:v]trim=start=${dv.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS[v_out];[1:a]atrim=start=${da.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS[a_out]`,
            "-map", "[v_out]",
            "-map", "[a_out]",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            outFilename
          );
        } else {
          await ffmpeg.run(
            "-ss", String(isDashSlice ? dv : startSec),
            "-i", CACHED_SOURCE_FILE,
            "-t", String(duration),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            outFilename
          );
        }
      }
    } else {
      // 🎨 Filter-complex overlay/crop/speed path
      const args = isDashSlice
        ? ["-i", CACHED_SOURCE_FILE]
        : ["-ss", String(startSec), "-i", CACHED_SOURCE_FILE];

      if (hasSeparateAudio) {
        if (!isDashSlice) args.push("-ss", String(startSec));
        args.push("-i", inAudio);
      }

      const filterChains = [];
      let curV = "0:v";
      let inIdx = hasSeparateAudio ? 2 : 1;

      if (isDashSlice) {
        filterChains.push(`[${curV}]trim=start=${dv.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS[v_trim]`);
        curV = "v_trim";
      }

      // 1. Aspect Ratio Vertical Crop Filter (9:16 Shorts or 1:1 Square)
      if (hasCrop) {
        if (aspectRatio === "9:16") {
          filterChains.push(`[${curV}]crop=w='min(iw\\,ih*9/16)':h='ih':x='(iw-ow)/2':y=0[v_crop]`);
          curV = "v_crop";
        } else if (aspectRatio === "1:1") {
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

      // 5. Audio Mapping & Playback Speed Filter (atempo / atrim)
      const audioSrc = hasSeparateAudio ? "1:a" : "0:a";
      let curA = hasSeparateAudio ? "1:a?" : "0:a?";
      if (isDashSlice && hasSeparateAudio) {
        const speedChain = hasSpeed ? `,atempo=${speedRatio.toFixed(2)}` : "";
        filterChains.push(`[${audioSrc}]atrim=start=${da.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS${speedChain}[a_out]`);
        curA = "[a_out]";
      } else if (hasSpeed) {
        filterChains.push(`[${audioSrc}]atempo=${speedRatio.toFixed(2)}[a_speed]`);
        curA = "[a_speed]";
      }

      if (!isDashSlice) {
        args.push("-t", String(duration));
      }

      args.push(
        "-filter_complex", filterChains.join(";"),
        "-map", `[${curV}]`,
        "-map", curA,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outFilename
      );

      await ffmpeg.run(...args);
    }

    self.postMessage({ type: "progress", segmentIndex, percent: 96, message: `[Reel ${segmentIndex + 1}] Finalizing...` });

    const clipData = ffmpeg.FS("readFile", outFilename);

    try { ffmpeg.FS("unlink", outFilename); } catch (_) {}
    if (isDashSlice) { try { ffmpeg.FS("unlink", CACHED_SOURCE_FILE); } catch (_) {} }
    if (hasSeparateAudio) { try { ffmpeg.FS("unlink", inAudio); } catch (_) {} }
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

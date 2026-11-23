/**
 * Client-Side Video & Audio Conversion Engine powered by FFmpeg WebAssembly & Web Audio
 * Enables 100% in-browser transcoding (MP3 320kbps, MP4, WebM, WAV, GIF) without servers.
 */

class MediaConverterEngine {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * Lazily loads FFmpeg WebAssembly on-demand from CDN
   */
  async loadFFmpeg(onProgress = () => {}) {
    if (this.isLoaded && this.ffmpeg) return this.ffmpeg;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.ffmpeg;
    }

    this.isLoading = true;
    onProgress({ stage: "loading_core", percent: 15, message: "Initializing FFmpeg WebAssembly engine..." });

    try {
      // Dynamically load ffmpeg.min.js script if not present
      if (!window.FFmpeg) {
        await this.loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js");
      }

      const { createFFmpeg } = window.FFmpeg;

      // Check for SharedArrayBuffer support (requires cross-origin isolation COOP/COEP headers)
      // If SharedArrayBuffer is unavailable (standard on GitHub Pages), use single-threaded core-st
      const isIsolated = Boolean(window.crossOriginIsolated && typeof window.SharedArrayBuffer !== "undefined");
      const corePath = isIsolated
        ? "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
        : "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js";

      this.ffmpeg = createFFmpeg({
        log: false,
        corePath: corePath,
      });

      this.ffmpeg.setProgress(({ ratio }) => {
        const pct = Math.min(99, Math.round(ratio * 100));
        onProgress({ stage: "transcoding", percent: pct, message: `Transcoding in browser: ${pct}%` });
      });

      try {
        await this.ffmpeg.load();
      } catch (loadErr) {
        // Fallback to single-threaded core if multi-threaded failed (e.g. SharedArrayBuffer restricted)
        if (!corePath.includes("core-st")) {
          console.warn("Multi-threaded FFmpeg core restricted, falling back to single-threaded core-st:", loadErr);
          this.ffmpeg = createFFmpeg({
            log: false,
            corePath: "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js",
          });
          await this.ffmpeg.load();
        } else {
          throw loadErr;
        }
      }

      this.isLoaded = true;
      this.isLoading = false;
      onProgress({ stage: "ready", percent: 100, message: "FFmpeg engine ready!" });
      return this.ffmpeg;
    } catch (err) {
      this.isLoading = false;
      console.warn("FFmpeg WebAssembly load error, falling back to Web Audio converter:", err);
      throw err;
    }
  }

  /**
   * Helper to load external script dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Transcodes any video/audio stream into specified format (MP3 320k, WAV, MP4, etc.)
   */
  async convert(sourceUrl, options = {}, onProgress = () => {}) {
    const {
      format = "mp3",          // "mp3", "wav", "mp4", "webm", "gif"
      bitrate = "320k",        // "320k", "256k", "192k", "128k"
      resolution = "original", // "original", "1080", "720", "480"
      startTime = null,
      endTime = null
    } = options;

    onProgress({ stage: "fetching", percent: 5, message: "Fetching media stream into memory..." });

    try {
      // 1. Fetch file into uint8 array
      const resp = await fetch(sourceUrl, { mode: "cors" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching media stream`);
      const buffer = await resp.arrayBuffer();
      const inputData = new Uint8Array(buffer);

      onProgress({ stage: "initializing", percent: 25, message: "Loading WebAssembly transcoder..." });

      // 2. Initialize FFmpeg
      const ffmpeg = await this.loadFFmpeg(onProgress);

      const inFilename = "input_media";
      const outFilename = `output.${format}`;

      ffmpeg.FS("writeFile", inFilename, inputData);

      // 3. Build FFmpeg command arguments
      const args = ["-i", inFilename];

      if (startTime) {
        args.push("-ss", startTime);
      }
      if (endTime) {
        args.push("-to", endTime);
      }

      if (format === "mp3") {
        args.push("-vn", "-c:a", "libmp3lame", "-b:a", bitrate, "-ar", "44100", outFilename);
      } else if (format === "wav") {
        args.push("-vn", "-c:a", "pcm_s16le", outFilename);
      } else if (format === "gif") {
        args.push("-vf", "fps=15,scale=480:-1:flags=lanczos", outFilename);
      } else if (format === "mp4") {
        let vf = [];
        if (resolution === "1080") vf.push("scale=-2:1080");
        else if (resolution === "720") vf.push("scale=-2:720");
        else if (resolution === "480") vf.push("scale=-2:480");

        if (vf.length > 0) args.push("-vf", vf.join(","));
        args.push("-c:v", "libx264", "-crf", "23", "-preset", "ultrafast", "-c:a", "aac", "-b:a", "192k", outFilename);
      } else {
        args.push(outFilename);
      }

      onProgress({ stage: "encoding", percent: 45, message: `Encoding to ${format.toUpperCase()} (${bitrate})...` });

      await ffmpeg.run(...args);

      const data = ffmpeg.FS("readFile", outFilename);
      
      // Cleanup virtual filesystem
      try {
        ffmpeg.FS("unlink", inFilename);
        ffmpeg.FS("unlink", outFilename);
      } catch (_) {}

      const mimeTypes = {
        mp3: "audio/mp3",
        wav: "audio/wav",
        mp4: "video/mp4",
        webm: "video/webm",
        gif: "image/gif"
      };

      const blob = new Blob([data.buffer], { type: mimeTypes[format] || "application/octet-stream" });
      onProgress({ stage: "complete", percent: 100, message: "Conversion finished!" });

      return {
        blob,
        url: URL.createObjectURL(blob),
        filename: `converted_${Date.now()}.${format}`,
        size: blob.size,
        format
      };

    } catch (err) {
      console.warn("FFmpeg conversion failed, trying Web Audio fallback:", err);
      // Fallback for audio formats using browser Web Audio API
      if (format === "mp3" || format === "wav") {
        return await this.fallbackWebAudioExtract(sourceUrl, format, bitrate, onProgress);
      }
      throw err;
    }
  }

  /**
   * Fallback audio extraction via native Web Audio API
   */
  async fallbackWebAudioExtract(sourceUrl, format, bitrate, onProgress) {
    onProgress({ stage: "audio_decode", percent: 50, message: "Decoding audio track with Web Audio..." });

    const resp = await fetch(sourceUrl);
    const arrayBuffer = await resp.arrayBuffer();

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    onProgress({ stage: "audio_encode", percent: 80, message: "Generating lossless WAV track..." });

    const wavBlob = this.audioBufferToWav(audioBuffer);
    onProgress({ stage: "complete", percent: 100, message: "Audio extraction ready!" });

    return {
      blob: wavBlob,
      url: URL.createObjectURL(wavBlob),
      filename: `audio_extracted_${Date.now()}.wav`,
      size: wavBlob.size,
      format: "wav"
    };
  }

  /**
   * Converts AudioBuffer to WAV Blob
   */
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    let interleaved;
    if (numChannels === 2) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      interleaved = new Float32Array(left.length + right.length);
      for (let i = 0, j = 0; i < left.length; i++, j += 2) {
        interleaved[j] = left[i];
        interleaved[j + 1] = right[i];
      }
    } else {
      interleaved = buffer.getChannelData(0);
    }

    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = interleaved.length * (bitDepth / 8);
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Helper to fetch media stream into Uint8Array with streaming progress and proxy fallback
   */
  async fetchBufferWithProgress(url, stageName, startPct, endPct, onProgress = () => {}) {
    const fetchDirectOrProxy = async (targetUrl) => {
      let resp;
      try {
        resp = await fetch(targetUrl, { mode: "cors" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        // Fallback to configured worker proxy if CORS or direct fetch fails
        if (!targetUrl.includes("/api/proxy")) {
          const apiBase = (window.downloaderEngine?.defaultSettings?.apiUrl || "https://clipper-resolver.download-reels.workers.dev").replace(/\/+$/, "");
          const proxyUrl = `${apiBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
          resp = await fetch(proxyUrl, { mode: "cors" });
          if (!resp.ok) throw new Error(`Proxy HTTP ${resp.status}`);
        } else {
          throw err;
        }
      }
      return resp;
    };

    // If it is known to require proxy (googlevideo.com has no CORS), route directly to proxy
    let target = url;
    if (url.includes("googlevideo.com") && !url.includes("/api/proxy")) {
      const apiBase = (window.downloaderEngine?.defaultSettings?.apiUrl || "https://clipper-resolver.download-reels.workers.dev").replace(/\/+$/, "");
      target = `${apiBase}/api/proxy?url=${encodeURIComponent(url)}`;
    }

    const response = await fetchDirectOrProxy(target);
    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body || !response.body.getReader) {
      const buf = await response.arrayBuffer();
      onProgress({ stage: stageName, percent: endPct, message: `Loaded ${stageName}...` });
      return new Uint8Array(buf);
    }

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (totalBytes > 0) {
        const ratio = received / totalBytes;
        const currentPct = Math.round(startPct + ratio * (endPct - startPct));
        onProgress({ stage: stageName, percent: Math.min(endPct, currentPct), message: `Downloading ${stageName}: ${Math.round(ratio * 100)}%` });
      } else {
        const mb = (received / 1024 / 1024).toFixed(1);
        onProgress({ stage: stageName, percent: startPct, message: `Downloading ${stageName} (${mb} MB)...` });
      }
    }

    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }

  /**
   * Client-side remuxer: combines separate video and audio streams into a single playable MP4 file
   * using FFmpeg WebAssembly without re-encoding (instant stream copy).
   * @param {string} videoUrl - Video stream URL (proxied if needed for CORS)
   * @param {string} audioUrl - Audio stream URL (proxied if needed for CORS)
   * @param {function} onProgress - Progress reporting callback ({ stage, percent, message })
   * @returns {Promise<{ blob: Blob, url: string, filename: string, size: number }>}
   */
  async mux(videoUrl, audioUrl, onProgress = () => {}) {
    onProgress({ stage: "fetching_video", percent: 5, message: "Fetching HD video stream (parallel turbo)..." });

    try {
      // 1. Fetch video & audio tracks using parallel multi-range connections when supported
      const videoData = await this.fetchParallelOrStreamBuffer(videoUrl, "HD Video Track", 5, 48, onProgress);

      onProgress({ stage: "fetching_audio", percent: 48, message: "Fetching HQ audio stream..." });
      const audioData = await this.fetchParallelOrStreamBuffer(audioUrl, "HQ Audio Track", 48, 68, onProgress);

      // 2. Initialize FFmpeg engine
      onProgress({ stage: "initializing", percent: 70, message: "Initializing FFmpeg remuxer engine..." });
      const ffmpeg = await this.loadFFmpeg(onProgress);

      const inVideo = `video_${Date.now()}.mp4`;
      const inAudio = `audio_${Date.now()}.m4a`;
      const outMuxed = `muxed_${Date.now()}.mp4`;

      ffmpeg.FS("writeFile", inVideo, videoData);
      ffmpeg.FS("writeFile", inAudio, audioData);

      onProgress({ stage: "muxing", percent: 85, message: "Merging video + audio streams..." });

      // Skip second-pass +faststart on huge files (>150MB) to avoid doubling WASM MEMFS allocation
      const isLargeFile = (videoData.byteLength + audioData.byteLength) > 150 * 1024 * 1024;
      const muxArgs = ["-i", inVideo, "-i", inAudio, "-c", "copy"];
      if (!isLargeFile) {
        muxArgs.push("-movflags", "+faststart");
      }
      muxArgs.push(outMuxed);

      // 3. Run stream copy muxing (-c copy is instant and lossless)
      try {
        await ffmpeg.run(...muxArgs);
      } catch (copyErr) {
        console.warn("Direct stream copy failed, falling back to AAC audio remux:", copyErr);
        const fallbackArgs = ["-i", inVideo, "-i", inAudio, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k"];
        if (!isLargeFile) fallbackArgs.push("-movflags", "+faststart");
        fallbackArgs.push(outMuxed);
        await ffmpeg.run(...fallbackArgs);
      }

      // Free input files immediately before reading output to minimize peak WASM heap usage
      try { ffmpeg.FS("unlink", inVideo); } catch (_) {}
      try { ffmpeg.FS("unlink", inAudio); } catch (_) {}

      onProgress({ stage: "finalizing", percent: 96, message: "Assembling final MP4 video..." });
      const data = ffmpeg.FS("readFile", outMuxed);

      try { ffmpeg.FS("unlink", outMuxed); } catch (_) {}

      const blob = new Blob([data.buffer], { type: "video/mp4" });
      onProgress({ stage: "complete", percent: 100, message: "HD Video ready!" });

      return {
        blob,
        url: URL.createObjectURL(blob),
        filename: `muxed_${Date.now()}.mp4`,
        size: blob.size,
        format: "mp4"
      };

    } catch (err) {
      console.error("FFmpeg remuxing failed:", err);
      throw err;
    }
  }

  /**
   * Helper to parse time string ("15", "00:15", "1:45", "01:45:00") into seconds
   */
  parseTimeToSeconds(input) {
    if (typeof input === "number") return Math.max(0, input);
    if (!input || typeof input !== "string") return 0;
    const parts = input.trim().split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }

  /**
   * Formats seconds into MM:SS string
   */
  formatSecondsToTime(seconds) {
    const s = Math.floor(Math.max(0, seconds));
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(remSec).padStart(2, "0")}`;
  }

  /**
   * Slices multiple segments/reels from a single video source using FFmpeg WebAssembly.
   * @param {string} sourceUrl - Video stream URL
   * @param {Array<{ label: string, start: number|string, end: number|string }>} segments
   * @param {object} options - Slicing options
   * @param {function} onProgress - Progress reporting callback
   * @returns {Promise<Array<{ name: string, blob: Blob, url: string, size: number, start: number, end: number }>>}
   */
  async sliceBatch(sourceUrl, segments = [], options = {}, onProgress = () => {}) {
    if (!segments || segments.length === 0) {
      throw new Error("No clip segments specified for export.");
    }

    onProgress({ stage: "fetching", percent: 5, message: "Preparing video stream for clipping..." });

    // 1. Try instant DASH sidx sub-segment byte-range slicing first (avoids downloading full 2GB movie!)
    let dashPayloads = null;
    try {
      dashPayloads = await this.fetchDashClipPayloads(sourceUrl, segments, options, onProgress);
    } catch (_) {}

    let fullVideoData = null;
    if (!dashPayloads) {
      const smart = await this.fetchSmartVideo(sourceUrl, segments, options, onProgress);
      fullVideoData = smart.fullData;
    }

    onProgress({ stage: "init_ffmpeg", percent: 32, message: "Initializing FFmpeg WebAssembly..." });
    const ffmpeg = await this.loadFFmpeg(onProgress);

    const inSource = `source_${Date.now()}.mp4`;
    if (!dashPayloads && fullVideoData) {
      ffmpeg.FS("writeFile", inSource, fullVideoData);
    }

    const hasCrop = Boolean(options.aspectRatio && options.aspectRatio !== "original");
    const hasSpeed = Boolean(options.speedRatio && Math.abs(options.speedRatio - 1.0) > 0.02);
    const hasOverlays = Boolean(options.logoBuffer || options.hookBuffer || hasCrop || hasSpeed);
    const inLogo = `logo_${Date.now()}.png`;
    const inHook = `hook_${Date.now()}.png`;

    if (options.logoBuffer) {
      ffmpeg.FS("writeFile", inLogo, options.logoBuffer);
    }
    if (options.hookBuffer) {
      ffmpeg.FS("writeFile", inHook, options.hookBuffer);
    }

    const results = [];
    const totalClips = segments.length;

    // 2. Process each segment
    for (let i = 0; i < totalClips; i++) {
      const seg = segments[i];
      const startSec = this.parseTimeToSeconds(seg.start);
      const endSec = this.parseTimeToSeconds(seg.end);
      const duration = Math.max(0.5, endSec - startSec);

      const dp = dashPayloads ? dashPayloads[i] : null;
      const isDashSlice = Boolean(dp && dp.isDashSlice);
      const segVideoFile = isDashSlice ? `seg_v_${i}_${Date.now()}.mp4` : inSource;
      const segAudioFile = (isDashSlice && dp.audioData) ? `seg_a_${i}_${Date.now()}.m4a` : null;

      if (isDashSlice) {
        ffmpeg.FS("writeFile", segVideoFile, dp.videoData);
        if (segAudioFile) ffmpeg.FS("writeFile", segAudioFile, dp.audioData);
      }

      const dv = Math.max(0, startSec - (Number(dp?.vFragStartSec) || 0));
      const da = Math.max(0, startSec - (Number(dp?.aFragStartSec) || 0));

      const clipPctStart = 35 + Math.round((i / totalClips) * 55);
      const clipPctEnd = 35 + Math.round(((i + 1) / totalClips) * 55);

      const label = (seg.label || `Reel_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_");
      const outFilename = `clip_${i + 1}_${Date.now()}.mp4`;
      const exportName = `${label}_${this.formatSecondsToTime(startSec).replace(":", "m")}s_${this.formatSecondsToTime(endSec).replace(":", "m")}s.mp4`;

      onProgress({
        stage: "clipping",
        percent: clipPctStart,
        message: `Slicing ${seg.label || `Reel #${i + 1}`} (${i + 1}/${totalClips})...`,
        currentClip: i + 1,
        totalClips
      });

      if (!hasOverlays) {
        try {
          if (isDashSlice && segAudioFile) {
            await ffmpeg.run(
              "-i", segVideoFile,
              "-i", segAudioFile,
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
          } else if (isDashSlice) {
            await ffmpeg.run(
              "-i", segVideoFile,
              "-copyts",
              "-ss", String(startSec),
              "-t", String(duration),
              "-c", "copy",
              "-avoid_negative_ts", "make_zero",
              "-movflags", "+faststart",
              outFilename
            );
          } else {
            await ffmpeg.run(
              "-ss", String(startSec),
              "-i", segVideoFile,
              "-t", String(duration),
              "-c", "copy",
              "-avoid_negative_ts", "make_zero",
              "-movflags", "+faststart",
              outFilename
            );
          }
        } catch (fastErr) {
          console.warn(`Fast stream copy failed for segment ${i + 1}, using ultrafast re-encode:`, fastErr);
          if (isDashSlice && segAudioFile) {
            await ffmpeg.run(
              "-i", segVideoFile,
              "-i", segAudioFile,
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
              "-i", segVideoFile,
              "-t", String(duration),
              "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
              "-c:a", "aac", "-b:a", "128k",
              "-movflags", "+faststart",
              outFilename
            );
          }
        }
      } else {
        const args = isDashSlice
          ? ["-i", segVideoFile]
          : ["-ss", String(startSec), "-i", segVideoFile];

        if (segAudioFile) {
          args.push("-i", segAudioFile);
        }

        const filterChains = [];
        let curV = "0:v";
        let inIdx = segAudioFile ? 2 : 1;

        if (isDashSlice) {
          filterChains.push(`[${curV}]trim=start=${dv.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS[v_trim]`);
          curV = "v_trim";
        }

        if (hasCrop) {
          if (options.aspectRatio === "9:16") {
            filterChains.push(`[${curV}]crop=w='min(iw\\,ih*9/16)':h='ih':x='(iw-ow)/2':y=0[v_crop]`);
            curV = "v_crop";
          } else if (options.aspectRatio === "1:1") {
            filterChains.push(`[${curV}]crop=w='min(iw\\,ih)':h='min(iw\\,ih)':x='(iw-ow)/2':y='(ih-oh)/2'[v_crop]`);
            curV = "v_crop";
          }
        }

        if (options.hookBuffer) {
          args.push("-i", inHook);
          const dur = options.hookDuration || 2.5;
          const durExpr = dur === "always" ? "" : `:enable='between(t,0,${dur})'`;
          filterChains.push(`[${curV}][${inIdx}]overlay=(W-w)/2:24${durExpr}[v_hook]`);
          curV = "v_hook";
          inIdx++;
        }

        if (options.logoBuffer) {
          args.push("-i", inLogo);
          let pos = "W-w-16:16";
          if (options.logoPosition === "top-left") pos = "16:16";
          else if (options.logoPosition === "bottom-right") pos = "W-w-16:H-h-16";
          else if (options.logoPosition === "bottom-left") pos = "16:H-h-16";
          filterChains.push(`[${curV}][${inIdx}]overlay=${pos}[v_logo]`);
          curV = "v_logo";
          inIdx++;
        }

        if (hasSpeed) {
          const ptsMult = (1 / options.speedRatio).toFixed(4);
          filterChains.push(`[${curV}]setpts=${ptsMult}*PTS[v_speed]`);
          curV = "v_speed";
        }

        const audioSrc = segAudioFile ? "1:a" : "0:a";
        let curA = segAudioFile ? "1:a?" : "0:a?";
        if (isDashSlice && segAudioFile) {
          const speedChain = hasSpeed ? `,atempo=${options.speedRatio.toFixed(2)}` : "";
          filterChains.push(`[${audioSrc}]atrim=start=${da.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS${speedChain}[a_out]`);
          curA = "[a_out]";
        } else if (hasSpeed) {
          filterChains.push(`[${audioSrc}]atempo=${options.speedRatio.toFixed(2)}[a_speed]`);
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

      const clipData = ffmpeg.FS("readFile", outFilename);
      try { ffmpeg.FS("unlink", outFilename); } catch (_) {}
      if (isDashSlice) {
        try { ffmpeg.FS("unlink", segVideoFile); } catch (_) {}
        if (segAudioFile) { try { ffmpeg.FS("unlink", segAudioFile); } catch (_) {} }
      }

      const blob = new Blob([clipData.buffer], { type: "video/mp4" });
      results.push({
        name: exportName,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        start: startSec,
        end: endSec,
        duration
      });

      onProgress({
        stage: "clip_done",
        percent: clipPctEnd,
        message: `Finished ${seg.label || `Reel #${i + 1}`} (${i + 1}/${totalClips})`,
        currentClip: i + 1,
        totalClips
      });
    }

    // 3. Clean up virtual FS
    try {
      if (options.logoBuffer) ffmpeg.FS("unlink", inLogo);
      if (options.hookBuffer) ffmpeg.FS("unlink", inHook);
      if (!dashPayloads) ffmpeg.FS("unlink", inSource);
    } catch (_) {}

    onProgress({ stage: "ready", percent: 95, message: "All reels sliced successfully!" });
    return results;
  }

  /**
   * Converts a stream URL into a CORS-safe URL (using Cloudflare Worker proxy for googlevideo.com)
   */
  toEffectiveProxyUrl(url) {
    if (!url) return url;
    const apiBase = (window.downloaderEngine?.defaultSettings?.apiUrl || "https://clipper-resolver.download-reels.workers.dev").replace(/\/+$/, "");
    if (url.includes("googlevideo.com") && !url.includes("/api/proxy")) {
      return `${apiBase}/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  /**
   * Probes a URL for byte-range support and total content length.
   * Returns { supportsRange: bool, totalBytes: number, effectiveUrl: string }
   */
  async probeByteRange(url) {
    const probeUrl = this.toEffectiveProxyUrl(url);

    try {
      const resp = await fetch(probeUrl, { method: "HEAD", mode: "cors" });
      const acceptRanges = (resp.headers.get("accept-ranges") || "").toLowerCase();
      const contentLength = resp.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const supportsRange = acceptRanges.includes("bytes") && totalBytes > 0;
      return { supportsRange, totalBytes, effectiveUrl: probeUrl };
    } catch (_) {
      return { supportsRange: false, totalBytes: 0, effectiveUrl: probeUrl };
    }
  }

  /**
   * Fetches a byte-range slice of a URL.
   * byteStart/byteEnd are inclusive byte positions.
   */
  async fetchByteRange(effectiveUrl, byteStart, byteEnd, returnMeta = false) {
    const resp = await fetch(effectiveUrl, {
      mode: "cors",
      headers: { Range: `bytes=${byteStart}-${byteEnd}` }
    });
    if (!resp.ok && resp.status !== 206) throw new Error(`Byte-range fetch failed: HTTP ${resp.status}`);
    const finalUpstreamUrl = resp.headers.get("x-final-url") || null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    return returnMeta ? { bytes, finalUpstreamUrl } : bytes;
  }

  /**
   * Fetches a byte-range slice using parallel concurrent connections for maximum throughput.
   */
  async fetchByteRangeParallel(effectiveUrl, byteStart, byteEnd, maxConnections = 8, onProgressBytes = null) {
    const totalLen = byteEnd - byteStart + 1;
    if (totalLen <= 384 * 1024 || maxConnections <= 1) {
      const data = await this.fetchByteRange(effectiveUrl, byteStart, byteEnd);
      if (onProgressBytes) onProgressBytes(data.byteLength, totalLen);
      return data;
    }

    const numChunks = Math.min(maxConnections, Math.max(2, Math.ceil(totalLen / (384 * 1024))));
    const chunkSize = Math.ceil(totalLen / numChunks);
    const loadedPerChunk = new Array(numChunks).fill(0);

    const chunks = await Promise.all(
      Array.from({ length: numChunks }, async (_, idx) => {
        const s = byteStart + idx * chunkSize;
        const e = idx === numChunks - 1 ? byteEnd : Math.min(byteEnd, s + chunkSize - 1);
        const part = await this.fetchByteRange(effectiveUrl, s, e);
        loadedPerChunk[idx] = part.byteLength;
        if (onProgressBytes) {
          const sum = loadedPerChunk.reduce((a, b) => a + b, 0);
          onProgressBytes(sum, totalLen);
        }
        return part;
      })
    );

    const totalReceived = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const combined = new Uint8Array(totalReceived);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.byteLength;
    }
    return combined;
  }

  /**
   * High-speed buffer downloader that automatically uses 6x parallel HTTP Range streams when supported
   */
  async fetchParallelOrStreamBuffer(url, stageName, startPct, endPct, onProgress = () => {}) {
    try {
      const { supportsRange, totalBytes, effectiveUrl } = await this.probeByteRange(url);
      if (supportsRange && totalBytes > 512 * 1024) {
        return await this.fetchByteRangeParallel(effectiveUrl, 0, totalBytes - 1, 6, (loaded, total) => {
          const ratio = loaded / total;
          const pct = Math.min(endPct, Math.round(startPct + ratio * (endPct - startPct)));
          const mbLoaded = (loaded / 1024 / 1024).toFixed(1);
          const mbTotal = (total / 1024 / 1024).toFixed(1);
          onProgress({
            stage: "fetching",
            percent: pct,
            message: `Turbo downloading ${stageName}: ${mbLoaded}MB / ${mbTotal}MB...`
          });
        });
      }
    } catch (_) {}
    return await this.fetchBufferWithProgress(url, stageName, startPct, endPct, onProgress);
  }

  /**
   * Parses ISO-BMFF ftyp + moov (init segment) and sidx (Segment Index) box from DASH fMP4 header bytes.
   * Returns { initBytes, subsegments: [{ startTime, endTime, startByte, endByte, size }], totalDuration } or null.
   */
  parseDashSidxHeader(bytes) {
    if (!bytes || bytes.byteLength < 64) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = 0;
    let initEnd = -1;
    let sidxPos = -1;
    let sidxSize = 0;

    while (pos + 8 <= bytes.byteLength) {
      const boxSize = view.getUint32(pos, false);
      const boxType = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
      if (boxSize < 8) break;

      if (boxType === "ftyp" || boxType === "moov") {
        initEnd = pos + boxSize - 1;
      } else if (boxType === "sidx") {
        sidxPos = pos;
        sidxSize = boxSize;
        break;
      } else if (boxType === "moof" || boxType === "mdat") {
        break;
      }
      pos += boxSize;
    }

    if (initEnd < 0 || sidxPos < 0) return null;
    if (sidxPos + sidxSize > bytes.byteLength) {
      return { needsMoreBytes: sidxPos + sidxSize };
    }

    try {
      const version = bytes[sidxPos + 8];
      const timescale = view.getUint32(sidxPos + 16, false);
      if (!timescale) return null;

      let earliestPt = 0;
      let firstOffset = 0;
      let p = 0;
      if (version === 0) {
        earliestPt = view.getUint32(sidxPos + 20, false);
        firstOffset = view.getUint32(sidxPos + 24, false);
        p = sidxPos + 28;
      } else {
        earliestPt = Number(view.getBigUint64(sidxPos + 20, false));
        firstOffset = Number(view.getBigUint64(sidxPos + 28, false));
        p = sidxPos + 36;
      }

      const refCount = view.getUint16(p + 2, false);
      p += 4;

      let curByte = sidxPos + sidxSize + firstOffset;
      let curTime = earliestPt / timescale;
      const subsegments = [];

      for (let i = 0; i < refCount && p + 12 <= sidxPos + sidxSize; i++) {
        const w1 = view.getUint32(p, false);
        const dur = view.getUint32(p + 4, false);
        p += 12;

        const refSize = w1 & 0x7fffffff;
        const segDur = dur / timescale;
        subsegments.push({
          startTime: curTime,
          endTime: curTime + segDur,
          startByte: curByte,
          endByte: curByte + refSize - 1,
          size: refSize
        });
        curByte += refSize;
        curTime += segDur;
      }

      if (subsegments.length === 0) return null;

      return {
        initBytes: bytes.slice(0, initEnd + 1),
        subsegments,
        totalDuration: curTime
      };
    } catch (e) {
      console.warn("Failed to parse DASH sidx box:", e);
      return null;
    }
  }

  /**
   * Probes a stream URL for a DASH sidx index box (fetches only the first 32-64KB!).
   * Also captures the resolved 302 regional edge node URL (X-Final-Url) so all subsequent
   * parallel range chunk requests skip the 302 redirect and download up to 4x faster!
   */
  async probeDashStream(url, indexRangeHint = null) {
    if (!url) return null;
    if (!this._sidxCache) this._sidxCache = new Map();
    if (this._sidxCache.has(url)) return this._sidxCache.get(url);

    let effectiveUrl = this.toEffectiveProxyUrl(url);
    let probeEnd = 65535;
    if (indexRangeHint && typeof indexRangeHint === "string" && indexRangeHint.includes("-")) {
      const hintEnd = parseInt(indexRangeHint.split("-")[1], 10);
      if (!isNaN(hintEnd) && hintEnd > 0) {
        probeEnd = Math.max(probeEnd, hintEnd + 256);
      }
    }

    try {
      let { bytes: headerBytes, finalUpstreamUrl } = await this.fetchByteRange(effectiveUrl, 0, probeEnd, true);
      if (finalUpstreamUrl && finalUpstreamUrl.includes("googlevideo.com")) {
        effectiveUrl = this.toEffectiveProxyUrl(finalUpstreamUrl);
      }
      let parsed = this.parseDashSidxHeader(headerBytes);
      if (parsed && parsed.needsMoreBytes && parsed.needsMoreBytes < 1024 * 1024) {
        headerBytes = await this.fetchByteRange(effectiveUrl, 0, parsed.needsMoreBytes + 64);
        parsed = this.parseDashSidxHeader(headerBytes);
      }
      if (parsed && parsed.subsegments && parsed.subsegments.length > 0) {
        const result = { ...parsed, effectiveUrl, url };
        this._sidxCache.set(url, result);
        return result;
      }
    } catch (err) {
      console.warn("DASH sidx probe fell back:", err);
    }
    return null;
  }

  /**
   * Pre-warms DASH sidx headers & resolves 302 regional edge URLs in the background
   * as soon as a video is loaded so clicking Export starts at 0ms!
   */
  prewarmDashSidx(videoUrl, audioUrl = null, indexRange = null, audioIndexRange = null) {
    if (videoUrl) {
      this.probeDashStream(this.toEffectiveProxyUrl(videoUrl), indexRange).catch(() => {});
    }
    if (audioUrl) {
      this.probeDashStream(this.toEffectiveProxyUrl(audioUrl), audioIndexRange).catch(() => {});
    }
  }

  /**
   * For DASH fMP4 videos (including 2-hour+ YouTube movies), fetches ONLY the exact 2-5MB
   * moof+mdat byte ranges for the requested clip timestamps instead of the entire multi-GB file!
   */
  async fetchDashClipPayloads(sourceUrl, segments, options = {}, onProgress = () => {}) {
    onProgress({ stage: "probe_sidx", percent: 4, message: "Reading DASH segment index (32KB header)..." });

    const [videoSidx, audioSidx] = await Promise.all([
      this.probeDashStream(sourceUrl, options.indexRange),
      options.audioUrl ? this.probeDashStream(options.audioUrl, options.audioIndexRange) : Promise.resolve(null)
    ]);

    if (!videoSidx) return null;

    const totalClips = segments.length;
    const clipPayloads = new Array(totalClips);

    // Pre-calculate exact byte slices for all segments
    const slicePlans = segments.map((seg, i) => {
      const startSec = this.parseTimeToSeconds(seg.start);
      const endSec = Math.max(startSec + 0.5, this.parseTimeToSeconds(seg.end));

      const vMatches = videoSidx.subsegments.filter(s => s.endTime > (startSec - 0.25) && s.startTime < (endSec + 0.5));
      const vPicked = vMatches.length > 0 ? vMatches : [videoSidx.subsegments[0]];
      const vByteStart = vPicked[0].startByte;
      const vByteEnd = vPicked[vPicked.length - 1].endByte;
      const vFragStartSec = vPicked[0].startTime;

      let aByteStart = 0;
      let aByteEnd = 0;
      let aFragStartSec = 0;
      if (audioSidx && audioSidx.subsegments.length > 0) {
        const aMatches = audioSidx.subsegments.filter(s => s.endTime > (startSec - 0.5) && s.startTime < (endSec + 0.5));
        const aPicked = aMatches.length > 0 ? aMatches : [audioSidx.subsegments[0]];
        aByteStart = aPicked[0].startByte;
        aByteEnd = aPicked[aPicked.length - 1].endByte;
        aFragStartSec = aPicked[0].startTime;
      }

      const estBytes = (vByteEnd - vByteStart + 1) + (audioSidx ? (aByteEnd - aByteStart + 1) : 0);
      return {
        index: i,
        startSec,
        endSec,
        vByteStart,
        vByteEnd,
        vFragStartSec,
        aByteStart,
        aByteEnd,
        aFragStartSec,
        estBytes
      };
    });

    const totalEstBytes = slicePlans.reduce((sum, p) => sum + p.estBytes, 0);
    const loadedPerPlan = new Array(totalClips).fill(0);

    onProgress({
      stage: "fetch_dash_slices",
      percent: 7,
      message: `Instant Range Slicing: Fetching only ${(totalEstBytes / 1024 / 1024).toFixed(1)} MB for ${totalClips} clip${totalClips > 1 ? "s" : ""}...`
    });

    const reportSliceProgress = () => {
      const loaded = loadedPerPlan.reduce((a, b) => a + b, 0);
      const pct = 7 + Math.round((loaded / Math.max(1, totalEstBytes)) * 21);
      onProgress({
        stage: "fetch_dash_slices",
        percent: Math.min(28, pct),
        message: `Fetching exact clip range (${(loaded / 1024 / 1024).toFixed(1)} / ${(totalEstBytes / 1024 / 1024).toFixed(1)} MB)...`
      });
    };

    // Fetch segment byte ranges concurrently (up to 2 clips at a time, 8 parallel chunks per clip on resolved regional edge node)
    const clipConcurrency = Math.min(2, slicePlans.length);
    let planIdx = 0;
    const fetchOnePlan = async () => {
      while (planIdx < slicePlans.length) {
        const i = planIdx++;
        const plan = slicePlans[i];
        let vLoaded = 0;
        let aLoaded = 0;

        const [vFrag, aFrag] = await Promise.all([
          this.fetchByteRangeParallel(videoSidx.effectiveUrl, plan.vByteStart, plan.vByteEnd, 8, (b) => {
            vLoaded = b;
            loadedPerPlan[i] = vLoaded + aLoaded;
            reportSliceProgress();
          }),
          audioSidx
            ? this.fetchByteRangeParallel(audioSidx.effectiveUrl, plan.aByteStart, plan.aByteEnd, 4, (b) => {
                aLoaded = b;
                loadedPerPlan[i] = vLoaded + aLoaded;
                reportSliceProgress();
              })
            : Promise.resolve(null)
        ]);

        // Prepend 740-byte ftyp+moov init segment to form a self-contained valid fMP4 buffer
        const videoData = new Uint8Array(videoSidx.initBytes.byteLength + vFrag.byteLength);
        videoData.set(videoSidx.initBytes, 0);
        videoData.set(vFrag, videoSidx.initBytes.byteLength);

        let audioData = null;
        if (audioSidx && aFrag) {
          audioData = new Uint8Array(audioSidx.initBytes.byteLength + aFrag.byteLength);
          audioData.set(audioSidx.initBytes, 0);
          audioData.set(aFrag, audioSidx.initBytes.byteLength);
        }

        clipPayloads[i] = {
          videoData,
          audioData,
          vFragStartSec: plan.vFragStartSec,
          aFragStartSec: plan.aFragStartSec,
          isDashSlice: true,
          sourceId: `dash_${i}_${Date.now()}`
        };
      }
    };

    await Promise.all(Array.from({ length: clipConcurrency }, () => fetchOnePlan()));

    return clipPayloads;
  }

  /**
   * Checks whether an MP4 buffer starts with a faststart `moov` atom in its first 64KB.
   * If `moov` is at the start, prefix byte-range truncation is 100% valid for FFmpeg.
   */
  hasFaststartMoov(bytes) {
    const limit = Math.min(bytes.length - 4, 65536);
    for (let i = 0; i < limit; i++) {
      // 'moov' = 0x6d, 0x6f, 0x6f, 0x76
      if (bytes[i] === 0x6d && bytes[i + 1] === 0x6f && bytes[i + 2] === 0x6f && bytes[i + 3] === 0x76) {
        return true;
      }
      // If we hit 'mdat' before 'moov', moov is at the end of the file
      if (bytes[i] === 0x6d && bytes[i + 1] === 0x64 && bytes[i + 2] === 0x61 && bytes[i + 3] === 0x74) {
        return false;
      }
    }
    return false;
  }

  /**
   * Smart video fetcher:
   * 1. Reuses in-memory cache if the same sourceUrl was already fetched in this session.
   * 2. Probes HTTP Range support:
   *    - If supported and video has faststart `moov` + user only needs early segments,
   *      truncates download to the needed prefix byte range (with 20% safety margin).
   *    - Downloads using 4 parallel HTTP Range connections to saturate client bandwidth.
   * 3. Falls back to streaming single-connection download if Range is unsupported.
   */
  async fetchSmartVideo(url, segments, options = {}, onProgress = () => {}) {
    const maxEnd = Math.max(...segments.map(s => this.parseTimeToSeconds(s.end)), 0);

    // Check in-memory session cache
    if (this._sourceCache && this._sourceCache.url === url && this._sourceCache.coveredUntilSec >= maxEnd) {
      onProgress({ stage: "cache_hit", percent: 28, message: "Using cached source stream in memory (0ms fetch)..." });
      return {
        fullData: this._sourceCache.data,
        sourceId: this._sourceCache.sourceId,
        usedByteRange: this._sourceCache.usedByteRange,
      };
    }

    onProgress({ stage: "probe", percent: 4, message: "Probing stream & range capabilities..." });
    const { supportsRange, totalBytes, effectiveUrl } = await this.probeByteRange(url);

    if (supportsRange && totalBytes > 512 * 1024) {
      try {
        // Probe first 64KB to check for faststart 'moov' atom
        const headerProbeEnd = Math.min(65535, totalBytes - 1);
        const headerBytes = await this.fetchByteRange(effectiveUrl, 0, headerProbeEnd);
        const isFaststart = this.hasFaststartMoov(headerBytes);

        const targetBytes = totalBytes;
        // Download targetBytes across parallel HTTP Range connections (2-4 streams for high-speed fetch)
        const numChunks = targetBytes > 2 * 1024 * 1024 ? 4 : 2;
        const chunkSize = Math.ceil(targetBytes / numChunks);
        const chunkProgress = new Array(numChunks).fill(0);

        onProgress({ stage: "fetch_parallel", percent: 8, message: `Parallel high-speed download (${numChunks} streams)...` });

        const chunks = await Promise.all(
          Array.from({ length: numChunks }, async (_, idx) => {
            const start = idx * chunkSize;
            const end = Math.min(targetBytes - 1, (idx + 1) * chunkSize - 1);
            const data = await this.fetchByteRange(effectiveUrl, start, end);
            chunkProgress[idx] = data.length;
            const loaded = chunkProgress.reduce((a, b) => a + b, 0);
            const pct = 8 + Math.round((loaded / targetBytes) * 20);
            onProgress({
              stage: "fetch_parallel",
              percent: Math.min(28, pct),
              message: `Downloading stream (${(loaded / 1024 / 1024).toFixed(1)} / ${(targetBytes / 1024 / 1024).toFixed(1)} MB)...`
            });
            return data;
          })
        );

        const totalReceived = chunks.reduce((acc, c) => acc + c.length, 0);
        const combined = new Uint8Array(totalReceived);
        let offset = 0;
        for (const c of chunks) {
          combined.set(c, offset);
          offset += c.length;
        }

        const sourceId = `src_${Date.now()}_${totalReceived}`;
        this._sourceCache = {
          url,
          data: combined,
          sourceId,
          usedByteRange: false,
          coveredUntilSec: Infinity
        };

        return { fullData: combined, sourceId, usedByteRange: false };
      } catch (rangeErr) {
        console.warn("Parallel range fetch failed, falling back to standard stream download:", rangeErr);
      }
    }

    // Standard single-stream fallback
    const fullData = await this.fetchBufferWithProgress(url, "Source Video", 5, 28, onProgress);
    const sourceId = `src_${Date.now()}_${fullData.length}`;
    this._sourceCache = {
      url,
      data: fullData,
      sourceId,
      usedByteRange: false,
      coveredUntilSec: Infinity
    };
    return { fullData, sourceId, usedByteRange: false };
  }

  /**
   * Pre-warms background Web Workers when the Studio modal opens so FFmpeg WASM is
   * already compiled before the user clicks Export.
   */
  prewarmWorkerPool(count = 2) {
    if (typeof Worker === "undefined") return;
    const hwCores = Math.max(1, Math.min(6, navigator.hardwareConcurrency || 4));
    const targetCount = Math.min(count, hwCores);
    const isIsolated = Boolean(window.crossOriginIsolated && typeof window.SharedArrayBuffer !== "undefined");
    const corePath = isIsolated
      ? "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
      : "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js";

    const pool = this.getWorkerPool(targetCount);
    pool.forEach(slot => {
      if (!slot.prewarmed && !slot.busy) {
        slot.prewarmed = true;
        slot.worker.postMessage({ type: "prewarm", payload: { corePath } });
      }
    });
  }

  /**
   * Acquires or initializes the reusable Web Worker pool (1 worker per CPU core, up to 6).
   */
  getWorkerPool(count) {
    if (!this._workerPool) {
      this._workerPool = [];
    }
    while (this._workerPool.length < count) {
      this._workerPool.push({
        worker: new Worker("js/clipper-worker.js"),
        cachedSourceId: null,
        busy: false
      });
    }
    return this._workerPool.slice(0, count);
  }

  /**
   * Parallel clip batch using a reusable Web Worker Pool — one FFmpeg instance per CPU core.
   * Falls back to sequential sliceBatch() if Workers are not available.
   *
   * @param {string} sourceUrl - Video stream URL
   * @param {Array<{ label, start, end }>} segments
   * @param {object} options - { logoBuffer?, logoPosition?, hookBuffer?, hookDuration?, videoDuration? }
   * @param {function} onProgress - ({ stage, percent, message, currentClip, totalClips, workerStates? }) => void
   */
  async sliceBatchParallel(sourceUrl, segments = [], options = {}, onProgress = () => {}) {
    if (!segments || segments.length === 0) throw new Error("No clip segments specified for export.");

    if (typeof Worker === "undefined") {
      console.warn("Web Workers not available, falling back to sequential processing.");
      return this.sliceBatch(sourceUrl, segments, options, onProgress);
    }

    const totalClips = segments.length;
    const hwCores = Math.max(1, Math.min(6, navigator.hardwareConcurrency || 4));
    const maxWorkers = Math.min(totalClips, hwCores);

    onProgress({
      stage: "init",
      percent: 2,
      message: `Engaging ${maxWorkers} CPU core${maxWorkers > 1 ? "s" : ""} for parallel processing...`,
      totalClips
    });

    // 1. Check if source is a DASH fMP4 stream with a sidx index (e.g., 2-hour YouTube HD movies)
    // If so, download ONLY the exact 2-5MB moof+mdat byte range per clip instead of the full multi-GB file!
    let dashPayloads = null;
    try {
      dashPayloads = await this.fetchDashClipPayloads(sourceUrl, segments, options, onProgress);
    } catch (dashErr) {
      console.warn("DASH sidx clip slice fallback:", dashErr);
    }

    let fullData = null;
    let sourceId = null;
    if (!dashPayloads) {
      const smart = await this.fetchSmartVideo(sourceUrl, segments, options, onProgress);
      fullData = smart.fullData;
      sourceId = smart.sourceId;
    }

    const isIsolated = Boolean(window.crossOriginIsolated && typeof window.SharedArrayBuffer !== "undefined");
    const corePath = isIsolated
      ? "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
      : "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js";

    const pool = this.getWorkerPool(maxWorkers);

    // 2. Worker state tracking (one entry per segment)
    const workerStates = segments.map((seg, i) => ({
      index: i,
      label: seg.label || `Reel ${i + 1}`,
      percent: 0,
      message: "Queued"
    }));
    const results = new Array(totalClips).fill(null);
    let completedCount = 0;

    const broadcastProgress = () => {
      const avgSegPct = workerStates.reduce((sum, ws) => sum + ws.percent, 0) / totalClips;
      const overall = 30 + Math.round((avgSegPct / 100) * 64);
      onProgress({
        stage: "parallel_clipping",
        percent: Math.min(95, overall),
        message: `Slicing ${totalClips} reel${totalClips > 1 ? "s" : ""} across ${maxWorkers} CPU core${maxWorkers > 1 ? "s" : ""} (${completedCount}/${totalClips} done)...`,
        currentClip: completedCount,
        totalClips,
        activeCores: maxWorkers,
        workerStates
      });
    };

    broadcastProgress();

    // 3. Dispatch segments across reusable worker pool with auto-fallback
    try {
      await new Promise((resolve, reject) => {
        let nextSegmentIndex = 0;
        let failed = false;

        const assignNextToSlot = (slot) => {
          if (failed) return;
          if (nextSegmentIndex >= totalClips) {
            slot.busy = false;
            return;
          }

          const i = nextSegmentIndex++;
          slot.busy = true;
          const seg = segments[i];
          const startSec = this.parseTimeToSeconds(seg.start);
          const endSec = this.parseTimeToSeconds(seg.end);

          const transferList = [];
          let videoDataCopy = null;
          let audioDataCopy = null;
          const dp = dashPayloads ? dashPayloads[i] : null;
          const segSourceId = dp ? dp.sourceId : sourceId;

          if (dp) {
            videoDataCopy = new Uint8Array(dp.videoData.byteLength);
            videoDataCopy.set(dp.videoData);
            transferList.push(videoDataCopy.buffer);

            if (dp.audioData) {
              audioDataCopy = new Uint8Array(dp.audioData.byteLength);
              audioDataCopy.set(dp.audioData);
              transferList.push(audioDataCopy.buffer);
            }
          } else if (slot.cachedSourceId !== segSourceId) {
            videoDataCopy = new Uint8Array(fullData.length);
            videoDataCopy.set(fullData);
            transferList.push(videoDataCopy.buffer);
          }

          const payload = {
            segmentIndex: i,
            startSec,
            endSec,
            label: seg.label || `Reel_${i + 1}`,
            sourceId: segSourceId,
            videoData: videoDataCopy,
            audioData: audioDataCopy,
            isDashSlice: Boolean(dp?.isDashSlice),
            vFragStartSec: dp?.vFragStartSec || 0,
            aFragStartSec: dp?.aFragStartSec || 0,
            corePath,
          };

          if (options.logoBuffer) {
            payload.logoBuffer = new Uint8Array(options.logoBuffer);
            payload.logoPosition = options.logoPosition;
          }
          if (options.hookBuffer) {
            payload.hookBuffer = new Uint8Array(options.hookBuffer);
            payload.hookDuration = options.hookDuration;
          }
          if (options.aspectRatio) {
            payload.aspectRatio = options.aspectRatio;
          }
          if (options.speedRatio) {
            payload.speedRatio = options.speedRatio;
          }

          slot.worker.onmessage = (evt) => {
            const { type, segmentIndex, percent, message, exportName, buffer, size } = evt.data;

            if (type === "progress") {
              workerStates[segmentIndex].percent = percent;
              workerStates[segmentIndex].message = message;
              broadcastProgress();
            } else if (type === "done") {
              slot.cachedSourceId = sourceId;
              workerStates[segmentIndex].percent = 100;
              workerStates[segmentIndex].message = "Done ✓";
              completedCount++;

              const blob = new Blob([buffer], { type: "video/mp4" });
              results[segmentIndex] = {
                name: exportName,
                blob,
                url: URL.createObjectURL(blob),
                size,
                start: startSec,
                end: endSec,
                duration: Math.max(0.5, endSec - startSec),
              };

              broadcastProgress();

              if (completedCount === totalClips) {
                slot.busy = false;
                resolve();
              } else {
                assignNextToSlot(slot);
              }
            } else if (type === "error") {
              failed = true;
              slot.busy = false;
              reject(new Error(`Reel ${segmentIndex + 1} failed: ${evt.data.message}`));
            }
          };

          slot.worker.onerror = (e) => {
            failed = true;
            slot.busy = false;
            reject(new Error(`Worker error on Reel ${i + 1}: ${e.message}`));
          };

          slot.worker.postMessage({ type: "slice", payload }, transferList);
        };

        // Kick off all pool workers simultaneously
        pool.forEach(slot => assignNextToSlot(slot));
      });
    } catch (workerPoolErr) {
      console.warn("Parallel worker clipping error, auto-recovering with sequential engine:", workerPoolErr);
      onProgress({
        stage: "fallback",
        percent: 32,
        message: "Auto-recovering via sequential studio engine..."
      });
      return await this.sliceBatch(sourceUrl, segments, options, onProgress);
    }

    onProgress({
      stage: "ready",
      percent: 96,
      message: `All ${totalClips} reels processed in parallel!`,
      totalClips,
      currentClip: totalClips,
      activeCores: maxWorkers,
      workerStates
    });
    return results;
  }

  /**
   * Bundles an array of { name, blob } files into a single zip archive Blob
   */
  async createZipArchive(files = [], onProgress = () => {}) {
    if (!window.JSZip) {
      try {
        await this.loadScript("js/jszip.min.js");
      } catch (_) {
        await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
      }
    }

    const zip = new window.JSZip();
    files.forEach(f => {
      zip.file(f.name, f.blob);
    });

    return await zip.generateAsync({ type: "blob" }, (meta) => {
      const pct = Math.round(meta.percent);
      onProgress({ stage: "zipping", percent: pct, message: `Packaging ZIP archive: ${pct}%` });
    });
  }
}

// Global converter instance
window.mediaConverterEngine = new MediaConverterEngine();


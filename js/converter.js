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
      this.ffmpeg = createFFmpeg({
        log: false,
        corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
      });

      this.ffmpeg.setProgress(({ ratio }) => {
        const pct = Math.min(99, Math.round(ratio * 100));
        onProgress({ stage: "transcoding", percent: pct, message: `Transcoding in browser: ${pct}%` });
      });

      await this.ffmpeg.load();
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
}

// Global converter instance
window.mediaConverterEngine = new MediaConverterEngine();

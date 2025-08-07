function base64ToAudioBuffer(
  base64: string,
  audioContext: AudioContext
): AudioBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new DataView(buffer);
  for (let i = 0; i < binary.length; i++) {
    view.setUint8(i, binary.charCodeAt(i));
  }

  const pcm = new Int16Array(buffer);
  const float32 = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    float32[i] = pcm[i] / 32768; // Normalize
  }

  const audioBuffer = audioContext.createBuffer(
    1, // mono
    float32.length,
    24000 // sampleRate
  );

  audioBuffer.getChannelData(0).set(float32);
  return audioBuffer;
}

async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetRate: number
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(audioBuffer.duration * targetRate),
    targetRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  return await offlineCtx.startRendering();
}

function extractPCM(audioBuffer: AudioBuffer): Int16Array {
  const channelData = audioBuffer.getChannelData(0); // mono
  const pcmData = new Int16Array(channelData.length);

  for (let i = 0; i < channelData.length; i++) {
    // Convert float [-1,1] to 16-bit PCM [-32768, 32767]
    pcmData[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
  }

  return pcmData;
}

function pcmToWav(pcmBase64: string, sampleRate = 24000, numChannels = 1) {
  const pcmData = atob(pcmBase64); // decode base64 to binary
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmData.length, true); // file length
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, pcmData.length, true);

  // PCM samples
  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData.charCodeAt(i));
  }

  return new Blob([view], { type: "audio/wav" });
}

function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const output = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function pcmToBase64(pcmData: Int16Array): string {
  // Convert Int16Array to Uint8Array (little-endian)
  const uint8Array = new Uint8Array(pcmData.buffer);

  // Convert to binary string
  let binary = "";
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }

  // Encode to base64
  return btoa(binary);
}

export {
  base64ToAudioBuffer,
  resampleAudioBuffer,
  extractPCM,
  pcmToWav,
  floatTo16BitPCM,
  pcmToBase64,
};

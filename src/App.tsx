import { Modality } from "@google/genai/web";
import { useCallback, useRef, useState } from "react";
import { base64Text } from "./base64Text";
import {
  useGeminiNativeAudio,
  AvailableVoices,
  type TokensUsageType,
  type VoiceNameType,
} from "./hooks/useGeminiNativeAudio";
import type { MediaModality, UsageMetadata } from "@google/genai";
import {} from "./hooks/useGeminiNativeAudio";

//console.log("Google API Key:", import.meta.env.VITE_GOOGLE_API_KEY);

const App = () => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const [selectedVoice, setSelectedVoice] = useState<VoiceNameType>(
    AvailableVoices[0].voiceName
  );

  const {
    connectSocket,
    disconnectSocket,
    isConnected,
    session,
    sendRealtimeInput,
    messages,
    responseQueue,
  } = useGeminiNativeAudio({
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    voiceName: selectedVoice,
    responseModalities: [Modality.AUDIO],
    systemInstruction:
      "You are a helpful assistant and answer in a friendly tone.",
    onUsageReporting: (usage) => {
      const tokensUsage = reportIfTokensUsage({ usageMetadata: usage });
      console.log("New Usage Report:", tokensUsage);
    },
    onAiResponseCompleted(base64Audio) {
      console.log(base64Audio);

      if (!(base64Audio && typeof base64Audio === "string")) {
        return;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      try {
        const audioBuffer = base64ToAudioBuffer(
          base64Audio,
          audioContextRef.current
        );
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
      } catch (err) {
        console.error("Playback error:", err);
      }
    },
    onUserInterruption: () => {
      audioContextRef.current = null;
    },
  });

  const [recordedPCM, setRecordedPCM] = useState<string>("");

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (event) => {
      const audioChunks = [];

      if (event.data.size > 0) {
        audioChunks.push(event.data);

        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();

        const audioContext = new AudioContext(); // default 48000 Hz
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // ✅ Resample to 16000 Hz PCM
        const resampledBuffer = await resampleAudioBuffer(audioBuffer, 16000);
        const pcmData = convertToPCM16(resampledBuffer);

        const base64String = arrayBufferToBase64(pcmData.buffer);

        console.log("data:audio/pcm;rate=16000;base64," + base64String);
        setRecordedPCM(base64String);
      }
    };

    setRecordedPCM("");
    mediaRecorder.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>WebSocket Test</h1>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>

      {isConnected ? (
        <div className=" gap-3 flex flex-col">
          <button
            onClick={() => {
              sendRealtimeInput(base64Text);
            }}
          >
            Ping
          </button>
          <button onClick={disconnectSocket}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectSocket}>Connect</button>
      )}

      <div>
        <label htmlFor="voiceSelect">Select Voice:</label>
        <select
          id="voiceSelect"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value as VoiceNameType)}
        >
          {AvailableVoices.map((voice) => (
            <option key={voice.voiceName} value={voice.voiceName}>
              {`${voice.voiceName} -- ${voice.description}`}
            </option>
          ))}
        </select>
        <div>
          <h4>Selected Voice:</h4>
          <p>{selectedVoice}</p>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Messages:</h3>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
      <button
        onClick={() => {
          console.log(session.current);
        }}
      >
        Log Session
      </button>

      <button
        onClick={() => {
          console.log(JSON.stringify(responseQueue));
        }}
      >
        Log Response Queue
      </button>

      <button
        onClick={() => {
          console.log(JSON.stringify(messages));
        }}
      >
        Log Messages
      </button>

      <div>
        <button onClick={recording ? stopRecording : startRecording}>
          {recording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>

      <button
        onClick={() => {
          audioContextRef.current?.suspend();
          audioContextRef.current = null;
        }}
      >
        Stop Speaking
      </button>
      <button
        onClick={() => {
          if (recordedPCM.length === 0) {
            console.warn("No recorded PCM to play");
            return;
          }

          const playNext = (index = 0) => {
            console.log("Playing PCM index:", index);

            const audioContext = new AudioContext({ sampleRate: 24000 });

            const base64Audio = recordedPCM;
            if (!base64Audio) {
              console.warn("No recorded PCM to play");
              return;
            }

            const audioBuffer = base64ToAudioBuffer(base64Audio, audioContext);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
          };

          playNext();
        }}
      >
        Play Recorded PCM
      </button>
      <button
        onClick={() => {
          if (recordedPCM.length === 0) {
            console.warn("No recorded PCM to send");
            return;
          }
          sendRealtimeInput(recordedPCM);
        }}
      >
        Send
      </button>
      <div>
        <button
          onClick={() => {
            playPCMBase64({
              base64String: base64Text,
              sampleRate: 16000,
            });
          }}
        >
          Play Ping Voice
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            playPCMBase64({
              base64String: recordedPCM,
              sampleRate: 16000,
            });
          }}
        >
          Play Recorded PCM
        </button>
      </div>
    </div>
  );
};

function playPCMBase64({
  base64String,
  sampleRate,
}: {
  base64String: string;
  sampleRate: number;
}) {
  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert to Int16Array
  const pcm16 = new Int16Array(bytes.buffer);

  // Convert to Float32Array (range -1.0 to 1.0)
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768; // normalize
  }

  // Use Web Audio API to play
  const context = new AudioContext({ sampleRate });
  const buffer = context.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
}

// Helper: Resample AudioBuffer to 16000 Hz
async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
) {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.duration * targetSampleRate,
    targetSampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const resampled = await offlineCtx.startRendering();
  return resampled;
}

// Helper: Convert AudioBuffer to Int16 PCM
function convertToPCM16(audioBuffer: AudioBuffer) {
  const channelData = audioBuffer.getChannelData(0); // mono
  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

const reportIfTokensUsage = ({
  usageMetadata,
}: {
  usageMetadata: UsageMetadata;
}): TokensUsageType => {
  let inputTextTokens = 0;
  let inputAudioTokens = 0;
  let outputTextTokens = 0;
  let outputAudioTokens = 0;

  for (const value of usageMetadata.promptTokensDetails ?? []) {
    if (value.modality === (Modality.TEXT as unknown as MediaModality)) {
      inputTextTokens += value.tokenCount ?? 0;
    } else if (
      value.modality === (Modality.AUDIO as unknown as MediaModality)
    ) {
      inputAudioTokens += value.tokenCount ?? 0;
    }
  }
  for (const value of usageMetadata.responseTokensDetails ?? []) {
    if (value.modality === (Modality.TEXT as unknown as MediaModality)) {
      outputTextTokens += value.tokenCount ?? 0;
    } else if (
      value.modality === (Modality.AUDIO as unknown as MediaModality)
    ) {
      outputAudioTokens += value.tokenCount ?? 0;
    }
  }

  const usage: TokensUsageType = {
    input: {
      audioTokens: inputAudioTokens,
      textTokens: inputTextTokens,
    },
    output: {
      audioTokens: outputAudioTokens,
      textTokens: outputTextTokens,
    },
  };

  return usage;
};

export default App;

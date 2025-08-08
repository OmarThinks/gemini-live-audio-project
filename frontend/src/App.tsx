import { Modality } from "@google/genai/web";
import { useCallback, useRef, useState } from "react";
import { dummyBase64Audio } from "./base64Audio.dummy";
import { base64Text } from "./base64Text";
import { useGeminiNativeAudio } from "./hooks/useGeminiNativeAudio";
import {
  base64ToAudioBuffer,
  floatTo16BitPCM,
  pcmToBase64,
} from "./utils/audioFunctions";

//console.log("Google API Key:", import.meta.env.VITE_GOOGLE_API_KEY);

const App = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);

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
    responseModalities: [Modality.AUDIO],
    systemInstruction:
      "You are a helpful assistant and answer in a friendly tone.",
    onUsageReporting: (usage) => {
      console.log("New Usage Report:", usage);
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
      // TODO: make the audio stop speaking
    },
  });

  const [recordedPCM, setRecordedPCM] = useState<string>("");

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];

    /*
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
        console.log("Audio chunk available:", event.data);
      }
    };*/
    //const audioContext = new AudioContext(); // default sampleRate, often 44100 or 48000

    /*mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);

        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();

        const audioContext = new AudioContext(); // default 48000 Hz
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const offlineCtx = new OfflineAudioContext({
          numberOfChannels: 1,
          length: Math.ceil(audioBuffer.duration * 24000),
          sampleRate: 24000,
        });

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const resampledBuffer = await offlineCtx.startRendering();
        const pcm = resampledBuffer.getChannelData(0); // Float32Array [-1, 1]

        // Optionally convert to 16-bit PCM
        const int16 = floatTo16BitPCM(pcm);
        const base64String = pcmToBase64(int16);

        console.log("PCM 24000Hz:", base64String);
        setRecordedPCM(base64String);
      }
    };*/

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

    /*
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
        const arrayBuffer = await event.data.arrayBuffer();
        const decodedAudioBuffer = await audioContext.decodeAudioData(
          arrayBuffer
        );

        const resampledBuffer = await resampleAudioBuffer(
          decodedAudioBuffer,
          24000
        );
        const pcmData = extractPCM(resampledBuffer);

        console.log("PCM 24000Hz data:", pcmData);
        // You can now use `pcmData` as raw PCM Int16Array
      }
    };*/

    /*
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Optional: base64 version
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(",")[1];
        console.log("Base64 Audio:", base64); // Do something with it
      };
      reader.readAsDataURL(audioBlob);
    };*/

    setRecordedPCM("");
    mediaRecorder.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  //console.log(messages);

  //console.log("responseQueue", JSON.stringify(responseQueue));

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

      <AudioRecorder
        recording={recording}
        audioUrl={audioUrl}
        startRecording={startRecording}
        stopRecording={stopRecording}
      />

      <button
        onClick={() => {
          const audioBlob = new Blob(audioChunks.current, {
            type: "audio/webm",
          });
          const url = URL.createObjectURL(audioBlob);
          const audio = new Audio(url);
          audio.play();
        }}
      >
        Play Recorded Audio
      </button>

      <button
        onClick={() => {
          if (!(dummyBase64Audio && typeof dummyBase64Audio === "string")) {
            return;
          }
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          }
          try {
            const audioBuffer = base64ToAudioBuffer(
              dummyBase64Audio,
              audioContextRef.current
            );
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start(0);
          } catch (err) {
            console.error("Playback error:", err);
          }
        }}
      >
        Speak
      </button>
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
            playPCMBase64(base64Text);
          }}
        >
          Play Ping Voice
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            playPCMBase64(recordedPCM);
          }}
        >
          Play Recorded PCM
        </button>
      </div>
    </div>
  );
};

function playPCMBase64(base64String: string) {
  const sampleRate = 16000;

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
async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
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
function convertToPCM16(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0); // mono
  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    let s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const AudioRecorder = ({
  recording,
  audioUrl,
  startRecording,
  stopRecording,
}: {
  recording: boolean;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}) => {
  return (
    <div>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {audioUrl && (
        <div>
          <h3>Playback:</h3>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
};

export default App;

import type { LiveServerMessage, Part } from "@google/genai";
import { GoogleGenAI, Modality } from "@google/genai/web";
import { Buffer } from "buffer";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WaveFile } from "wavefile"; // npm install wavefile
import { base64Text } from "./base64Text";
import {
  useGeminiNativeAudio,
  type TokensUsageType,
} from "./hooks/useGeminiNativeAudio";
import { dummyResponseQueue } from "./ResponseQueue.dummy";
import { dummyBase64Audio } from "./base64Audio.dummy";

//console.log("Google API Key:", import.meta.env.VITE_GOOGLE_API_KEY);

type MessageType = undefined | LiveServerMessage;

//console.log("api key", process.env.GOOGLE_API_KEY);

const App = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [responseQueue, setResponseQueue] = useState<Part[]>([]);

  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);

  const enqueueResponseQueue = useCallback((part: Part) => {
    setResponseQueue((prev) => [...prev, part]);
  }, []);
  const clearResponseQueue = useCallback(() => {
    setResponseQueue([]);
    audioContextRef.current?.suspend();
    audioContextRef.current = null;
  }, []);

  const {
    connectSocket,
    disconnectSocket,
    isConnected,
    serverStatus,
    session,
    sendRealtimeInput,
    messages,
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
    enqueueResponseQueue,
    clearResponseQueue,
  });

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
        console.log("Audio chunk available:", event.data);
      }
    };

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
    };

    mediaRecorder.start(300);
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

      <JustDoIt />

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
    </div>
  );
};

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

const JustDoIt = () => {
  const doIt = async () => {
    const ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    });

    const model = "gemini-2.5-flash-preview-native-audio-dialog";

    const config = {
      responseModalities: [Modality.AUDIO],
      systemInstruction:
        "You are a helpful assistant and answer in a friendly tone.",
    };
    const responseQueue: MessageType[] = [];

    async function waitMessage() {
      let done = false;
      let message: MessageType = undefined;
      while (!done) {
        message = responseQueue.shift();
        if (message) {
          done = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      return message;
    }

    async function handleTurn() {
      const turns: MessageType[] = [];
      let done = false;
      while (!done) {
        const message = await waitMessage();
        turns.push(message);
        if (message?.serverContent && message.serverContent.turnComplete) {
          done = true;
        }
      }
      return turns;
    }

    const session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.debug("Opened");
        },
        onmessage: function (message) {
          responseQueue.push(message);
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
        },
      },
      config: config,
    });

    // Send Audio Chunk

    // Ensure audio conforms to API requirements (16-bit PCM, 16kHz, mono)
    // Send Audio Chunk
    // Ensure audio conforms to API requirements (16-bit PCM, 16kHz, mono)

    const base64Audio = base64Text;
    console.log("Base64 Audio:\n", base64Audio);
    // If already in correct format, you can use this:
    // const fileBuffer = fs.readFileSync("sample.pcm");
    // const base64Audio = Buffer.from(fileBuffer).toString('base64');

    session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });

    const turns = await handleTurn();

    // Combine audio data strings and save as wave file
    const combinedAudio = turns.reduce((acc: number[], turn) => {
      if (turn?.data) {
        const buffer = Buffer.from(turn.data, "base64");
        const intArray = new Int16Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength / Int16Array.BYTES_PER_ELEMENT
        );
        return acc.concat(Array.from(intArray));
      }
      return acc;
    }, []);

    const audioBuffer = new Int16Array(combinedAudio);

    const wf = new WaveFile();
    /*wf.fromScratch(1, 24000, "16", audioBuffer); // output is 24kHz
    fs.writeFileSync("audio.wav", wf.toBuffer());

    session.close();*/

    console.log("Creating wave file...");

    wf.fromScratch(1, 24000, "16", audioBuffer);
    console.log("Wave file created");

    // Use browser download instead of fs.writeFileSync
    const blob = new Blob([wf.toBuffer()], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Audio downloaded");

    session.close?.();

    console.log("Session closed");
  };

  return <button onClick={doIt}>Just Do It</button>;
};

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

export default App;

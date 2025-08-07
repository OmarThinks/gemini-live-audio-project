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
import { dummyResponseQueue } from "./dummyResponseQueue";

//console.log("Google API Key:", import.meta.env.VITE_GOOGLE_API_KEY);

type MessageType = undefined | LiveServerMessage;

//console.log("api key", process.env.GOOGLE_API_KEY);

const App = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [usageQueue, setUsageQueue] = useState<TokensUsageType[]>([]);
  const [responseQueue, setResponseQueue] =
    useState<Part[]>(dummyResponseQueue);

  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const resposeQueueRef = useRef<Part[]>(dummyResponseQueue);

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
      setUsageQueue((prev) => {
        const newUsageQueue = [...prev, usage];
        console.log("newUsageQueue:", newUsageQueue);
        return newUsageQueue;
      });
    },
    onReceivingMessage: (message) => {
      //onReceivingMessage(message);
      //console.log("Message received:", message);
      //const base64PcmAudio =
      //  message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    },
    onAiResponseCompleted(base64Audio) {
      //playPcmAudio(base64Audio, 24000); // sample rate from the mimeType
      /*
      console.log("AI response completed");
      // Handle AI response completed logic here

      const wavBlob = pcmToWav(base64Audio, 24000); // sample rate from the mimeType
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.play();*/
      //audio.st
    },
    setResponseQueue,
  });

  //const [isPlaying, setIsPlaying] = useState(false);

  const isPlaying = useRef(false);

  const timeRef = useRef<number>(0);

  const playNext = () => {
    const start = new Date();
    const elapsed = start.getTime() - timeRef.current;
    timeRef.current = start.getTime();
    console.log("Time since last play:", elapsed, "ms");

    //console.log(Number(start));
    const next = resposeQueueRef.current.shift();
    if (!next || !next.inlineData?.data) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;

    const pcmBase64 = next.inlineData.data;
    const wavBlob = pcmToWav(pcmBase64, 24000);
    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      playNext(); // Play the next chunk immediately
    };

    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      isPlaying.current = false;
    });
    const end = new Date();
    console.log("Audio created in", end.getTime() - start.getTime(), "ms");
  };

  /*
  const playNext = useCallback(() => {
    if (resposeQueueRef.current.length === 0) {
      console.log("No responses to play");
      //setIsPlaying(false);
      isPlaying.current = false;
      return;
    }

    //const newResponseQueue = [...responseQueue];

    //const response = 
    //console.log(responseQueue.length, newResponseQueue.length);
    //setResponseQueue(() => newResponseQueue);
    //setIsPlaying(true);
    const response = resposeQueueRef.current.shift();

    console.log("Playing next response:", response);
    // Here you can handle the playback of the response data

    const pcmBase64 = response?.inlineData?.data; // Assuming response.pcmAudio.data is the base64 PCM audio

    if (!pcmBase64) {
      console.warn("No PCM audio data found in response");
      return;
    }

    const wavBlob = pcmToWav(pcmBase64, 24000); // sample rate from the mimeType
    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      //setIsPlaying(false);
      //playNext();
    };
    //audio.play().then(() => {
    //  playNext();
    //});
  }, [responseQueue]);*/

  /*
  useEffect(() => {
    if (!isPlaying && responseQueue.length > 0) {
      console.log(
        "Starting playback of next response From the Effect",
        isPlaying,
        responseQueue.length
      );
      setIsPlaying(true);
      playNext();
    }
  }, [isPlaying, responseQueue, playNext]);*/

  /*
  useEffect(() => {
    if (!isPlaying) {
      playNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playNext, responseQueue]);*/

  /*
  const [messages, setMessages] = useState<string[]>([]);

  const session = useRef<Session | null>(null);
  const isConnected = !!session?.current;
  const [responseQueue, setResponseQueue] = useState<MessageType[]>([]);
  const [usageQueue, setUsageQueue] = useState<TokensUsageType[]>([]);
  const [serverStatus, _setServerStatus] = useState<ServerStatusType>(
    ServerStatusEnum.Disconnected
  );

  const setServerStatus: React.Dispatch<
    React.SetStateAction<ServerStatusType>
  > = (status) => {
    _setServerStatus(status);
  };

  const connectSocket = useCallback(async () => {
    const _session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.debug("Opened");
          setMessages((prev) => [...prev, "Connected to Google GenAI"]);
          setServerStatus(ServerStatusEnum.Listening);
        },
        onmessage: function (message) {
          recordTokensUsage({
            message,
            setUsageQueue,
          });
          updateServerStatusFromMessage({
            message,
            setServerStatus,
          });
          setResponseQueue((prev) => [...prev, message]);
          setMessages((prev) => [...prev, `Message received: ${message.data}`]);
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
          setMessages((prev) => [...prev, `Error: ${e.message}`]);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
          setMessages((prev) => [...prev, `Disconnected: ${e.reason}`]);
          session.current = null;
          setServerStatus(ServerStatusEnum.Disconnected);
        },
      },
      config: config,
    });

    console.log("Connected to Google GenAI:", _session);

    session.current = _session;
  }, []);

  console.log("responseQueue", JSON.stringify(responseQueue));
  console.log("messages", JSON.stringify(messages));
  console.log("usageQueue", JSON.stringify(usageQueue));
  console.log("serverStatus", serverStatus);

  const disconnectSocket = useCallback(() => {
    session?.current?.close?.();
  }, []);

  useEffect(() => {
    return () => {
      session?.current?.close?.();
    };
  }, []);
  */

  /*
  const waitMessage = useCallback(async () => {
    let done = false;
    let message: MessageType = undefined;
    while (!done) {
      //message = responseQueue.shift();
      const newResponseQueue = [...responseQueue];
      message = newResponseQueue.shift();
      setResponseQueue(newResponseQueue);
      if (message) {
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message;
  }, [responseQueue]);

  const handleTurn = useCallback(async () => {
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
  }, [waitMessage]);

  const ping = useCallback(async () => {
    const base64Audio = base64Text;

    console.log("Base64 Audio:\n", base64Audio);
    // If already in correct format, you can use this:
    // const fileBuffer = fs.readFileSync("sample.pcm");
    // const base64Audio = Buffer.from(fileBuffer).toString('base64');

    session.current?.sendRealtimeInput?.({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });
    console.log("Audio chunk sent");

    const turns = await handleTurn();
    console.log("Turns received:", turns);

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
    

    console.log("Combined audio length:", combinedAudio);

    const audioBuffer = new Int16Array(combinedAudio);

    console.log("Audio buffer created with length:", audioBuffer.length);

    const wf = new WaveFile();

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

    session.current?.close?.();

    console.log("Session closed");
  }, []);
  */

  //console.log("responseQueue", JSON.stringify(responseQueue));
  //console.log("messages", JSON.stringify(messages));
  //console.log("usageQueue", JSON.stringify(usageQueue));
  //console.log("serverStatus", serverStatus);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
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

      <button onClick={playNext}>Play Next</button>
      <AudioPlayer />
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

const playPcmAudio = (pcmBase64: string, sampleRate = 24000) => {
  const wavBlob = pcmToWav(pcmBase64, sampleRate); // sample rate from the mimeType
  const audioUrl = URL.createObjectURL(wavBlob);
  const audio = new Audio(audioUrl);
  audio.play();
};

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

const AudioPlayer = memo(() => {
  const [responseQueue, setResponseQueue] =
    useState<Part[]>(dummyResponseQueue);
  const [isPlaying, setIsPlaying] = useState(false);
  console.log(isPlaying);

  const timeRef = useRef<number>(0);

  /*
  const playNext = () => {
    const start = new Date();
    const elapsed = start.getTime() - timeRef.current;
    timeRef.current = start.getTime();
    console.log("Time since last play:", elapsed, "ms");

    //console.log(Number(start));

    const newResponseQueue = [...responseQueue];
    const next = newResponseQueue.shift();

    setResponseQueue(newResponseQueue);

    if (!next || !next.inlineData?.data) {
      console.log("No more responses to play");
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    const pcmBase64 = next.inlineData.data;
    const wavBlob = pcmToWav(pcmBase64, 24000);
    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      //playNext(); // Play the next chunk immediately
      setIsPlaying(false);
    };

    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      //setIsPlaying(false);
    });
    const end = new Date();
    console.log("Audio created in", end.getTime() - start.getTime(), "ms");
  };*/

  /*
  const playNext = (index: number = 0) => {
    const start = new Date();
    const part = responseQueue[index];
    //console.log("Playing next chunk at index:", index, part);

    if (part === undefined) {
      return;
    }

    const pcmBase64 = part.inlineData?.data as string;
    const wavBlob = pcmToWav(pcmBase64, 24000);
    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      const end = new Date();
      console.log(
        "Audio played and ednded in",
        end.getTime() - start.getTime(),
        "ms"
      );
      playNext(index + 1); // Play the next chunk immediately
    };
    audio.play();
    const endRunningFunction = new Date();
    console.log(
      "playNext function ended in",
      endRunningFunction.getTime() - start.getTime(),
      "ms"
    );
  };
  */

  const audioContextRef = useRef<AudioContext | null>(null);

  const playNext = async (index = 0) => {
    const chunk = responseQueue[index]?.inlineData?.data;
    if (!chunk) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    try {
      const audioBuffer = base64ToAudioBuffer(chunk, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        playNext(index + 1); // recursively play the next chunk
      };

      source.start(0);
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  /*
  useEffect(() => {
    if (!isPlaying && responseQueue.length > 0) {
      console.log(
        "Starting playback of next response From the Effect",
        isPlaying,
        responseQueue.length
      );
      setIsPlaying(true);
      playNext();
    }
  }, [isPlaying, responseQueue, playNext]);
  */

  return <button onClick={() => playNext()}>Play Next</button>;
});

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

//export default App;

export default AudioPlayer;

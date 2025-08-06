import type { LiveServerMessage, Part } from "@google/genai";
import { GoogleGenAI, Modality } from "@google/genai/web";
import { Buffer } from "buffer";
import { useMemo, useState } from "react";
import { WaveFile } from "wavefile"; // npm install wavefile
import { base64Text } from "./base64Text";
import {
  useGeminiNativeAudio,
  type TokensUsageType,
} from "./hooks/useGeminiNativeAudio";

//console.log("Google API Key:", import.meta.env.VITE_GOOGLE_API_KEY);

type MessageType = undefined | LiveServerMessage;

//console.log("api key", process.env.GOOGLE_API_KEY);

const App = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [usageQueue, setUsageQueue] = useState<TokensUsageType[]>([]);
  const [responseQueue, setResponseQueue] = useState<Part[]>([]);

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
      //console.log("Message received:", message);
    },
    onAiResponseCompleted() {
      console.log("AI response completed");
      // Handle AI response completed logic here
    },
    setResponseQueue,
  });

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

  const audioUrl = useMemo(() => {
    const firstResponseQueueItem = responseQueue[0];

    if (firstResponseQueueItem) {
      console.log("First responseQueue item:", firstResponseQueueItem);
      // You can also play the audio if needed
      const audioData = firstResponseQueueItem.inlineData?.data as string;
      console.log("Audio Data:", audioData);
      if (audioData) {
        const audioBlob = new Blob([Buffer.from(audioData, "base64")], {
          type: "audio/wav",
        });

        console.log("Audio Blob created:", audioBlob);

        const audioUrl = URL.createObjectURL(audioBlob);

        return audioUrl;

        /*
        console.log("Audio URL created:", audioUrl);

        const audio = new Audio(audioUrl);

        console.log("Audio object created:", audio);
        audio.play();
        console.log("Audio playback started");*/
      }
      return undefined;
    }
  }, [responseQueue]);

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

      <button
        onClick={() => {
          const firstResponseQueueItem = responseQueue[1];

          if (firstResponseQueueItem) {
            console.log("First responseQueue item:", firstResponseQueueItem);
            // You can also play the audio if needed
            const audioData = firstResponseQueueItem.inlineData?.data as string;

            const wavBlob = pcmToWav(audioData, 24000); // sample rate from the mimeType
            const audioUrl = URL.createObjectURL(wavBlob);
            const audio = new Audio(audioUrl);
            audio.play();

            /*
            console.log("Audio Data:", audioData);

            const audioSrc = `data:audio/wav;base64,${audioData}`;

            console.log("Audio Source:", audioSrc);

            const audio = new Audio(audioSrc);

            console.log("Audio object created:", audio);

            audio.play();*/
            /*

            console.log("Audio Data:", audioData);
            if (audioData) {
              const audioBlob = new Blob([Buffer.from(audioData, "base64")], {
                type: "audio/wav",
              });

              console.log("Audio Blob created:", audioBlob);

              const audioUrl = URL.createObjectURL(audioBlob);

              console.log("Audio URL created:", audioUrl);

              const audio = new Audio(audioUrl);

              console.log("Audio object created:", audio);
              audio.play();
              console.log("Audio playback started");
            }*/
          } else {
            console.log("No items in responseQueue");
          }
        }}
      >
        Read out the first responseQueue item
      </button>

      <audio src={audioUrl} controls />

      <JustDoIt />
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

export default App;

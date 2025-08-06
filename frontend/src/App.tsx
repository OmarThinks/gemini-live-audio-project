import type { LiveServerMessage } from "@google/genai";
import { GoogleGenAI, Modality } from "@google/genai/web";
import { Buffer } from "buffer";
import { useState } from "react";
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
  const [usageQueue, setUsageQueue] = useState<TokensUsageType[]>([]);
  const [messages, setMessages] = useState<string[]>([]);

  const {
    connectSocket,
    disconnectSocket,
    isConnected,
    serverStatus,
    session,
    sendRealtimeInput,
  } = useGeminiNativeAudio({
    init_apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    init_responseModalities: [Modality.AUDIO],
    init_systemInstruction:
      "You are a helpful assistant and answer in a friendly tone.",
    init_onUsageReporting: (usage) => {
      console.log("Usage reported:", usage);
      setUsageQueue((prev) => [...prev, usage]);
    },
    init_onReceivingMessage: (message) => {
      //console.log("Message received:", message);
      setMessages((prev) => [...prev, `Message received: ${message.data}`]);
    },
    init_onAiResponseReady(response) {
      console.log("AI response ready:", response);
      // Handle AI response ready logic here
    },
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

      <JustDoIt />
    </div>
  );
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

export default App;

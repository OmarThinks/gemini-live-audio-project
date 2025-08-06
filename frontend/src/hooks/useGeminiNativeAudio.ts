import type { LiveServerMessage, Part } from "@google/genai/web";
import {
  GoogleGenAI,
  MediaModality,
  Modality,
  Session,
} from "@google/genai/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const model = "gemini-2.5-flash-preview-native-audio-dialog";

/*
async function playRawPCM(int16Array: Int16Array, sampleRate = 24000) {
  const audioContext = new AudioContext({ sampleRate });

  // Convert Int16Array to Float32Array (Web Audio API uses Float32)
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768; // normalize from [-32768, 32767] to [-1, 1]
  }

  // Create AudioBuffer
  const audioBuffer = audioContext.createBuffer(
    1, // 1 channel (mono)
    float32Array.length,
    sampleRate
  );

  audioBuffer.getChannelData(0).set(float32Array);

  // Create buffer source and connect it
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Start playback
  source.start();
}*/

const useGeminiNativeAudio = ({
  apiKey,
  responseModalities = [Modality.AUDIO],
  systemInstruction,
  onUsageReporting,
  onReceivingMessage,
  onChangingServerStatus,
  onSocketError,
  onSocketClose,
  onAiResponseCompleted: onAiResponseReady,
  setResponseQueue,
}: //onAiShouldStopSpeaking,
{
  apiKey: string;
  responseModalities?: Modality[];
  systemInstruction?: string;
  onUsageReporting?: (usage: TokensUsageType) => void;
  onReceivingMessage?: (message: LiveServerMessage) => void;
  onChangingServerStatus?: (status: ServerStatusType) => void;
  onSocketError?: (error: unknown) => void;
  onSocketClose?: (reason: unknown) => void;
  onAiResponseCompleted?: () => void;
  onAiShouldStopSpeaking?: () => void;
  setResponseQueue: React.Dispatch<React.SetStateAction<Part[]>>;
}) => {
  const session = useRef<Session | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const isConnected = !!session?.current;
  const [serverStatus, _setServerStatus] = useState<ServerStatusType>(
    ServerStatusEnum.Disconnected
  );

  //console.log("responseQueue", JSON.stringify(responseQueue));

  const ai = useMemo(() => {
    return new GoogleGenAI({
      apiKey: apiKey,
    });
  }, [apiKey]);

  //console.log(onUsageReporting);

  const setServerStatus: (status: ServerStatusType) => void = useCallback(
    (status) => {
      //console.log("messages:", messages);

      _setServerStatus(status);
      onChangingServerStatus?.(status);
      if (status === ServerStatusEnum.ResponseIsReady) {
        /*
        const combinedAudio = responseQueue.reduce((acc: number[], turn) => {
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
        */

        onAiResponseReady?.();

        //console.log("Combined audio length:", combinedAudio.length);

        /*
        const audioBuffer = new Int16Array(combinedAudio);



        //playRawPCM(audioBuffer, 24000); // 24kHz sample rate

        console.log("Audio buffer created with length:", audioBuffer.length);

        const wf = new WaveFile();

        console.log("Creating wave file...");

        wf.fromScratch(1, 24000, "16", audioBuffer);
        */

        //setResponseQueue([]);
      }
    },
    [onAiResponseReady, onChangingServerStatus]
  );

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
            onUsageReporting: onUsageReporting,
          });
          const serverStatus = getServerStatusFromMessage(message);
          onReceivingMessage?.(message);
          if (serverStatus) {
            setServerStatus?.(serverStatus);
          }
          if (message?.serverContent?.modelTurn?.parts) {
            const parts: Part[] =
              message?.serverContent?.modelTurn?.parts.filter(
                (part) => part.inlineData !== undefined
              ) ?? [];

            if (parts.length > 0) {
              //console.log("Parts:", parts);
              //console.log("Part inline data:", parts[0].inlineData);
              setResponseQueue((prev) => [...prev, ...parts]);
            }

            //const parts: Part[] = []
          }
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
          setMessages((prev) => [...prev, `Error: ${e.message}`]);
          onSocketError?.(e);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
          setMessages((prev) => [...prev, `Disconnected: ${e.reason}`]);
          session.current = null;
          setServerStatus(ServerStatusEnum.Disconnected);
          onSocketClose?.(e);
        },
      },
      config: {
        responseModalities: responseModalities,
        systemInstruction: systemInstruction,
      },
    });

    console.log("Connected to Google GenAI:", _session);

    session.current = _session;
  }, [
    ai.live,
    responseModalities,
    systemInstruction,
    setServerStatus,
    onUsageReporting,
    onReceivingMessage,
    setResponseQueue,
    onSocketError,
    onSocketClose,
  ]);

  const disconnectSocket = useCallback(() => {
    session?.current?.close?.();
    session.current = null;
  }, []);

  useEffect(() => {
    return () => {
      session?.current?.close?.();
    };
  }, []);
  //console.log("messages", messages);
  //console.log("responseQueue", responseQueue);

  const sendRealtimeInput = useCallback(
    async (message: string) => {
      setResponseQueue([]);
      session.current?.sendRealtimeInput?.({
        audio: {
          data: message,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    },
    [setResponseQueue]
  );

  return {
    isConnected,
    serverStatus,
    connectSocket,
    disconnectSocket,
    session,
    sendRealtimeInput,
  };
};

const ServerStatusEnum = {
  Listening: "Listening",
  Responding: "Responding",
  ResponseIsReady: "ResponseIsReady",
  Disconnected: "Disconnected",
};

type ServerStatusType =
  (typeof ServerStatusEnum)[keyof typeof ServerStatusEnum];

type TokensUsageType = {
  input: {
    textTokens: number;
    audioTokens: number;
  };
  output: {
    textTokens: number;
    audioTokens: number;
  };
};

const recordTokensUsage = ({
  message,
  onUsageReporting,
}: {
  message: LiveServerMessage;
  onUsageReporting?: (usage: TokensUsageType) => void;
}): void => {
  if (message.usageMetadata) {
    let inputTextTokens = 0;
    let inputAudioTokens = 0;
    let outputTextTokens = 0;
    let outputAudioTokens = 0;

    for (const value of message.usageMetadata.promptTokensDetails ?? []) {
      if (value.modality === (Modality.TEXT as unknown as MediaModality)) {
        inputTextTokens += value.tokenCount ?? 0;
      } else if (
        value.modality === (Modality.AUDIO as unknown as MediaModality)
      ) {
        inputAudioTokens += value.tokenCount ?? 0;
      }
    }
    for (const value of message.usageMetadata.responseTokensDetails ?? []) {
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
    console.log("Tokens usage:", usage);

    onUsageReporting?.(usage);
  }
};

/**
 * This function tries to read the server status from the message.
 * It returns the status if it can determine it, otherwise returns undefined.
 */

const getServerStatusFromMessage = (
  message: LiveServerMessage
): ServerStatusType | undefined => {
  if (message.setupComplete) {
    return ServerStatusEnum.Listening;
  } else if (message.serverContent?.modelTurn) {
    return ServerStatusEnum.Responding;
  } else if (message.serverContent?.turnComplete) {
    return ServerStatusEnum.ResponseIsReady;
  } else {
    return undefined;
  }
  // TODO: when to move on to listening again? so that it can just shut up?
};

export { ServerStatusEnum, useGeminiNativeAudio };

export type { ServerStatusType, TokensUsageType, MessageQueueType };

import type { LiveServerMessage, Part } from "@google/genai/web";
import {
  GoogleGenAI,
  MediaModality,
  Modality,
  Session,
} from "@google/genai/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Buffer } from "buffer";
import { base64Text } from "../base64Text";

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
  onSocketError,
  onSocketClose,
  onAiResponseCompleted,
  onResponseChunks,
  onUserInterruption,
}: {
  apiKey: string;
  responseModalities?: Modality[];
  systemInstruction?: string;
  onUsageReporting?: (usage: TokensUsageType) => void;
  onReceivingMessage?: (message: LiveServerMessage) => void;
  onSocketError?: (error: unknown) => void;
  onSocketClose?: (reason: unknown) => void;
  onAiResponseCompleted?: (base64Audio: string) => void;
  onResponseChunks?: (part: Part[]) => void;
  onUserInterruption: () => void;
}) => {
  const innerResponseQueue = useRef<Part[]>([]);

  const session = useRef<Session | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const isConnected = !!session?.current;

  const ai = useMemo(() => {
    return new GoogleGenAI({
      apiKey: apiKey,
    });
  }, [apiKey]);

  //console.log(onUsageReporting);

  const connectSocket = useCallback(async () => {
    const _session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.debug("Opened");
          setMessages((prev) => [...prev, "Connected to Google GenAI"]);
        },
        onmessage: function (message) {
          setMessages((prev) => [...prev, `Message received: ${message.data}`]);
          recordTokensUsage({
            message,
            onUsageReporting: onUsageReporting,
          });
          onReceivingMessage?.(message);

          if (message.serverContent?.turnComplete) {
            const combinedBase64 = combineResponseQueueToBase64Pcm({
              responseQueue: innerResponseQueue.current,
            });
            onAiResponseCompleted?.(combinedBase64);
          }
          if (message?.serverContent?.modelTurn?.parts) {
            const parts: Part[] =
              message?.serverContent?.modelTurn?.parts.filter(
                (part) => part.inlineData !== undefined
              ) ?? [];

            if (parts.length > 0) {
              //console.log("Parts:", parts);
              //console.log("Part inline data:", parts[0].inlineData);
              //setResponseQueue((prev) => [...prev, ...parts]);
              onResponseChunks?.(parts);
              innerResponseQueue.current = [
                ...innerResponseQueue.current,
                ...parts,
              ];
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
          console.log("Session closed:", e);
          setMessages((prev) => [...prev, `Disconnected: ${e.reason}`]);
          session.current = null;
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
    onUsageReporting,
    onReceivingMessage,
    onAiResponseCompleted,
    onResponseChunks,
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
      onUserInterruption();
      session.current?.sendRealtimeInput?.({
        audio: {
          data: message,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    },
    [onUserInterruption]
  );

  return {
    isConnected,
    connectSocket,
    disconnectSocket,
    session,
    sendRealtimeInput,
    messages,
  };
};

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

const combineResponseQueueToBase64Pcm = ({
  responseQueue,
}: {
  responseQueue: Part[];
}) => {
  const pcmChunks: Uint8Array[] = responseQueue.map((part) => {
    if (part?.inlineData?.data) {
      const buf = Buffer.from(part.inlineData?.data, "base64"); // decode base64 to raw bytes
      const toReturn = new Uint8Array(
        buf.buffer,
        buf.byteOffset,
        buf.byteLength
      );
      return toReturn;
    } else {
      return new Uint8Array();
    }
  });

  // Calculate total length
  const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // Create one big Uint8Array
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of pcmChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert back to base64
  const combinedBase64 = Buffer.from(combined.buffer).toString("base64");

  return combinedBase64;
};

export { useGeminiNativeAudio };

export type { TokensUsageType };

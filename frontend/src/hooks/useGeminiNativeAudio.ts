import type { UsageMetadata } from "@google/genai";
import type { LiveServerMessage, Part } from "@google/genai/web";
import { GoogleGenAI, Modality, Session } from "@google/genai/web";
import { Buffer } from "buffer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const model = "gemini-2.5-flash-preview-native-audio-dialog";

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
  onUsageReporting?: (usage: UsageMetadata) => void;
  onReceivingMessage?: (message: LiveServerMessage) => void;
  onSocketError?: (error: unknown) => void;
  onSocketClose?: (reason: unknown) => void;
  onAiResponseCompleted?: (base64Audio: string) => void;
  onResponseChunks?: (part: Part[]) => void;
  onUserInterruption: () => void;
}) => {
  const innerResponseQueue = useRef<Part[]>([]);
  const [responseQueue, setResponseQueue] = useState<Part[]>([]);

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
          if (message.usageMetadata) {
            onUsageReporting?.(message.usageMetadata);
          }
          onReceivingMessage?.(message);

          if (message.serverContent?.turnComplete) {
            const combinedBase64 = combineResponseQueueToBase64Pcm({
              responseQueue: innerResponseQueue.current,
            });
            onAiResponseCompleted?.(combinedBase64);
            console.log(
              "AI Turn completed, base64 audio:",
              responseQueue,
              combinedBase64
            );
          }
          if (message?.serverContent?.modelTurn?.parts) {
            const parts: Part[] =
              message?.serverContent?.modelTurn?.parts.filter(
                (part) => part.inlineData !== undefined
              ) ?? [];

            if (parts.length > 0) {
              onResponseChunks?.(parts);
              setResponseQueue((prev) => [...prev, ...parts]);
              innerResponseQueue.current = [
                ...innerResponseQueue.current,
                ...parts,
              ];
            }
          }
          if (message?.serverContent?.interrupted) {
            onUserInterruption();
            setResponseQueue([]);
            innerResponseQueue.current = [];
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
    responseQueue,
    onResponseChunks,
    onUserInterruption,
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

  const sendRealtimeInput = useCallback(async (message: string) => {
    console.log("Sending realtime input:", message);
    session.current?.sendRealtimeInput?.({
      audio: {
        data: message,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }, []);

  return {
    isConnected,
    connectSocket,
    disconnectSocket,
    session,
    sendRealtimeInput,
    messages,
    responseQueue,
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

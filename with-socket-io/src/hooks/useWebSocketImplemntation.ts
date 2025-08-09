import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modality,
  type LiveClientMessage,
  type LiveClientSetup,
  type LiveServerMessage,
  type Part,
  type UsageMetadata,
  type ListModelsConfig,
} from "@google/genai";

const model = "models/gemini-2.5-flash-preview-native-audio-dialog";

const useWebSocketImplementation = ({
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
  targetTokens,
  voiceName = AvailableVoices[0].voiceName,
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
  onUserInterruption?: () => void;
  targetTokens?: number;
  voiceName?: string; // Optional voice name, default to first available voice
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const _targetTokens = targetTokens ? `${targetTokens}` : undefined;

  console.log("isConnected:", isConnected);

  const sendMessage = useCallback(
    (message: LiveClientMessage) => {
      if (!isConnected || !socketRef.current) {
        console.warn("WebSocket is not connected");
        return;
      }
      console.log("Sending message:", message);
      socketRef.current.send(JSON.stringify(message));
    },
    [isConnected]
  );

  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState) {
      console.warn("WebSocket is already connected");
      return;
    }

    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
    );
    socketRef.current = ws;
    socketRef.current.onopen = () => {
      console.log("WebSocket connection opened");
      setIsConnected(true);
    };
    socketRef.current.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
    };
    socketRef.current.onerror = (error) => {
      console.log("WebSocket error:", error);
    };
    socketRef.current.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      setIsConnected(false);
    };
  }, [apiKey]);

  useEffect(() => {
    if (isConnected) {
      const serverConfig: LiveClientSetup = {
        model,
        generationConfig: {
          responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        systemInstruction,
        contextWindowCompression: {
          slidingWindow: { targetTokens: _targetTokens },
        },
      };

      sendMessage({
        setup: serverConfig,
      });
    } else {
      console.log("WebSocket is not connected");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const disconnectWebSocket = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  const sendRealtimeInput = useCallback(
    (message: string) => {
      if (!isConnected || !socketRef.current) {
        console.warn("WebSocket is not connected");
        return;
      }

      const messageToSend: LiveClientMessage = {
        realtimeInput: {
          text: "Hello",
          /*audio: {
            data: message,
            mimeType: "audio/pcm;rate=16000",
          },*/
        },
      };

      console.log("Sending message:", messageToSend);

      socketRef.current.send(JSON.stringify(messageToSend));
    },
    [isConnected]
  );

  return {
    socket: socketRef.current,
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
    sendRealtimeInput,
  };
};

const AvailableVoices: {
  voiceName: VoiceNameType;
  description: string;
}[] = [
  { voiceName: "Zephyr", description: "Bright" },
  { voiceName: "Puck", description: "Upbeat" },
  { voiceName: "Charon", description: "Informative" },
  { voiceName: "Kore", description: "Firm" },
  { voiceName: "Fenrir", description: "Excitable" },
  { voiceName: "Leda", description: "Youthful" },
  { voiceName: "Orus", description: "Firm" },
  { voiceName: "Aoede", description: "Breezy" },
  { voiceName: "Callirrhoe", description: "Easy-going" },
  { voiceName: "Autonoe", description: "Bright" },
  { voiceName: "Enceladus", description: "Breathy" },
  { voiceName: "Iapetus", description: "Clear" },
  { voiceName: "Umbriel", description: "Easy-going" },
  { voiceName: "Algieba", description: "Smooth" },
  { voiceName: "Despina", description: "Smooth" },
  { voiceName: "Erinome", description: "Clear" },
  { voiceName: "Algenib", description: "Gravelly" },
  { voiceName: "Rasalgethi", description: "Informative" },
  { voiceName: "Laomedeia", description: "Upbeat" },
  { voiceName: "Achernar", description: "Soft" },
  { voiceName: "Alnilam", description: "Firm" },
  { voiceName: "Schedar", description: "Even" },
  { voiceName: "Gacrux", description: "Mature" },
  { voiceName: "Pulcherrima", description: "Forward" },
  { voiceName: "Achird", description: "Friendly" },
  { voiceName: "Zubenelgenubi", description: "Casual" },
  { voiceName: "Vindemiatrix", description: "Gentle" },
  { voiceName: "Sadachbia", description: "Lively" },
  { voiceName: "Sadaltager", description: "Knowledgeable" },
  { voiceName: "Sulafat", description: "Warm" },
];

type VoiceNameType =
  | "Zephyr"
  | "Puck"
  | "Charon"
  | "Kore"
  | "Fenrir"
  | "Leda"
  | "Orus"
  | "Aoede"
  | "Callirrhoe"
  | "Autonoe"
  | "Enceladus"
  | "Iapetus"
  | "Umbriel"
  | "Algieba"
  | "Despina"
  | "Erinome"
  | "Algenib"
  | "Rasalgethi"
  | "Laomedeia"
  | "Achernar"
  | "Alnilam"
  | "Schedar"
  | "Gacrux"
  | "Pulcherrima"
  | "Achird"
  | "Zubenelgenubi"
  | "Vindemiatrix"
  | "Sadachbia"
  | "Sadaltager"
  | "Sulafat";

export { useWebSocketImplementation };

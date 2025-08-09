import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveClientRealtimeInput, LiveClientMessage } from "@google/genai";

const useWebSocketImplementation = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState) {
      console.warn("WebSocket is already connected");
      return;
    }
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

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

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

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
          audio: {
            data: message,
            mimeType: "audio/pcm;rate=16000",
          },
        },
      };

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

export { useWebSocketImplementation };

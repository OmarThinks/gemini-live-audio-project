import { useCallback, useEffect, useRef, useState } from "react";

const useWebSocketImplementation = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    );
    socketRef.current = ws;
    socketRef.current.onopen = () => {
      console.debug("WebSocket connection opened");
      setIsConnected(true);
    };
    socketRef.current.onmessage = (event) => {
      console.debug("WebSocket message received:", event.data);
    };
    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    socketRef.current.onclose = (event) => {
      console.debug("WebSocket connection closed:", event);
      setIsConnected(false);
    };

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [connectWebSocket, disconnect]);

  return { socket: socketRef.current, isConnected };
};

export { useWebSocketImplementation };

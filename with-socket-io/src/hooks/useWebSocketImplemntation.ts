import { useEffect, useRef, useState } from "react";

const useWebSocketImplementation = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    );
    socketRef.current = ws;

    return () => {
      socketRef.current?.close();
      setSocket(null);
    };
  }, []);

  return { socket: socketRef.current };
};

export { useWebSocketImplementation };

"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io("http://localhost:8000");
    setSocket(socketInstance);

    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("Connected:", socketInstance.id);
      setIsConnected(true);
      setMessages((prev) => [...prev, `Connected: ${socketInstance.id}`]);
    });

    socketInstance.on("events", (data) => {
      console.log("Received:", data);
      setMessages((prev) => [...prev, `Received: ${data}`]);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected");
      setIsConnected(false);
      setMessages((prev) => [...prev, "Disconnected"]);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (socket && isConnected) {
      socket.emit("events", "Hello from Next.js client!");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>WebSocket Test</h1>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <button onClick={sendMessage} disabled={!isConnected}>
        Send Test Message
      </button>
      <div style={{ marginTop: "20px" }}>
        <h3>Messages:</h3>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
    </div>
  );
}

export default Home;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

function Home() {
  const [messages, setMessages] = useState<string[]>([]);

  const socket = useRef<Socket | null>(null);
  const isConnected = !!socket?.current?.connected;

  const connectSocket = useCallback(() => {
    if (!socket.current) {
      const _socket = io("http://localhost:8000", {});

      _socket.on("connect", () => {
        console.log("Connected:", _socket.id);
        setMessages((prev) => [...prev, `Connected: ${_socket.id}`]);
      });

      _socket.on("events", (data) => {
        console.log("Received:", data);
        setMessages((prev) => [...prev, `Received: ${data}`]);
      });

      _socket.on("disconnect", () => {
        console.log("Disconnected");
        setMessages((prev) => [...prev, "Disconnected"]);
      });

      _socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
        setMessages((prev) => [...prev, `Connection error: ${err.message}`]);
      });

      _socket.on("connect_timeout", (timeout) => {
        console.error("Connection timeout:", timeout);
        setMessages((prev) => [...prev, `Connection timeout: ${timeout}`]);
      });

      _socket.on("reconnect_attempt", (attempt) => {
        console.log("Reconnecting attempt:", attempt);
        setMessages((prev) => [...prev, `Reconnecting attempt: ${attempt}`]);
      });

      _socket.on("reconnect_failed", () => {
        console.error("Reconnection failed");
        setMessages((prev) => [...prev, "Reconnection failed"]);
      });

      socket.current = _socket;
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    socket.current?.disconnect?.();
  }, []);

  useEffect(() => {
    // Initialize socket connection
    //const socketInstance = io("http://localhost:8000", {});
    //setSocket(socketInstance);

    // Connection event handlers
    //socketInstance.on("connect", () => {
    //  console.log("Connected:", socketInstance.id);
    //  setIsConnected(true);
    //  setMessages((prev) => [...prev, `Connected: ${socketInstance.id}`]);
    //});

    //socketInstance.on("events", (data) => {
    //  console.log("Received:", data);
    //  setMessages((prev) => [...prev, `Received: ${data}`]);
    //});

    //socketInstance.on("disconnect", () => {
    //  console.log("Disconnected");
    //  setIsConnected(false);
    //  setMessages((prev) => [...prev, "Disconnected"]);
    //});

    // Cleanup on unmount
    return () => {
      socket?.current?.disconnect?.();

      //socketInstance.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (socket.current && isConnected) {
      socket.current.emit("events", "Hello from Next.js client!");
      console.log("Message sent: Hello from Next.js client!");
      setMessages((prev) => [...prev, "Sent: Hello from Next.js client!"]);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>WebSocket Test</h1>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {isConnected ? (
        <div className=" gap-3 flex flex-col">
          <button onClick={sendMessage}>Send Test Message</button>
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
    </div>
  );
}

export default Home;

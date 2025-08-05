"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

function Home() {
  const [messages, setMessages] = useState<string[]>([]);

  const socket = useRef<Socket | null>(null);
  const isConnected = !!socket?.current?.connected;

  const connectSocket = useCallback(() => {
    if (!socket?.current?.connected) {
      const _socket = io("http://localhost:8000", {});

      _socket.on("connect", () => {
        console.log("Connected:", _socket.id);
        setMessages((prev) => [...prev, `Connected: ${_socket.id}`]);
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

      _socket.on("pong", (response) => {
        console.log("Pong received:", response);
        setMessages((prev) => [...prev, `Message received: ${response}`]);
      });

      socket.current = _socket;
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    socket.current?.disconnect?.();
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      socket?.current?.disconnect?.();

      //socketInstance.disconnect();
    };
  }, []);

  const ping = useCallback(() => {
    if (socket.current && isConnected) {
      socket.current.emit("ping", "ping");
      console.log("Ping sent");
      setMessages((prev) => [...prev, "Ping sent"]);
    }
  }, [isConnected]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>WebSocket Test</h1>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {isConnected ? (
        <div className=" gap-3 flex flex-col">
          <button onClick={ping}>Ping</button>
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

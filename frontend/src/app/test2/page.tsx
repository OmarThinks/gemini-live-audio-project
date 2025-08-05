"use client";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai/web";
import * as fs from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaveFile } from "wavefile"; // npm install wavefile
import { base64Text } from "./base64Text";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const model = "gemini-2.5-flash-preview-native-audio-dialog";

const config = {
  responseModalities: [Modality.AUDIO],
  systemInstruction:
    "You are a helpful assistant and answer in a friendly tone.",
};

type MessageType = undefined | LiveServerMessage;

//console.log("api key", process.env.GOOGLE_API_KEY);

const Test = () => {
  const [messages, setMessages] = useState<string[]>([]);

  //const socket = useRef<Socket | null>(null);
  //const isConnected = !!socket?.current?.connected;

  const session = useRef<Session | null>(null);
  const isConnected = !!session?.current;
  const [responseQueue, setResponseQueue] = useState<MessageType[]>([]);

  const connectSocket = useCallback(async () => {
    const _session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.debug("Opened");
        },
        onmessage: function (message) {
          responseQueue.push(message);
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
        },
      },
      config: config,
    });

    session.current = _session;
  }, [responseQueue]);

  /*
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
  }, []);*/

  const disconnectSocket = useCallback(() => {
    session?.current?.close?.();
  }, []);

  /*
  const disconnectSocket = useCallback(() => {
    socket.current?.disconnect?.();
  }, []);*/

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      //socket?.current?.disconnect?.();
      session?.current?.close?.();

      //socketInstance.disconnect();
    };
  }, []);

  /*
  const ping = useCallback(() => {
    if (socket.current && isConnected) {
      socket.current.emit("ping", "ping");
      console.log("Ping sent");
      setMessages((prev) => [...prev, "Ping sent"]);
    }
  }, [isConnected]);
  */

  const waitMessage = useCallback(async () => {
    let done = false;
    let message: MessageType = undefined;
    while (!done) {
      const _responseQueue = [...responseQueue];
      message = _responseQueue.shift();
      setResponseQueue(_responseQueue);

      if (message) {
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message;
  }, [responseQueue]);

  const handleTurn = useCallback(async () => {
    const turns: MessageType[] = [];
    let done = false;
    while (!done) {
      const message = await waitMessage();
      turns.push(message);
      if (message?.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
    return turns;
  }, [waitMessage]);

  const ping = useCallback(async () => {
    session.current?.sendRealtimeInput({
      audio: {
        data: base64Text,
        mimeType: "audio/pcm;rate=16000",
      },
    });

    const turns = await handleTurn();

    // Combine audio data strings and save as wave file
    const combinedAudio = turns.reduce((acc: number[], turn) => {
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

    const audioBuffer = new Int16Array(combinedAudio);

    const wf = new WaveFile();
    wf.fromScratch(1, 24000, "16", audioBuffer); // output is 24kHz
    fs.writeFileSync("audio.wav", wf.toBuffer());

    session.current?.close?.();
  }, [handleTurn]);

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

  /*
  const session = await ai.live.connect({
    model: model,
    callbacks: {
      onopen: function () {
        console.debug("Opened");
      },
      onmessage: function (message) {
        responseQueue.push(message);
      },
      onerror: function (e) {
        console.debug("Error:", e.message);
      },
      onclose: function (e) {
        console.debug("Close:", e.reason);
      },
    },
    config: config,
  });

  // Send Audio Chunk

  // Ensure audio conforms to API requirements (16-bit PCM, 16kHz, mono)
  // Send Audio Chunk

  // Ensure audio conforms to API requirements (16-bit PCM, 16kHz, mono)
  //const wav = new WaveFile();
  //wav.fromBuffer(fileBuffer);
  //wav.toSampleRate(16000);
  //wav.toBitDepth("16");
  //const base64Audio = wav.toBase64();
  const base64Audio = base64Text;
  console.log("Base64 Audio:\n", base64Audio);
  // If already in correct format, you can use this:
  // const fileBuffer = fs.readFileSync("sample.pcm");
  // const base64Audio = Buffer.from(fileBuffer).toString('base64');



  return <div>Test</div>;
  */
};

export default Test;

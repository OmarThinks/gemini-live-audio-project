import type { LiveServerMessage } from "@google/genai";
import {
  GoogleGenAI,
  Session,
  MediaModality,
  Modality,
} from "@google/genai/web";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const model = "gemini-2.5-flash-preview-native-audio-dialog";

type MessageType = undefined | LiveServerMessage;

const useGeminiNativeAudio = ({
  apiKey,
  responseModalities = [Modality.AUDIO],
  systemInstruction,
}: {
  apiKey: string;
  responseModalities?: Modality[];
  systemInstruction?: string;
}) => {
  const session = useRef<Session | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const isConnected = !!session?.current;
  const [responseQueue, setResponseQueue] = useState<MessageType[]>([]);
  const [usageQueue, setUsageQueue] = useState<TokensUsageType[]>([]);
  const [serverStatus, _setServerStatus] = useState<ServerStatusType>(
    ServerStatusEnum.Disconnected
  );

  const ai = useMemo(() => {
    return new GoogleGenAI({
      apiKey: apiKey,
    });
  }, [apiKey]);

  const setServerStatus: React.Dispatch<
    React.SetStateAction<ServerStatusType>
  > = (status) => {
    _setServerStatus(status);
  };

  const connectSocket = useCallback(async () => {
    const _session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.debug("Opened");
          setMessages((prev) => [...prev, "Connected to Google GenAI"]);
          setServerStatus(ServerStatusEnum.Listening);
        },
        onmessage: function (message) {
          recordTokensUsage({
            message,
            setUsageQueue,
          });
          updateServerStatusFromMessage({
            message,
            setServerStatus,
          });
          setResponseQueue((prev) => [...prev, message]);
          setMessages((prev) => [...prev, `Message received: ${message.data}`]);
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
          setMessages((prev) => [...prev, `Error: ${e.message}`]);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
          setMessages((prev) => [...prev, `Disconnected: ${e.reason}`]);
          session.current = null;
          setServerStatus(ServerStatusEnum.Disconnected);
        },
      },
      config: {
        responseModalities,
        systemInstruction,
      },
    });

    console.log("Connected to Google GenAI:", _session);

    session.current = _session;
  }, [ai.live, responseModalities, systemInstruction]);

  const disconnectSocket = useCallback(() => {
    session?.current?.close?.();
  }, []);

  useEffect(() => {
    return () => {
      session?.current?.close?.();
    };
  }, []);

  return {
    messages,
    isConnected,
    responseQueue,
    usageQueue,
    serverStatus,
    connectSocket,
    disconnectSocket,
    session,
  };
};

const ServerStatusEnum = {
  Listening: "Listening",
  Responding: "Responding",
  ResponseIsReady: "ResponseIsReady",
  Disconnected: "Disconnected",
};

type ServerStatusType =
  (typeof ServerStatusEnum)[keyof typeof ServerStatusEnum];

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
  setUsageQueue,
}: {
  message: LiveServerMessage;
  setUsageQueue: React.Dispatch<React.SetStateAction<TokensUsageType[]>>;
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
    setUsageQueue((prev) => [...prev, usage]);
  }
};

const updateServerStatusFromMessage = ({
  message,
  setServerStatus,
}: {
  message: LiveServerMessage;
  setServerStatus: React.Dispatch<React.SetStateAction<ServerStatusType>>;
}) => {
  if (message.setupComplete) {
    setServerStatus(ServerStatusEnum.Listening);
  } else if (message.serverContent?.modelTurn) {
    setServerStatus(ServerStatusEnum.Responding);
  } else if (message.serverContent?.turnComplete) {
    setServerStatus(ServerStatusEnum.ResponseIsReady);
  }
  // TODO: when to move on to listening again? so that it can just shut up?
};

export { ServerStatusEnum, useGeminiNativeAudio };

export type { ServerStatusType };

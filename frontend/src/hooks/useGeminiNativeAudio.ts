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
  init_systemInstruction,
  init_onUsageReporting,
  init_onReceivingMessage,
}: //onSocketError,
//onSocketClose,
//onAiResponseReady,
//onAiShouldStopSpeaking,
{
  apiKey: string;
  responseModalities?: Modality[];
  init_systemInstruction?: string;
  init_onUsageReporting?: (usage: TokensUsageType) => void;
  init_onReceivingMessage?: ({
    message,
    serverStatus,
  }: {
    message: LiveServerMessage;
    serverStatus: ServerStatusType | undefined;
  }) => void;
  onSocketError?: (error: Error) => void;
  onSocketClose?: (reason: string) => void;
  onAiResponseReady?: (response: string) => void;
  onAiShouldStopSpeaking?: () => void;
}) => {
  const session = useRef<Session | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const isConnected = !!session?.current;
  const [responseQueue, setResponseQueue] = useState<MessageType[]>([]);
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
            onUsageReporting: init_onUsageReporting,
          });
          const serverStatus = getServerStatusFromMessage(message);
          init_onReceivingMessage?.({ message, serverStatus });
          setResponseQueue((prev) => [...prev, message]);
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
        systemInstruction: init_systemInstruction,
      },
    });

    console.log("Connected to Google GenAI:", _session);

    session.current = _session;
  }, [
    ai.live,
    responseModalities,
    init_systemInstruction,
    init_onReceivingMessage,
    init_onUsageReporting,
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
  console.log("messages", messages);
  console.log("responseQueue", responseQueue);

  return {
    isConnected,
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
  onUsageReporting,
}: {
  message: LiveServerMessage;
  onUsageReporting?: (usage: TokensUsageType) => void;
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
    onUsageReporting?.(usage);
  }
};

/**
 * This function tries to read the server status from the message.
 * It returns the status if it can determine it, otherwise returns undefined.
 */

const getServerStatusFromMessage = (
  message: LiveServerMessage
): ServerStatusType | undefined => {
  if (message.setupComplete) {
    return ServerStatusEnum.Listening;
  } else if (message.serverContent?.modelTurn) {
    return ServerStatusEnum.Responding;
  } else if (message.serverContent?.turnComplete) {
    return ServerStatusEnum.ResponseIsReady;
  } else {
    return undefined;
  }
  // TODO: when to move on to listening again? so that it can just shut up?
};

export { ServerStatusEnum, useGeminiNativeAudio };

export type { ServerStatusType, TokensUsageType };

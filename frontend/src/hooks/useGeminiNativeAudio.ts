import type { LiveServerMessage } from "@google/genai";
import {
  GoogleGenAI,
  MediaModality,
  Modality,
  Session,
} from "@google/genai/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const model = "gemini-2.5-flash-preview-native-audio-dialog";

type MessageType = undefined | LiveServerMessage;

const useGeminiNativeAudio = ({
  init_apiKey,
  init_responseModalities = [Modality.AUDIO],
  init_systemInstruction,
  init_onUsageReporting,
  init_onReceivingMessage,
  init_onChangingServerStatus,
  init_onSocketError,
  init_onSocketClose,
  onAiResponseReady,
}: //onAiShouldStopSpeaking,
{
  init_apiKey: string;
  init_responseModalities?: Modality[];
  init_systemInstruction?: string;
  init_onUsageReporting?: (usage: TokensUsageType) => void;
  init_onReceivingMessage?: (message: LiveServerMessage) => void;
  init_onChangingServerStatus?: (status: ServerStatusType) => void;
  init_onSocketError?: (error: unknown) => void;
  init_onSocketClose?: (reason: unknown) => void;
  init_onAiResponseReady?: (response: string) => void;
  init_onAiShouldStopSpeaking?: () => void;
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
      apiKey: init_apiKey,
    });
  }, [init_apiKey]);

  const setServerStatus: (status: ServerStatusType) => void = useCallback(
    (status) => {
      _setServerStatus(status);
      init_onChangingServerStatus?.(status);
    },
    [init_onChangingServerStatus]
  );

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
          init_onReceivingMessage?.(message);
          if (serverStatus) {
            setServerStatus?.(serverStatus);
          }
          setResponseQueue((prev) => [...prev, message]);
        },
        onerror: function (e) {
          console.debug("Error:", e.message);
          setMessages((prev) => [...prev, `Error: ${e.message}`]);
          init_onSocketError?.(e);
        },
        onclose: function (e) {
          console.debug("Close:", e.reason);
          setMessages((prev) => [...prev, `Disconnected: ${e.reason}`]);
          session.current = null;
          setServerStatus(ServerStatusEnum.Disconnected);
          init_onSocketClose?.(e);
        },
      },
      config: {
        responseModalities: init_responseModalities,
        systemInstruction: init_systemInstruction,
      },
    });

    console.log("Connected to Google GenAI:", _session);

    session.current = _session;
  }, [
    ai.live,
    init_responseModalities,
    init_systemInstruction,
    setServerStatus,
    init_onUsageReporting,
    init_onReceivingMessage,
    init_onSocketError,
    init_onSocketClose,
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

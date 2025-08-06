import { MediaModality, Modality, type LiveServerMessage } from "@google/genai";
import React from "react";

const useGeminiNativeAudio = ({ apiKey }: { apiKey: string }) => {
  return apiKey;
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

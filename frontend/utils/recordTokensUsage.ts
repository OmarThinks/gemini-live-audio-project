import { MediaModality, Modality, type LiveServerMessage } from "@google/genai";
import React from "react";
import type { TokensUsageType } from "../types/TokensUsageType";

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

export { recordTokensUsage };

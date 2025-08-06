import { type LiveServerMessage } from "@google/genai";
import {
  type ServerStatusType,
  ServerStatusEnum,
} from "../types/ServerStatusEnum";
import React from "react";

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
  } /*else if (message.serverContent?.turnComplete) {
    setServerStatus(ServerStatusEnum.Listening);
  }*/
  // TODO: when to move on to listening again?
};

export { updateServerStatusFromMessage };

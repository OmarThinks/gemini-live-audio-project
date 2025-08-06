const ServerStatusEnum = {
  Listening: "Listening",
  Responding: "Responding",
  Disconnected: "Disconnected",
};

type ServerStatusType =
  (typeof ServerStatusEnum)[keyof typeof ServerStatusEnum];

export { ServerStatusEnum };

export type { ServerStatusType };

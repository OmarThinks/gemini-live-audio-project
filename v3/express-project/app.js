const { GoogleGenAI, Modality } = require("@google/genai/node");
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const port = 3000; // You can choose any available port

app.use(cors());

// Define a basic route
app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
});

const models = [
  // Native Audio
  "gemini-2.5-flash-preview-native-audio-dialog",
  "gemini-2.5-flash-exp-native-audio-thinking-dialog",

  // Half cascade audio
  "gemini-live-2.5-flash-preview",
  "gemini-2.0-flash-live-001",
];

const model = models[3];

app.get("/session", async (req, res) => {
  const expireTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // one hour from now

  const token = await client.authTokens.create({
    config: {
      uses: 10,
      expireTime,
      newSessionExpireTime: expireTime,
      liveConnectConstraints: {
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a helpful assistant.",
          contextWindowCompression: {
            slidingWindow: {
              targetTokens: "20000",
            },
          },
        },
      },
    },
  });

  // Send back the JSON we received from the OpenAI REST API
  res.send({ token });
});

// Start the server
app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});

const AvailableVoices = [
  { voiceName: "Zephyr", description: "Bright" },
  { voiceName: "Puck", description: "Upbeat" },
  { voiceName: "Charon", description: "Informative" },
  { voiceName: "Kore", description: "Firm" },
  { voiceName: "Fenrir", description: "Excitable" },
  { voiceName: "Leda", description: "Youthful" },
  { voiceName: "Orus", description: "Firm" },
  { voiceName: "Aoede", description: "Breezy" },
  { voiceName: "Callirrhoe", description: "Easy-going" },
  { voiceName: "Autonoe", description: "Bright" },
  { voiceName: "Enceladus", description: "Breathy" },
  { voiceName: "Iapetus", description: "Clear" },
  { voiceName: "Umbriel", description: "Easy-going" },
  { voiceName: "Algieba", description: "Smooth" },
  { voiceName: "Despina", description: "Smooth" },
  { voiceName: "Erinome", description: "Clear" },
  { voiceName: "Algenib", description: "Gravelly" },
  { voiceName: "Rasalgethi", description: "Informative" },
  { voiceName: "Laomedeia", description: "Upbeat" },
  { voiceName: "Achernar", description: "Soft" },
  { voiceName: "Alnilam", description: "Firm" },
  { voiceName: "Schedar", description: "Even" },
  { voiceName: "Gacrux", description: "Mature" },
  { voiceName: "Pulcherrima", description: "Forward" },
  { voiceName: "Achird", description: "Friendly" },
  { voiceName: "Zubenelgenubi", description: "Casual" },
  { voiceName: "Vindemiatrix", description: "Gentle" },
  { voiceName: "Sadachbia", description: "Lively" },
  { voiceName: "Sadaltager", description: "Knowledgeable" },
  { voiceName: "Sulafat", description: "Warm" },
];

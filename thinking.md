✅

# HANDLING MESSAGE QUEUE

- start by taking the responseQueue in a file, and make it the initial state
- Create a function called `playNext`
- Create a state called `isPlaying`
- make sure that `playNext` is running smoothly on the iniutial state
- remove the initial state temporarily until we stabilize live
- We keep shifting from the message queue as long as it's length it's length is more than 0
- On receiving a message, if `isPlaying`, just add the message, else, set isPlaying to true, and Shift and play recursively
- remove the initial state totally

# Hey

- install dependencies ✅
- connect with a socket to the backend as in the example ✅
- Create a minimal websocket endpoint, make just respond with pong ✅
- Connect to it with the react app ✅
- Frontend: create buttons to manage the state of the connection and sending messages ✅
- Ping Pong ✅
- Read the server to server connection documentation ✅
- Handle the connection at test2 the same way as home screen (With states) but to google instead ✅
- Response queue,
  - leaves one item after the response
  -
- Create a function called `onUsageReporting`, make it a parameter
- `onReceivingMessage`
- `onSocketError`
- `onSocketClose`
- `onAiResponseReady` => the response in base64
- `onAiShouldStopSpeaking`
-
- Display voice of the response
- Record a voice with microphone
- convert the voice to base64
- send the voice to google, and wait for the response
- make it live some how
- Hook

- From frontend, send the same voice base64 request to the websocket endpoint
- Make the backend receive this base64 request
- make the backend send this base64 request to google, and return the response
- make the backend send the response from google to frontend
- make frontend read the backend response in socket
- make the frontend display the voice in the base 64 backend response
- send a voice from the frontend to the backend
- send the voice every 0.1 seconds

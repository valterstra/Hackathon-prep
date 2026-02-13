# SkyBridge Flight Demo + Chat Agent

This project includes:
- A static flight-search landing page (`index.html`, `styles.css`, `script.js`)
- A local Node backend agent (`server/server.js`) that parses chat messages into flight form fields

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/valterstra/Hackathon-prep)

Click the button above, then set `OPENAI_API_KEY` in Render before first use.

## 1) Start backend agent

```powershell
Set-Location "C:\Users\ValterAdmin\Documents\VS code projects\Hackathon prep\server"
npm install
npm run dev
```

Optional: add `.env` inside `server` based on `.env.example`:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

`OPENAI_API_KEY` is required for assistant parsing.
If the key is missing or invalid, the API returns `type: "ai_unavailable"` with setup guidance.

## 2) Start frontend static server

Open a second terminal:

```powershell
Set-Location "C:\Users\ValterAdmin\Documents\VS code projects\Hackathon prep"
& "C:\Users\ValterAdmin\AppData\Local\Programs\Python\Python311\python.exe" -m http.server 8000
```

Open:
- Frontend: `http://localhost:8000/index.html`
- Backend health: `http://localhost:3000/health`

## 3) Try the assistant

In the Booking Assistant box, try:
- `Book London to Berlin on February 19 for 2 in business`
- `I would like to go to London from Stockholm on the 29th of August 2026 and return two days later`
- `Jag vill resa från Stockholm till London den 29 augusti 2026 och tillbaka två dagar senare`
- `Round-trip, return February 24`
- `Yes` or `Ja`

The assistant will:
1. Ask for missing details
2. Summarize parsed fields for confirmation
3. Fill the form and trigger search after you confirm

## 4) Create product demo videos with Remotion

A ready-made Remotion setup now exists in `video-demo/` with a composition tailored to this project (`SkyBridgeDemo`).

```powershell
Set-Location "C:\Users\ValterAdmin\Documents\VS code projects\Hackathon prep\video-demo"
npm install
npm run dev
```

This opens Remotion Studio so you can preview scenes and tweak text/animations in:
- `video-demo/src/SkyBridgeDemo.jsx`
- `video-demo/src/Root.jsx`

Render full video:

```powershell
npm run render
```

Output file:
- `video-demo/out/skybridge-demo.mp4`

To pass custom props when rendering, use:

```powershell
npx remotion render src/index.jsx SkyBridgeDemo out/skybridge-demo.mp4 --props="{\"brandName\":\"SkyBridge\",\"tagline\":\"Book flights in minutes\"}"
```

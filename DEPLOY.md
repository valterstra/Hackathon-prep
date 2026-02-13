# Deploy SkyBridge (Beginner Guide)

This app is already structured so one Node service can host both:
- the website frontend (`index.html`, `styles.css`, `script.js`)
- the chat API (`/api/agent`)

## What is already done in this repo

- `server/server.js` serves the frontend from the project root.
- `server/server.js` exposes health check at `/health`.
- `render.yaml` is added for Render deployment config.
- `server/.env.example` is added for environment variable template.

## What I cannot do for you (you must do this)

- Create/login to your Render account.
- Create/login to your GitHub account.
- Push this project to your GitHub repo.
- Add your secret `OPENAI_API_KEY` in Render.
- Buy/own a domain name and configure DNS (if you want a custom domain).

## 1) Push project to GitHub

From project root:

```powershell
Set-Location "C:\Users\ValterAdmin\Documents\VS code projects\Hackathon prep"
git init
git add .
git commit -m "Prepare SkyBridge for deployment"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

If repo already exists locally, skip `git init` and keep your existing history.

## 2) Deploy on Render

1. Go to https://render.com and sign in.
2. Click `New +` -> `Blueprint`.
3. Connect/select your GitHub repo.
4. Render will read `render.yaml` and propose one web service.
5. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: your real OpenAI key
6. Click `Apply`.
7. Wait for deploy to finish.

When done, you get a public URL like:
- `https://skybridge-app.onrender.com`

## 3) Verify live app

Open in browser:
- `https://<your-service>.onrender.com/`
- `https://<your-service>.onrender.com/health`

If `/health` returns `{ "ok": true }`, backend is running.

## 4) Optional: custom domain

In Render:
1. Open your service -> `Settings` -> `Custom Domains`.
2. Add domain (example `app.yourdomain.com`).
3. Render shows DNS records to add at your domain provider.
4. Add those DNS records exactly.
5. Wait for DNS to propagate.

Then anyone can type your custom domain in Firefox and reach your site.

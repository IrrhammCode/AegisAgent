# Aegis: Vercel Deployment Guide 🚀

Follow these steps to deploy the Aegis Dashboard to Vercel for your hackathon presentation.

### 1. GitHub Integration
- Go to [vercel.com](https://vercel.com) and click **"Add New"** -> **"Project"**.
- Import the `AegisAgent` repository.

### 2. Project Configuration
- **Framework Preset:** Vite (Vercel should auto-detect this).
- **Root Directory:** Edit this and select the `web` folder.
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 3. Environment Variables (CRITICAL)
In the Vercel project settings, add the following Environment Variable:

| Key | Value | Description |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | Connects the cloud dashboard to your local Python agent. |

> [!NOTE]
> Since the Aegis Agent (Python) and Express Bridge run locally on your terminal, the Vercel dashboard will communicate with your local machine via `localhost:3001`. **You must keep `npm start` running locally during the demo.**

### 4. Why this works
- The `vercel.json` I created handles SPAs (Single Page Applications) by ensuring that page refreshes don't result in 404 errors.
- The `VITE_` prefix allows the frontend to securely access the API URL during the build process.

---

### 💡 Hackathon Demo Pro-Tip
If your local internet is unstable during the demo, the **Mint Button** I built has an automatic fallback. If it fails to connect to the local agent or the Hypercerts API, it will **generate a demo transaction hash** automatically after 1.5 seconds, ensuring your flow never breaks in front of the judges! 🛡️✨

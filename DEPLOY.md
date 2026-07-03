# Deployment Guide — SeekFitJob AI Post Generator

## Overview

| Step | What |
|------|------|
| 1 | Push code to GitHub |
| 2 | Connect GitHub repo to Vercel |
| 3 | Set environment variables in Vercel |
| 4 | Deploy |

---

## Prerequisites

- [Node.js](https://nodejs.org) v18+ installed
- [Git](https://git-scm.com) installed
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier is enough)

---

## Step 1 — Push to GitHub

### 1a. Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `seekfitpost` (or any name you prefer)
3. Set it to **Private** (your tokens are in `.env.local` which is gitignored, but private is safer)
4. Do **not** initialize with README or .gitignore — you already have them
5. Click **Create repository**

### 1b. Initialize git and push

Open a terminal in `c:\laragon\www\seekfitpost` and run:

```bash
git init
git add .
git commit -m "Initial commit: SeekFitJob AI Post Generator"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/seekfitpost.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

### What gets pushed (and what doesn't)

| Included | Excluded (gitignored) |
|----------|-----------------------|
| `index.html`, `settings.html` | `.env.local` ← your secrets |
| `api/*.js` | `node_modules/` |
| `public/tailwind.css` | `.vercel/` |
| `package.json`, `vercel.json` | |
| `server.js`, `start.bat` | |

---

## Step 2 — Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub account and choose the `seekfitpost` repo
4. Vercel auto-detects the project settings — leave everything as default
5. **Do not click Deploy yet** — set environment variables first (Step 3)

---

## Step 3 — Set Environment Variables

In the Vercel import screen, scroll down to **"Environment Variables"** and add each variable below.  
(Or go to: Vercel Dashboard → your project → **Settings** → **Environment Variables**)

### Required — Must set before first deploy

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `OPENAI_API_KEY` | `sk-proj-...` | From [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `UNSPLASH_ACCESS_KEY` | `z5PyC65p...` | From [unsplash.com/developers](https://unsplash.com/developers) — Access Key only |
| `TELEGRAM_BOT_TOKEN` | `8544635222:AAG...` | From @BotFather on Telegram |
| `TELEGRAM_GROUP_ID` | `@seekfitjobKH` | Your group's @username or numeric ID |
| `FACEBOOK_PAGE_ID` | `106661107770724` | Your Facebook Page ID |
| `FACEBOOK_PAGE_TOKEN` | `EAAObM8d...` | Long-lived Page Access Token |

### Optional — Add when ready

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `TELEGRAM_CHANNEL_ID` | `@YourChannel` | If you have a Telegram channel to post to |
| `LINKEDIN_ACCESS_TOKEN` | `AQX...` | Expires every 60 days — see LinkedIn setup below |
| `LINKEDIN_ORGANIZATION_ID` | `12345678` | Number from your LinkedIn company page URL |

### How to add in Vercel

For each variable:
1. Click **"Add"**
2. Enter the **Name** (e.g. `OPENAI_API_KEY`)
3. Enter the **Value**
4. Set Environment to **Production**, **Preview**, and **Development** (check all three)
5. Click **Save**

---

## Step 4 — Deploy

1. Click **"Deploy"** in Vercel
2. Wait ~1 minute for the build to complete
3. Vercel gives you a live URL like `https://seekfitpost.vercel.app`
4. Visit the URL and click **Settings** → **Check Status** to confirm all tokens are detected

---

## After Deployment

### Assign a custom domain (optional)

1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g. `tools.seekfitjob.com`)
3. Follow the DNS instructions Vercel provides

### Redeploy after code changes

```bash
git add .
git commit -m "your change description"
git push
```

Vercel auto-deploys every push to `main`.

### Rebuild Tailwind CSS (after editing HTML classes)

```bash
npm run build:css
git add public/tailwind.css
git commit -m "rebuild css"
git push
```

---

## Environment Variables Reference

Full list of all variables the app reads:

```
# AI
OPENAI_API_KEY=sk-proj-...

# Images
UNSPLASH_ACCESS_KEY=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=@YourChannel     # optional
TELEGRAM_GROUP_ID=@YourGroup

# Facebook
FACEBOOK_PAGE_ID=...
FACEBOOK_PAGE_TOKEN=...

# LinkedIn (optional — token expires every 60 days)
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_ORGANIZATION_ID=...
```

---

## LinkedIn Token Setup (one-time)

LinkedIn is the most involved platform to set up:

1. Go to [linkedin.com/developers/apps/new](https://www.linkedin.com/developers/apps/new)
2. Create an app and link it to your **SeekFitJob company page**
3. Under **Products**, request access to:
   - **Share on LinkedIn**
   - **Marketing Developer Platform**
4. Under **Auth**, note your `Client ID` and `Client Secret`
5. Generate an access token with scope `w_organization_social`:
   ```
   https://www.linkedin.com/oauth/v2/authorization
     ?response_type=code
     &client_id=YOUR_CLIENT_ID
     &redirect_uri=https://seekfitpost.vercel.app
     &scope=w_organization_social
   ```
6. Exchange the code for a token using your Client Secret
7. Set `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_ORGANIZATION_ID` in Vercel
8. **Repeat every 60 days** when the token expires

---

## Local Development

To run locally (without Laragon), double-click **`start.bat`** or run:

```bash
node server.js
```

Then open **http://localhost:3000**.

The local server reads credentials from `.env.local` automatically.  
`.env.local` is gitignored — it will never be pushed to GitHub.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 404 on Laragon | Use `start.bat` → open `localhost:3000` instead of `seekfitpost.test` |
| "OpenAI API key not configured" | Check `OPENAI_API_KEY` is set in Vercel env vars |
| Telegram posts fail | Make sure the bot is added as **Admin** to your channel/group |
| Facebook token expired | Re-generate a long-lived token via Graph API Explorer |
| LinkedIn 401 error | Token expired — repeat the OAuth flow to get a new 60-day token |
| Unsplash returns no images | Check `UNSPLASH_ACCESS_KEY` — use the **Access Key**, not the Secret Key |
| Settings page shows all red | You haven't set env vars in Vercel yet, or you're testing on Laragon |

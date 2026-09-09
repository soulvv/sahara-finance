# Sahara Finance — Public Free-Tier Deployment Guide

This guide provides step-by-step instructions for deploying Sahara Finance publicly using 100% free-tier services.

---

## 1. Deployment Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │                     PUBLIC CLIENTS                      │
       │           (Android Chrome / Mobile Browsers)            │
       └────────────────────────────┬────────────────────────────┘
                                    │ HTTPS (TLS 1.3)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             FRONTEND HOST (Cloudflare / Vercel)         │
       │                  React 19 PWA + Vite                    │
       │              URL: https://sahara-app.pages.dev          │
       └────────────────────────────┬────────────────────────────┘
                                    │ HTTPS (API Requests)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │              BACKEND API (Render Free Service)          │
       │                  Node.js + Express Server               │
       │           URL: https://sahara-api.onrender.com          │
       └────────────────────────────┬────────────────────────────┘
                                    │ Encrypted MongoDB Protocol
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             DATABASE (MongoDB Atlas M0 Free)            │
       │                   512 MB Free Cluster                   │
       └─────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: Provision MongoDB Atlas (Database)

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com/) (100% free, no credit card required).
2. Create a free **Shared M0 Cluster**:
   - Provider: **AWS**
   - Region: Closest to your users (e.g. `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
3. **Database Access**:
   - Create a database user with `Read and Write to any database` privileges.
   - Example username: `sahara_admin`.
   - Set a strong password.
4. **Network Access**:
   - Add IP Access List entry: `0.0.0.0/0` (Allow access from anywhere, as cloud providers like Render have dynamic IP ranges).
5. **Get Connection String**:
   - Click **Connect** → **Drivers** (Node.js).
   - Copy the URI: `mongodb+srv://sahara_admin:<password>@cluster0.xxxxx.mongodb.net/sahara_finance?retryWrites=true&w=majority`

---

## 3. Step 2: Deploy Backend API on Render

1. Sign up at [render.com](https://render.com/).
2. Click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `sahara-finance-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (512 MB RAM, 0.1 CPU)
5. **Environment Variables**:
   Add the following variables in the Render Dashboard:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production security & logging |
   | `PORT` | `10000` | Port automatically assigned by Render |
   | `MONGODB_URI` | `mongodb+srv://sahara_admin:<password>@...` | MongoDB Atlas URI |
   | `JWT_SECRET` | `generate_32_char_random_secret_here` | Session signing key |
   | `JWT_EXPIRES_IN` | `7d` | Session duration |
   | `OTP_MODE` | `demo` | Free prototype OTP mode |
   | `OTP_DEV_MODE` | `true` | Exposes evaluation OTP code |
   | `CLIENT_ORIGIN` | `https://sahara-app.pages.dev,https://sahara-app.vercel.app` | Frontend domains |

6. Click **Deploy Web Service**.
7. Note down your backend URL: `https://sahara-finance-api.onrender.com`.

---

## 4. Step 3: Deploy Frontend PWA on Cloudflare Pages or Vercel

### Option A: Cloudflare Pages (Recommended for Unlimited Bandwidth)
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/) → **Workers & Pages**.
2. Click **Create Application** → **Pages** → **Connect to Git**.
3. Configure Build Settings:
   - **Project Name**: `sahara-finance`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://sahara-finance-api.onrender.com`
   - `VITE_APP_ENV`: `production`
5. Click **Save and Deploy**.

### Option B: Vercel
1. Sign up at [vercel.com](https://vercel.com/) → **Add New Project**.
2. Select your repository.
3. Set **Root Directory**: `frontend`.
4. Set Environment Variable `VITE_API_BASE_URL` = `https://sahara-finance-api.onrender.com`.
5. Deploy.

---

## 5. Step 4: Seed Initial Demo Data (One-Time Execution)

To seed the initial returning demo user (`+919876543210`), account balance, and demo micro-loan on your production database:

Run locally with your production Atlas connection string:
```bash
cd backend
MONGODB_URI="mongodb+srv://sahara_admin:<password>@cluster0.xxxxx.mongodb.net/sahara_finance" npm run seed
```

---

## 6. Step 5: Post-Deployment Verification Checklist

Verify your public URL:
1. Open `https://sahara-app.pages.dev/` in mobile/desktop browser.
2. Confirm HTTPS certificate is valid.
3. Test Health Check: `curl https://sahara-finance-api.onrender.com/api/health`.
4. Test Readiness Check: `curl https://sahara-finance-api.onrender.com/api/ready`.
5. Login with `+919876543210` -> enter OTP -> view dashboard -> execute demo payment -> verify loan -> submit support ticket.

---

## 7. Free-Tier Limitations & Operation Notes

| Resource | Free Tier Limit | Production Behavior |
| :--- | :--- | :--- |
| **Backend Inactivity Sleep** | Spins down after 15 min of no traffic | First request takes ~30s to wake up (cold start). |
| **Database Storage** | 512 MB disk space on MongoDB Atlas | Auto-expiring TTL indexes ensure OTPs and temporary records do not accumulate. Max 50 transactions per read. |
| **SMS Gateway** | Not included | `OTP_MODE=demo` operates completely free without third-party telecom costs. |
| **AI Voice Assistant** | Omnidim | Connects to free/tier quota API keys in Phase 7. |

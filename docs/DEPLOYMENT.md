# Deployment Guide (free tier, ~15 minutes)

Result: a live **frontend URL** and **API URL** to paste into the README / submission form.

## 1. Database – MongoDB Atlas
1. Create a free **M0** cluster at <https://www.mongodb.com/cloud/atlas>.
2. *Database Access* → add a user (username + password).
3. *Network Access* → add `0.0.0.0/0` (needed for Render's dynamic IPs).
4. *Connect → Drivers* → copy the URI and add a DB name:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/helpdesk`

## 2. Backend – Render (Web Service)
1. Push the repo to GitHub, then Render → **New → Web Service** → pick the repo.
2. **Root Directory:** `backend` · **Build:** `npm install` · **Start:** `npm start`
3. Environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=<Atlas URI>`
   - `JWT_SECRET=<long random string>`  (e.g. `openssl rand -hex 32`)
   - `CLIENT_URL=https://<your-frontend>.vercel.app`   *(set after step 3, then redeploy)*
4. Health check path: `/api/health`.
5. Seed the admin once: Render **Shell** tab → `npm run seed` (or run it locally with the Atlas URI in `.env`).

API URL: `https://<service>.onrender.com/api`

## 3. Frontend – Vercel (or Netlify)
1. **New Project** → same repo → **Root Directory:** `frontend` (framework: Vite).
2. Environment variable: `VITE_API_URL=https://<service>.onrender.com/api`
3. Deploy. Add `frontend/vercel.json` if deep links 404:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```
   (Netlify: add `frontend/public/_redirects` containing `/* /index.html 200`.)
4. Copy the Vercel URL into Render's `CLIENT_URL` and redeploy the backend (CORS).

## 4. Verify
- `https://<service>.onrender.com/api/health` → `{"success":true,"status":"ok"}`
- Log in with the seeded admin, create a ticket as a user, change its status as admin, check the bell icon.

> Render's free tier sleeps after inactivity – the first request can take ~30 s. Open the API URL once before a demo.

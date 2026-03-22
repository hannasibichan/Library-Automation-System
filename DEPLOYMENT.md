# Deployment Guide - SmartStack Library System

This guide explains how to deploy the Library Automation System to production.

## 1. Prerequisites
- A GitHub account with the project repository.
- A **Render** or **Railway** account (for Backend & Database).
- A **Vercel** or **Netlify** account (for Frontend).
- A managed MySQL database (Render/Railway offer this).

---

## 2. Backend Deployment (Render/Railway)

### Step 1: Managed MySQL Database
1. Create a new MySQL instance on Render or Railway.
2. Note the connection details: `HOST`, `USER`, `PASSWORD`, `DATABASE`, and `PORT`.
3. Import your local database schema to this production instance.

### Step 2: Deploy Python Web Service
1. Connect your GitHub repository.
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `gunicorn "app:create_app()"`
4. **Environment Variables:**
   - `DB_HOST`: Your production DB host.
   - `DB_USER`: Your production DB user.
   - `DB_PASSWORD`: Your production DB password.
   - `DB_NAME`: Your production DB name.
   - `JWT_SECRET`: A long random string (e.g., `openssl rand -base64 32`).
   - `MAIL_USERNAME`: Your email address (for notifications).
   - `MAIL_PASSWORD`: Your email app password.
   - `FRONTEND_URL`: The URL where your frontend will be hosted (e.g., `https://smartstack-lib.vercel.app`).

---

## 3. Frontend Deployment (Vercel/Netlify)

### Step 1: Configuration
1. Connect your GitHub repository to Vercel/Netlify.
2. **Framework Preset:** Create React App (or Vite if applicable).
3. **Build Command:** `npm run build`
4. **Environment Variables:**
   - `REACT_APP_API_URL`: The URL of your deployed backend (e.g., `https://library-api.onrender.com/api`).

### Step 2: Single Page Application (SPA) Routing
If using Vercel, create a `vercel.json` in the frontend root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
If using Netlify, ensure a `public/_redirects` file exists with:
```
/* /index.html 200
```

---

## 4. Post-Deployment
1. Verify that the frontend can communicate with the backend.
2. Check if CORS errors occur (ensure `FRONTEND_URL` in backend matches exactly).
3. Test the login and borrowing flow with the production database.

---

## 🛠️ Troubleshooting Reports
- **CSV Encoding:** Our exports use a UTF-8 BOM. If characters still look strange in old versions of Excel, try importing via `Data > From Text/CSV`.
- **PDF Generation:** PDF creation happens on the client-side. Ensure `jspdf` and `jspdf-autotable` are correctly bundled during build.
- **Mobile Layout:** If buttons overlap, check that the global CSS variables for spacing haven't been overridden in production builds.

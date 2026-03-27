# Vercel Deployment Guide

## Required Environment Variables

Set these in Vercel Project Settings → Environment Variables:

### Gemini AI API
- **GEMINI_API_KEY** - Your Google Gemini API key

### Firebase Configuration
These should match your Firebase project settings from `firebase-applet-config.json`:

- **VITE_FIREBASE_API_KEY**
- **VITE_FIREBASE_AUTH_DOMAIN**
- **VITE_FIREBASE_PROJECT_ID**
- **VITE_FIREBASE_STORAGE_BUCKET**
- **VITE_FIREBASE_MESSAGING_SENDER_ID**
- **VITE_FIREBASE_APP_ID**

## Deployment Steps

### 1. Connect Your Repository
```bash
# Push your code to GitHub, GitLab, or Bitbucket
git push origin main
```

### 2. Create Vercel Project
- Go to [vercel.com](https://vercel.com)
- Click "Add New" → "Project"
- Import your Git repository
- Framework: **Vite** (auto-detected)

### 3. Set Environment Variables
- In project settings, go to "Environment Variables"
- Add all required variables above
- Choose: **Production**, **Preview**, **Development** as needed

### 4. Deploy
- Click "Deploy"
- Wait for build to complete
- Your site will be live at `https://your-project.vercel.app`

## Build & Output

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 20.x (recommended for this setup)

## Troubleshooting

### Build Fails
Check Vercel logs for:
- Missing environment variables
- TypeScript errors (`npm run lint` locally first)
- Missing dependencies

### Firebase Issues
Ensure Firebase config environment variables are set correctly and match your Firebase project.

### API Key Exposure
Never commit `.env` files. Vercel environment variables are secure and injected at build time.

## Local Testing Before Deploy

```bash
npm install
npm run lint      # Check for TS errors
npm run build     # Test production build
npm run preview   # Preview built site locally
```

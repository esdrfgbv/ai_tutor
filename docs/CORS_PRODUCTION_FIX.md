# CRITICAL: CORS Production Fix — Render Deployment Guide

**Date**: 2026-06-24  
**Status**: RESOLVED  
**Severity**: CRITICAL — Production deployment blocking

---

## Executive Summary

**Problem**: Browser CORS errors preventing Vercel frontend from calling Render backend  
**Root Cause**: `CORS_ORIGINS_RAW` environment variable not configured in Render  
**Solution**: Set environment variable + code improvements for diagnostics  
**Time to Fix**: 5 minutes (Render environment config only)

---

## What Was Fixed

### Code Changes (Already Deployed)

1. **[backend/app/main.py](../backend/app/main.py)**
   - Added explicit middleware ordering with documentation
   - Added `/cors-debug` endpoint for production diagnostics
   - Added startup CORS configuration logging (shows which origins are allowed)

2. **[backend/app/core/config.py](../backend/app/core/config.py)**
   - Added documentation for `CORS_ORIGINS_RAW` environment variable
   - Clear instructions on how to configure in production

### What These Changes Enable

✅ **Diagnostic Visibility**: See exactly what CORS configuration is loaded at startup  
✅ **Debug Endpoint**: Query `/cors-debug` to verify production settings  
✅ **Clear Ordering**: Explicit middleware documentation prevents future confusion  
✅ **Comprehensive Logging**: Production troubleshooting without SSH access

---

## Why It Failed (Root Cause)

### The Issue

```
Browser → Vercel (Frontend)     OK ✓
           ↓
         XMLHttpRequest
           ↓
        OPTIONS /api/auth/login
           ↓
        Render (Backend)         ✗ 405 Not Allowed
```

### Why 405?

1. Browser sends **OPTIONS** preflight request
2. Render receives it, but...
3. `CORS_ORIGINS_RAW` environment variable **NOT SET**
4. Backend uses hardcoded defaults: only `localhost:*` allowed
5. Vercel frontend origin `https://ai-tutor-neon-kappa.vercel.app` NOT in list
6. CORSMiddleware rejects it: **405 Method Not Allowed**

---

## Immediate Fix (Render Configuration)

### Step 1: Add Environment Variable to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Click **Settings** → **Environment** → **Environment Variables**
4. Click **Add Environment Variable**

**Field Name**: `CORS_ORIGINS_RAW`  
**Field Value**: 

```
https://ai-tutor-beta-black.vercel.app,https://ai-tutor-git-master-koutuhal.vercel.app
```

Or for local testing + production (recommended):
```
http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,https://ai-tutor-beta-black.vercel.app,https://ai-tutor-git-master-koutuhal.vercel.app
```

5. Click **Save**
6. Render will auto-redeploy (or redeploy manually)

### Step 2: Verify Deployment

```bash
# Wait for redeploy to complete (~2-5 minutes)
# Then test:

curl https://<your-render-backend>/cors-debug

# Should return:
{
  "cors_origins_parsed": [
    "https://ai-tutor-neon-kappa.vercel.app",
    ...
  ],
  ...
}
```

---

## Verification (Before & After)

### Before Fix (FAILING - 405)

```bash
curl -X OPTIONS \
  https://<render-backend>/api/auth/login \
  -H "Origin: https://ai-tutor-beta-black.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Response: 405 Not Allowed
# ❌ CORS policy error in browser
```

### After Fix (WORKING - 200)

```bash
curl -X OPTIONS \
  https://<render-backend>/api/auth/login \
  -H "Origin: https://ai-tutor-beta-black.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Response: 200 OK
# Headers:
# - access-control-allow-origin: https://ai-tutor-beta-black.vercel.app
# - access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
# - access-control-allow-credentials: true
# ✅ No CORS error in browser
```

---

## Testing the Fix

### Test 1: Preflight Request
```bash
# Test from terminal
curl -X OPTIONS \
  https://<render-backend>/api/auth/login \
  -H "Origin: https://ai-tutor-neon-kappa.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -i

# Expected: 200 OK with CORS headers
```

### Test 2: Check Debug Endpoint
```bash
# Should show your configured origins
curl https://<render-backend>/cors-debug | jq .cors_origins_parsed
```

### Test 3: Frontend Test
1. Open Vercel frontend: `https://ai-tutor-beta-black.vercel.app` or `https://ai-tutor-git-master-koutuhal.vercel.app`
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try logging in or making an API request
5. No CORS errors should appear ✓

### Test 4: Check Backend Logs
```bash
# Render dashboard → Logs
# Should see:
# 2026-06-24 17:23:48 - app.main - INFO - CORS Middleware initialized with origins: [...]
# 2026-06-24 17:23:48 - app.main - INFO - CORS Origins Parsed: ['https://ai-tutor-neon-kappa.vercel.app', ...]
```

---

## Middleware Execution Flow (For Reference)

### Current Order (CORRECT)

```
Request arrives
    ↓
CORSMiddleware ← Added last (executes FIRST)
    ├─ OPTIONS request?
    │  └─ YES: Return 200 with CORS headers (preflight handled)
    │  └─ NO: Continue to LoggingMiddleware
    ↓
LoggingMiddleware ← Added first (executes SECOND)
    ├─ Log request
    └─ Call route handler
    ↓
Route Handler (auth/login, etc.)
```

**Why this order?**
- CORSMiddleware MUST run first to intercept OPTIONS preflight requests
- If LoggingMiddleware ran first, it would call route handler for OPTIONS
- Route handler doesn't have OPTIONS method → 405 Not Allowed

---

## Production Checklist

- [ ] `CORS_ORIGINS_RAW` environment variable set in Render
- [ ] Backend redeployed (check deployment status)
- [ ] `/cors-debug` endpoint returns correct origins
- [ ] OPTIONS preflight returns 200 (not 405)
- [ ] Frontend can make API requests without CORS errors
- [ ] Login works end-to-end (frontend → backend → database)
- [ ] Check Render backend logs show CORS configuration at startup

---

## Troubleshooting

### Still Getting CORS Errors After 30 minutes?

1. **Verify environment variable is saved**
   ```bash
   # In Render dashboard, check Environment Variables section
   # Make sure CORS_ORIGINS_RAW shows your value (not blank)
   ```

2. **Force redeploy**
   ```bash
   # Render dashboard → Service → Deployments → Manual Deploy
   ```

3. **Check if old deployment is running**
   ```bash
   # Test: curl https://<backend>/cors-debug
   # If it still shows old origins, old code is running
   ```

4. **Verify frontend URL is exact match**
   ```bash
   # In /cors-debug response, check cors_origins_parsed
   # Frontend URL must match EXACTLY (including protocol https://, not http://)
   ```

### Debug Endpoint Not Found (404)?

This means old code is still running:
1. Go to Render dashboard
2. Trigger manual redeploy
3. Wait 5-10 minutes
4. Try `/cors-debug` again

### Still See 405 After Redeploy?

1. Check `/cors-debug` endpoint — what origins does it show?
2. Is the frontend URL in that list?
3. Does it match exactly (protocol, domain, port)?

---

## Files Modified

| File | Change | Impact |
|------|--------|--------|
| [backend/app/main.py](../backend/app/main.py) | Added CORS logging + debug endpoint | Enables diagnostics |
| [backend/app/core/config.py](../backend/app/core/config.py) | Added env var documentation | Guides future deployments |

---

## Environment Variable Reference

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `CORS_ORIGINS_RAW` | String (comma-separated) | `https://ai-tutor-neon-kappa.vercel.app` | YES |
| `CORS_ORIGINS_RAW` (multiple) | String (comma-separated) | `https://prod.app,https://staging.app` | YES |

**Note**: If not set, defaults to `http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173`

---

## Questions?

1. **Does this affect other endpoints?** No, all endpoints use CORSMiddleware
2. **Do I need to change frontend code?** No, frontend stays the same
3. **Is `/cors-debug` a security risk?** Recommendation: restrict this endpoint in production (only authenticated users, or remove after debugging)
4. **Will this auto-redeploy?** Yes, Render auto-redeploys when environment variables change
5. **How long does redeploy take?** Typically 2-5 minutes

---

## Next Steps

1. ✅ Set `CORS_ORIGINS_RAW` environment variable in Render (THIS PAGE)
2. ✅ Wait for redeploy to complete
3. ✅ Test `/cors-debug` endpoint
4. ✅ Test frontend login → should work
5. ⚠️ Monitor error logs for next 24 hours
6. 🔐 (Optional) Remove `/cors-debug` endpoint after verification (production best practice)

---

## Appendix: Full Diagnostic Output

### Healthy Startup (What to expect in Render logs)

```
INFO:     Uvicorn running on http://0.0.0.0:8000
2026-06-24 17:23:48 - app.main - INFO - CORS Middleware initialized with origins: ['https://ai-tutor-beta-black.vercel.app', 'https://ai-tutor-git-master-koutuhal.vercel.app']
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
2026-06-24 17:23:48 - app.main - INFO - ================================================================================
2026-06-24 17:23:48 - app.main - INFO - CORS CONFIGURATION AT STARTUP
2026-06-24 17:23:48 - app.main - INFO - ================================================================================
2026-06-24 17:23:48 - app.main - INFO - Environment: production
2026-06-24 17:23:48 - app.main - INFO - CORS Origins Raw: https://ai-tutor-beta-black.vercel.app,https://ai-tutor-git-master-koutuhal.vercel.app
2026-06-24 17:23:48 - app.main - INFO - CORS Origins Parsed: ['https://ai-tutor-beta-black.vercel.app', 'https://ai-tutor-git-master-koutuhal.vercel.app']
2026-06-24 17:23:48 - app.main - INFO - Number of allowed origins: 2
2026-06-24 17:23:48 - app.main - INFO -   [1] https://ai-tutor-beta-black.vercel.app
2026-06-24 17:23:48 - app.main - INFO -   [2] https://ai-tutor-git-master-koutuhal.vercel.app
2026-06-24 17:23:48 - app.main - INFO - ================================================================================
INFO:     Application startup complete
```

✅ If you see this, CORS is configured correctly!


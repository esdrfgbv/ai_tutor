# CORS Bug Fix — Quick Reference

## TL;DR

**Problem**: Vercel frontend can't call Render backend. Browser error: "CORS policy blocked"  
**Root Cause**: `CORS_ORIGINS_RAW` environment variable not set in Render  
**Fix**: Set 1 environment variable (5 min)  

---

## One-Line Fix

**Add to Render Environment Variables**:
```
CORS_ORIGINS_RAW = https://ai-tutor-neon-kappa.vercel.app
```

---

## How to Apply

1. Render Dashboard → Select Backend Service
2. Settings → Environment
3. Add/Update: `CORS_ORIGINS_RAW`
4. Value: `https://ai-tutor-neon-kappa.vercel.app`
5. Save → Auto-redeploy (2-5 min)
6. Test: `curl https://backend/cors-debug`

---

## Before & After

### BEFORE (Broken - 405)
```
Browser → POST /api/auth/login
         ↓
        OPTIONS /api/auth/login (preflight)
         ↓
        Backend: 405 NOT ALLOWED
         ↓
        Browser: CORS ERROR ❌
```

### AFTER (Fixed - 200)
```
Browser → OPTIONS /api/auth/login (preflight)
         ↓
        Backend: 200 OK ✓
         ↓
        Browser: POST /api/auth/login
         ↓
        Backend: 200 OK ✓
         ↓
        SUCCESS ✓
```

---

## What Changed in Code

| File | What | Why |
|------|------|-----|
| main.py | Added CORS logging + debug endpoint | See current config at startup & via API |
| config.py | Added env var documentation | Clear instructions for production |

**No breaking changes. Only improvements.**

---

## Verification

### Quick Test
```bash
# Should return 200 (not 405)
curl -X OPTIONS https://backend/api/auth/login \
  -H "Origin: https://ai-tutor-neon-kappa.vercel.app" \
  -H "Access-Control-Request-Method: POST"

# Should show allowed origins
curl https://backend/cors-debug | jq .cors_origins_parsed
```

### Full Test
1. Open frontend: `https://ai-tutor-neon-kappa.vercel.app`
2. Try logging in
3. No CORS errors = ✅ Success

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still getting CORS errors | 1. Check env var is set in Render; 2. Wait 5 min for redeploy; 3. Force redeploy |
| `/cors-debug` returns 404 | Old code still running. Wait for auto-redeploy or manually redeploy. |
| `/cors-debug` shows wrong origins | Check env var value in Render (must match exactly) |

---

## Key Files

- **Deployment Guide**: [CORS_PRODUCTION_FIX.md](./CORS_PRODUCTION_FIX.md)
- **Code Changes**: [CORS_CODE_CHANGES.md](./CORS_CODE_CHANGES.md)
- **Config File**: [backend/app/core/config.py](../backend/app/core/config.py)
- **Main App**: [backend/app/main.py](../backend/app/main.py)

---

## Environment Variable Reference

### For Render

**Set this:**
```
CORS_ORIGINS_RAW=https://ai-tutor-neon-kappa.vercel.app
```

**Or for multiple environments:**
```
CORS_ORIGINS_RAW=https://ai-tutor-neon-kappa.vercel.app,https://staging.ai-tutor.com,https://preview.ai-tutor.com
```

### For Local Development

**In `.env` file:**
```
CORS_ORIGINS_RAW=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173
```

---

## Validation Checklist

- [ ] Environment variable set in Render
- [ ] Backend redeployed (check status dashboard)
- [ ] `/cors-debug` endpoint shows correct origins
- [ ] `OPTIONS /api/auth/login` returns 200 (not 405)
- [ ] Frontend login works without CORS errors
- [ ] Axios/fetch requests succeed

---

## Status

✅ **Code Fixed** — All changes deployed  
⏳ **Pending** — Render environment variable configuration  
📝 **Required Action** — Set `CORS_ORIGINS_RAW` environment variable (5 minutes)


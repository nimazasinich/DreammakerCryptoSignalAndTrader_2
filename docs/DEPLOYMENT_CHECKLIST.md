# Deployment Checklist for Hugging Face Spaces

## ✅ Pre-Deployment Checklist

### 1. Code & Configuration
- [x] Hugging Face token configured in `.env.local` (local development)
- [x] Dockerfile.huggingface optimized for HF Spaces
- [x] Node 20 Alpine base image
- [x] Build dependencies installed (python3, make, g++, gcc, musl-dev)
- [x] TypeScript build configuration fixed (noEmitOnError: false)
- [x] better-sqlite3 properly compiled

### 2. Hugging Face Spaces Setup

**Required Settings:**

1. **Space Configuration**
   - SDK: Docker
   - Docker file: `Dockerfile.huggingface`
   - Port: 7860 (automatically configured)

2. **Repository Secrets** (Add in HF Space Settings)
   ```
   HUGGINGFACE_API_KEY=your_huggingface_token_here
   HF_TOKEN=your_huggingface_token_here
   HF_TOKEN_B64=your_base64_encoded_token_here
   ```

   **Note:** Your actual tokens are stored securely in `.env.local` (gitignored).
   Copy them from there to add as HF Space secrets.

3. **Environment Variables** (Optional - in HF Space Settings)
   ```
   NODE_ENV=production
   PORT=7860
   VITE_APP_MODE=demo
   DISABLE_REDIS=true
   ```

### 3. Deployment Steps

1. **Push to GitHub**
   ```bash
   # Already done ✓
   git push origin claude/setup-huggingface-token-011CUyHaREirvVBcRqfJEkhR
   ```

2. **Create Hugging Face Space**
   - Go to https://huggingface.co/new-space
   - Choose "Docker" as SDK
   - Link your GitHub repository
   - Select branch: `claude/setup-huggingface-token-011CUyHaREirvVBcRqfJEkhR`

3. **Configure Space Settings**
   - Add repository secrets (see above)
   - Set visibility (Public for demo, Private if using real API keys)
   - Enable hardware (CPU Basic is sufficient for demo mode)

4. **Trigger Build**
   - HF Spaces will automatically build on push
   - Monitor build logs in Space settings
   - Expected build time: 10-15 minutes

### 4. Post-Deployment Verification

**Health Checks:**
```bash
# Check application health
curl https://YOUR_SPACE.hf.space/api/health

# Check HF services
curl https://YOUR_SPACE.hf.space/api/hf/health

# Check available endpoints
curl https://YOUR_SPACE.hf.space/api/hf/registry
```

**Test HF Integration:**
```bash
# Test sentiment analysis
curl -X POST https://YOUR_SPACE.hf.space/api/hf/sentiment/single \
  -H "Content-Type: application/json" \
  -d '{"text": "Bitcoin is bullish today with strong momentum!"}'

# Test OHLCV data (if available)
curl "https://YOUR_SPACE.hf.space/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=10"
```

## 🔍 Troubleshooting

### Build Fails at npm install

**Symptom:** Build fails with "Cannot find module" or native binding errors

**Solution:**
- Ensure Dockerfile.huggingface has all build dependencies
- Check that `npm rebuild better-sqlite3` is executed
- Verify Node version is 20-alpine

### Build Fails at TypeScript Compilation

**Symptom:** Build fails with hundreds of TypeScript errors

**Solution:**
- Verify `tsconfig.server.json` has `noEmitOnError: false`
- Check that `npm run build` completes despite errors
- Ensure `dist/` folder is created with compiled JS files

### Application Starts but Crashes

**Symptom:** Build succeeds but application crashes on startup

**Solution:**
- Check Space logs for error messages
- Verify environment variables are set correctly
- Ensure PORT=7860 is configured
- Check that all required dependencies are in package.json

### HF Token Not Working

**Symptom:** Hugging Face API calls fail with 401/403 errors

**Solution:**
- Verify token is added to Space secrets
- Check token format (should start with `hf_`)
- Ensure token has correct permissions
- Test token at https://huggingface.co/settings/tokens

## 📊 Expected Build Output

**Successful Build:**
```
✓ Installing dependencies (3-5 minutes)
✓ Building client (vite build) (2-3 minutes)
✓ Building server (tsc) (1-2 minutes)
  - May show TypeScript warnings (expected)
  - Should complete with "Exit code: 0"
✓ Creating production image (2-3 minutes)
✓ Starting application
✓ Health check passing
```

**Total Time:** ~10-15 minutes

## 🎯 Success Criteria

- [ ] Build completes without errors
- [ ] Application starts successfully
- [ ] Health endpoint responds: `GET /api/health`
- [ ] Frontend loads at Space URL
- [ ] HF services available: `GET /api/hf/health`
- [ ] Sentiment analysis works: `POST /api/hf/sentiment/single`

## 📝 Additional Notes

### Demo Mode vs Online Mode

**Demo Mode** (Default - No API keys needed):
- Uses mock data with realistic patterns
- Full UI/UX demonstration
- No external API calls
- Perfect for public Spaces

**Online Mode** (Requires API keys):
- Real market data from multiple providers
- Requires API keys for CoinMarketCap, CryptoCompare, etc.
- Set `VITE_APP_MODE=online` and `APP_MODE=online`
- **Important:** Keep Space PRIVATE if using real API keys!

### Security Reminders

⚠️ **Never commit secrets to git!**
- Use `.env.local` for local development (gitignored)
- Use HF Space secrets for production
- Rotate tokens regularly
- Monitor API usage and rate limits

### Performance Tips

For better performance on free tier:
- Enable demo mode (no API calls)
- Disable Redis (uses in-memory cache)
- Limit concurrent requests
- Increase cache TTL values

## 🔗 Useful Links

- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Docker Spaces Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [Project Documentation](../README.md)
- [HF Integration Guide](./HUGGINGFACE_SETUP.md)

## 🆘 Support

If you encounter issues:
1. Check build logs in HF Space settings
2. Review this checklist
3. Consult [HUGGINGFACE_SETUP.md](./HUGGINGFACE_SETUP.md)
4. Open an issue on GitHub

---

**Last Updated:** 2025-11-10
**Status:** Ready for Deployment ✅

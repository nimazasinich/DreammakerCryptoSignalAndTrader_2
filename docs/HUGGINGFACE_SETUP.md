# Hugging Face Integration Setup

This guide explains how to configure Hugging Face API tokens for the DreammakerCryptoSignalAndTrader project.

## Why Hugging Face?

Hugging Face tokens provide:
- Higher API rate limits for Hugging Face Spaces
- Access to private datasets
- Enhanced ML features and model inference

## Local Development Setup

### Step 1: Get Your Token

1. Visit [Hugging Face Settings → Tokens](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Select permissions (read is sufficient for most use cases)
4. Copy your token (starts with `hf_`)

### Step 2: Configure Locally

Create a `.env.local` file in the project root:

```bash
# .env.local (gitignored - safe for secrets)
HUGGINGFACE_API_KEY=your_token_here
HF_TOKEN=your_token_here
```

**Important:** `.env.local` is gitignored and will NOT be committed to version control.

### Step 3: Verify Configuration

The application loads environment variables in this order:
1. `.env` (base configuration)
2. `.env.local` (your local secrets - overrides .env)

Run the application:
```bash
npm run dev
```

The Hugging Face token will be automatically loaded from `.env.local`.

## Hugging Face Spaces Deployment

### Option 1: Repository Secrets (Recommended)

1. Go to your Hugging Face Space settings
2. Navigate to "Repository secrets"
3. Add these secrets:
   - `HUGGINGFACE_API_KEY`: your token
   - `HF_TOKEN`: your token
   - `HF_TOKEN_B64`: base64-encoded token

Generate base64 token:
```bash
echo -n "your_token_here" | base64
```

### Option 2: Environment Variables in Space

1. Go to your Space → Settings → Variables
2. Add the environment variables directly in the Space configuration
3. Rebuild your Space to apply changes

## Production Deployment

### GitHub Actions / CI/CD

Add tokens as GitHub Secrets:
1. Repository → Settings → Secrets → Actions
2. Add `HUGGINGFACE_API_KEY` secret
3. Reference in workflows: `${{ secrets.HUGGINGFACE_API_KEY }}`

### Docker / Container Deployment

Pass as environment variables:
```bash
docker run -e HUGGINGFACE_API_KEY=your_token \
           -e HF_TOKEN=your_token \
           your-image-name
```

Or use docker-compose:
```yaml
services:
  app:
    environment:
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
      - HF_TOKEN=${HF_TOKEN}
```

## Security Best Practices

### ✅ DO:
- Store tokens in `.env.local` (gitignored) for local development
- Use environment variables or secrets management in production
- Rotate tokens periodically
- Use read-only tokens when write access isn't needed
- Keep tokens private and never share them

### ❌ DON'T:
- Commit tokens to `.env` files in git
- Hardcode tokens in source code
- Share tokens in public repositories
- Use production tokens in development environments
- Commit `.env.local` to version control

## Verification

To verify your token is configured correctly:

```bash
# Check if token is loaded
grep HUGGINGFACE_API_KEY .env.local

# Test the application
npm run dev
```

Check the application logs for Hugging Face API connections.

## Troubleshooting

### Token Not Working

1. Verify token format: should start with `hf_`
2. Check token permissions in Hugging Face settings
3. Ensure `.env.local` exists and contains the token
4. Restart the application after adding the token

### GitHub Blocking Push

If you accidentally committed a token:
1. **DO NOT** push to the repository
2. Remove the token from committed files
3. Use `git reset` to undo the commit
4. Move token to `.env.local`
5. Follow this guide for proper setup

### Rate Limiting

Without a token:
- Lower rate limits on Hugging Face APIs
- Some features may be restricted

With a token:
- Higher rate limits
- Access to more features
- Better performance

## Additional Resources

- [Hugging Face Tokens Documentation](https://huggingface.co/docs/hub/security-tokens)
- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Project README](../README.md)

## Support

If you encounter issues:
1. Check this documentation
2. Verify token permissions on Hugging Face
3. Review application logs
4. Open an issue on GitHub

# Deployment Guide

## Quick Start

### 1. Create PDF Repository

```bash
# Create a new repository on GitHub (e.g., devops-pdfs)
# Make it PUBLIC
# Upload all PDF files to the root
```

### 2. Setup Code Repository

```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/devops-notes-website.git
cd devops-notes-website

# Update config.js with your details
# Edit config.js:
# - username: 'YOUR_GITHUB_USERNAME'
# - repoName: 'devops-pdfs'
# - branch: 'main'

# Commit and push
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Enable GitHub Pages

1. Go to repository **Settings**
2. Click **Pages** in left sidebar
3. Under **Source**:
   - Select branch: `main`
   - Select folder: `/ (root)`
4. Click **Save**
5. Your site will be live at: `https://YOUR_USERNAME.github.io/devops-notes-website/`

## Repository Structure

### Code Repository (This One)
```
devops-notes-website/
├── index.html
├── styles.css
├── script.js
├── config.js
└── README.md
```

### PDF Repository (Separate)
```
devops-pdfs/
├── AWS DevOps cheat.pdf
├── docker.pdf
├── Kubernetes .pdf
└── ... (all PDFs)
```

## Configuration

Edit `config.js`:

```javascript
const PDF_REPO_CONFIG = {
    username: 'your-github-username',  // Change this
    repoName: 'devops-pdfs',           // Change this
    branch: 'main',                    // Usually 'main' or 'master'
};
```

## Testing Locally

1. Start a local server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Or Node.js
   npx http-server
   ```

2. Open browser: `http://localhost:8000`

3. **Note**: PDFs from GitHub may have CORS restrictions when testing locally. 
   The site will work properly when hosted on GitHub Pages.

## Updating PDFs

1. Add new PDF to PDF repository
2. Update `pdfCategories` in `script.js` of code repository
3. Commit and push both repositories

## Troubleshooting

### PDFs not loading?
- ✅ Check PDF repository is **PUBLIC**
- ✅ Verify `config.js` has correct username/repo
- ✅ Check browser console for errors
- ✅ Ensure PDF filenames match exactly (case-sensitive)

### CORS Errors?
- GitHub raw URLs work fine on GitHub Pages
- Local testing may show CORS errors (normal)
- Deploy to GitHub Pages for full functionality

### Thumbnails not generating?
- PDF.js needs time to load
- Check browser console
- Some PDFs may fail (will show placeholder)

## Custom Domain

1. Add `CNAME` file to code repository:
   ```
   yourdomain.com
   ```

2. Configure DNS:
   - Type: `CNAME`
   - Name: `@` or `www`
   - Value: `YOUR_USERNAME.github.io`

3. Wait for DNS propagation (can take up to 48 hours)

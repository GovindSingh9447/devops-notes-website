# Quick Setup Guide

## 🎯 Overview

You'll have **2 separate GitHub repositories**:
1. **Code Repository** - Contains website code (HTML, CSS, JS)
2. **PDF Repository** - Contains all PDF files

## 📋 Step-by-Step Instructions

### Step 1: Create PDF Repository

1. Go to GitHub and create a **new public repository**
   - Name: `devops-pdfs` (or any name you prefer)
   - Make it **PUBLIC** (required!)
   - Don't initialize with README

2. Upload all your PDF files to this repository
   ```bash
   # Option 1: Using GitHub web interface
   # - Click "uploading an existing file"
   # - Drag and drop all PDF files
   # - Commit changes
   
   # Option 2: Using Git
   git clone https://github.com/YOUR_USERNAME/devops-pdfs.git
   cd devops-pdfs
   # Copy all PDF files here
   git add .
   git commit -m "Add PDF files"
   git push origin main
   ```

### Step 2: Create Code Repository

1. Create a **new repository** for the website code
   - Name: `devops-notes-website` (or any name)
   - Can be public or private
   - Initialize with README (optional)

2. Upload the code files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `config.js`
   - `.gitignore`
   - `README.md`

### Step 3: Configure PDF Repository Connection

1. Open `config.js` in the code repository
2. Update with your details:
   ```javascript
   const PDF_REPO_CONFIG = {
       username: 'your-github-username',    // Your GitHub username
       repoName: 'devops-pdfs',             // Your PDF repo name
       branch: 'main',                      // Branch name
   };
   ```

### Step 4: Enable GitHub Pages

1. Go to your **code repository** settings
2. Click **Pages** in the left sidebar
3. Under **Source**:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes
6. Your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/devops-notes-website/
   ```

## ✅ Verification Checklist

- [ ] PDF repository is **PUBLIC**
- [ ] All PDF files are in PDF repository
- [ ] `config.js` has correct username and repo name
- [ ] GitHub Pages is enabled on code repository
- [ ] Website loads and shows PDFs

## 🔄 Adding New PDFs

1. Add PDF to **PDF repository**
2. Update `pdfCategories` in `script.js` of **code repository**
3. Commit and push both repositories

## 📝 Example Configuration

If your GitHub username is `johndoe` and PDF repo is `my-pdfs`:

```javascript
const PDF_REPO_CONFIG = {
    username: 'johndoe',
    repoName: 'my-pdfs',
    branch: 'main',
};
```

This will load PDFs from:
```
https://raw.githubusercontent.com/johndoe/my-pdfs/main/FILENAME.pdf
```

## 🐛 Common Issues

**PDFs not loading?**
- ✅ Check PDF repo is PUBLIC
- ✅ Verify config.js has correct details
- ✅ Check PDF filenames match exactly (case-sensitive)

**CORS errors?**
- Normal when testing locally
- Will work fine on GitHub Pages

**Thumbnails not showing?**
- PDF.js needs time to load
- Check browser console for errors

## 📞 Need Help?

Check the main `README.md` and `DEPLOYMENT.md` for more details.

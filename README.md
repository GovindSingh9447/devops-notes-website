# DevOps Notes Library - Website

This is the **code repository** for the DevOps Notes Library website. The PDF files are stored in a separate repository.

## 📁 Repository Structure

- **This Repo (Code)**: Contains HTML, CSS, JavaScript files
- **PDF Repo**: Contains all PDF files (separate repository)

## 🚀 Setup Instructions

### Step 1: Create the PDF Repository

1. Create a new GitHub repository (e.g., `devops-pdfs`)
2. Upload all your PDF files to this repository
3. Make sure the repository is **public** (required for GitHub raw URLs to work)

### Step 2: Configure This Repository

1. Open `config.js` file
2. Update the configuration:
   ```javascript
   const PDF_REPO_CONFIG = {
       username: 'YOUR_GITHUB_USERNAME',  // Your GitHub username
       repoName: 'devops-pdfs',           // Your PDF repository name
       branch: 'main',                    // Branch name (main or master)
   };
   ```

### Step 3: Enable GitHub Pages

1. Go to your repository settings
2. Navigate to **Pages** section
3. Under **Source**, select:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Click **Save**
5. Your site will be available at: `https://YOUR_USERNAME.github.io/REPO_NAME/`

## 📝 File Structure

```
.
├── index.html          # Main HTML file
├── styles.css          # Stylesheet
├── script.js           # Main JavaScript
├── config.js           # PDF repository configuration
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## 🔧 How It Works

- The website loads PDFs from your separate PDF repository using GitHub's raw content URLs
- Format: `https://raw.githubusercontent.com/USERNAME/REPO_NAME/BRANCH/FILENAME.pdf`
- PDFs are loaded dynamically when needed
- Thumbnails are generated using PDF.js library

## 📦 Adding New PDFs

1. Add PDF files to your **PDF repository** (not this one)
2. Update the `pdfCategories` object in `script.js` to include new PDFs
3. Commit and push changes to both repositories

## 🌐 Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to this repository with your domain name
2. Configure DNS settings for your domain
3. Update GitHub Pages settings

## 🐛 Troubleshooting

### PDFs not loading?
- Check that your PDF repository is **public**
- Verify the `config.js` has correct username and repo name
- Check browser console for CORS errors

### Thumbnails not showing?
- Ensure PDF.js library is loading correctly
- Check browser console for errors
- Some PDFs may take time to generate thumbnails

## 📄 License

This project is open source and available for personal use.

---

**Note**: Keep PDF files in the separate repository to maintain clean separation between code and content.

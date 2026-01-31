// Configuration for PDF Repository
// GitHub username and PDF repository name
const PDF_REPO_CONFIG = {
    // GitHub username
    username: 'GovindSingh9447',
    
    // PDF repository name (the repo containing all PDF files)
    repoName: 'devops-pdfs',
    
    // Branch name (usually 'main' or 'master')
    branch: 'main',
    
    // Base URL for PDFs (using GitHub raw content)
    get baseUrl() {
        return `https://raw.githubusercontent.com/${this.username}/${this.repoName}/${this.branch}/`;
    }
};

// Function to get full PDF URL
function getPDFUrl(pdfName) {
    const encodedName = encodeURIComponent(pdfName);
    return PDF_REPO_CONFIG.baseUrl + encodedName;
}

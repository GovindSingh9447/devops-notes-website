// Configuration for PDF Repository + website repo (stars)
const PDF_REPO_CONFIG = {
    username: 'GovindSingh9447',
    repoName: 'devops-pdfs',
    branch: 'main',

    // Website repo (for Star CTA)
    websiteRepoName: 'devops-notes-website',

    get baseUrl() {
        return `https://raw.githubusercontent.com/${this.username}/${this.repoName}/${this.branch}/`;
    },

    get websiteUrl() {
        return `https://github.com/${this.username}/${this.websiteRepoName}`;
    },

    get websiteApiUrl() {
        return `https://api.github.com/repos/${this.username}/${this.websiteRepoName}`;
    },

    get pdfTreeApiUrl() {
        return `https://api.github.com/repos/${this.username}/${this.repoName}/git/trees/${this.branch}?recursive=1`;
    }
};

function getPDFUrl(pdfName) {
    // Support nested paths from GitHub tree sync
    const encoded = String(pdfName)
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
    return PDF_REPO_CONFIG.baseUrl + encoded;
}

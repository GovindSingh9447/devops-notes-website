// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
} else {
    console.warn('PDF.js library not loaded. Thumbnails will not be generated.');
}

// Organize PDFs into categories
const pdfCategories = {
    "AWS & Cloud": [
        "AWS DevOps cheat.pdf",
        "AWS VPC Peering vs. Transit Gateway.pdf",
        "aws_networking.pdf",
        "aws_vpc.pdf",
        "Aws-Projets.pdf",
        "ec2.pdf",
        "Elastic Load Balancing & Auto Scaling Groups Section.pdf",
        "Route53.pdf",
        "TerraformAWS.pdf",
        "?Cloud.pdf"
    ],
    "Kubernetes": [
        "K8S-notes.pdf",
        "k8s-pods-to-prod.pdf",
        "k8s.pdf",
        "k8s1.pdf",
        "Kubernetes .pdf",
        "Kubernetes-CKA-0500-Cluster+Maintenance-v1.2.pdf",
        "Kubernetes+-CKA-+0800+-+Networking-v1.2.pdf",
        "Ingress.pdf",
        "Kind_cluster.pdf"
    ],
    "Docker": [
        "docker.pdf",
        "Docker-notes.pdf",
        "docker-commands.pdf",
        "docker_apche.pdf"
    ],
    "CI/CD Tools": [
        "jenkins_project.pdf",
        "Jenkins-springBoot.pdf",
        "GitLab CI-CD.pdf",
        "github-action.pdf",
        "Azurepipeline_project.pdf",
        "AKS-ci-cd.pdf",
        "KubeADM-ci-cd-promethus-grafana.pdf"
    ],
    "Infrastructure as Code": [
        "Terraform Notes.pdf",
        "terraform.pdf.pdf",
        "Terraform-Workspaces.pdf",
        "terraform-Q&A.pdf",
        "TerraformAWS.pdf"
    ],
    "Monitoring & Observability": [
        "Prometheus.pdf",
        "promethus&grafana.pdf",
        "grafna-promentus.pdf",
        "SonarQube.pdf",
        "𝗠𝗼𝗻𝗶𝘁𝗼𝗿𝗶𝗻𝗴 𝘃𝘀 𝗢𝗯𝘀𝗲𝗿𝘃𝗮𝗯𝗶𝗹𝗶𝘁𝘆 𝗶𝗻 𝗗𝗲𝘃𝗢𝗽𝘀 .pdf"
    ],
    "Git & Version Control": [
        "GIT.pdf",
        "git-commands.pdf",
        "GitOps-project-doc.pdf"
    ],
    "Scripting & Programming": [
        "bash.pdf",
        "ShellScript.pdf",
        "Linux_cmd.pdf",
        "Python.pdf",
        "python_vijay_sir_notes.pdf"
    ],
    "DevOps Fundamentals": [
        "DevOps-Masternotes.pdf",
        "DevOps-Scripts.pdf",
        "DevOps-Interview.pdf",
        "DEVOPS INTERVIEWS QUESTION AND ANSWER.pdf",
        "110+ DevOps.pdf",
        "Mastering_DevOps_From_Basics_to_Enterprise-Grade_Automation.pdf",
        "Networking_For_DevOps_.pdf"
    ],
    "Projects & Case Studies": [
        "DevOps Project-03A.pdf",
        "jenkins_project.pdf",
        "Azurepipeline_project.pdf",
        "java-war-deployment.pdf",
        "Build_maven.pdf",
        "nexus.pdf"
    ],
    "Other Resources": [
        "Deep Learning From Scratch.pdf",
        "ML.pdf",
        "ProtNo.pdf",
        "applicationForm_15603179.pdf",
        "1739243718251.pdf",
        "Govind Singh.pdf",
        "Govind -Singh.pdf"
    ]
};

// Cache management
const CACHE_KEY = 'pdfLibraryCache';
const RECENT_KEY = 'recentPDFs';
const MAX_RECENT = 10;
const MAX_CACHE_SIZE = 50; // Maximum number of thumbnails to cache

let thumbnailCache = {};
let totalPDFCount = 0;
let currentFilter = 'all';
let observer = null;

// Initialize cache from localStorage
function initCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            thumbnailCache = JSON.parse(cached);
        }
    } catch (e) {
        console.warn('Failed to load cache:', e);
        thumbnailCache = {};
    }
    updateCachedCount();
}

// Save cache to localStorage
function saveCache() {
    try {
        // Limit cache size
        const entries = Object.entries(thumbnailCache);
        if (entries.length > MAX_CACHE_SIZE) {
            // Keep most recent entries
            const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            thumbnailCache = Object.fromEntries(sorted.slice(0, MAX_CACHE_SIZE));
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(thumbnailCache));
        updateCachedCount();
    } catch (e) {
        console.warn('Failed to save cache:', e);
    }
}

// Get recent PDFs
function getRecentPDFs() {
    try {
        const recent = localStorage.getItem(RECENT_KEY);
        return recent ? JSON.parse(recent) : [];
    } catch (e) {
        return [];
    }
}

// Add to recent PDFs
function addToRecent(pdfName, category) {
    try {
        let recent = getRecentPDFs();
        // Remove if already exists
        recent = recent.filter(item => item.name !== pdfName);
        // Add to beginning
        recent.unshift({ name: pdfName, category: category, timestamp: Date.now() });
        // Keep only MAX_RECENT items
        recent = recent.slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
        renderRecentPDFs();
    } catch (e) {
        console.warn('Failed to save recent PDFs:', e);
    }
}

// Generate PDF thumbnail
async function generateThumbnail(pdfName) {
    // Check cache first
    if (thumbnailCache[pdfName]) {
        return thumbnailCache[pdfName].dataUrl;
    }

    // Check if PDF.js is available
    if (typeof pdfjsLib === 'undefined') {
        return null;
    }

    try {
        // Get PDF URL from config (GitHub raw URL) or use local path
        const pdfUrl = typeof getPDFUrl !== 'undefined' ? getPDFUrl(pdfName) : encodeURIComponent(pdfName);
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        
        // Get first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Cache it
        thumbnailCache[pdfName] = {
            dataUrl: dataUrl,
            timestamp: Date.now()
        };
        saveCache();
        
        return dataUrl;
    } catch (error) {
        console.warn(`Failed to generate thumbnail for ${pdfName}:`, error);
        return null;
    }
}

// Load thumbnail with lazy loading
function loadThumbnail(pdfCard, pdfName) {
    const thumbnailContainer = pdfCard.querySelector('.pdf-thumbnail');
    if (!thumbnailContainer) return;
    
    // Show loading indicator
    thumbnailContainer.innerHTML = '<div class="pdf-thumbnail-loading"></div>';
    
    // Generate thumbnail
    generateThumbnail(pdfName).then(dataUrl => {
        if (dataUrl) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = pdfName;
            img.onload = () => {
                thumbnailContainer.innerHTML = '';
                thumbnailContainer.appendChild(img);
            };
        } else {
            // Show placeholder
            thumbnailContainer.innerHTML = '<div class="pdf-thumbnail-placeholder">📄</div>';
        }
    });
}

// Intersection Observer for lazy loading
function setupLazyLoading() {
    if (observer) {
        observer.disconnect();
    }
    
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pdfCard = entry.target;
                const pdfName = pdfCard.getAttribute('data-pdf');
                if (pdfName && !pdfCard.hasAttribute('data-loaded')) {
                    pdfCard.setAttribute('data-loaded', 'true');
                    loadThumbnail(pdfCard, pdfName);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    // Observe all PDF cards
    document.querySelectorAll('.pdf-card').forEach(card => {
        observer.observe(card);
    });
}

// Render category filters
function renderCategoryFilters() {
    const filtersContainer = document.getElementById('categoryFilters');
    filtersContainer.innerHTML = '';
    
    // Add "All" filter
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${currentFilter === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `
        <span>All Categories</span>
        <span class="filter-count">${totalPDFCount}</span>
    `;
    allBtn.onclick = () => setFilter('all');
    filtersContainer.appendChild(allBtn);
    
    // Add category filters
    Object.keys(pdfCategories).forEach(category => {
        const count = pdfCategories[category].length;
        const btn = document.createElement('button');
        btn.className = `filter-btn ${currentFilter === category ? 'active' : ''}`;
        btn.innerHTML = `
            <span>${category}</span>
            <span class="filter-count">${count}</span>
        `;
        btn.onclick = () => setFilter(category);
        filtersContainer.appendChild(btn);
    });
}

// Set filter
function setFilter(category) {
    currentFilter = category;
    renderCategoryFilters();
    renderSections();
    // Close mobile menu after filter is applied
    closeMobileMenu();
}

// Render recent PDFs
function renderRecentPDFs() {
    const recentContainer = document.getElementById('recentPDFs');
    const recent = getRecentPDFs();
    
    if (recent.length === 0) {
        recentContainer.innerHTML = '<p class="empty-state">No recent PDFs</p>';
        return;
    }
    
    recentContainer.innerHTML = '';
    recent.forEach(item => {
        const recentItem = document.createElement('div');
        recentItem.className = 'recent-item';
        recentItem.onclick = () => openPDF(item.name, item.category);
        
        // Try to get cached thumbnail
        const thumb = thumbnailCache[item.name]?.dataUrl;
        const thumbHtml = thumb 
            ? `<img src="${thumb}" alt="${item.name}" class="recent-thumb">`
            : `<div class="recent-thumb" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📄</div>`;
        
        const timeAgo = getTimeAgo(item.timestamp);
        
        recentItem.innerHTML = `
            ${thumbHtml}
            <div class="recent-info">
                <div class="recent-name">${item.name.replace('.pdf', '')}</div>
                <div class="recent-time">${timeAgo}</div>
            </div>
        `;
        
        recentContainer.appendChild(recentItem);
    });
}

// Get time ago string
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Update cached count
function updateCachedCount() {
    const count = Object.keys(thumbnailCache).length;
    document.getElementById('cachedCount').textContent = count;
}

// Render sections
function renderSections() {
    const sectionsContainer = document.getElementById('pdfSections');
    sectionsContainer.innerHTML = '';
    totalPDFCount = 0;
    
    const categories = currentFilter === 'all' 
        ? Object.keys(pdfCategories)
        : [currentFilter];
    
    categories.forEach(category => {
        const pdfs = pdfCategories[category];
        if (pdfs.length === 0) return;
        
        // Filter by search if active
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filteredPDFs = searchTerm 
            ? pdfs.filter(pdf => pdf.toLowerCase().includes(searchTerm))
            : pdfs;
        
        if (filteredPDFs.length === 0) return;
        
        totalPDFCount += filteredPDFs.length;
        
        const section = document.createElement('div');
        section.className = 'section';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            ${category}
            <span class="section-count">(${filteredPDFs.length})</span>
        `;
        
        sectionHeader.appendChild(sectionTitle);
        
        const pdfGrid = document.createElement('div');
        pdfGrid.className = 'pdf-grid';
        
        filteredPDFs.forEach(pdfName => {
            const pdfCard = document.createElement('div');
            pdfCard.className = 'pdf-card';
            pdfCard.setAttribute('data-pdf', pdfName);
            pdfCard.onclick = () => openPDF(pdfName, category);
            
            pdfCard.innerHTML = `
                <div class="pdf-thumbnail">
                    <div class="pdf-thumbnail-placeholder">📄</div>
                </div>
                <div class="pdf-info">
                    <div class="pdf-name">${pdfName.replace('.pdf', '')}</div>
                    <div class="pdf-category">${category}</div>
                </div>
            `;
            
            pdfGrid.appendChild(pdfCard);
        });
        
        section.appendChild(sectionHeader);
        section.appendChild(pdfGrid);
        sectionsContainer.appendChild(section);
    });
    
    // Update total count
    document.getElementById('totalPDFs').textContent = totalPDFCount;
    
    // Setup lazy loading after a short delay
    setTimeout(() => {
        setupLazyLoading();
    }, 100);
}

// PDF viewer state
let currentPDF = null;
let currentPage = 1;
let totalPages = 0;
let pdfOutline = null;
let pageCanvases = [];

// Open PDF
async function openPDF(pdfName, category) {
    console.log('openPDF called:', pdfName, category);
    
    const modal = document.getElementById('pdfModal');
    if (!modal) {
        console.error('PDF modal not found!');
        return;
    }
    
    const pdfTitle = document.getElementById('pdfTitle');
    const pdfCategory = document.getElementById('pdfCategory');
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const canvasContainer = document.getElementById('pdfCanvasContainer');
    
    // Close mobile menu if open
    closeMobileMenu();
    
    // Reset state
    currentPage = 1;
    
    // Set PDF title and category
    if (pdfTitle) pdfTitle.textContent = pdfName.replace('.pdf', '');
    if (pdfCategory) pdfCategory.textContent = category;
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Show loading
    if (pdfLoading) {
        pdfLoading.style.display = 'flex';
        pdfLoading.innerHTML = `
            <div class="spinner"></div>
            <p>Loading PDF...</p>
        `;
    }
    if (pdfCanvas) pdfCanvas.style.display = 'none';
    
    // Get PDF URL from config (GitHub raw URL) or use local path
    const pdfUrl = typeof getPDFUrl !== 'undefined' ? getPDFUrl(pdfName) : encodeURIComponent(pdfName);
    
    console.log('PDF URL:', pdfUrl);
    
    try {
        // Check if PDF.js is available
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }
        
        console.log('PDF.js loaded, starting to load PDF...');
        
        // Load PDF
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
        });
        
        currentPDF = await loadingTask.promise;
        totalPages = currentPDF.numPages;
        
        // Get PDF outline (table of contents)
        try {
            pdfOutline = await currentPDF.getOutline();
            renderTOC(pdfOutline);
        } catch (error) {
            console.log('No table of contents available');
            document.getElementById('tocContent').innerHTML = '<p class="toc-empty">No table of contents available for this PDF.</p>';
        }
        
        // Render all pages
        await renderAllPages();
        
        // Hide loading
        pdfLoading.style.display = 'none';
        
        // Add to recent
        addToRecent(pdfName, category);
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        pdfLoading.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <p style="font-size: 1.2em; margin-bottom: 0.5rem;">❌ Failed to load PDF</p>
                <p style="font-size: 0.9em;">${error.message}</p>
                <p style="font-size: 0.85em; margin-top: 1rem; opacity: 0.7;">The PDF may be too large or the URL is incorrect.</p>
            </div>
        `;
    }
}

// Render all PDF pages
async function renderAllPages() {
    if (!currentPDF || totalPages === 0) return;
    
    const canvasContainer = document.getElementById('pdfCanvasContainer');
    pageCanvases = [];
    
    // Clear container
    canvasContainer.innerHTML = '';
    
    // Get device pixel ratio for high-quality rendering
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate scale to fit container width (edge-to-edge)
    const containerWidth = canvasContainer.clientWidth;
    const firstPage = await currentPDF.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.0 });
    const scale = Math.min(containerWidth / viewport.width, 2.5); // Max 2.5x zoom for clarity
    
    try {
        // Render all pages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await currentPDF.getPage(pageNum);
            const scaledViewport = page.getViewport({ scale: scale });
            
            // Create canvas for each page with high DPR
            const pageCanvas = document.createElement('canvas');
            pageCanvas.className = 'pdf-page-canvas';
            pageCanvas.setAttribute('data-page', pageNum);
            pageCanvas.id = `pdf-page-${pageNum}`;
            
            // Set canvas size with DPR for crisp rendering
            pageCanvas.width = scaledViewport.width * dpr;
            pageCanvas.height = scaledViewport.height * dpr;
            pageCanvas.style.width = scaledViewport.width + 'px';
            pageCanvas.style.height = scaledViewport.height + 'px';
            
            const context = pageCanvas.getContext('2d');
            context.scale(dpr, dpr);
            
            // Render page with high quality
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport
            };
            
            await page.render(renderContext).promise;
            
            // Add canvas to container
            canvasContainer.appendChild(pageCanvas);
            pageCanvases.push(pageCanvas);
        }
        
    } catch (error) {
        console.error('Error rendering pages:', error);
    }
}

// Render Table of Contents
function renderTOC(outline) {
    const tocContent = document.getElementById('tocContent');
    
    if (!outline || outline.length === 0) {
        tocContent.innerHTML = '<p class="toc-empty">No table of contents available for this PDF.</p>';
        return;
    }
    
    let tocHTML = '<ul class="toc-list">';
    
    function renderOutlineItem(item, level = 0) {
        const pageRef = item.dest ? (Array.isArray(item.dest) ? item.dest[0] : item.dest) : null;
        const pageNum = pageRef ? (typeof pageRef === 'object' && pageRef.gen !== undefined ? pageRef.num : pageRef) : null;
        
        tocHTML += `<li class="toc-item toc-level-${level}">`;
        if (pageNum) {
            tocHTML += `<a href="#" onclick="scrollToPage(${pageNum}, event)" class="toc-link">`;
        } else {
            tocHTML += `<span class="toc-link">`;
        }
        tocHTML += `<span class="toc-title">${item.title}</span>`;
        if (pageNum) {
            tocHTML += `<span class="toc-page">Page ${pageNum}</span>`;
        }
        tocHTML += pageNum ? `</a>` : `</span>`;
        
        if (item.items && item.items.length > 0) {
            tocHTML += '<ul class="toc-sublist">';
            item.items.forEach(subItem => {
                renderOutlineItem(subItem, level + 1);
            });
            tocHTML += '</ul>';
        }
        
        tocHTML += '</li>';
    }
    
    outline.forEach(item => {
        renderOutlineItem(item);
    });
    
    tocHTML += '</ul>';
    tocContent.innerHTML = tocHTML;
}

// Scroll to specific page
function scrollToPage(pageNum, event) {
    if (event) event.preventDefault();
    
    const pageCanvas = document.getElementById(`pdf-page-${pageNum}`);
    if (pageCanvas) {
        pageCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the page briefly
        pageCanvas.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
        setTimeout(() => {
            pageCanvas.style.boxShadow = '';
        }, 2000);
    }
    
    // Close TOC on mobile
    if (window.innerWidth <= 768) {
        toggleTOC();
    }
}

// Toggle Table of Contents
function toggleTOC() {
    const tocSidebar = document.getElementById('tocSidebar');
    const tocToggle = document.getElementById('tocToggle');
    
    if (tocSidebar) {
        tocSidebar.classList.toggle('active');
        if (tocSidebar.classList.contains('active')) {
            tocToggle.classList.add('active');
        } else {
            tocToggle.classList.remove('active');
        }
    }
}

// Search in TOC
function searchTOC() {
    const searchTerm = document.getElementById('tocSearch').value.toLowerCase();
    const tocItems = document.querySelectorAll('.toc-item');
    
    tocItems.forEach(item => {
        const title = item.querySelector('.toc-title').textContent.toLowerCase();
        if (title.includes(searchTerm) || searchTerm === '') {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Close PDF
function closePDF() {
    const modal = document.getElementById('pdfModal');
    
    // Hide modal
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Clear PDF
    currentPDF = null;
    currentPage = 1;
    totalPages = 0;
    
    // Clear canvas
    const pdfCanvas = document.getElementById('pdfCanvas');
    const ctx = pdfCanvas.getContext('2d');
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
}

// Toggle fullscreen
function toggleFullscreen() {
    const modalContent = document.querySelector('.modal-content');
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && !document.msFullscreenElement) {
        if (modalContent.requestFullscreen) {
            modalContent.requestFullscreen();
        } else if (modalContent.webkitRequestFullscreen) {
            modalContent.webkitRequestFullscreen();
        } else if (modalContent.mozRequestFullScreen) {
            modalContent.mozRequestFullScreen();
        } else if (modalContent.msRequestFullscreen) {
            modalContent.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Update fullscreen icon
function updateFullscreenIcon() {
    const fullscreenText = document.getElementById('fullscreenText');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                         document.mozFullScreenElement || document.msFullscreenElement;
    
    if (fullscreenText) {
        fullscreenText.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
    }
}

// Theme toggle
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Filter PDFs
function filterPDFs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const clearBtn = document.getElementById('clearSearch');
    
    if (searchTerm) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    renderSections();
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    filterPDFs();
    document.getElementById('searchInput').focus();
}

// Toggle mobile menu
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Close mobile menu when clicking outside or on a link
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait for PDF.js to load if available
    const initApp = () => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        initCache();
        initTheme();
        renderCategoryFilters();
        renderSections();
        renderRecentPDFs();
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }
        
        // Close mobile menu when clicking on filter buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.filter-btn') || e.target.closest('.recent-item')) {
                setTimeout(closeMobileMenu, 300);
            }
        });
        
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    filterPDFs();
                }
            });
            searchInput.addEventListener('input', filterPDFs);
        }
        
        // Clear search
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', clearSearch);
        }
        
        // Fullscreen events
        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);
        
    // Keyboard navigation for PDF viewer
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('pdfModal');
        if (modal && modal.classList.contains('active')) {
            // Only handle Escape key when modal is active
            if (e.key === 'Escape') {
                if (document.fullscreenElement || document.webkitFullscreenElement || 
                    document.mozFullScreenElement || document.msFullscreenElement) {
                    toggleFullscreen();
                } else {
                    closePDF();
                }
            }
        }
    });
    };
    
    // If PDF.js is already loaded, initialize immediately
    if (typeof pdfjsLib !== 'undefined') {
        initApp();
    } else {
        // Wait a bit for PDF.js to load
        setTimeout(() => {
            initApp();
        }, 100);
    }
});

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
let currentView = localStorage.getItem('libraryView') || 'grid';
let observer = null;

const PLACEHOLDER_SVG = `
    <div class="pdf-thumbnail-placeholder" aria-hidden="true"></div>
`;

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
            thumbnailContainer.innerHTML = PLACEHOLDER_SVG;
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

    const libraryTotal = Object.values(pdfCategories).reduce((sum, list) => sum + list.length, 0);

    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${currentFilter === 'all' ? 'active' : ''}`;
    allBtn.setAttribute('role', 'option');
    allBtn.setAttribute('aria-selected', currentFilter === 'all' ? 'true' : 'false');
    allBtn.innerHTML = `
        <span>All categories</span>
        <span class="filter-count">${libraryTotal}</span>
    `;
    allBtn.onclick = () => setFilter('all');
    filtersContainer.appendChild(allBtn);

    Object.keys(pdfCategories).forEach(category => {
        const count = pdfCategories[category].length;
        const btn = document.createElement('button');
        btn.className = `filter-btn ${currentFilter === category ? 'active' : ''}`;
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', currentFilter === category ? 'true' : 'false');
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
    updateActiveFilterLabel();
    renderCategoryFilters();
    renderSections();
    closeMobileMenu();
}

function updateActiveFilterLabel() {
    const label = document.getElementById('activeFilterLabel');
    if (!label) return;
    label.textContent = currentFilter === 'all' ? 'All categories' : currentFilter;
}

function setViewMode(mode) {
    currentView = mode === 'list' ? 'list' : 'grid';
    localStorage.setItem('libraryView', currentView);

    const sections = document.getElementById('pdfSections');
    if (sections) sections.setAttribute('data-view', currentView);

    const gridBtn = document.getElementById('viewGrid');
    const listBtn = document.getElementById('viewList');
    if (gridBtn && listBtn) {
        gridBtn.classList.toggle('active', currentView === 'grid');
        listBtn.classList.toggle('active', currentView === 'list');
        gridBtn.setAttribute('aria-pressed', currentView === 'grid' ? 'true' : 'false');
        listBtn.setAttribute('aria-pressed', currentView === 'list' ? 'true' : 'false');
    }
}

function resetFilters() {
    currentFilter = 'all';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('clearSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    updateActiveFilterLabel();
    renderCategoryFilters();
    renderSections();
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
            ? `<img src="${thumb}" alt="" class="recent-thumb">`
            : `<div class="recent-thumb pdf-thumbnail-placeholder" aria-hidden="true"></div>`;
        
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
    const emptyResults = document.getElementById('emptyResults');
    sectionsContainer.innerHTML = '';
    sectionsContainer.setAttribute('data-view', currentView);
    totalPDFCount = 0;

    const categories = currentFilter === 'all'
        ? Object.keys(pdfCategories)
        : [currentFilter];

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    let cardIndex = 0;

    categories.forEach((category, sectionIndex) => {
        const pdfs = pdfCategories[category];
        if (pdfs.length === 0) return;

        const filteredPDFs = searchTerm
            ? pdfs.filter(pdf =>
                pdf.toLowerCase().includes(searchTerm) ||
                category.toLowerCase().includes(searchTerm)
              )
            : pdfs;

        if (filteredPDFs.length === 0) return;

        totalPDFCount += filteredPDFs.length;

        const section = document.createElement('section');
        section.className = 'section';
        section.style.animationDelay = `${Math.min(sectionIndex, 6) * 40}ms`;

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';

        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            ${category}
            <span class="section-count">${filteredPDFs.length}</span>
        `;

        sectionHeader.appendChild(sectionTitle);

        const pdfGrid = document.createElement('div');
        pdfGrid.className = 'pdf-grid';

        filteredPDFs.forEach(pdfName => {
            const pdfCard = document.createElement('article');
            pdfCard.className = 'pdf-card';
            pdfCard.setAttribute('data-pdf', pdfName);
            pdfCard.setAttribute('tabindex', '0');
            pdfCard.setAttribute('role', 'button');
            pdfCard.setAttribute('aria-label', `Open ${pdfName.replace('.pdf', '')}`);
            pdfCard.style.animationDelay = `${Math.min(cardIndex, 20) * 25}ms`;
            cardIndex += 1;
            pdfCard.onclick = () => openPDF(pdfName, category);
            pdfCard.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPDF(pdfName, category);
                }
            };

            pdfCard.innerHTML = `
                <div class="pdf-thumbnail">
                    ${PLACEHOLDER_SVG}
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

    document.getElementById('totalPDFs').textContent = totalPDFCount;

    if (emptyResults) {
        emptyResults.hidden = totalPDFCount > 0;
    }

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
let pageTrackRaf = null;
let pageTrackBound = false;

function updatePageIndicator(page) {
    if (page && page >= 1) {
        currentPage = Math.min(page, totalPages || page);
    }

    const currentEl = document.getElementById('currentPageNum');
    const totalEl = document.getElementById('totalPageNum');
    const floatCurrent = document.getElementById('floatCurrentPage');
    const floatTotal = document.getElementById('floatTotalPage');
    const headerIndicator = document.getElementById('pageIndicator');
    const floatIndicator = document.getElementById('pageIndicatorFloat');

    const cur = String(currentPage || 1);
    const tot = String(totalPages || 1);

    if (currentEl) currentEl.textContent = cur;
    if (totalEl) totalEl.textContent = tot;
    if (floatCurrent) floatCurrent.textContent = cur;
    if (floatTotal) floatTotal.textContent = tot;

    const show = totalPages > 0;
    if (headerIndicator) headerIndicator.classList.toggle('visible', show);
    if (floatIndicator) floatIndicator.classList.toggle('visible', show);
}

function getVisiblePageNumber() {
    const scrollRoot = document.getElementById('pdfViewerScroll') ||
        document.querySelector('.pdf-viewer-container');
    if (!scrollRoot || !pageCanvases.length) return currentPage || 1;

    const rootRect = scrollRoot.getBoundingClientRect();
    // Prefer the page near the upper reading band
    const targetY = rootRect.top + rootRect.height * 0.28;

    let bestPage = 1;
    let bestDist = Infinity;

    pageCanvases.forEach((canvas) => {
        const pageNum = parseInt(canvas.getAttribute('data-page'), 10);
        if (!pageNum) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) return;

        const dist = Math.abs(rect.top - targetY);
        if (dist < bestDist) {
            bestDist = dist;
            bestPage = pageNum;
        }
    });

    return bestPage;
}

function onPdfScrollTrack() {
    if (pageTrackRaf) return;
    pageTrackRaf = requestAnimationFrame(() => {
        pageTrackRaf = null;
        const page = getVisiblePageNumber();
        if (page !== currentPage) {
            updatePageIndicator(page);
        }
    });
}

function setupPageTracking() {
    const scrollRoot = document.getElementById('pdfViewerScroll') ||
        document.querySelector('.pdf-viewer-container');
    if (!scrollRoot) return;

    if (!pageTrackBound) {
        scrollRoot.addEventListener('scroll', onPdfScrollTrack, { passive: true });
        pageTrackBound = true;
    }

    updatePageIndicator(1);
    // Sync once layout settles
    setTimeout(() => updatePageIndicator(getVisiblePageNumber()), 50);
}

function teardownPageTracking() {
    updatePageIndicator(1);
    const headerIndicator = document.getElementById('pageIndicator');
    const floatIndicator = document.getElementById('pageIndicatorFloat');
    if (headerIndicator) headerIndicator.classList.remove('visible');
    if (floatIndicator) floatIndicator.classList.remove('visible');
}

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
    
    // Push state to history for back button support
    if (window.history && window.history.pushState) {
        window.history.pushState({ pdfView: true }, '', '#pdf');
    }
    
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
        updatePageIndicator(1);
        
        // Get PDF outline (table of contents)
        try {
            pdfOutline = await currentPDF.getOutline();
            console.log('PDF Outline:', pdfOutline);
            if (pdfOutline && pdfOutline.length > 0) {
                renderTOC(pdfOutline);
            } else {
                // Create a simple page-based TOC if no outline exists
                createPageBasedTOC();
            }
        } catch (error) {
            console.log('No table of contents available:', error);
            // Create a simple page-based TOC as fallback
            createPageBasedTOC();
        }
        
        // Render all pages
        await renderAllPages();
        
        // Hide loading
        pdfLoading.style.display = 'none';
        
        // Track visible page + header scroll behavior
        setTimeout(() => {
            setupPageTracking();
            setupHeaderScrollBehavior();
        }, 100);
        
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
    // Wait a bit for container to be properly sized
    await new Promise(resolve => setTimeout(resolve, 100));
    const containerWidth = canvasContainer.clientWidth || window.innerWidth - 40;
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
        createPageBasedTOC();
        return;
    }
    
    let tocHTML = '<ul class="toc-list">';
    
    function renderOutlineItem(item, level = 0) {
        let pageNum = null;
        
        // Try different methods to extract page number
        if (item.dest) {
            if (Array.isArray(item.dest)) {
                // Handle array destination
                const dest = item.dest[0];
                if (typeof dest === 'object' && dest !== null) {
                    if (dest.gen !== undefined && dest.num !== undefined) {
                        pageNum = dest.num;
                    } else if (dest.pageIndex !== undefined) {
                        pageNum = dest.pageIndex + 1;
                    } else if (dest.pageNum !== undefined) {
                        pageNum = dest.pageNum;
                    }
                } else if (typeof dest === 'number') {
                    pageNum = dest;
                }
            } else if (typeof item.dest === 'object' && item.dest !== null) {
                if (item.dest.gen !== undefined && item.dest.num !== undefined) {
                    pageNum = item.dest.num;
                } else if (item.dest.pageIndex !== undefined) {
                    pageNum = item.dest.pageIndex + 1;
                }
            } else if (typeof item.dest === 'number') {
                pageNum = item.dest;
            }
        }
        
        // Try to get page from URL if available
        if (!pageNum && item.url) {
            const match = item.url.match(/page=(\d+)/);
            if (match) {
                pageNum = parseInt(match[1]);
            }
        }
        
        tocHTML += `<li class="toc-item toc-level-${level}">`;
        if (pageNum) {
            tocHTML += `<a href="#" onclick="scrollToPage(${pageNum}, event)" class="toc-link">`;
        } else {
            tocHTML += `<span class="toc-link">`;
        }
        tocHTML += `<span class="toc-title">${item.title || 'Untitled'}</span>`;
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

// Create a simple page-based TOC when PDF has no outline
function createPageBasedTOC() {
    const tocContent = document.getElementById('tocContent');
    
    if (!totalPages || totalPages === 0) {
        tocContent.innerHTML = '<p class="toc-empty">No table of contents available for this PDF.</p>';
        return;
    }
    
    let tocHTML = '<ul class="toc-list">';
    
    // Create TOC entries for every 10 pages or major sections
    const pagesPerEntry = totalPages > 100 ? 20 : totalPages > 50 ? 10 : 5;
    
    for (let i = 1; i <= totalPages; i += pagesPerEntry) {
        const endPage = Math.min(i + pagesPerEntry - 1, totalPages);
        const label = i === endPage ? `Page ${i}` : `Pages ${i}-${endPage}`;
        
        tocHTML += `<li class="toc-item toc-level-0">`;
        tocHTML += `<a href="#" onclick="scrollToPage(${i}, event)" class="toc-link">`;
        tocHTML += `<span class="toc-title">${label}</span>`;
        tocHTML += `<span class="toc-page">Page ${i}</span>`;
        tocHTML += `</a>`;
        tocHTML += `</li>`;
    }
    
    tocHTML += '</ul>';
    tocContent.innerHTML = tocHTML;
}

// Scroll to specific page
function scrollToPage(pageNum, event) {
    if (event) event.preventDefault();
    
    const pageCanvas = document.getElementById(`pdf-page-${pageNum}`);
    if (pageCanvas) {
        pageCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updatePageIndicator(pageNum);
        // Highlight the page briefly
        pageCanvas.style.boxShadow = '0 0 20px rgba(15, 118, 110, 0.45)';
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
    
    // Exit fullscreen if active
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) {
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
    
    // Close TOC if open
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar && tocSidebar.classList.contains('active')) {
        tocSidebar.classList.remove('active');
    }
    
    // Hide modal
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Remove hash from URL if present
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
    }
    
    // Clear PDF
    currentPDF = null;
    currentPage = 1;
    totalPages = 0;
    pdfOutline = null;
    pageCanvases = [];
    teardownPageTracking();
    
    // Clear canvas container
    const canvasContainer = document.getElementById('pdfCanvasContainer');
    if (canvasContainer) {
        canvasContainer.innerHTML = '';
    }
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

// Handle header visibility on scroll
let scrollTimeout = null;
let lastScrollTop = 0;
let isScrolling = false;

function setupHeaderScrollBehavior() {
    const scrollRoot = document.getElementById('pdfViewerScroll') ||
        document.querySelector('.pdf-viewer-container');
    const modalHeader = document.querySelector('.modal-header');
    const modalContent = document.querySelector('.modal-content');
    
    if (!scrollRoot || !modalHeader || !modalContent) return;
    
    // Reset scroll tracking
    lastScrollTop = 0;
    isScrolling = false;
    
    scrollRoot.addEventListener('scroll', () => {
        const scrollTop = scrollRoot.scrollTop;
        const isScrollingDown = scrollTop > lastScrollTop && scrollTop > 100;
        const scrollThreshold = 100;
        
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        isScrolling = true;
        
        if (scrollTop < scrollThreshold || !isScrollingDown) {
            modalHeader.classList.remove('hidden');
        } else if (scrollTop > scrollThreshold && isScrollingDown) {
            modalHeader.classList.add('hidden');
        }
        
        lastScrollTop = scrollTop;
        
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            modalHeader.classList.remove('hidden');
        }, 2000);
    }, { passive: true });
    
    modalContent.addEventListener('mouseenter', () => {
        if (!isScrolling) {
            modalHeader.classList.remove('hidden');
        }
    });
    
    modalHeader.addEventListener('mouseenter', () => {
        modalHeader.classList.remove('hidden');
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
    });
    
    modalContent.addEventListener('mousemove', (e) => {
        if (e.clientY < 100) {
            modalHeader.classList.remove('hidden');
        }
    });
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
    if (!icon) return;

    if (theme === 'dark') {
        icon.innerHTML = `
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
            </svg>
        `;
    } else {
        icon.innerHTML = `
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/>
            </svg>
        `;
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
    const menuBtn = document.getElementById('mobileMenuBtn');

    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        overlay.hidden = !overlay.classList.contains('active');

        const isOpen = sidebar.classList.contains('open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        document.body.style.overflow = isOpen ? 'hidden' : '';
    }
}

// Close mobile menu when clicking outside or on a link
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');

    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        overlay.hidden = true;
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
}

function setupHeaderScroll() {
    const header = document.querySelector('.main-header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const initApp = () => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        initCache();
        initTheme();
        setViewMode(currentView);
        updateActiveFilterLabel();
        renderCategoryFilters();
        renderSections();
        renderRecentPDFs();
        setupHeaderScroll();

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }

        const viewGrid = document.getElementById('viewGrid');
        const viewList = document.getElementById('viewList');
        if (viewGrid) viewGrid.addEventListener('click', () => setViewMode('grid'));
        if (viewList) viewList.addEventListener('click', () => setViewMode('list'));

        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetFilters);
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.filter-btn') || e.target.closest('.recent-item')) {
                setTimeout(closeMobileMenu, 300);
            }
        });

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

        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', clearSearch);
        }

        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

        window.addEventListener('popstate', () => {
            const modal = document.getElementById('pdfModal');
            if (modal && modal.classList.contains('active')) {
                closePDF();
            }
        });

        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('pdfModal');
            const modalOpen = modal && modal.classList.contains('active');
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

            if (modalOpen && e.key === 'Escape') {
                if (document.fullscreenElement || document.webkitFullscreenElement ||
                    document.mozFullScreenElement || document.msFullscreenElement) {
                    toggleFullscreen();
                } else {
                    closePDF();
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
                return;
            }

            // Slash focuses search when not typing / viewing PDF
            if (!modalOpen && !typing && e.key === '/') {
                e.preventDefault();
                searchInput?.focus();
                searchInput?.select();
            }

            if (!modalOpen && e.key === 'Escape') {
                closeMobileMenu();
                if (document.getElementById('searchInput')?.value) {
                    clearSearch();
                }
            }
        });
    };

    if (typeof pdfjsLib !== 'undefined') {
        initApp();
    } else {
        setTimeout(() => {
            initApp();
        }, 100);
    }
});

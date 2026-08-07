// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
} else {
    console.warn('PDF.js library not loaded. Thumbnails will not be generated.');
}

// Seed catalog (merged/updated by GitHub sync)
const DEFAULT_PDF_CATEGORIES = {
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
        "ML.pdf"
    ]
};

// Personal / non-library files — hidden unless Misc is enabled
const PRIVATE_PDF_PATTERNS = [
    /^Govind/i,
    /applicationForm/i,
    /^ProtNo\.pdf$/i,
    /^\d{8,}\.pdf$/i
];

const CATEGORY_RULES = [
    { category: 'Kubernetes', pattern: /k8s|kubernetes|ingress|kind.?cluster/i },
    { category: 'Docker', pattern: /docker/i },
    { category: 'CI/CD Tools', pattern: /jenkins|gitlab|github.?action|azure.?pipeline|ci-?cd|aks-ci/i },
    { category: 'Infrastructure as Code', pattern: /terraform|ansible|iac/i },
    { category: 'Monitoring & Observability', pattern: /prometheus|grafana|prometh|sonar|observability|monitoring/i },
    { category: 'Git & Version Control', pattern: /\bgit\b|gitops/i },
    { category: 'Scripting & Programming', pattern: /bash|shell|linux|python/i },
    { category: 'AWS & Cloud', pattern: /aws|ec2|vpc|route53|cloud|elb|auto.?scaling/i },
    { category: 'Projects & Case Studies', pattern: /project|maven|nexus|war.?deploy|case.?stud/i },
    { category: 'DevOps Fundamentals', pattern: /devops|interview|network/i }
];

const CATALOG_CACHE_KEY = 'pdfCatalogSync';
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const SHOW_MISC_KEY = 'showMiscResources';

let pdfCategories = JSON.parse(JSON.stringify(DEFAULT_PDF_CATEGORIES));
let showMiscResources = localStorage.getItem(SHOW_MISC_KEY) === 'true';
let pdfPathIndex = {}; // basename/display name -> repo path for nested files

function isPrivatePdf(pdfName) {
    const base = String(pdfName).split('/').pop();
    return PRIVATE_PDF_PATTERNS.some((re) => re.test(base));
}

function categorizePdf(pdfName) {
    const base = String(pdfName).split('/').pop();
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(base)) return rule.category;
    }
    return 'Other Resources';
}

function visibleCategories() {
    return Object.keys(pdfCategories).filter((cat) => {
        if (cat === 'Other Resources' && !showMiscResources) return false;
        return (pdfCategories[cat] || []).length > 0;
    });
}

function visiblePdfsInCategory(category) {
    const list = pdfCategories[category] || [];
    return list.filter((name) => {
        if (isPrivatePdf(name) && !showMiscResources) return false;
        if (category === 'Other Resources' && !showMiscResources) return false;
        return true;
    });
}

function mergePdfIntoCatalog(pdfPath) {
    const base = pdfPath.split('/').pop();
    if (!base.toLowerCase().endsWith('.pdf')) return;

    pdfPathIndex[base] = pdfPath;

    // Skip private unless misc shown — still keep path index for deep links if needed
    if (isPrivatePdf(base)) {
        if (!showMiscResources) return;
    }

    // Already present somewhere?
    for (const list of Object.values(pdfCategories)) {
        if (list.includes(base) || list.includes(pdfPath)) return;
    }

    const category = categorizePdf(base);
    if (!pdfCategories[category]) pdfCategories[category] = [];
    pdfCategories[category].push(base);
}

async function syncPdfCatalogFromGitHub() {
    try {
        const cached = localStorage.getItem(CATALOG_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.timestamp && Date.now() - parsed.timestamp < CATALOG_TTL_MS && parsed.categories) {
                pdfCategories = parsed.categories;
                pdfPathIndex = parsed.pathIndex || {};
                return { source: 'cache', count: countCatalogPdfs() };
            }
        }
    } catch (e) {
        /* ignore bad cache */
    }

    if (typeof PDF_REPO_CONFIG === 'undefined' || !PDF_REPO_CONFIG.pdfTreeApiUrl) {
        return { source: 'seed', count: countCatalogPdfs() };
    }

    try {
        const response = await fetch(PDF_REPO_CONFIG.pdfTreeApiUrl, {
            headers: { Accept: 'application/vnd.github+json' }
        });
        if (!response.ok) throw new Error(`GitHub API ${response.status}`);
        const data = await response.json();
        const files = (data.tree || [])
            .filter((item) => item.type === 'blob' && /\.pdf$/i.test(item.path))
            .map((item) => item.path);

        pdfCategories = JSON.parse(JSON.stringify(DEFAULT_PDF_CATEGORIES));
        pdfPathIndex = {};
        files.forEach(mergePdfIntoCatalog);

        // Strip private from public catalog when misc is off
        if (!showMiscResources) {
            Object.keys(pdfCategories).forEach((cat) => {
                pdfCategories[cat] = (pdfCategories[cat] || []).filter((n) => !isPrivatePdf(n));
            });
            if (pdfCategories['Other Resources']) {
                // keep learning misc, drop empties handled by visibleCategories
            }
        }

        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            categories: pdfCategories,
            pathIndex: pdfPathIndex
        }));

        return { source: 'github', count: countCatalogPdfs() };
    } catch (err) {
        console.warn('PDF catalog sync failed, using seed list:', err);
        return { source: 'seed', count: countCatalogPdfs() };
    }
}

function countCatalogPdfs() {
    return Object.values(pdfCategories).reduce((sum, list) => sum + list.length, 0);
}

function setShowMisc(enabled) {
    showMiscResources = !!enabled;
    localStorage.setItem(SHOW_MISC_KEY, showMiscResources ? 'true' : 'false');
    // Force re-sync merge from cache/seed for private visibility
    localStorage.removeItem(CATALOG_CACHE_KEY);
    syncPdfCatalogFromGitHub().then(() => {
        if (currentFilter === 'Other Resources' && !showMiscResources) {
            currentFilter = 'all';
            updateActiveFilterLabel();
        }
        renderCategoryFilters();
        renderSections();
    });
}

function pdfToSlug(pdfName) {
    return normalizeSearchText(String(pdfName).split('/').pop())
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'note';
}

function findPdfBySlug(slug) {
    const wanted = normalizeSearchText(decodeURIComponent(slug).replace(/-/g, ' '));
    if (!wanted) return null;

    let best = null;
    let bestScore = 0;

    Object.keys(pdfCategories).forEach((category) => {
        visiblePdfsInCategory(category).forEach((name) => {
            const cleaned = normalizeSearchText(name);
            const slugClean = pdfToSlug(name).replace(/-/g, ' ');
            let score = 0;
            if (cleaned === wanted || slugClean === wanted) score = 3;
            else if (cleaned.includes(wanted) || wanted.includes(cleaned)) score = 2;
            else if (slugClean.includes(wanted) || wanted.includes(slugClean)) score = 1;
            if (score > bestScore) {
                bestScore = score;
                best = { name, category };
            }
        });
    });

    return best;
}

function getShareablePdfUrl(pdfName) {
    const slug = pdfToSlug(pdfName);
    return `${window.location.origin}${window.location.pathname}#pdf=${encodeURIComponent(slug)}`;
}

function updatePdfHash(pdfName) {
    const slug = pdfToSlug(pdfName);
    const next = `#pdf=${encodeURIComponent(slug)}`;
    if (window.history && window.history.replaceState) {
        window.history.replaceState({ pdfView: true, pdf: pdfName }, '', next);
    } else {
        window.location.hash = next;
    }
}

function clearPdfHash() {
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}

function resolvePdfUrl(pdfName) {
    const path = pdfPathIndex[pdfName] || pdfName;
    return typeof getPDFUrl !== 'undefined' ? getPDFUrl(path) : encodeURIComponent(path);
}

function cachePdfForOffline(pdfName) {
    if (!('serviceWorker' in navigator)) return;
    const url = resolvePdfUrl(pdfName);
    navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'CACHE_PDF', url });
    }).catch(() => {});
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (location.protocol !== 'https:' && !isLocal) return;

    navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
    });
}

async function loadGitHubStarCount() {
    const countEl = document.getElementById('githubStarCount');
    if (!countEl || typeof PDF_REPO_CONFIG === 'undefined') return;
    try {
        const cached = sessionStorage.getItem('ghStarCount');
        if (cached) {
            countEl.textContent = cached;
            return;
        }
        const res = await fetch(PDF_REPO_CONFIG.websiteApiUrl, {
            headers: { Accept: 'application/vnd.github+json' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = data.stargazers_count ?? 0;
        countEl.textContent = String(count);
        sessionStorage.setItem('ghStarCount', String(count));
    } catch (e) {
        /* ignore */
    }
}

function maybePromptGitHubStar() {
    try {
        if (localStorage.getItem('starPromptDismissed') === 'true') return;
        const opens = Number(localStorage.getItem('pdfOpenCount') || '0');
        if (opens < 2) return;
        if (sessionStorage.getItem('starPromptShown') === 'true') return;
        const prompt = document.getElementById('starPrompt');
        if (prompt) {
            prompt.hidden = false;
            sessionStorage.setItem('starPromptShown', 'true');
        }
    } catch (e) {
        /* ignore */
    }
}

function dismissStarPrompt() {
    const prompt = document.getElementById('starPrompt');
    if (prompt) prompt.hidden = true;
    localStorage.setItem('starPromptDismissed', 'true');
}

async function shareCurrentPdf() {
    if (!currentPdfName) return;
    const url = getShareablePdfUrl(currentPdfName);
    const title = currentPdfName.replace(/\.pdf$/i, '');
    try {
        if (navigator.share) {
            await navigator.share({ title, url, text: `DevOps note: ${title}` });
            return;
        }
    } catch (e) {
        if (e?.name === 'AbortError') return;
    }
    try {
        await navigator.clipboard.writeText(url);
        const btn = document.getElementById('sharePdfBtn');
        if (btn) {
            const label = btn.querySelector('span');
            const prev = label?.textContent;
            if (label) label.textContent = 'Copied';
            setTimeout(() => { if (label) label.textContent = prev || 'Share'; }, 1400);
        }
    } catch (e) {
        window.prompt('Copy this link:', url);
    }
}

// Cache management
const CACHE_KEY = 'pdfLibraryCache';
const RECENT_KEY = 'recentPDFs';
const BOOKMARKS_KEY = 'pdfBookmarks';
const PROGRESS_KEY = 'pdfReadingProgress';
const NOTES_KEY = 'pdfPersonalNotes';
const MAX_RECENT = 10;
const MAX_CACHE_SIZE = 50; // Maximum number of thumbnails to cache
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

let thumbnailCache = {};
let totalPDFCount = 0;
let currentFilter = 'all';
let currentView = localStorage.getItem('libraryView') || 'grid';
let currentSort = localStorage.getItem('librarySort') || 'az';
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
        renderContinueReadingStrip();
    } catch (e) {
        console.warn('Failed to save recent PDFs:', e);
    }
}

// ——— Bookmarks ———
function getBookmarks() {
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveBookmarks(list) {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

function isBookmarked(pdfName) {
    return getBookmarks().some(item => item.name === pdfName);
}

function toggleBookmark(pdfName, category, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    let list = getBookmarks();
    if (list.some(item => item.name === pdfName)) {
        list = list.filter(item => item.name !== pdfName);
    } else {
        list.unshift({ name: pdfName, category: category || 'Other Resources', timestamp: Date.now() });
    }
    saveBookmarks(list);
    renderFavorites();
    renderCategoryFilters();
    updateViewerBookmarkBtn();
    // Refresh cards so star state stays in sync
    if (currentFilter === 'favorites') {
        renderSections();
    } else {
        document.querySelectorAll('.pdf-card').forEach(card => {
            if (card.getAttribute('data-pdf') !== pdfName) return;
            const btn = card.querySelector('.card-bookmark');
            if (!btn) return;
            const active = isBookmarked(pdfName);
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            const svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', active ? 'currentColor' : 'none');
        });
    }
}

function toggleCurrentBookmark() {
    if (!currentPdfName) return;
    toggleBookmark(currentPdfName, currentPdfCategory);
}

function updateViewerBookmarkBtn() {
    const btn = document.getElementById('viewerBookmarkBtn');
    const label = document.getElementById('bookmarkBtnText');
    if (!btn || !currentPdfName) return;
    const active = isBookmarked(currentPdfName);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (label) label.textContent = active ? 'Saved' : 'Favorite';
}

function renderFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    const bookmarks = getBookmarks();
    if (bookmarks.length === 0) {
        container.innerHTML = '<p class="empty-state">Star a note to save it here</p>';
        return;
    }

    container.innerHTML = '';
    bookmarks.slice(0, 12).forEach(item => {
        const el = document.createElement('div');
        el.className = 'recent-item favorite-item';
        el.onclick = () => openPDF(item.name, item.category);

        const thumb = thumbnailCache[item.name]?.dataUrl;
        const thumbHtml = thumb
            ? `<img src="${thumb}" alt="" class="recent-thumb">`
            : `<div class="recent-thumb pdf-thumbnail-placeholder" aria-hidden="true"></div>`;

        el.innerHTML = `
            ${thumbHtml}
            <div class="recent-info">
                <div class="recent-name">${item.name.replace('.pdf', '')}</div>
                <div class="recent-time">${item.category}</div>
            </div>
            <button type="button" class="sidebar-star active" title="Remove favorite" aria-label="Remove favorite">★</button>
        `;

        el.querySelector('.sidebar-star').onclick = (e) => toggleBookmark(item.name, item.category, e);
        container.appendChild(el);
    });
}

// ——— Reading progress ———
function getReadingProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveReadingProgress(pdfName, page) {
    if (!pdfName || !page) return;
    try {
        const data = getReadingProgress();
        data[pdfName] = { page: page, timestamp: Date.now() };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save reading progress:', e);
    }
}

function getSavedPage(pdfName) {
    const entry = getReadingProgress()[pdfName];
    return entry && entry.page > 0 ? entry.page : 1;
}

// ——— Personal notes ———
function getAllPersonalNotes() {
    try {
        const raw = localStorage.getItem(NOTES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function getPersonalNote(pdfName) {
    const entry = getAllPersonalNotes()[pdfName];
    return entry && typeof entry.text === 'string' ? entry.text : '';
}

function savePersonalNote(pdfName, text) {
    if (!pdfName) return;
    try {
        const data = getAllPersonalNotes();
        const trimmed = String(text || '').trim();
        if (!trimmed) {
            delete data[pdfName];
        } else {
            data[pdfName] = {
                text: trimmed.slice(0, 2000),
                updatedAt: Date.now(),
                page: currentPage || getSavedPage(pdfName)
            };
        }
        localStorage.setItem(NOTES_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save personal note:', e);
    }
}

let noteSaveTimer = null;

function loadNotePanelForCurrentPdf() {
    const input = document.getElementById('personalNoteInput');
    const status = document.getElementById('noteSaveStatus');
    const toggle = document.getElementById('noteToggleBtn');
    if (!input || !currentPdfName) return;

    input.value = getPersonalNote(currentPdfName);
    if (status) status.textContent = input.value.trim() ? 'Saved on this device' : 'Autosaves';
    if (toggle) toggle.classList.toggle('has-note', !!input.value.trim());
}

function scheduleNoteSave() {
    const input = document.getElementById('personalNoteInput');
    const status = document.getElementById('noteSaveStatus');
    if (!input || !currentPdfName) return;

    if (status) status.textContent = 'Saving…';
    if (noteSaveTimer) clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => {
        savePersonalNote(currentPdfName, input.value);
        if (status) status.textContent = input.value.trim() ? 'Saved' : 'Autosaves';
        const toggle = document.getElementById('noteToggleBtn');
        if (toggle) toggle.classList.toggle('has-note', !!input.value.trim());
        renderContinueReadingStrip();
    }, 400);
}

function setNotePanelOpen(open) {
    const panel = document.getElementById('notePanel');
    const toggle = document.getElementById('noteToggleBtn');
    if (!panel) return;

    panel.hidden = !open;
    panel.classList.toggle('open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
        loadNotePanelForCurrentPdf();
        document.getElementById('personalNoteInput')?.focus();
    }
}

function toggleNotePanel() {
    const panel = document.getElementById('notePanel');
    if (!panel) return;
    setNotePanelOpen(panel.hidden);
}

// ——— Continue reading strip ———
function getContinueReadingItem() {
    const recent = getRecentPDFs();
    if (!recent.length) return null;
    return recent[0];
}

function renderContinueReadingStrip() {
    const strip = document.getElementById('continueReadingStrip');
    const card = document.getElementById('continueReadingCard');
    if (!strip || !card) return;

    const item = getContinueReadingItem();
    if (!item) {
        strip.hidden = true;
        return;
    }

    const page = getSavedPage(item.name);
    const note = getPersonalNote(item.name);
    const title = item.name.replace(/\.pdf$/i, '');
    const thumb = document.getElementById('continueThumb');
    const titleEl = document.getElementById('continueTitle');
    const metaEl = document.getElementById('continueMeta');
    const noteEl = document.getElementById('continueNotePreview');

    if (titleEl) titleEl.textContent = title;
    if (metaEl) {
        const pageLabel = page > 1 ? `Page ${page}` : 'Start from page 1';
        metaEl.textContent = `${item.category || 'Notes'} · ${pageLabel}`;
    }

    if (noteEl) {
        if (note) {
            noteEl.hidden = false;
            noteEl.textContent = note.length > 120 ? `${note.slice(0, 120)}…` : note;
        } else {
            noteEl.hidden = true;
            noteEl.textContent = '';
        }
    }

    if (thumb) {
        const cached = thumbnailCache[item.name]?.dataUrl;
        if (cached) {
            thumb.innerHTML = `<img src="${cached}" alt="">`;
        } else {
            thumb.innerHTML = '<div class="pdf-thumbnail-placeholder" aria-hidden="true"></div>';
        }
    }

    card.onclick = () => openPDF(item.name, item.category);
    strip.hidden = false;
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
        const pdfUrl = resolvePdfUrl(pdfName);
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

    const libraryTotal = visibleCategories().reduce(
        (sum, cat) => sum + visiblePdfsInCategory(cat).length,
        0
    );
    const favCount = getBookmarks().length;

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

    const favBtn = document.createElement('button');
    favBtn.className = `filter-btn ${currentFilter === 'favorites' ? 'active' : ''}`;
    favBtn.setAttribute('role', 'option');
    favBtn.setAttribute('aria-selected', currentFilter === 'favorites' ? 'true' : 'false');
    favBtn.innerHTML = `
        <span>Favorites</span>
        <span class="filter-count">${favCount}</span>
    `;
    favBtn.onclick = () => setFilter('favorites');
    filtersContainer.appendChild(favBtn);

    visibleCategories().forEach(category => {
        const count = visiblePdfsInCategory(category).length;
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

    const miscBtn = document.createElement('button');
    miscBtn.className = `filter-btn misc-toggle ${showMiscResources ? 'active' : ''}`;
    miscBtn.type = 'button';
    miscBtn.innerHTML = `<span>${showMiscResources ? 'Hide misc' : 'Show misc'}</span>`;
    miscBtn.title = 'Show or hide personal / misc files';
    miscBtn.onclick = () => setShowMisc(!showMiscResources);
    filtersContainer.appendChild(miscBtn);

    renderCategoryChips();
}

function renderCategoryChips() {
    const chips = document.getElementById('categoryChips');
    if (!chips) return;

    const libraryTotal = visibleCategories().reduce(
        (sum, cat) => sum + visiblePdfsInCategory(cat).length,
        0
    );
    const favCount = getBookmarks().length;
    chips.innerHTML = '';

    const makeChip = (id, label, count) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `category-chip ${currentFilter === id ? 'active' : ''}`;
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', currentFilter === id ? 'true' : 'false');
        btn.innerHTML = `<span>${label}</span>${count !== null ? `<span class="chip-count">${count}</span>` : ''}`;
        btn.onclick = () => setFilter(id);
        chips.appendChild(btn);
    };

    makeChip('all', 'All', libraryTotal);
    makeChip('favorites', 'Favorites', favCount);
    visibleCategories().forEach(category => {
        makeChip(category, category, visiblePdfsInCategory(category).length);
    });
}

// Normalize titles for forgiving search (ignore .pdf / punctuation / accents)
// Fold mathematical / styled Unicode letters into plain ASCII when possible
function foldStyledLetters(text) {
    return String(text || '').replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
        const cp = ch.codePointAt(0);
        const ranges = [
            [0x1D400, 26, 65],  // bold A-Z
            [0x1D41A, 26, 97],  // bold a-z
            [0x1D434, 26, 65],  // italic A-Z
            [0x1D44E, 26, 97],  // italic a-z
            [0x1D468, 26, 65],  // bold italic A-Z
            [0x1D482, 26, 97],  // bold italic a-z
            [0x1D5A0, 26, 65],  // sans A-Z
            [0x1D5BA, 26, 97],  // sans a-z
            [0x1D5D4, 26, 65],  // sans bold A-Z
            [0x1D5EE, 26, 97],  // sans bold a-z
            [0x1D608, 26, 65],  // sans italic A-Z
            [0x1D622, 26, 97],  // sans italic a-z
            [0x1D63C, 26, 65],  // sans bold italic A-Z
            [0x1D656, 26, 97],  // sans bold italic a-z
            [0x1D56C, 26, 65],  // bold fraktur A-Z
            [0x1D586, 26, 97],  // bold fraktur a-z
        ];
        for (const [start, len, base] of ranges) {
            if (cp >= start && cp < start + len) {
                return String.fromCharCode(base + (cp - start));
            }
        }
        return ' ';
    });
}

function normalizeSearchText(text) {
    return foldStyledLetters(String(text || ''))
        .toLowerCase()
        .normalize('NFKC')
        .replace(/\.pdf$/gi, '')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesSearch(haystacks, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query) return true;
    const tokens = query.split(' ').filter(Boolean);
    const haystack = normalizeSearchText(Array.isArray(haystacks) ? haystacks.join(' ') : haystacks);
    return tokens.every(token => haystack.includes(token));
}

function getRecentTimestampMap() {
    const map = {};
    getRecentPDFs().forEach((item, index) => {
        map[item.name] = item.timestamp || (Date.now() - index);
    });
    // Also consider reading progress timestamps as weak recency
    const progress = getReadingProgress();
    Object.keys(progress).forEach(name => {
        const ts = progress[name]?.timestamp || 0;
        if (!map[name] || ts > map[name]) map[name] = ts;
    });
    return map;
}

function sortPdfItems(items) {
    const recentMap = getRecentTimestampMap();
    const cloned = [...items];

    if (currentSort === 'recent') {
        cloned.sort((a, b) => {
            const tb = recentMap[b.name] || 0;
            const ta = recentMap[a.name] || 0;
            if (tb !== ta) return tb - ta;
            return normalizeSearchText(a.name).localeCompare(normalizeSearchText(b.name));
        });
    } else {
        // A–Z (default) and category-size both sort titles A–Z inside a section
        cloned.sort((a, b) =>
            normalizeSearchText(a.name).localeCompare(normalizeSearchText(b.name))
        );
    }
    return cloned;
}

function sortCategories(categoryNames) {
    const recentMap = getRecentTimestampMap();
    const cloned = [...categoryNames];

    if (currentSort === 'size') {
        cloned.sort((a, b) => {
            const sizeDiff = visiblePdfsInCategory(b).length - visiblePdfsInCategory(a).length;
            if (sizeDiff !== 0) return sizeDiff;
            return a.localeCompare(b);
        });
    } else if (currentSort === 'recent') {
        cloned.sort((a, b) => {
            const maxRecent = (cat) => {
                const pdfs = visiblePdfsInCategory(cat);
                return pdfs.reduce((best, name) => Math.max(best, recentMap[name] || 0), 0);
            };
            const diff = maxRecent(b) - maxRecent(a);
            if (diff !== 0) return diff;
            return a.localeCompare(b);
        });
    } else {
        cloned.sort((a, b) => a.localeCompare(b));
    }
    return cloned;
}

function setSortMode(mode) {
    const allowed = ['az', 'recent', 'size'];
    currentSort = allowed.includes(mode) ? mode : 'az';
    localStorage.setItem('librarySort', currentSort);
    const select = document.getElementById('sortSelect');
    if (select && select.value !== currentSort) select.value = currentSort;
    renderSections();
}

// Set filter
function setFilter(category) {
    currentFilter = category;
    updateActiveFilterLabel();
    renderCategoryFilters();
    renderSections();
    closeMobileMenu();

    // Keep active chip in view on mobile
    const activeChip = document.querySelector('.category-chip.active');
    if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function updateActiveFilterLabel() {
    const label = document.getElementById('activeFilterLabel');
    if (!label) return;
    if (currentFilter === 'all') label.textContent = 'All categories';
    else if (currentFilter === 'favorites') label.textContent = 'Favorites';
    else label.textContent = currentFilter;
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

    const searchTerm = document.getElementById('searchInput')?.value || '';
    let cardIndex = 0;

    let categories;
    if (currentFilter === 'favorites') {
        categories = ['Favorites'];
    } else if (currentFilter === 'all') {
        categories = sortCategories(visibleCategories());
    } else {
        categories = [currentFilter];
    }

    categories.forEach((category, sectionIndex) => {
        let filteredPDFs;
        let displayCategory = category;

        if (currentFilter === 'favorites') {
            filteredPDFs = getBookmarks()
                .filter(item => matchesSearch([item.name, item.category || ''], searchTerm))
                .map(item => ({ name: item.name, category: item.category }));
            displayCategory = 'Favorites';
        } else {
            const pdfs = visiblePdfsInCategory(category);
            if (pdfs.length === 0) return;
            filteredPDFs = pdfs
                .filter(pdf => matchesSearch([pdf, category], searchTerm))
                .map(name => ({ name, category }));
        }

        filteredPDFs = sortPdfItems(filteredPDFs);

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
            ${displayCategory}
            <span class="section-count">${filteredPDFs.length}</span>
        `;

        sectionHeader.appendChild(sectionTitle);

        const pdfGrid = document.createElement('div');
        pdfGrid.className = 'pdf-grid';

        filteredPDFs.forEach(item => {
            const pdfName = item.name;
            const itemCategory = item.category;
            const bookmarked = isBookmarked(pdfName);
            const savedPage = getSavedPage(pdfName);
            const hasNote = !!getPersonalNote(pdfName);

            const pdfCard = document.createElement('article');
            pdfCard.className = 'pdf-card';
            pdfCard.setAttribute('data-pdf', pdfName);
            pdfCard.setAttribute('tabindex', '0');
            pdfCard.setAttribute('role', 'button');
            pdfCard.setAttribute('aria-label', `Open ${pdfName.replace('.pdf', '')}`);
            pdfCard.style.animationDelay = `${Math.min(cardIndex, 20) * 25}ms`;
            cardIndex += 1;
            pdfCard.onclick = () => openPDF(pdfName, itemCategory);
            pdfCard.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPDF(pdfName, itemCategory);
                }
            };

            const progressHint = savedPage > 1
                ? `<div class="pdf-progress">Resume p.${savedPage}</div>`
                : '';
            const noteHint = hasNote
                ? `<div class="pdf-note-badge" title="Has a personal note">Note</div>`
                : '';

            pdfCard.innerHTML = `
                <button type="button" class="card-bookmark ${bookmarked ? 'active' : ''}" aria-label="Toggle favorite" aria-pressed="${bookmarked}" title="Favorite">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                ${noteHint}
                <div class="pdf-thumbnail">
                    ${PLACEHOLDER_SVG}
                </div>
                <div class="pdf-info">
                    <div class="pdf-name">${pdfName.replace('.pdf', '')}</div>
                    <div class="pdf-category">${itemCategory}</div>
                    ${progressHint}
                </div>
            `;

            pdfCard.querySelector('.card-bookmark').onclick = (e) => toggleBookmark(pdfName, itemCategory, e);
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
let currentPdfName = null;
let currentPdfCategory = null;
let currentPage = 1;
let totalPages = 0;
let pdfOutline = null;
let pageCanvases = [];
let pageTrackRaf = null;
let pageTrackBound = false;
let fitScale = 1;
let zoomFactor = 1;
let isRenderingPages = false;
let progressSaveTimer = null;
let restorePageAfterRender = 1;

function updateZoomLabel() {
    const label = document.getElementById('zoomLevelLabel');
    if (label) label.textContent = `${Math.round(zoomFactor * 100)}%`;

    const zoomOut = document.getElementById('zoomOutBtn');
    const zoomIn = document.getElementById('zoomInBtn');
    if (zoomOut) zoomOut.disabled = zoomFactor <= ZOOM_MIN + 0.001;
    if (zoomIn) zoomIn.disabled = zoomFactor >= ZOOM_MAX - 0.001;
}

function setZoomControlsVisible(show) {
    const jump = document.getElementById('pageJump');
    const zoom = document.getElementById('zoomControls');
    if (jump) jump.classList.toggle('visible', show);
    if (zoom) zoom.classList.toggle('visible', show);
}

function updatePageIndicator(page) {
    if (page && page >= 1) {
        currentPage = Math.min(page, totalPages || page);
    }

    const jumpInput = document.getElementById('pageJumpInput');
    const totalEl = document.getElementById('totalPageNum');
    const floatCurrent = document.getElementById('floatCurrentPage');
    const floatTotal = document.getElementById('floatTotalPage');
    const floatIndicator = document.getElementById('pageIndicatorFloat');

    const cur = String(currentPage || 1);
    const tot = String(totalPages || 1);

    if (jumpInput && document.activeElement !== jumpInput) {
        jumpInput.value = cur;
        jumpInput.max = String(totalPages || 1);
    }
    if (totalEl) totalEl.textContent = tot;
    if (floatCurrent) floatCurrent.textContent = cur;
    if (floatTotal) floatTotal.textContent = tot;

    const show = totalPages > 0;
    if (floatIndicator) floatIndicator.classList.toggle('visible', show);
    setZoomControlsVisible(show);

    if (currentPdfName && currentPage > 0) {
        if (progressSaveTimer) clearTimeout(progressSaveTimer);
        progressSaveTimer = setTimeout(() => {
            saveReadingProgress(currentPdfName, currentPage);
        }, 400);
    }
}

function jumpToPageFromInput() {
    const input = document.getElementById('pageJumpInput');
    if (!input || !totalPages) return;
    let page = parseInt(input.value, 10);
    if (Number.isNaN(page)) page = 1;
    page = Math.max(1, Math.min(totalPages, page));
    input.value = String(page);
    scrollToPage(page);
}

async function changeZoom(delta) {
    const next = Math.round((zoomFactor + delta) * 100) / 100;
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    if (Math.abs(clamped - zoomFactor) < 0.001) return;
    zoomFactor = clamped;
    updateZoomLabel();
    restorePageAfterRender = currentPage || 1;
    await renderAllPages();
    setTimeout(() => scrollToPage(restorePageAfterRender), 60);
}

async function fitZoomWidth() {
    zoomFactor = 1;
    updateZoomLabel();
    restorePageAfterRender = currentPage || 1;
    await renderAllPages();
    setTimeout(() => scrollToPage(restorePageAfterRender), 60);
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

    // Don't force page 1 — keep restored / current page
    setTimeout(() => updatePageIndicator(getVisiblePageNumber()), 50);
}

function teardownPageTracking() {
    updatePageIndicator(1);
    const floatIndicator = document.getElementById('pageIndicatorFloat');
    if (floatIndicator) floatIndicator.classList.remove('visible');
    setZoomControlsVisible(false);
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
    
    closeMobileMenu();
    
    currentPdfName = pdfName;
    currentPdfCategory = category;
    currentPage = 1;
    zoomFactor = 1;
    updateZoomLabel();
    updateViewerBookmarkBtn();
    setNotePanelOpen(false);
    loadNotePanelForCurrentPdf();
    
    if (pdfTitle) pdfTitle.textContent = pdfName.replace('.pdf', '');
    if (pdfCategory) pdfCategory.textContent = category;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    updatePdfHash(pdfName);
    
    if (pdfLoading) {
        pdfLoading.style.display = 'flex';
        pdfLoading.innerHTML = `
            <div class="spinner"></div>
            <p>Loading PDF…</p>
        `;
    }
    if (pdfCanvas) pdfCanvas.style.display = 'none';
    
    const pdfUrl = resolvePdfUrl(pdfName);
    
    try {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }
        
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
        });
        
        currentPDF = await loadingTask.promise;
        totalPages = currentPDF.numPages;

        const savedPage = Math.min(getSavedPage(pdfName), totalPages);
        restorePageAfterRender = savedPage;
        updatePageIndicator(savedPage);
        
        try {
            pdfOutline = await currentPDF.getOutline();
            if (pdfOutline && pdfOutline.length > 0) {
                renderTOC(pdfOutline);
            } else {
                createPageBasedTOC();
            }
        } catch (error) {
            createPageBasedTOC();
        }
        
        await renderAllPages();
        
        const loadingAfter = document.getElementById('pdfLoading');
        if (loadingAfter) loadingAfter.style.display = 'none';
        
        setTimeout(() => {
            setupPageTracking();
            setupHeaderScrollBehavior();
            if (restorePageAfterRender > 1) {
                scrollToPage(restorePageAfterRender);
            }
            updatePageIndicator(restorePageAfterRender);
        }, 120);
        
        addToRecent(pdfName, category);
        cachePdfForOffline(pdfName);
        try {
            const opens = Number(localStorage.getItem('pdfOpenCount') || '0') + 1;
            localStorage.setItem('pdfOpenCount', String(opens));
        } catch (e) { /* ignore */ }
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        const loadingEl = document.getElementById('pdfLoading');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            loadingEl.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary);">
                    <p style="font-size: 1.2em; margin-bottom: 0.5rem;">Failed to load PDF</p>
                    <p style="font-size: 0.9em;">${error.message}</p>
                    <p style="font-size: 0.85em; margin-top: 1rem; opacity: 0.7;">The PDF may be too large or the URL is incorrect.</p>
                </div>
            `;
        }
    }
}

// Render all PDF pages
async function renderAllPages() {
    if (!currentPDF || totalPages === 0 || isRenderingPages) return;
    isRenderingPages = true;
    
    const canvasContainer = document.getElementById('pdfCanvasContainer');
    pageCanvases = [];
    
    canvasContainer.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'pdf-loading';
    loading.id = 'pdfLoading';
    loading.innerHTML = `
        <div class="spinner"></div>
        <p id="pdfLoadProgress">Preparing…</p>
    `;
    canvasContainer.appendChild(loading);
    
    const dpr = window.devicePixelRatio || 1;
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const containerWidth = canvasContainer.clientWidth || window.innerWidth - 40;
    const firstPage = await currentPDF.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.0 });
    fitScale = Math.min(containerWidth / viewport.width, 2.5);
    const scale = fitScale * zoomFactor;
    
    try {
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (!currentPDF) break;
            const progressEl = document.getElementById('pdfLoadProgress');
            if (progressEl) {
                progressEl.textContent = `Loading page ${pageNum} of ${totalPages}…`;
            }
            const page = await currentPDF.getPage(pageNum);
            const scaledViewport = page.getViewport({ scale: scale });
            
            const pageCanvas = document.createElement('canvas');
            pageCanvas.className = 'pdf-page-canvas';
            pageCanvas.setAttribute('data-page', pageNum);
            pageCanvas.id = `pdf-page-${pageNum}`;
            
            pageCanvas.width = scaledViewport.width * dpr;
            pageCanvas.height = scaledViewport.height * dpr;
            pageCanvas.style.width = scaledViewport.width + 'px';
            pageCanvas.style.height = scaledViewport.height + 'px';
            
            const context = pageCanvas.getContext('2d');
            context.scale(dpr, dpr);
            
            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;
            
            canvasContainer.appendChild(pageCanvas);
            pageCanvases.push(pageCanvas);
        }
        
    } catch (error) {
        console.error('Error rendering pages:', error);
    } finally {
        loading.style.display = 'none';
        isRenderingPages = false;
        updateZoomLabel();
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
    
    clearPdfHash();
    setNotePanelOpen(false);
    
    // Clear PDF
    if (currentPdfName && currentPage > 0) {
        saveReadingProgress(currentPdfName, currentPage);
        const noteInput = document.getElementById('personalNoteInput');
        if (noteInput) savePersonalNote(currentPdfName, noteInput.value);
    }
    currentPDF = null;
    currentPdfName = null;
    currentPdfCategory = null;
    currentPage = 1;
    totalPages = 0;
    pdfOutline = null;
    pageCanvases = [];
    zoomFactor = 1;
    teardownPageTracking();
    
    // Clear canvas container
    const canvasContainer = document.getElementById('pdfCanvasContainer');
    if (canvasContainer) {
        canvasContainer.innerHTML = `
            <div class="pdf-loading" id="pdfLoading">
                <div class="spinner"></div>
                <p>Loading PDF…</p>
            </div>
        `;
    }

    // Refresh cards so resume hints update
    renderSections();
    renderFavorites();
    renderContinueReadingStrip();
    maybePromptGitHubStar();
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
    const initApp = async () => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        registerServiceWorker();
        initCache();
        initTheme();
        await syncPdfCatalogFromGitHub();

        setViewMode(currentView);
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = currentSort;
        currentSort = ['az', 'recent', 'size'].includes(currentSort) ? currentSort : 'az';

        updateActiveFilterLabel();
        renderCategoryFilters();
        renderSections();
        renderRecentPDFs();
        renderFavorites();
        renderContinueReadingStrip();
        setupHeaderScroll();
        updateZoomLabel();
        loadGitHubStarCount();

        document.querySelectorAll('[data-github-star]').forEach((el) => {
            if (typeof PDF_REPO_CONFIG !== 'undefined') {
                el.href = PDF_REPO_CONFIG.websiteUrl;
            }
        });
        const dismissStar = document.getElementById('dismissStarPrompt');
        if (dismissStar) dismissStar.addEventListener('click', dismissStarPrompt);

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);

        const viewGrid = document.getElementById('viewGrid');
        const viewList = document.getElementById('viewList');
        if (viewGrid) viewGrid.addEventListener('click', () => setViewMode('grid'));
        if (viewList) viewList.addEventListener('click', () => setViewMode('list'));

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => setSortMode(e.target.value));
        }

        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomFitBtn = document.getElementById('zoomFitBtn');
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => changeZoom(ZOOM_STEP));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => changeZoom(-ZOOM_STEP));
        if (zoomFitBtn) zoomFitBtn.addEventListener('click', () => fitZoomWidth());

        const sharePdfBtn = document.getElementById('sharePdfBtn');
        if (sharePdfBtn) sharePdfBtn.addEventListener('click', shareCurrentPdf);

        const noteToggleBtn = document.getElementById('noteToggleBtn');
        if (noteToggleBtn) noteToggleBtn.addEventListener('click', toggleNotePanel);
        const notePanelClose = document.getElementById('notePanelClose');
        if (notePanelClose) notePanelClose.addEventListener('click', () => setNotePanelOpen(false));
        const personalNoteInput = document.getElementById('personalNoteInput');
        if (personalNoteInput) personalNoteInput.addEventListener('input', scheduleNoteSave);
        const clearNoteBtn = document.getElementById('clearNoteBtn');
        if (clearNoteBtn) {
            clearNoteBtn.addEventListener('click', () => {
                const input = document.getElementById('personalNoteInput');
                if (!input || !currentPdfName) return;
                input.value = '';
                savePersonalNote(currentPdfName, '');
                const status = document.getElementById('noteSaveStatus');
                if (status) status.textContent = 'Cleared';
                noteToggleBtn?.classList.remove('has-note');
                renderContinueReadingStrip();
            });
        }

        const pageJumpInput = document.getElementById('pageJumpInput');
        if (pageJumpInput) {
            pageJumpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    jumpToPageFromInput();
                    pageJumpInput.blur();
                }
            });
            pageJumpInput.addEventListener('change', jumpToPageFromInput);
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.filter-btn') || e.target.closest('.recent-item') || e.target.closest('.favorite-item')) {
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
        if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);

        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

        const openFromHash = () => {
            const hash = window.location.hash || '';
            const match = hash.match(/^#pdf(?:=(.+))?$/i);
            if (!match || !match[1]) return;
            const found = findPdfBySlug(match[1]);
            if (found) openPDF(found.name, found.category);
        };

        window.addEventListener('hashchange', openFromHash);
        window.addEventListener('popstate', () => {
            const modal = document.getElementById('pdfModal');
            const hash = window.location.hash || '';
            if (/^#pdf=/i.test(hash)) {
                openFromHash();
                return;
            }
            if (modal && modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
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
                    const notePanel = document.getElementById('notePanel');
                    if (notePanel && !notePanel.hidden) {
                        setNotePanelOpen(false);
                    } else {
                        closePDF();
                    }
                }
                return;
            }

            if (!modalOpen && !typing && e.key === '/') {
                e.preventDefault();
                searchInput?.focus();
                searchInput?.select();
            }

            if (!modalOpen && e.key === 'Escape') {
                closeMobileMenu();
                if (document.getElementById('searchInput')?.value) clearSearch();
            }
        });

        openFromHash();
    };

    if (typeof pdfjsLib !== 'undefined') {
        initApp();
    } else {
        setTimeout(() => initApp(), 100);
    }
});

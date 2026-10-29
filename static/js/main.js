/**
 * InstaDown Client-side Controller
 * Features: Metadata fetching, Direct media download, Clipboard paste,
 * Cookie consent management, Event analytics, and Toast feedback.
 */

// ─── STATE MANAGEMENT ──────────────────────────────────────────
let currentPost = null;
let isFetching = false;
let isDownloading = false;

// ─── DOM ELEMENTS ──────────────────────────────────────────────
const urlInput     = document.getElementById('url-input');
const fetchBtn     = document.getElementById('fetch-btn');
const errorArea    = document.getElementById('error-area');
const resultPanel  = document.getElementById('result-panel');
const thumb        = document.getElementById('thumb');
const mediaBadge   = document.getElementById('media-badge');
const typeLabel    = document.getElementById('media-type-label');
const ownerName    = document.getElementById('owner-name');
const captionTxt   = document.getElementById('caption-text');
const likesCount   = document.getElementById('likes-count');
const qualityLabel = document.getElementById('quality-label');
const downloadBtn  = document.getElementById('download-btn');
const progressWrap = document.getElementById('progress-wrap');
const progressBar  = document.getElementById('progress-bar');
const cookieBanner = document.getElementById('cookie-banner');

// ─── INITIALIZATION ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent();

  // Enter key trigger on input
  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchInfo();
      }
    });

    // Auto-clear error when user types
    urlInput.addEventListener('input', () => {
      clearError();
    });
  }
});

// ─── ANALYTICS DISPATCHER ──────────────────────────────────────
function trackEvent(eventName, eventParams = {}) {
  const consent = localStorage.getItem('instadown_cookie_consent');
  if (consent === 'accepted' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

// ─── COOKIE CONSENT BANNER ─────────────────────────────────────
function initCookieConsent() {
  if (!cookieBanner) return;
  const consent = localStorage.getItem('instadown_cookie_consent');
  if (!consent) {
    cookieBanner.style.display = 'flex';
  } else {
    cookieBanner.style.display = 'none';
  }
}

function acceptAllCookies() {
  localStorage.setItem('instadown_cookie_consent', 'accepted');
  if (cookieBanner) cookieBanner.style.display = 'none';
  trackEvent('cookie_consent', { status: 'accepted' });
  showToast('Preferences saved: Cookies accepted');
}

function declineNonEssentialCookies() {
  localStorage.setItem('instadown_cookie_consent', 'essential');
  if (cookieBanner) cookieBanner.style.display = 'none';
  trackEvent('cookie_consent', { status: 'essential_only' });
  showToast('Preferences saved: Essential cookies only');
}

// ─── CLIPBOARD PASTE CTA ───────────────────────────────────────
async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      if (urlInput) {
        urlInput.focus();
        showToast('Please press Ctrl+V / Cmd+V to paste URL');
      }
      return;
    }

    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      showToast('Clipboard is empty. Copy an Instagram URL first!');
      return;
    }

    if (urlInput) {
      urlInput.value = text.trim();
      clearError();
      fetchInfo();
    }
  } catch (err) {
    if (urlInput) {
      urlInput.focus();
      showToast('Click and press Ctrl+V / Cmd+V to paste');
    }
  }
}

// ─── FETCH POST INFO ───────────────────────────────────────────
async function fetchInfo() {
  if (isFetching || !urlInput) return;
  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    showError('Please paste an Instagram Reel or Post link first.');
    urlInput.focus();
    return;
  }

  // Basic sanity check for Instagram URL
  if (!rawUrl.includes('instagram.com/')) {
    showError('Invalid URL format. Please paste a link from instagram.com (e.g. /reel/ or /p/).');
    return;
  }

  isFetching = true;
  clearError();
  hideResult();

  fetchBtn.disabled = true;
  fetchBtn.innerHTML = `
    <span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
    <span>Fetching...</span>
  `;

  trackEvent('fetch_started', { url_domain: 'instagram.com' });

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ url: rawUrl })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Failed to fetch details. Please verify the URL.');
      trackEvent('fetch_error', { error: data.error });
      return;
    }

    currentPost = data;
    renderResult(data);
    trackEvent('fetch_success', { media_type: data.media_type, shortcode: data.shortcode });

  } catch (err) {
    showError('Network error connecting to the server. Please check your connection.');
    trackEvent('fetch_network_error', { error: String(err) });
  } finally {
    isFetching = false;
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span>Fetch Media</span>
    `;
  }
}

// ─── RENDER RESULT ─────────────────────────────────────────────
function renderResult(d) {
  if (!resultPanel) return;

  // Image Lazy Loading & Accessible Alt Text
  if (thumb) {
    thumb.src = d.thumbnail || '';
    thumb.alt = `Instagram preview thumbnail for @${d.owner || 'user'}`;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
  }

  if (ownerName) ownerName.textContent = '@' + (d.owner || 'instagram_user');
  if (captionTxt) captionTxt.textContent = d.caption ? d.caption : '(No caption provided)';
  if (likesCount) likesCount.textContent = (typeof d.likes === 'number') ? d.likes.toLocaleString() : '—';

  const mt = d.media_type;
  if (mt === 'video') {
    if (typeLabel) typeLabel.textContent = 'Reel / Video';
    if (qualityLabel) qualityLabel.textContent = 'Original HD MP4';
  } else if (mt === 'carousel') {
    if (typeLabel) typeLabel.textContent = 'Carousel';
    if (qualityLabel) qualityLabel.textContent = 'Multi-image Post';
  } else {
    if (typeLabel) typeLabel.textContent = 'Photo Post';
    if (qualityLabel) qualityLabel.textContent = 'High-res JPG';
  }

  resultPanel.style.display = 'block';
  if (progressWrap) progressWrap.style.display = 'none';

  resetDownloadBtn();
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── DOWNLOAD HANDLER ──────────────────────────────────────────
async function startDownload() {
  if (isDownloading || !currentPost || !downloadBtn) return;
  isDownloading = true;

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `
    <span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
    <span>Downloading & Streaming...</span>
  `;

  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';

  let prog = 0;
  const ticker = setInterval(() => {
    prog = Math.min(prog + Math.random() * 9, 88);
    if (progressBar) progressBar.style.width = prog + '%';
  }, 220);

  trackEvent('download_started', { shortcode: currentPost.shortcode, is_video: currentPost.is_video });

  try {
    const resp = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ url: urlInput.value.trim() })
    });

    clearInterval(ticker);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Download failed' }));
      showError(err.error || 'Server error during download process.');
      trackEvent('download_error', { error: err.error });
      resetDownloadBtn();
      return;
    }

    if (progressBar) progressBar.style.width = '100%';

    // Extract filename from header or build from shortcode
    const contentDisposition = resp.headers.get('Content-Disposition') || '';
    let filename = `instadown_${currentPost.shortcode}.${currentPost.is_video ? 'mp4' : 'jpg'}`;
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);

    trackEvent('download_success', { shortcode: currentPost.shortcode, filename });
    showToast('Download started successfully!');

    setTimeout(() => {
      if (progressBar) progressBar.style.width = '0%';
      if (progressWrap) progressWrap.style.display = 'none';
      resetDownloadBtn();
    }, 1500);

  } catch (err) {
    clearInterval(ticker);
    showError('Download request interrupted. Please verify connection and retry.');
    trackEvent('download_network_error', { error: String(err) });
    resetDownloadBtn();
  } finally {
    isDownloading = false;
  }
}

function resetDownloadBtn() {
  if (!downloadBtn) return;
  downloadBtn.disabled = false;
  downloadBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    <span>Download High Quality Media</span>
  `;
}

// ─── UI FEEDBACK ───────────────────────────────────────────────
function showError(msg) {
  if (!errorArea) return;
  errorArea.innerHTML = `
    <div class="error-box" role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${escapeHtml(msg)}</span>
    </div>
  `;
  errorArea.style.display = 'block';
}

function clearError() {
  if (errorArea) {
    errorArea.innerHTML = '';
    errorArea.style.display = 'none';
  }
}

function hideResult() {
  if (resultPanel) resultPanel.style.display = 'none';
  currentPost = null;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${escapeHtml(msg)}</span>
  `;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('hide');
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

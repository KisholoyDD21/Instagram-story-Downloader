/**
 * InstaDown Advanced Client Controller v1.2
 * Features:
 * - Dynamic interactive cursor glow & ambient light
 * - Mode selection tabs (Reels, Photos, Audio MP3, Stories)
 * - Smart input with auto-paste, instant clear, and keyboard cues
 * - In-browser inline video player preview
 * - Multi-slide carousel album inspector & ZIP download
 * - Background audio extraction (MP3)
 * - Desktop-to-mobile QR code transfer modal (with guaranteed modal isolation)
 * - Client-side private Recent Downloads History drawer
 * - Native Web Share API & clipboard helpers
 * - Cookie consent management & analytics dispatcher
 */

// ─── STATE MANAGEMENT ──────────────────────────────────────────
let currentPost = null;
let currentTab = 'reels';
let isFetching = false;
let isDownloading = false;

// ─── DOM ELEMENTS ──────────────────────────────────────────────
const urlInput          = document.getElementById('url-input');
const inputClearBtn     = document.getElementById('btn-input-clear');
const inputLabelText    = document.getElementById('input-label-text');
const hintText          = document.getElementById('hint-text');
const fetchBtn          = document.getElementById('fetch-btn');
const errorArea         = document.getElementById('error-area');
const skeletonLoader    = document.getElementById('skeleton-loader');
const resultPanel       = document.getElementById('result-panel');

// Media Preview Elements
const thumbPreviewWrap  = document.getElementById('thumb-preview-wrap');
const videoPlayerWrap   = document.getElementById('video-player-wrap');
const inlineVideoPlayer = document.getElementById('inline-video-player');
const thumb             = document.getElementById('thumb');
const playPreviewBtn    = document.getElementById('play-preview-btn');
const mediaBadge        = document.getElementById('media-badge');
const typeLabel         = document.getElementById('media-type-label');
const ownerName         = document.getElementById('owner-name');
const captionTxt        = document.getElementById('caption-text');
const likesCount        = document.getElementById('likes-count');
const qualityLabel      = document.getElementById('quality-label');

// Action Buttons & Progress
const downloadBtn       = document.getElementById('download-btn');
const downloadBtnText   = document.getElementById('download-btn-text');
const btnAudioExtract   = document.getElementById('btn-audio-extract');
const progressWrap      = document.getElementById('progress-wrap');
const progressBar       = document.getElementById('progress-bar');

// Carousel Elements
const carouselInspector = document.getElementById('carousel-inspector');
const carouselStrip     = document.getElementById('carousel-slides-strip');
const slideCountBadge   = document.getElementById('slide-count-badge');
const storiesGuideCard  = document.getElementById('stories-guide-card');

// Modals & Drawers
const historyDrawer     = document.getElementById('history-drawer');
const drawerOverlay     = document.getElementById('drawer-overlay');
const historyList       = document.getElementById('history-list');
const historyCounter    = document.getElementById('history-counter');
const qrModalOverlay    = document.getElementById('qr-modal-overlay');
const qrCanvasContainer = document.getElementById('qr-canvas-container');
const cookieBanner      = document.getElementById('cookie-banner');
const cursorGlow        = document.getElementById('cursor-glow');

// ─── INITIALIZATION ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent();
  initCursorGlow();
  initHistoryTray();

  // Smart input listeners
  if (urlInput) {
    urlInput.addEventListener('input', () => {
      toggleClearButton();
      clearError();
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchInfo();
      }
    });

    // Auto-detect Instagram URL on paste
    urlInput.addEventListener('paste', () => {
      setTimeout(() => {
        toggleClearButton();
        if (urlInput.value.includes('instagram.com/')) {
          fetchInfo();
        }
      }, 50);
    });
  }
});

// ─── INTERACTIVE CURSOR GLOW ───────────────────────────────────
function initCursorGlow() {
  if (!cursorGlow || window.innerWidth < 768) return;

  window.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => {
    cursorGlow.style.opacity = '0';
  });
}

// ─── TAB SWITCHER ──────────────────────────────────────────────
function switchMediaTab(tabId, tabButton) {
  currentTab = tabId;

  // Update tab buttons active state
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (tabButton) tabButton.classList.add('active');

  // Adjust input copy & guidance
  if (tabId === 'reels') {
    if (inputLabelText) inputLabelText.textContent = 'Paste Instagram Reel or Video Link';
    if (urlInput) urlInput.placeholder = 'https://www.instagram.com/reel/C-...';
    if (hintText) hintText.innerHTML = 'Supports: <strong>/reel/</strong> · <strong>/tv/</strong> (Public videos only)';
    if (storiesGuideCard) storiesGuideCard.style.display = 'none';
  } else if (tabId === 'photos') {
    if (inputLabelText) inputLabelText.textContent = 'Paste Instagram Photo or Carousel Link';
    if (urlInput) urlInput.placeholder = 'https://www.instagram.com/p/C-...';
    if (hintText) hintText.innerHTML = 'Supports: <strong>/p/</strong> (Single images & multi-slide albums)';
    if (storiesGuideCard) storiesGuideCard.style.display = 'none';
  } else if (tabId === 'audio') {
    if (inputLabelText) inputLabelText.textContent = 'Paste Reel Link to Extract Background Audio (MP3)';
    if (urlInput) urlInput.placeholder = 'https://www.instagram.com/reel/C-...';
    if (hintText) hintText.innerHTML = 'Converts background song / sound to <strong>high-quality MP3</strong>';
    if (storiesGuideCard) storiesGuideCard.style.display = 'none';
  } else if (tabId === 'stories') {
    if (inputLabelText) inputLabelText.textContent = 'Paste Public Story or Highlight Link';
    if (urlInput) urlInput.placeholder = 'https://www.instagram.com/stories/...';
    if (hintText) hintText.innerHTML = 'Public stories & highlights only · User login not required';
    if (storiesGuideCard) storiesGuideCard.style.display = 'block';
  }

  if (urlInput) urlInput.focus();
}

// ─── SMART INPUT HELPERS ───────────────────────────────────────
function toggleClearButton() {
  if (!inputClearBtn || !urlInput) return;
  inputClearBtn.style.display = urlInput.value.length > 0 ? 'flex' : 'none';
}

function clearInput() {
  if (!urlInput) return;
  urlInput.value = '';
  toggleClearButton();
  clearError();
  hideResult();
  urlInput.focus();
}

async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      if (urlInput) {
        urlInput.focus();
        showToast('Press Ctrl+V / Cmd+V to paste URL');
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
      toggleClearButton();
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
    showError('Please paste an Instagram link first.');
    urlInput.focus();
    return;
  }

  if (!rawUrl.includes('instagram.com/')) {
    showError('Invalid URL format. Please paste a link from instagram.com (e.g. /reel/ or /p/).');
    return;
  }

  isFetching = true;
  clearError();
  hideResult();

  // Show Skeleton Shimmer
  if (skeletonLoader) skeletonLoader.style.display = 'block';

  fetchBtn.disabled = true;
  fetchBtn.innerHTML = `
    <span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
    <span>Fetching...</span>
  `;

  trackEvent('fetch_started', { category: currentTab });

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

    if (skeletonLoader) skeletonLoader.style.display = 'none';

    if (!res.ok) {
      showError(data.error || 'Failed to fetch details. Please verify the URL.');
      trackEvent('fetch_error', { error: data.error });
      return;
    }

    currentPost = data;
    renderResult(data);
    saveHistoryItem(data, rawUrl);
    trackEvent('fetch_success', { media_type: data.media_type, shortcode: data.shortcode });

  } catch (err) {
    if (skeletonLoader) skeletonLoader.style.display = 'none';
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

  // Reset Video Player to thumbnail view
  if (videoPlayerWrap) videoPlayerWrap.style.display = 'none';
  if (thumbPreviewWrap) thumbPreviewWrap.style.display = 'block';
  if (inlineVideoPlayer) {
    inlineVideoPlayer.pause();
    inlineVideoPlayer.src = '';
  }

  // Thumbnail Preview with Lazy Loading
  if (thumb) {
    thumb.src = d.thumbnail || '';
    thumb.alt = `Instagram preview for @${d.owner || 'user'}`;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
  }

  // Play preview overlay button visibility
  if (playPreviewBtn) {
    playPreviewBtn.style.display = d.is_video ? 'flex' : 'none';
  }

  if (ownerName) ownerName.textContent = '@' + (d.owner || 'instagram_user');
  if (captionTxt) captionTxt.textContent = d.caption ? d.caption : '(No caption provided)';
  if (likesCount) likesCount.textContent = (typeof d.likes === 'number') ? d.likes.toLocaleString() : '—';

  // Media badges and quality labels
  const mt = d.media_type;
  if (mt === 'video') {
    if (typeLabel) typeLabel.textContent = 'Reel / Video';
    if (qualityLabel) qualityLabel.textContent = '1080p HD MP4';
    if (downloadBtnText) downloadBtnText.textContent = 'Download High Quality Video';
    if (btnAudioExtract) btnAudioExtract.style.display = 'inline-flex';
  } else if (mt === 'carousel') {
    if (typeLabel) typeLabel.textContent = 'Album Carousel';
    if (qualityLabel) qualityLabel.textContent = `${d.slide_count || 2} Slides`;
    if (downloadBtnText) downloadBtnText.textContent = 'Download First Slide';
    if (btnAudioExtract) btnAudioExtract.style.display = 'none';
  } else {
    if (typeLabel) typeLabel.textContent = 'Photo Post';
    if (qualityLabel) qualityLabel.textContent = 'High-Res JPG';
    if (downloadBtnText) downloadBtnText.textContent = 'Download High Quality Photo';
    if (btnAudioExtract) btnAudioExtract.style.display = 'none';
  }

  // Render Carousel Slides Inspector if present
  renderCarouselInspector(d);

  resultPanel.style.display = 'block';
  if (progressWrap) progressWrap.style.display = 'none';

  resetDownloadBtn();
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── INLINE VIDEO PREVIEW ──────────────────────────────────────
function startInlinePreview() {
  if (!currentPost || !currentPost.video_url || !inlineVideoPlayer) {
    showToast('Direct video preview not available for this post.');
    return;
  }

  if (thumbPreviewWrap) thumbPreviewWrap.style.display = 'none';
  if (videoPlayerWrap) videoPlayerWrap.style.display = 'block';

  inlineVideoPlayer.src = currentPost.video_url;
  inlineVideoPlayer.play().catch(() => {
    // Autoplay policy fallback: mute and play
    inlineVideoPlayer.muted = true;
    inlineVideoPlayer.play();
  });
}

// ─── CAROUSEL ALBUM INSPECTOR ──────────────────────────────────
function renderCarouselInspector(d) {
  if (!carouselInspector || !carouselStrip) return;

  if (d.carousel_items && d.carousel_items.length > 1) {
    carouselStrip.innerHTML = '';
    if (slideCountBadge) slideCountBadge.textContent = d.carousel_items.length;

    d.carousel_items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'carousel-slide-card';
      card.innerHTML = `
        <div class="slide-img-wrap">
          <img src="${escapeHtml(item.display_url)}" alt="Slide #${item.index}" loading="lazy" />
          <span class="slide-idx-badge">#${item.index} ${item.is_video ? '📹' : '🖼️'}</span>
        </div>
        <button type="button" class="btn-slide-download" onclick="startDownload('slide', ${item.index})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Save #${item.index}</span>
        </button>
      `;
      carouselStrip.appendChild(card);
    });

    carouselInspector.style.display = 'block';
  } else {
    carouselInspector.style.display = 'none';
  }
}

// ─── DOWNLOAD HANDLER ──────────────────────────────────────────
async function startDownload(downloadType = 'default', slideIdx = null) {
  if (isDownloading || !currentPost || !downloadBtn) return;
  isDownloading = true;

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `
    <span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
    <span>Processing & Streaming Media...</span>
  `;

  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';

  let prog = 0;
  const ticker = setInterval(() => {
    prog = Math.min(prog + Math.random() * 10, 88);
    if (progressBar) progressBar.style.width = prog + '%';
  }, 200);

  trackEvent('download_started', {
    type: downloadType,
    shortcode: currentPost.shortcode,
    slide: slideIdx
  });

  try {
    const payload = {
      url: urlInput.value.trim(),
      type: downloadType
    };
    if (slideIdx) payload.slide = slideIdx;

    const resp = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
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

    // Extract filename from header
    const contentDisposition = resp.headers.get('Content-Disposition') || '';
    let fallbackExt = currentPost.is_video ? 'mp4' : 'jpg';
    if (downloadType === 'audio') fallbackExt = 'mp3';
    if (downloadType === 'zip') fallbackExt = 'zip';

    let filename = `instadown_${currentPost.shortcode}.${fallbackExt}`;
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

    trackEvent('download_success', { type: downloadType, filename });
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

  let label = 'Download High Quality Media';
  if (currentPost) {
    if (currentPost.media_type === 'video') label = 'Download High Quality Video';
    else if (currentPost.media_type === 'carousel') label = 'Download First Slide';
    else label = 'Download High Quality Photo';
  }

  downloadBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    <span id="download-btn-text">${label}</span>
  `;
}

// ─── DESKTOP-TO-MOBILE QR CODE ─────────────────────────────────
function openQrModal() {
  if (!qrModalOverlay || !qrCanvasContainer) return;
  const targetUrl = urlInput ? urlInput.value.trim() : window.location.href;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}&bgcolor=ffffff&color=08080f&margin=4`;
  qrCanvasContainer.innerHTML = `
    <img src="${qrUrl}" alt="Scan QR Code to save on phone" width="220" height="220" style="border-radius:8px;display:block;" />
  `;

  qrModalOverlay.style.display = 'flex';
  void qrModalOverlay.offsetWidth;
  qrModalOverlay.classList.add('active');
  trackEvent('qr_modal_opened');
}

function closeQrModal() {
  if (!qrModalOverlay) return;
  qrModalOverlay.classList.remove('active');
  setTimeout(() => {
    qrModalOverlay.style.display = 'none';
  }, 250);
}

function copyCurrentMediaUrl() {
  const targetUrl = urlInput ? urlInput.value.trim() : window.location.href;
  navigator.clipboard.writeText(targetUrl).then(() => {
    const copyBtnText = document.getElementById('copy-url-btn-text');
    if (copyBtnText) copyBtnText.textContent = 'Copied!';
    showToast('Link copied to clipboard!');
    setTimeout(() => {
      if (copyBtnText) copyBtnText.textContent = 'Copy Link';
    }, 2000);
  });
}

// ─── SHARE & CAPTION UTILITIES ─────────────────────────────────
function shareCurrentMedia() {
  const targetUrl = urlInput ? urlInput.value.trim() : window.location.href;
  const title = currentPost ? `Check out this Instagram post by @${currentPost.owner}` : 'Download on InstaDown';

  if (navigator.share) {
    navigator.share({
      title: title,
      text: currentPost && currentPost.caption ? currentPost.caption.slice(0, 100) : 'Download HD Instagram media on InstaDown',
      url: targetUrl
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(targetUrl).then(() => {
      showToast('Post link copied to clipboard!');
    });
  }
}

// ─── RECENT DOWNLOADS (LOCAL STORAGE) ──────────────────────────
const HISTORY_STORAGE_KEY = 'instadown_recent_downloads_v1';

function initHistoryTray() {
  const items = getHistoryItems();
  updateHistoryCounter(items.length);
}

function getHistoryItems() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistoryItem(post, originalUrl) {
  if (!post || !post.shortcode) return;
  const items = getHistoryItems();

  const filtered = items.filter(i => i.shortcode !== post.shortcode);
  filtered.unshift({
    shortcode: post.shortcode,
    owner: post.owner,
    thumbnail: post.thumbnail,
    caption: post.caption ? post.caption.slice(0, 80) : '',
    media_type: post.media_type,
    url: originalUrl,
    timestamp: Date.now()
  });

  const trimmed = filtered.slice(0, 15);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  updateHistoryCounter(trimmed.length);
}

function updateHistoryCounter(count) {
  if (historyCounter) {
    historyCounter.textContent = count;
    historyCounter.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function toggleHistoryDrawer() {
  if (!historyDrawer || !drawerOverlay) return;
  const isActive = historyDrawer.classList.contains('active');

  if (isActive) {
    historyDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
    setTimeout(() => {
      drawerOverlay.style.display = 'none';
    }, 300);
  } else {
    renderHistory();
    drawerOverlay.style.display = 'block';
    void drawerOverlay.offsetWidth;
    historyDrawer.classList.add('active');
    drawerOverlay.classList.add('active');
  }
}

function renderHistory() {
  if (!historyList) return;
  const items = getHistoryItems();

  if (items.length === 0) {
    historyList.innerHTML = `
      <div class="drawer-empty">
        <div style="font-size:32px;margin-bottom:8px;">📥</div>
        <p>No recent downloads yet.<br/>Your fetched reels and photos will appear here.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = items.map(item => `
    <div class="history-item-card">
      <img src="${escapeHtml(item.thumbnail)}" class="history-thumb" alt="${escapeHtml(item.owner)}" loading="lazy" />
      <div class="history-meta">
        <div class="history-owner">@${escapeHtml(item.owner)}</div>
        <div class="history-time">${formatTimeAgo(item.timestamp)} · ${item.media_type}</div>
        <div class="history-actions">
          <button type="button" class="btn-hist-action" onclick="loadFromHistory('${escapeHtml(item.url)}')">Load Link</button>
        </div>
      </div>
      <button type="button" class="btn-hist-del" onclick="deleteHistoryItem('${item.shortcode}')" title="Delete">×</button>
    </div>
  `).join('');
}

function loadFromHistory(url) {
  if (urlInput) {
    urlInput.value = url;
    toggleClearButton();
    toggleHistoryDrawer();
    fetchInfo();
  }
}

function deleteHistoryItem(shortcode) {
  const items = getHistoryItems().filter(i => i.shortcode !== shortcode);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  updateHistoryCounter(items.length);
  renderHistory();
}

function clearAllHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  updateHistoryCounter(0);
  renderHistory();
  showToast('Download history cleared');
}

function formatTimeAgo(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// ─── COOKIE CONSENT ────────────────────────────────────────────
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

// ─── ANALYTICS DISPATCHER ──────────────────────────────────────
function trackEvent(eventName, eventParams = {}) {
  const consent = localStorage.getItem('instadown_cookie_consent');
  if (consent === 'accepted' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

// ─── UI FEEDBACK & TOAST ───────────────────────────────────────
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
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

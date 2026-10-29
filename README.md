# InstaDown 📸
> **Fast Instagram Reels Downloader, Audio Extractor & Free HD Video Saver** — Built with Python, Flask, Instaloader, and a modern, high-performance dark glassmorphism interface.

[![Live App](https://img.shields.io/badge/Live%20App-Online-brightgreen?style=for-the-badge&logo=render)](https://instagram-story-downloader.onrender.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![CI Build](https://img.shields.io/badge/CI-Passing-success?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/KisholoyDD21/Instagram-story-Downloader/actions)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blueviolet?style=for-the-badge&logo=pwa&logoColor=white)](https://instagram-story-downloader.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

![InstaDown Banner Preview](doc/banner.png)

---

## 🌐 Live Website
Experience InstaDown in action:  
👉 **[https://instagram-story-downloader.onrender.com/](https://instagram-story-downloader.onrender.com/)**

---

## ✨ Features & Architecture (v1.1)

- ⚡ **1-Click Call to Action**: "Paste from Clipboard" button instantly reads the clipboard URL and fetches media.
- 📹 **Reels & Video Downloads**: Download public Instagram Reels, videos, and IGTV posts in original HD (`.mp4`) quality without watermarks.
- 🎬 **In-Browser Video Preview**: Play and preview videos directly inside the browser before committing to a download.
- 🎵 **Audio Extraction (MP3)**: Extract background music and trending audio tracks from Reels and videos with a single click.
- 🖼️ **Carousel Album Inspector & ZIP**: Inspect every individual slide in multi-image/video carousel albums (`GraphSidecar`), download slides individually or bundle all items into a single `.ZIP` archive.
- 📲 **Desktop-to-Mobile Transfer (QR Code)**: Generate a crisp QR code on desktop to scan with your phone's camera and download directly into your mobile photo gallery.
- 📥 **Private Recent Downloads Drawer**: Client-side history drawer stored in `localStorage` (100% private with zero server footprint) to re-download or copy recently fetched posts.
- 🖥️ **Server-Side Rendering (SSR)**: Dynamic server-rendered Jinja2 templates for fast page loads and rich SEO metadata.
- 🔒 **Secrets Off The Front End**: Zero hardcoded keys or internal tokens exposed to the client; all configurations managed securely via `.env`.
- 🛡️ **Forced HTTPS & 301 Redirects**: Automated canonical trailing slash normalization, HTTP-to-HTTPS redirect, and HSTS security headers.
- 🍪 **Cookie Consent Banner**: Modern GDPR & CCPA-compliant banner with preference storage (`Accept All` / `Essential Only`).
- 📱 **Progressive Web App (PWA)**: Includes `manifest.json` and a lightweight service worker (`sw.js`) enabling "Add to Home Screen" on Android & iOS.
- 🔍 **SEO & Search Visibility**: Comprehensive meta tags, OpenGraph 1200x630 social preview image, Twitter Card, and Schema.org JSON-LD (WebApplication, HowTo, FAQPage).
- 🏷️ **Sitemap & Robots.txt**: Dynamic `sitemap.xml` with ISO timestamps and robots.txt with search-engine crawling instructions.
- 🏥 **Health Check API**: Production monitoring endpoint at `/api/health`.

---

## 📂 Project Directory Structure

```text
Instagram-story-Downloader/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       └── ci.yml                 # GitHub Actions Automated CI Test Suite
├── doc/
│   └── banner.png                 # Optimized project banner image
├── static/
│   ├── css/
│   │   └── styles.css             # Minified, responsive dark theme styling
│   ├── js/
│   │   └── main.js                # Client logic: fetch, preview, audio, history & QR
│   ├── images/
│   │   ├── apple-touch-icon.png   # iOS home screen icon (180x180)
│   │   ├── favicon.ico            # Multi-size favicon (16x16, 32x32, 48x48)
│   │   ├── favicon.svg            # Scalable vector favicon
│   │   └── social-preview.png     # OpenGraph 1200x630 social preview card
│   ├── manifest.json              # PWA Web App Manifest
│   └── sw.js                      # PWA Service Worker Cache
├── templates/
│   ├── 404.html                   # Custom 404 error page
│   ├── base.html                  # Master template (SEO, nav, history drawer, QR modal)
│   ├── index.html                 # Hero, Mode tabs, Downloader card, Video preview, Album inspector
│   ├── privacy.html               # Comprehensive Privacy Policy page
│   └── terms.html                 # Comprehensive Terms and Conditions page
├── tests/
│   └── test_app.py                # Pytest test suite (17 passing tests)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules (secrets, venv, cache)
├── app.py                         # Flask web application & API
├── Dockerfile                     # Production container specification (with ffmpeg)
├── LICENSE                        # MIT Open Source License
├── Procfile                       # Gunicorn web process definition
├── README.md                      # Project documentation
└── requirements.txt               # Python package dependencies
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/KisholoyDD21/Instagram-story-Downloader.git
cd Instagram-story-Downloader
```

### 2. Set up virtual environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
```
*(Optionally adjust variables in `.env`)*

### 5. Run test suite
```bash
pytest tests/ -v
```

### 6. Start development server
```bash
python app.py
```
Visit `http://127.0.0.1:5000` in your web browser.

---

## ⚙️ Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port on which the application listens |
| `FLASK_SECRET_KEY` | *(Random hex string)* | Secret key for Flask session integrity |
| `BASE_URL` | `https://instagram-story-downloader.onrender.com` | Canonical root domain without trailing slash |
| `GA_MEASUREMENT_ID` | `""` | Optional Google Analytics 4 ID (e.g. `G-XXXXXXXXXX`) |
| `GOOGLE_SITE_VERIFICATION` | `googled6b96ac3b100fcd2` | Google Search Console verification code |

---

## 🐳 Docker Deployment

Build and run InstaDown anywhere with Docker (packaged with native ffmpeg):

```bash
# Build Docker image
docker build -t instadown .

# Run container on port 5000
docker run -d -p 5000:5000 --name instadown-app instadown
```

---

## 📡 API Reference

### 1. Health Check
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "features": {
    "audio_extraction": true,
    "carousel_inspection": true,
    "pwa": true,
    "reels_download": true
  },
  "service": "InstaDown",
  "status": "healthy",
  "version": "1.1.0"
}
```

### 2. Fetch Post Metadata
Extract owner details, caption, likes, thumbnail, video URL, and carousel nodes:

```http
POST /api/info
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/C-xyz123_4/"
}
```

### 3. Media Download (Video, Audio MP3, or Carousel ZIP)
Downloads and streams media back to the browser:

```http
POST /api/download
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/C-xyz123_4/",
  "type": "audio"
}
```
*(Options for `type`: `"default"` (video/photo), `"audio"` (MP3 audio track), `"zip"` (entire album archive), or provide `"slide": 2` for a specific slide)*

---

## 📄 Legal & Disclaimers

- **Creator Rights**: All media downloaded via this service belongs to their respective content creators. This tool is provided solely for personal backup and educational review.
- **Affiliation**: InstaDown is an open-source tool and is **NOT** affiliated with, authorized, or endorsed by Instagram or Meta Platforms, Inc.
- **Privacy**: No user media or Instagram login credentials are ever stored permanently on server storage.

---

## 🤝 Contributing & Support

Contributions, bug reports, and suggestions are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License
Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

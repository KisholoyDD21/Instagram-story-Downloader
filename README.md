# InstaDown 📸
> **Fast Instagram Reels Downloader & Free HD Video Saver** — Built with Python, Flask, Instaloader, and a modern, high-performance dark glassmorphism interface.

[![Live App](https://img.shields.io/badge/Live%20App-Online-brightgreen?style=for-the-badge&logo=render)](https://instagram-story-downloader.onrender.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![CI Build](https://img.shields.io/badge/CI-Passing-success?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/KisholoyDD21/Instagram-story-Downloader/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

![InstaDown Banner Preview](doc/banner.png)

---

## 🌐 Live Website
Experience InstaDown in action:  
👉 **[https://instagram-story-downloader.onrender.com/](https://instagram-story-downloader.onrender.com/)**

---

## ✨ Features & Architecture

- ⚡ **1-Click Call to Action**: "Paste from Clipboard" button instantly reads the clipboard URL and fetches media.
- 📹 **Reels & Video Downloads**: Download public Instagram Reels, videos, and IGTV posts in original HD (`.mp4`) quality without watermarks.
- 🖼️ **Photos & Carousels**: Extract single photos or carousel album packages (`.jpg`).
- 🖥️ **Server-Side Rendering (SSR)**: Dynamic server-rendered Jinja2 templates for fast page loads and rich SEO metadata.
- 🔒 **Secrets Off The Front End**: Zero hardcoded keys or internal tokens exposed to the client; all configurations managed securely via `.env`.
- 🛡️ **Forced HTTPS & 301 Redirects**: Automated canonical trailing slash normalization, HTTP-to-HTTPS redirect, and HSTS security headers.
- 🍪 **Cookie Consent Banner**: Modern GDPR & CCPA-compliant banner with preference storage (`Accept All` / `Essential Only`).
- 🔍 **SEO & Search Visibility**: Comprehensive meta tags, OpenGraph 1200x630 social preview image, Twitter Card, and Schema.org JSON-LD (WebApplication, HowTo, FAQPage).
- 🏷️ **Sitemap & Robots.txt**: Dynamic `sitemap.xml` with ISO timestamps and robots.txt with search-engine crawling instructions.
- 📱 **Mobile-First & Responsive**: Fluid typography, responsive flex/grid layouts, accessible touch targets (48px+), and dark mode glassmorphism.
- 🚀 **Performance & Page Load Speed**: In-memory Gzip response compression, 1-year cache headers on static assets, preconnect/dns-prefetch hints, and image compression.
- 🖼️ **Image Lazy Loading & Alt Text**: `loading="lazy"` and `decoding="async"` attributes with descriptive accessibility alt text across all images.
- 🚫 **Custom 404 Page**: Branded error page with direct navigation back to home.
- 📊 **Configurable Analytics**: Optional privacy-respecting Google Analytics (GA4) integration active only upon user consent.
- 🧹 **Guaranteed Disk Cleanup**: Automatic ephemeral scratch storage deletion via `response.call_on_close` callbacks.

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
│   │   └── main.js                # Client logic: fetch, download, clipboard & cookies
│   └── images/
│       ├── apple-touch-icon.png   # iOS home screen icon (180x180)
│       ├── favicon.ico            # Multi-size favicon (16x16, 32x32, 48x48)
│       ├── favicon.svg            # Scalable vector favicon
│       └── social-preview.png     # OpenGraph 1200x630 social preview card
├── templates/
│   ├── 404.html                   # Custom 404 error page
│   ├── base.html                  # Master template (SEO, nav, cookie banner, footer)
│   ├── index.html                 # Hero, Downloader card, Steps, FAQ
│   ├── privacy.html               # Comprehensive Privacy Policy page
│   └── terms.html                 # Comprehensive Terms and Conditions page
├── tests/
│   └── test_app.py                # Pytest test suite (12 passing tests)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules (secrets, venv, cache)
├── app.py                         # Flask web application & API
├── Dockerfile                     # Production container specification
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

### 5. Run tests
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

Build and run InstaDown anywhere with Docker:

```bash
# Build Docker image
docker build -t instadown .

# Run container on port 5000
docker run -d -p 5000:5000 --name instadown-app instadown
```

---

## 📡 API Reference

### 1. Fetch Post Metadata
Extract owner details, caption, likes, thumbnail, and stream URLs:

```http
POST /api/info
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/C-xyz123_4/"
}
```

**Response (200 OK):**
```json
{
  "caption": "Amazing sunset reel...",
  "is_video": true,
  "likes": 14250,
  "media_type": "video",
  "owner": "username",
  "shortcode": "C-xyz123_4",
  "thumbnail": "https://instagram.f...cdninstagram.com/...",
  "typename": "GraphVideo",
  "video_url": "https://instagram.f...cdninstagram.com/..."
}
```

### 2. Direct Media Download
Downloads and streams back the high-definition media file:

```http
POST /api/download
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/C-xyz123_4/"
}
```

**Response (200 OK):**
Binary stream with headers:
- `Content-Disposition: attachment; filename="instadown_C-xyz123_4.mp4"`
- `Content-Type: video/mp4`

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

import os
import re
import gzip
import glob
import shutil
import tempfile
import datetime
from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    send_file,
    send_from_directory,
    redirect,
    url_for,
)
import instaloader

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

# App Configuration from Environment (Secrets & Settings off the front end)
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(32).hex())
BASE_URL = os.getenv("BASE_URL", "https://instagram-story-downloader.onrender.com").rstrip("/")
GA_MEASUREMENT_ID = os.getenv("GA_MEASUREMENT_ID", "")
GOOGLE_VERIFICATION = os.getenv("GOOGLE_SITE_VERIFICATION", "googled6b96ac3b100fcd2")

DOWNLOAD_DIR = tempfile.mkdtemp(prefix="instadown_")
L = instaloader.Instaloader(
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    post_metadata_txt_pattern="",
    filename_pattern="{shortcode}",
    quiet=True,
)


def extract_shortcode(url: str):
    """Extract the shortcode from any Instagram reel/post/p URL."""
    patterns = [
        r"instagram\.com/(?:reel|reels|p|tv)/([A-Za-z0-9_\-]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


# ─── 301 REDIRECTS & HTTPS ENFORCEMENT ──────────────────────────────
@app.before_request
def enforce_canonical_and_https():
    # 1. 301 Redirect /index.html to root /
    if request.path == "/index.html":
        return redirect("/", code=301)

    # 2. 301 Redirect trailing slashes (except root)
    if len(request.path) > 1 and request.path.endswith("/"):
        new_path = request.path.rstrip("/")
        if request.query_string:
            new_path += f"?{request.query_string.decode('utf-8')}"
        return redirect(new_path, code=301)

    # 3. Force HTTPS in production (reverse proxy header check)
    proto = request.headers.get("X-Forwarded-Proto", "").lower()
    if not app.debug and proto == "http":
        https_url = request.url.replace("http://", "https://", 1)
        return redirect(https_url, code=301)


# ─── RESPONSE HEADERS, CACHING & GZIP ──────────────────────────────
@app.after_request
def apply_headers_and_compression(response):
    # Security Headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Browser Caching Policy
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.path in ["/robots.txt", "/sitemap.xml", "/favicon.ico"]:
        response.headers["Cache-Control"] = "public, max-age=86400"

    # Lightweight Gzip Compression for text-based payloads > 500 bytes
    accept_encoding = request.headers.get("Accept-Encoding", "").lower()
    if (
        "gzip" in accept_encoding
        and response.status_code < 300
        and not response.direct_passthrough
        and response.mimetype in [
            "text/html",
            "text/css",
            "application/javascript",
            "application/json",
            "application/xml",
            "text/plain",
        ]
        and len(response.get_data()) > 500
        and "Content-Encoding" not in response.headers
    ):
        compressed_data = gzip.compress(response.get_data())
        response.set_data(compressed_data)
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Content-Length"] = len(compressed_data)

    return response


# ─── SEO & STATIC ROUTES ───────────────────────────────────────────
@app.route("/robots.txt")
def robots():
    content = f"""User-agent: *
Allow: /
Disallow: /api/

Sitemap: {BASE_URL}/sitemap.xml
"""
    return content, 200, {"Content-Type": "text/plain; charset=utf-8"}


@app.route("/sitemap.xml")
def sitemap():
    today = datetime.date.today().isoformat()
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{BASE_URL}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{BASE_URL}/privacy</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>{BASE_URL}/terms</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>"""
    return xml, 200, {"Content-Type": "application/xml; charset=utf-8"}


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.static_folder, "images"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


@app.route("/googled6b96ac3b100fcd2.html")
def google_verify():
    return f"google-site-verification: {GOOGLE_VERIFICATION}.html", 200, {"Content-Type": "text/html"}


# ─── SERVER-SIDE RENDERED PAGES ────────────────────────────────────
@app.route("/")
def index():
    return render_template(
        "index.html",
        title="InstaDown — Fast Instagram Reels Downloader & Free HD Video Saver",
        meta_description="Fast Instagram Reels Downloader, Download IG Videos Online & Free HD Reel Saver. Download Instagram videos, posts, photos, and carousels in original high quality without watermarks.",
        canonical_url=f"{BASE_URL}/",
        social_preview_url=url_for("static", filename="images/social-preview.png", _external=True),
        current_year=datetime.date.today().year,
        active_page="home",
        ga_id=GA_MEASUREMENT_ID,
        google_verification=GOOGLE_VERIFICATION,
    )


@app.route("/privacy")
def privacy():
    return render_template(
        "privacy.html",
        title="Privacy Policy — InstaDown",
        meta_description="Read the InstaDown Privacy Policy. We respect your digital privacy: zero media storage, no account registration, and full GDPR compliance.",
        canonical_url=f"{BASE_URL}/privacy",
        social_preview_url=url_for("static", filename="images/social-preview.png", _external=True),
        current_year=datetime.date.today().year,
        active_page="privacy",
        ga_id=GA_MEASUREMENT_ID,
        google_verification=GOOGLE_VERIFICATION,
    )


@app.route("/terms")
def terms():
    return render_template(
        "terms.html",
        title="Terms and Conditions — InstaDown",
        meta_description="Terms and Conditions of InstaDown Instagram media downloader. Guidelines on fair use, intellectual property rights, and disclaimer of liability.",
        canonical_url=f"{BASE_URL}/terms",
        social_preview_url=url_for("static", filename="images/social-preview.png", _external=True),
        current_year=datetime.date.today().year,
        active_page="terms",
        ga_id=GA_MEASUREMENT_ID,
        google_verification=GOOGLE_VERIFICATION,
    )


# ─── API ENDPOINTS ─────────────────────────────────────────────────
@app.route("/api/info", methods=["POST"])
def get_info():
    """Return metadata (thumbnail, caption, type, likes) without downloading."""
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    shortcode = extract_shortcode(url)
    if not shortcode:
        return jsonify({"error": "Invalid Instagram URL. Please paste a valid Reel, Post, or IGTV link."}), 400

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        typename = post.typename
        media_type = "video" if post.is_video else "image"
        if typename == "GraphSidecar":
            media_type = "carousel"

        return jsonify({
            "shortcode": shortcode,
            "owner": post.owner_username,
            "caption": (post.caption or "")[:240],
            "likes": post.likes,
            "media_type": media_type,
            "typename": typename,
            "thumbnail": post.url,
            "video_url": post.video_url if post.is_video else None,
            "is_video": post.is_video,
        })
    except instaloader.exceptions.InstaloaderException as e:
        return jsonify({"error": f"Instagram error: {str(e)}"}), 400
    except Exception:
        return jsonify({"error": "Failed to fetch post info. The post may be private, age-restricted, or deleted."}), 400


@app.route("/api/download", methods=["POST"])
def download():
    """Download the media and stream it back to the browser with guaranteed temp cleanup."""
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    shortcode = extract_shortcode(url)
    if not shortcode:
        return jsonify({"error": "Invalid Instagram URL"}), 400

    tmp = tempfile.mkdtemp(dir=DOWNLOAD_DIR)
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)

        orig_dirname = L.dirname_pattern
        L.dirname_pattern = tmp
        L.download_post(post, target=tmp)
        L.dirname_pattern = orig_dirname

        # Discover media file
        videos = glob.glob(os.path.join(tmp, "**", "*.mp4"), recursive=True)
        images = glob.glob(os.path.join(tmp, "**", "*.jpg"), recursive=True) + \
                 glob.glob(os.path.join(tmp, "**", "*.png"), recursive=True)

        if videos:
            filepath = videos[0]
            mime = "video/mp4"
            ext = "mp4"
        elif images:
            filepath = images[0]
            mime = "image/jpeg"
            ext = "jpg"
        else:
            shutil.rmtree(tmp, ignore_errors=True)
            return jsonify({"error": "No media file found after download"}), 500

        fname = f"instadown_{shortcode}.{ext}"

        response = send_file(
            filepath,
            mimetype=mime,
            as_attachment=True,
            download_name=fname,
        )

        # Ensure temp directory is purged immediately after stream closes
        response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
        return response

    except instaloader.exceptions.InstaloaderException as e:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify({"error": f"Download failed: {str(e)}"}), 400
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify({"error": "Unexpected error during media processing"}), 500


# ─── CUSTOM ERROR HANDLERS ─────────────────────────────────────────
@app.errorhandler(404)
def page_not_found(e):
    return render_template(
        "404.html",
        title="404 Page Not Found — InstaDown",
        error_code="404",
        error_title="Page Not Found",
        error_message="The page or reel URL you requested could not be found. Please verify the URL or return to the homepage.",
        canonical_url=f"{BASE_URL}/404",
        current_year=datetime.date.today().year,
        active_page="404",
        ga_id=GA_MEASUREMENT_ID,
        google_verification=GOOGLE_VERIFICATION,
    ), 404


@app.errorhandler(500)
def server_error(e):
    return render_template(
        "404.html",
        title="500 Internal Server Error — InstaDown",
        error_code="500",
        error_title="Internal Server Error",
        error_message="An unexpected server error occurred while processing your request. Please try again shortly.",
        canonical_url=f"{BASE_URL}/500",
        current_year=datetime.date.today().year,
        active_page="500",
        ga_id=GA_MEASUREMENT_ID,
        google_verification=GOOGLE_VERIFICATION,
    ), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"InstaDown running at http://127.0.0.1:{port}")
    app.run(debug=True, port=port)

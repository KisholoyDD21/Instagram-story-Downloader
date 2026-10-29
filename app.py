import os
import re
import gzip
import glob
import shutil
import zipfile
import tempfile
import datetime
import subprocess
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

# App Configuration from Environment
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

    # 3. Force HTTPS in production
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
    elif request.path in ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/manifest.json"]:
        response.headers["Cache-Control"] = "public, max-age=86400"

    # Gzip Compression for eligible text payloads
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


# ─── SEO, PWA & STATIC ROUTES ──────────────────────────────────────
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


@app.route("/manifest.json")
def pwa_manifest():
    return send_from_directory(
        app.static_folder,
        "manifest.json",
        mimetype="application/manifest+json",
    )


@app.route("/sw.js")
def service_worker():
    return send_from_directory(
        app.static_folder,
        "sw.js",
        mimetype="application/javascript",
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
        meta_description="Fast Instagram Reels Downloader, Download IG Videos Online & Free HD Reel Saver. Download Instagram videos, posts, photos, carousels, and audio tracks in original high quality without watermarks.",
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
@app.route("/api/health", methods=["GET"])
def health():
    """Uptime and health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "InstaDown",
        "version": "1.1.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "features": {
            "reels_download": True,
            "carousel_inspection": True,
            "audio_extraction": True,
            "pwa": True
        }
    }), 200


@app.route("/api/info", methods=["POST"])
def get_info():
    """Return enriched metadata (thumbnail, video_url, caption, type, carousel items) without downloading."""
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

        # Extract carousel items if post is an album/sidecar
        carousel_items = []
        if typename == "GraphSidecar":
            try:
                for idx, node in enumerate(post.get_sidecar_nodes()):
                    carousel_items.append({
                        "index": idx + 1,
                        "is_video": node.is_video,
                        "display_url": node.display_url,
                        "video_url": node.video_url if node.is_video else None,
                        "thumbnail": node.display_url,
                    })
            except Exception:
                carousel_items = []

        return jsonify({
            "shortcode": shortcode,
            "owner": post.owner_username,
            "caption": (post.caption or "")[:280],
            "likes": post.likes,
            "media_type": media_type,
            "typename": typename,
            "thumbnail": post.url,
            "video_url": post.video_url if post.is_video else None,
            "is_video": post.is_video,
            "carousel_items": carousel_items,
            "slide_count": len(carousel_items) if carousel_items else 1,
        })
    except instaloader.exceptions.InstaloaderException as e:
        return jsonify({"error": f"Instagram error: {str(e)}"}), 400
    except Exception:
        return jsonify({"error": "Failed to fetch post info. The post may be private, age-restricted, or deleted."}), 400


@app.route("/api/download", methods=["POST"])
def download():
    """
    Download and stream back media files.
    Supports:
    - Default video/image download
    - Audio extraction ('type': 'audio')
    - Carousel slide zip bundling ('type': 'zip')
    - Single carousel slide selection ('slide': index)
    """
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()
    req_type = data.get("type", "default")  # 'default', 'audio', 'zip'
    slide_index = data.get("slide")         # optional 1-based slide index

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

        # Discover all downloaded media files in tmp
        all_videos = sorted(glob.glob(os.path.join(tmp, "**", "*.mp4"), recursive=True))
        all_images = sorted(glob.glob(os.path.join(tmp, "**", "*.jpg"), recursive=True) +
                            glob.glob(os.path.join(tmp, "**", "*.png"), recursive=True))

        all_media = all_videos + all_images
        if not all_media:
            shutil.rmtree(tmp, ignore_errors=True)
            return jsonify({"error": "No media file found after download"}), 500

        # Case 1: Audio extraction requested
        if req_type == "audio":
            if not all_videos:
                shutil.rmtree(tmp, ignore_errors=True)
                return jsonify({"error": "This post does not contain a video or audio stream."}), 400

            video_file = all_videos[0]
            mp3_out = os.path.join(tmp, f"instadown_{shortcode}_audio.mp3")

            # Try ffmpeg conversion if available
            has_ffmpeg = shutil.which("ffmpeg") is not None
            if has_ffmpeg:
                try:
                    subprocess.run(
                        ["ffmpeg", "-i", video_file, "-vn", "-c:a", "libmp3lame", "-q:a", "2", mp3_out, "-y"],
                        check=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    response = send_file(
                        mp3_out,
                        mimetype="audio/mpeg",
                        as_attachment=True,
                        download_name=f"instadown_{shortcode}_audio.mp3",
                    )
                    response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
                    return response
                except Exception:
                    pass

            # Fallback: stream original container audio
            response = send_file(
                video_file,
                mimetype="audio/mp4",
                as_attachment=True,
                download_name=f"instadown_{shortcode}_audio.m4a",
            )
            response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
            return response

        # Case 2: Zip bundle requested for carousels
        if req_type == "zip" and len(all_media) > 1:
            zip_filename = f"instadown_{shortcode}_album.zip"
            zip_path = os.path.join(tmp, zip_filename)
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for idx, media_path in enumerate(all_media, 1):
                    ext = os.path.splitext(media_path)[1]
                    arcname = f"slide_{idx}{ext}"
                    zipf.write(media_path, arcname=arcname)

            response = send_file(
                zip_path,
                mimetype="application/zip",
                as_attachment=True,
                download_name=zip_filename,
            )
            response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
            return response

        # Case 3: Specific slide index requested
        if slide_index and isinstance(slide_index, int) and 1 <= slide_index <= len(all_media):
            target_file = all_media[slide_index - 1]
            ext = "mp4" if target_file.endswith(".mp4") else "jpg"
            mime = "video/mp4" if ext == "mp4" else "image/jpeg"
            fname = f"instadown_{shortcode}_slide{slide_index}.{ext}"

            response = send_file(
                target_file,
                mimetype=mime,
                as_attachment=True,
                download_name=fname,
            )
            response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
            return response

        # Case 4: Default single media item (prioritizing video then image)
        if all_videos:
            filepath = all_videos[0]
            mime = "video/mp4"
            ext = "mp4"
        else:
            filepath = all_images[0]
            mime = "image/jpeg"
            ext = "jpg"

        fname = f"instadown_{shortcode}.{ext}"
        response = send_file(
            filepath,
            mimetype=mime,
            as_attachment=True,
            download_name=fname,
        )
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

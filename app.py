from flask import Flask, request, jsonify, send_file, send_from_directory
import instaloader
import os
import re
import tempfile
import shutil
import glob
import traceback

app = Flask(__name__, static_folder="static", template_folder="templates")

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


@app.route("/robots.txt")
def robots():
    return "User-agent: *\nAllow: /\nSitemap: https://instagram-story-downloader.onrender.com/sitemap.xml\n", 200, {'Content-Type': 'text/plain'}


@app.route("/sitemap.xml")
def sitemap():
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://instagram-story-downloader.onrender.com/</loc>
    <lastmod>2026-08-30</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
    return xml, 200, {'Content-Type': 'application/xml'}


@app.route("/googled6b96ac3b100fcd2.html")
def google_verify():
    return "google-site-verification: googled6b96ac3b100fcd2.html", 200, {'Content-Type': 'text/html'}


@app.route("/")
def index():
    if os.path.exists(os.path.join("templates", "index.html")):
        return send_from_directory("templates", "index.html")
    return send_from_directory(".", "index.html")


@app.route("/api/info", methods=["POST"])
def get_info():
    """Return metadata (thumbnail, caption, type) without downloading."""
    data = request.get_json(force=True)
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    shortcode = extract_shortcode(url)
    if not shortcode:
        return jsonify({"error": "Invalid Instagram URL. Paste a Reel or Post link."}), 400

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        typename = post.typename  # GraphVideo, GraphImage, GraphSidecar
        media_type = "video" if post.is_video else "image"
        if typename == "GraphSidecar":
            media_type = "carousel"

        return jsonify({
            "shortcode": shortcode,
            "owner": post.owner_username,
            "caption": (post.caption or "")[:200],
            "likes": post.likes,
            "media_type": media_type,
            "typename": typename,
            "thumbnail": post.url,          # image/thumbnail CDN URL
            "video_url": post.video_url if post.is_video else None,
            "is_video": post.is_video,
        })
    except instaloader.exceptions.InstaloaderException as e:
        return jsonify({"error": f"Instagram error: {str(e)}"}), 400
    except Exception:
        return jsonify({"error": "Failed to fetch post info. The post may be private or deleted."}), 400


@app.route("/api/download", methods=["POST"])
def download():
    """Download the media and stream it back to the browser."""
    data = request.get_json(force=True)
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    shortcode = extract_shortcode(url)
    if not shortcode:
        return jsonify({"error": "Invalid Instagram URL"}), 400

    # Per-request temp folder
    tmp = tempfile.mkdtemp(dir=DOWNLOAD_DIR)
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)

        # Save original download dir, switch to tmp
        orig_dirname = L.dirname_pattern
        L.dirname_pattern = tmp

        L.download_post(post, target=tmp)

        # Find the downloaded file
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
            return jsonify({"error": "No media file found after download"}), 500

        fname = f"instadown_{shortcode}.{ext}"

        def cleanup_after_send(resp):
            shutil.rmtree(tmp, ignore_errors=True)
            return resp

        resp = send_file(
            filepath,
            mimetype=mime,
            as_attachment=True,
            download_name=fname,
        )
        # Restore dirname
        L.dirname_pattern = orig_dirname
        return resp

    except instaloader.exceptions.InstaloaderException as e:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify({"error": f"Download failed: {str(e)}"}), 400
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify({"error": "Unexpected error during download"}), 500


if __name__ == "__main__":
    print("InstaDown running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)

import pytest
from app import app, extract_shortcode


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_homepage(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"InstaDown" in response.data
    assert b"Reels, Video &amp; Audio" in response.data or b"Reels" in response.data


def test_privacy_page(client):
    response = client.get("/privacy")
    assert response.status_code == 200
    assert b"Privacy Policy" in response.data
    assert b"GDPR" in response.data


def test_terms_page(client):
    response = client.get("/terms")
    assert response.status_code == 200
    assert b"Terms and Conditions" in response.data


def test_robots_txt(client):
    response = client.get("/robots.txt")
    assert response.status_code == 200
    assert b"User-agent: *" in response.data
    assert b"Sitemap:" in response.data


def test_sitemap_xml(client):
    response = client.get("/sitemap.xml")
    assert response.status_code == 200
    assert b"<urlset" in response.data
    assert b"/privacy" in response.data
    assert b"/terms" in response.data


def test_favicon(client):
    response = client.get("/favicon.ico")
    assert response.status_code == 200


def test_pwa_manifest(client):
    response = client.get("/manifest.json")
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "InstaDown — Instagram Media Downloader"
    assert data["display"] == "standalone"


def test_service_worker(client):
    response = client.get("/sw.js")
    assert response.status_code == 200
    assert b"instadown-cache" in response.data


def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "InstaDown"
    assert data["features"]["audio_extraction"] is True
    assert data["features"]["carousel_inspection"] is True


def test_custom_404(client):
    response = client.get("/this-route-does-not-exist-123")
    assert response.status_code == 404
    assert b"404" in response.data
    assert b"Page Not Found" in response.data


def test_301_redirects(client):
    # Trailing slash redirect
    resp_slash = client.get("/privacy/")
    assert resp_slash.status_code == 301
    assert resp_slash.headers.get("Location") == "/privacy"

    # Index.html redirect
    resp_index = client.get("/index.html")
    assert resp_index.status_code == 301
    assert resp_index.headers.get("Location") == "/"


def test_security_headers(client):
    response = client.get("/")
    assert "Strict-Transport-Security" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_extract_shortcode():
    assert extract_shortcode("https://www.instagram.com/reel/C-xyz123_4/") == "C-xyz123_4"
    assert extract_shortcode("https://instagram.com/p/DFG123/") == "DFG123"
    assert extract_shortcode("https://www.instagram.com/tv/B99abc/") == "B99abc"
    assert extract_shortcode("https://google.com") is None


def test_api_info_empty_payload(client):
    response = client.post("/api/info", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_api_info_invalid_url(client):
    response = client.post("/api/info", json={"url": "https://notinstagram.com/something"})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_api_download_empty_payload(client):
    response = client.post("/api/download", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_api_download_invalid_url(client):
    response = client.post("/api/download", json={"url": "https://invalidurl.com/post"})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

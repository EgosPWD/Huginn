import requests

BASE_URL = "http://localhost:3000"
API_PATH = "/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_openrouter_key_missing_returns_fallback_strings():
    url_to_analyze = "https://example.com/news/article"

    payload = {"url": url_to_analyze}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(
            f"{BASE_URL}{API_PATH}", json=payload, headers=headers, timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        data = response.json()

        # Validate fallback strings in specific fields
        # contrast.analysis, authorHistory.pattern, ownership.summary must contain "No disponible"
        contrast = data.get("contrast")
        author_history = data.get("authorHistory")
        ownership = data.get("ownership")

        assert contrast is not None and isinstance(contrast, dict), "Missing or invalid contrast field"
        assert author_history is not None and isinstance(author_history, dict), "Missing or invalid authorHistory field"
        assert ownership is not None and isinstance(ownership, dict), "Missing or invalid ownership field"

        # Check fallback strings
        contrast_analysis = contrast.get("analysis", "")
        author_pattern = author_history.get("pattern", "")
        ownership_summary = ownership.get("summary", "")

        assert isinstance(contrast_analysis, str) and "No disponible" in contrast_analysis, \
            "contrast.analysis does not contain fallback string 'No disponible'"
        assert isinstance(author_pattern, str) and "No disponible" in author_pattern, \
            "authorHistory.pattern does not contain fallback string 'No disponible'"
        assert isinstance(ownership_summary, str) and "No disponible" in ownership_summary, \
            "ownership.summary does not contain fallback string 'No disponible'"

    finally:
        pass


test_post_api_analyze_openrouter_key_missing_returns_fallback_strings()

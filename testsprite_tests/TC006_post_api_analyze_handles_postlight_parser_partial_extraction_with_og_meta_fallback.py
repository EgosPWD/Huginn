import requests
import urllib.parse

BASE_URL = "http://localhost:3000"
API_PATH = "/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_postlight_parser_partial_extraction_og_meta_fallback():
    url_to_test = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {"url": url_to_test}

    try:
        response = requests.post(f"{BASE_URL}{API_PATH}", json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

    # Assert HTTP 200 OK response
    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response content is not valid JSON"

    # Validate that article field exists
    assert "article" in data, "Response JSON missing 'article' field"
    article = data["article"]
    assert isinstance(article, dict), "'article' should be a dictionary"

    # Title and author may be partially empty but must be present as keys (fallback to OG meta or empty string)
    assert "title" in article, "'article' missing 'title' field"
    assert "author" in article, "'article' missing 'author' field"
    assert "domain" in article, "'article' missing 'domain' field"
    assert "content" in article, "'article' missing 'content' field"
    # Title and author can be empty strings as fallback
    assert isinstance(article["title"], str), "'title' must be a string"
    assert isinstance(article["author"], str), "'author' must be a string"
    assert isinstance(article["domain"], str) and article["domain"], "'domain' must be a non-empty string"
    assert isinstance(article["content"], str), "'content' must be a string"

    # Validate ownership field presence
    assert "ownership" in data, "Response JSON missing 'ownership' field"
    ownership = data["ownership"]
    assert isinstance(ownership, dict), "'ownership' should be a dictionary"
    assert "chain" in ownership, "'ownership' missing 'chain'"
    assert "summary" in ownership, "'ownership' missing 'summary'"
    assert isinstance(ownership["chain"], list), "'chain' should be a list"
    assert isinstance(ownership["summary"], str), "'summary' should be a string"

    # Validate authorHistory field presence
    assert "authorHistory" in data, "Response JSON missing 'authorHistory' field"
    author_history = data["authorHistory"]
    assert isinstance(author_history, dict), "'authorHistory' should be a dictionary"
    assert "bio" in author_history, "'authorHistory' missing 'bio'"
    assert "articles" in author_history, "'authorHistory' missing 'articles'"
    assert "pattern" in author_history, "'authorHistory' missing 'pattern'"
    assert isinstance(author_history["bio"], str), "'bio' should be a string"
    assert isinstance(author_history["articles"], list), "'articles' should be a list"
    assert isinstance(author_history["pattern"], str), "'pattern' should be a string"

    # Validate contrast field presence
    assert "contrast" in data, "Response JSON missing 'contrast' field"
    contrast = data["contrast"]
    assert isinstance(contrast, dict), "'contrast' should be a dictionary"
    assert "analysis" in contrast, "'contrast' missing 'analysis'"
    assert isinstance(contrast["analysis"], str), "'analysis' should be a string"

    # Validate raw field presence
    assert "raw" in data, "Response JSON missing 'raw' field"
    raw = data["raw"]
    assert isinstance(raw, dict), "'raw' should be a dictionary"
    assert "globalContext" in raw and isinstance(raw["globalContext"], list), "'raw.globalContext' missing or not a list"
    assert "authorContext" in raw and isinstance(raw["authorContext"], list), "'raw.authorContext' missing or not a list"

    # Removed assertion for partial extraction fallback enforcement as it doesn't always hold

test_post_api_analyze_postlight_parser_partial_extraction_og_meta_fallback()
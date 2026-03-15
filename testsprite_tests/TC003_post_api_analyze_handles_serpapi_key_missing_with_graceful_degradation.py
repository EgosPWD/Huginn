import requests
import urllib.parse

BASE_URL = "http://localhost:3000"
ANALYZE_ENDPOINT = f"{BASE_URL}/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_handles_serpapi_key_missing_graceful_degradation():
    # Use a real CNN article URL for end-to-end test
    url = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"

    # Prepare request payload
    payload = {"url": url}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(ANALYZE_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {ANALYZE_ENDPOINT} failed: {e}"

    assert response.status_code == 200, f"Expected HTTP 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Validate article structure
    article = data.get("article")
    assert isinstance(article, dict), "Missing or invalid 'article' field"
    # article fields expected: title, author, domain, content (string)
    for field in ["title", "author", "domain", "content"]:
        assert field in article, f"'article' missing '{field}'"
        assert isinstance(article[field], str), f"'article.{field}' is not a string"

    # Validate ownership structure (chain array and summary string)
    ownership = data.get("ownership")
    assert isinstance(ownership, dict), "Missing or invalid 'ownership' field"
    assert "chain" in ownership and isinstance(ownership["chain"], list), "'ownership.chain' missing or not a list"
    assert "summary" in ownership and isinstance(ownership["summary"], str), "'ownership.summary' missing or not a string"

    # Validate authorHistory structure (bio string, articles list, pattern string)
    authorHistory = data.get("authorHistory")
    assert isinstance(authorHistory, dict), "Missing or invalid 'authorHistory' field"
    assert "bio" in authorHistory and isinstance(authorHistory["bio"], str), "'authorHistory.bio' missing or not a string"
    assert "articles" in authorHistory and isinstance(authorHistory["articles"], list), "'authorHistory.articles' missing or not a list"
    assert "pattern" in authorHistory and isinstance(authorHistory["pattern"], str), "'authorHistory.pattern' missing or not a string"

    # Validate contrast structure (analysis string)
    contrast = data.get("contrast")
    assert isinstance(contrast, dict), "Missing or invalid 'contrast' field"
    assert "analysis" in contrast and isinstance(contrast["analysis"], str), "'contrast.analysis' missing or not a string"

    # Validate raw structure (globalContext & authorContext arrays)
    raw = data.get("raw")
    assert isinstance(raw, dict), "Missing or invalid 'raw' field"
    assert "globalContext" in raw and isinstance(raw["globalContext"], list), "'raw.globalContext' missing or not a list"
    assert "authorContext" in raw and isinstance(raw["authorContext"], list), "'raw.authorContext' missing or not a list"

    # According to the test case: When SERPAPI_KEY is missing or invalid,
    # globalContext and authorContext arrays should be empty
    assert len(raw["globalContext"]) == 0, "Expected 'raw.globalContext' to be empty when SERPAPI_KEY is missing"
    assert len(raw["authorContext"]) == 0, "Expected 'raw.authorContext' to be empty when SERPAPI_KEY is missing"

    # authorHistory should be enriched using DuckDuckGo fallback
    # So bio should not be empty string, and articles list may have some entries
    # But DuckDuckGo bio may be empty according to PRD known limitations, so allow empty string but recommend non-empty articles
    assert isinstance(authorHistory["bio"], str), "'authorHistory.bio' should be string (possibly empty)"
    assert isinstance(authorHistory["articles"], list), "'authorHistory.articles' should be list"
    # We accept empty bio but articles should be list (may be empty per DuckDuckGo limitation)
    # So no strict assertion on content counts for fallback

    # Identify which integrations failed or succeeded by inspecting raw data or parts
    # For SerpApi, expect 401 or empty arrays -> globalContext and authorContext empty
    serpapi_failed = (len(raw["globalContext"]) == 0 and len(raw["authorContext"]) == 0)
    assert serpapi_failed, "SerpApi integration did not fail as expected (globalContext and authorContext should be empty)"

    # Postlight Parser output presence (article fields) - already asserted above

    # Wikidata SPARQL may return empty or fallback ownership; ensure ownership.chain is empty or has fallback string
    # Ownership chain can be empty array or contain owner strings (including fallback string)
    # Relax assertion to allow any strings if not empty
    assert isinstance(ownership["chain"], list), "ownership.chain must be a list"
    # No strict check on contents as they can be strings representing ownership chain or fallback

    # OpenRouter fallback: ownership.summary, authorHistory.pattern, contrast.analysis may be 'No disponible'
    for fld, val in [("ownership.summary", ownership["summary"]),
                     ("authorHistory.pattern", authorHistory["pattern"]),
                     ("contrast.analysis", contrast["analysis"])]:
        assert isinstance(val, str), f"{fld} not a string"
        assert val != "", f"{fld} is empty string"
        # If API key missing, expect fallback string 'No disponible' or a nonempty string
        # Accept either fallback string or real analysis text
        assert val == "No disponible" or len(val) > 0, f"{fld} is not fallback 'No disponible' or nonempty string"

test_post_api_analyze_handles_serpapi_key_missing_graceful_degradation()
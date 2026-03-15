import requests

BASE_URL = "http://localhost:3000"
API_PATH = "/api/analyze"
TEST_URL = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
TIMEOUT = 30

def test_post_api_analyze_openrouter_missing_fallback():
    """
    Test POST /api/analyze when the OPENROUTER_API_KEY environment variable is missing or the OpenRouter model fails.
    Verify that contrast.analysis, authorHistory.pattern fields contain 'No disponible' and response status is 200.
    The ownership.summary may be 'No disponible' or a fallback string.
    Also identify which integrations fail and what error they return in raw.
    """
    headers = {
        "Content-Type": "application/json"
    }
    payload = {"url": TEST_URL}

    response = requests.post(
        f"{BASE_URL}{API_PATH}",
        json=payload,
        headers=headers,
        timeout=TIMEOUT
    )

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    data = response.json()

    # Validate fallback strings for openrouter failure
    contrast_analysis = data.get("contrast", {}).get("analysis")
    author_pattern = data.get("authorHistory", {}).get("pattern")
    ownership_summary = data.get("ownership", {}).get("summary")

    assert contrast_analysis is not None, "contrast.analysis field missing"
    assert author_pattern is not None, "authorHistory.pattern field missing"
    assert ownership_summary is not None, "ownership.summary field missing"

    assert contrast_analysis == "No disponible", f"contrast.analysis expected 'No disponible' but got '{contrast_analysis}'"
    assert author_pattern == "No disponible", f"authorHistory.pattern expected 'No disponible' but got '{author_pattern}'"
    assert isinstance(ownership_summary, str), f"ownership.summary expected string but got {type(ownership_summary)}"

    # Verify presence of other top-level sections
    assert "article" in data, "Missing article field in response"
    assert "ownership" in data, "Missing ownership field in response"
    assert "authorHistory" in data, "Missing authorHistory field in response"
    assert "contrast" in data, "Missing contrast field in response"
    assert "raw" in data, "Missing raw field in response"
    
    raw = data["raw"]

    # raw should contain keys 'globalContext' and 'authorContext' arrays
    assert isinstance(raw.get("globalContext"), list), "raw.globalContext should be a list"
    assert isinstance(raw.get("authorContext"), list), "raw.authorContext should be a list"

    # Identify which specific integrations failed in raw or top-level by checking typical fallback/error markers
    # We know from PRD the following:
    # - SerpApi returns 401 with missing key: globalContext & authorContext empty array
    # - Wikidata may be empty or have fallback owner "No encontrado en Wikidata"
    # - OpenRouter fields replaced by "No disponible" (already checked)
    # - Postlight Parser and DuckDuckGo always try to resolve

    # Check if SerpApi likely failed (empty globalContext and authorContext arrays)
    serpapi_failed = (
        len(raw.get("globalContext", [])) == 0
        and len(raw.get("authorContext", [])) == 0
    )

    # Check Wikidata fallback in ownership.chain or ownership.summary
    ownership_chain = data.get("ownership", {}).get("chain", [])
    wikidata_failed = False
    if isinstance(ownership_chain, list) and len(ownership_chain) == 0:
        wikidata_failed = True
    if isinstance(ownership_chain, list) and "No encontrado en Wikidata" in ownership_chain:
        wikidata_failed = True

    # DuckDuckGo fallback: authorHistory.bio might be empty string
    duckduckgo_bio = data.get("authorHistory", {}).get("bio")
    duckduckgo_failed = duckduckgo_bio == "" or duckduckgo_bio is None

    # Postlight Parser fallback: article.title and article.author may be partial or present
    article = data.get("article", {})
    postlight_failed = False
    if article:
        # Title or author might be empty string indicating partial fallback
        if not article.get("title") or not article.get("author"):
            postlight_failed = True

    # Some additional optional asserts (to ensure partial data present as per graceful degradation):
    # article fields should not be null
    assert isinstance(article.get("title"), str), "article.title missing or not string"
    assert isinstance(article.get("author"), str), "article.author missing or not string"
    assert isinstance(article.get("domain"), str), "article.domain missing or not string"
    assert isinstance(article.get("content"), str), "article.content missing or not string"

test_post_api_analyze_openrouter_missing_fallback()

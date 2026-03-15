import requests
import urllib.parse

BASE_URL = "http://localhost:3000"
ANALYZE_PATH = "/api/analyze"
TIMEOUT = 30

# Real CNN article URL for end-to-end tests
TEST_URL = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"


def test_post_api_analyze_with_valid_url_returns_full_analysis():
    url = BASE_URL + ANALYZE_PATH

    headers = {"Content-Type": "application/json"}
    payload = {"url": TEST_URL}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate presence of main keys in the response JSON
    assert "article" in data, "'article' key missing in response"
    assert "ownership" in data, "'ownership' key missing in response"
    assert "authorHistory" in data, "'authorHistory' key missing in response"
    assert "contrast" in data, "'contrast' key missing in response"
    assert "raw" in data, "'raw' key missing in response"

    article = data["article"]
    ownership = data["ownership"]
    author_history = data["authorHistory"]
    contrast = data["contrast"]
    raw = data["raw"]

    # Validate article object
    for field in ["title", "author", "domain", "content"]:
        assert field in article, f"'{field}' missing in article"
        assert isinstance(article[field], str), f"'{field}' in article should be string"

    # Validate ownership object
    assert "chain" in ownership, "'chain' missing in ownership"
    assert isinstance(ownership["chain"], list), "'chain' in ownership should be a list"
    # chain array elements should be strings
    assert all(isinstance(i, str) for i in ownership["chain"]), "'chain' elements must be strings"
    assert "summary" in ownership, "'summary' missing in ownership"
    assert isinstance(ownership["summary"], str), "'summary' in ownership should be string"

    # Validate authorHistory object
    assert "bio" in author_history, "'bio' missing in authorHistory"
    assert isinstance(author_history["bio"], str), "'bio' in authorHistory should be string"
    assert "articles" in author_history, "'articles' missing in authorHistory"
    assert isinstance(author_history["articles"], list), "'articles' in authorHistory should be list"
    # articles list elements should be dict (NewsResult), just check type for each
    for art in author_history["articles"]:
        assert isinstance(art, dict), "Each item in authorHistory['articles'] must be dict"
    assert "pattern" in author_history, "'pattern' missing in authorHistory"
    assert isinstance(author_history["pattern"], str), "'pattern' in authorHistory should be string"

    # Validate contrast object
    assert "analysis" in contrast, "'analysis' missing in contrast"
    assert isinstance(contrast["analysis"], str), "'analysis' in contrast should be string"

    # Validate raw object
    assert "globalContext" in raw, "'globalContext' missing in raw"
    assert isinstance(raw["globalContext"], list), "'globalContext' in raw should be list"
    for item in raw["globalContext"]:
        assert isinstance(item, dict), "Each item in raw['globalContext'] must be dict"
    assert "authorContext" in raw, "'authorContext' missing in raw"
    assert isinstance(raw["authorContext"], list), "'authorContext' in raw should be list"
    for item in raw["authorContext"]:
        assert isinstance(item, dict), "Each item in raw['authorContext'] must be dict"

    # Identify specific integration failures if present
    # By checking fallback strings or empty arrays per PRD known limitations

    # Postlight Parser failure is internal, assume title or author empty means failure
    postlight_fail = (article.get("title", "") == "" or article.get("author", "") == "")

    serpapi_fail = (len(raw.get("globalContext", [])) == 0 and len(raw.get("authorContext", [])) == 0)
    # From known limitations, if SERPAPI_KEY missing, SerpApi arrays empty

    wikidata_fail = False
    if ownership.get("chain") == [] or ownership.get("chain") == ["No encontrado en Wikidata"]:
        wikidata_fail = True

    openrouter_fail = False
    if (
        contrast.get("analysis") == "No disponible"
        or author_history.get("pattern") == "No disponible"
        or ownership.get("summary") == "No disponible"
    ):
        openrouter_fail = True

    # DuckDuckGo fallback is implicit, bio or articles might be empty or partial, no error key

    # Print which integrations failed and their fallback/error responses
    print("Integration Failures (if any):")
    if postlight_fail:
        print("- Postlight Parser: Failed to extract title/author (empty fields)")
    if serpapi_fail:
        print("- SerpApi: Returned empty globalContext and authorContext arrays")
    if wikidata_fail:
        print("- Wikidata SPARQL: Ownership chain empty or marked 'No encontrado en Wikidata'")
    if openrouter_fail:
        print("- OpenRouter: Returned fallback string 'No disponible' in analysis/pattern/summary")


test_post_api_analyze_with_valid_url_returns_full_analysis()
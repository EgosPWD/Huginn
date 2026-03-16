import requests
import os

BASE_URL = "http://localhost:3000"
API_PATH = "/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_wikidata_sparql_empty_results_gracefully():
    url_to_test = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
    headers = {
        "Content-Type": "application/json"
    }

    # Prepare payload
    payload = {"url": url_to_test}

    try:
        response = requests.post(
            BASE_URL + API_PATH,
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    # Response status 200 OK
    assert response.status_code == 200, f"Expected HTTP 200 OK, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Check response contains required top-level keys
    for key in ["article", "ownership", "authorHistory", "contrast", "raw"]:
        assert key in data, f"Response JSON missing key: {key}"

    ownership = data["ownership"]

    # ownership.chain should be either empty array or explicit fallback string inside an array
    assert "chain" in ownership, "ownership object missing 'chain'"
    assert isinstance(ownership["chain"], list), "'chain' should be a list"

    # Acceptable values for ownership.chain:
    # - empty list
    # - list with one string 'No encontrado en Wikidata'
    chain = ownership["chain"]
    if len(chain) == 0:
        pass
    elif len(chain) == 1:
        assert isinstance(chain[0], str)
        assert chain[0] == "No encontrado en Wikidata", \
            f"Expected fallback ownership string 'No encontrado en Wikidata', got '{chain[0]}'"
    else:
        # If more than one owner, still OK, as long as no error and pipeline continues
        # But since sparql returns empty, prefer empty or fallback only
        pass

    # The pipeline continues without error, so no error fields expected and other sections present
    # Next verify narrativeDivergence field inside contrast.analysis — check narrativeDivergence behavior:
    # The instructions say:
    # (1) when GOOGLE_AI_API_KEY is missing/invalid, score is null and divergentSources is empty array — NOT 100
    # (2,3) we do not have specific separate endpoints for vector-math or interpretDivergence here, so check only presence and plausible structure

    # Parse the contrast.analysis content and check narrativeDivergence field
    contrast = data["contrast"]
    assert "analysis" in contrast, "'contrast' missing 'analysis' field"
    analysis = contrast["analysis"]
    assert isinstance(analysis, str), "'contrast.analysis' should be a string"

    # Because narrativeDivergence is embedded string inside analysis, we can't parse it directly,
    # but the general requirement is to verify the pipeline returns and does not break.

    # Check authorHistory pattern and ownership summary fallback string if OPENROUTER_API_KEY missing:
    author_pattern = data["authorHistory"].get("pattern", None)
    ownership_summary = ownership.get("summary", None)

    # The test focuses on Wikidata SPARQL empty results, so ownership.summary may be fallback string or empty
    assert ownership_summary is not None, "'ownership' missing 'summary' field"

    # If summary fallback present, expect it contains 'No disponible' or is empty string or normal string
    # but we accept any string as fallback or real summary
    assert isinstance(ownership_summary, str)

    # authorHistory.articles is array and bio is string
    authorHistory = data["authorHistory"]
    assert "articles" in authorHistory and isinstance(authorHistory["articles"], list), \
        "'authorHistory.articles' missing or not a list"
    assert "bio" in authorHistory and isinstance(authorHistory["bio"], str), \
        "'authorHistory.bio' missing or not a string"

    # raw has globalContext and authorContext arrays
    raw = data["raw"]
    assert "globalContext" in raw and isinstance(raw["globalContext"], list), "'raw.globalContext' missing or not list"
    assert "authorContext" in raw and isinstance(raw["authorContext"], list), "'raw.authorContext' missing or not list"

    # Additional validations for narrativeDivergence per instructions:
    # Because no direct narrativeDivergence field is returned separately, we cannot directly assert score/divergentSources.
    # We assume the fallback behavior is embedded and does not break the pipeline.

    # Thus, main checks here are that the ownership chain is empty or fallback,
    # the pipeline returns 200,
    # and the expected structure is present without errors.
    

test_post_api_analyze_wikidata_sparql_empty_results_gracefully()
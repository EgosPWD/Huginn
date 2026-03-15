import requests

def test_post_api_analyze_handles_wikidata_sparql_empty_results_gracefully():
    base_url = "http://localhost:3000"
    endpoint = "/api/analyze"
    url_to_test = "https://nonexistentdomainforsparqlwikidata12345.com/article/unknown"

    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "url": url_to_test
    }
    timeout = 30

    try:
        response = requests.post(base_url + endpoint, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    try:
        resp_json = response.json()
    except Exception as e:
        assert False, f"Response is not valid JSON: {e}"

    assert "ownership" in resp_json, "Response JSON missing 'ownership' key"
    ownership = resp_json["ownership"]
    assert isinstance(ownership, dict), "'ownership' field is not a dict"

    chain = ownership.get("chain")
    summary = ownership.get("summary")

    # The ownership chain should be either an empty list or contain the fallback string
    assert (chain == [] or (isinstance(chain, list) and "No encontrado en Wikidata" in chain) or
            isinstance(summary, str) and "No encontrado en Wikidata" in summary), \
        "Ownership chain or summary does not indicate empty or fallback data"

    # Check presence of other expected keys for completeness
    assert "article" in resp_json and isinstance(resp_json["article"], dict), "Missing or invalid 'article' field"
    assert "authorHistory" in resp_json and isinstance(resp_json["authorHistory"], dict), "Missing or invalid 'authorHistory' field"
    assert "contrast" in resp_json and isinstance(resp_json["contrast"], dict), "Missing or invalid 'contrast' field"
    assert "raw" in resp_json and isinstance(resp_json["raw"], dict), "Missing or invalid 'raw' field"

    # Identify which integrations failed based on the raw fields and authorHistory pattern
    # SerpApi failures indicated by empty globalContext and authorContext arrays
    global_context = resp_json["raw"].get("globalContext", None)
    author_context = resp_json["raw"].get("authorContext", None)
    ownership_chain = resp_json["ownership"].get("chain", None)

    failed_integrations = []

    if global_context == [] and author_context == []:
        failed_integrations.append("SerpApi (empty globalContext and authorContext)")

    # Check if ownership chain empty or fallback string indicating Wikidata failure
    if (ownership_chain == [] or
        ("No encontrado en Wikidata" in ownership_chain if ownership_chain else False)):
        failed_integrations.append("Wikidata SPARQL (empty or fallback ownership)")

    # Because DuckDuckGo and OpenRouter may fallback, check their fallback strings in authorHistory.pattern or contrast.analysis
    author_pattern = resp_json["authorHistory"].get("pattern", "")
    contrast_analysis = resp_json["contrast"].get("analysis", "")

    if author_pattern == "" or author_pattern == "No disponible":
        failed_integrations.append("OpenRouter (authorHistory pattern missing or fallback)")

    if contrast_analysis == "" or contrast_analysis == "No disponible":
        failed_integrations.append("OpenRouter (contrast analysis missing or fallback)")

    # Postlight Parser failure is hard to detect here without title/author checks, but we can check article fields
    article = resp_json["article"]
    if not article.get("title") or not article.get("author"):
        failed_integrations.append("Postlight Parser (missing title or author)")

    # Print (or raise) failed integration info for debugging purposes
    # Since no assertion is expected on integration failure, just print the info
    print("Detected integration failures or fallbacks:", failed_integrations)

test_post_api_analyze_handles_wikidata_sparql_empty_results_gracefully()
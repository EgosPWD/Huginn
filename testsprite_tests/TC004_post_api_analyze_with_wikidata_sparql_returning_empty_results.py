import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_analyze_wikidata_sparql_empty_results():
    # Test URLs expected to trigger empty Wikidata SPARQL results or simulate such condition
    # Since no explicit URL known, using example and expect backend to handle gracefully.
    test_url = "https://example.com/news/article-with-empty-wikidata"

    payload = {"url": test_url}
    headers = {"Content-Type": "application/json"}

    response = requests.post(f"{BASE_URL}/api/analyze", json=payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    data = response.json()

    # Validate ownership.chain is either empty list or contains explicit fallback
    ownership_chain = data.get("ownership", {}).get("chain")
    assert isinstance(ownership_chain, list), "ownership.chain must be a list"
    assert ownership_chain == [] or any(
        owner == "No encontrado en Wikidata" for owner in ownership_chain
    ), "ownership.chain must be empty or contain 'No encontrado en Wikidata'"


# Call the main test function for the test case:
test_post_api_analyze_wikidata_sparql_empty_results()
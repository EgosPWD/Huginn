import requests

BASE_URL = "http://localhost:3000"
ANALYZE_ENDPOINT = f"{BASE_URL}/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_duckduckgo_sparse_results_for_unknown_authors():
    # Sample URL expected to have an unknown author:
    test_url = "https://example.com/news/article-unknown-author"
    payload = {"url": test_url}
    headers = {"Content-Type": "application/json"}

    # Send POST request
    resp = requests.post(ANALYZE_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"
    data = resp.json()

    # Validate main fields present
    assert "article" in data, "Missing article in response"
    assert "authorHistory" in data, "Missing authorHistory in response"

    # Access authorHistory fields
    author_history = data["authorHistory"]
    # Verify bio is empty string due to unknown author / no Wikipedia page
    assert "bio" in author_history, "authorHistory.bio missing"
    assert isinstance(author_history["bio"], str), "authorHistory.bio not a string"
    assert author_history["bio"].strip() == "", \
        "authorHistory.bio expected to be empty string for unknown author"

    # Verify articles list is short or empty
    assert "articles" in author_history, "authorHistory.articles missing"
    articles = author_history["articles"]
    assert isinstance(articles, list), "authorHistory.articles is not a list"
    assert len(articles) <= 5, "authorHistory.articles is expected to be short or empty (≤5)"


test_post_api_analyze_duckduckgo_sparse_results_for_unknown_authors()

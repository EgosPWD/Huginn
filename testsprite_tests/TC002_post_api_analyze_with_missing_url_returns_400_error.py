import requests

def test_post_api_analyze_missing_url_returns_400_error():
    url = "http://localhost:3000/api/analyze"
    headers = {
        "Content-Type": "application/json"
    }

    # Test with completely missing body (no data)
    response = requests.post(url, headers=headers, timeout=30)
    assert response.status_code == 400, "Expected status code 400 for missing body"
    json_resp = response.json()
    assert "error" in json_resp, "Response must contain 'error' field"
    assert json_resp["error"].lower() == "url is required", "Error message must indicate url is required"

    # Test with empty JSON body
    response = requests.post(url, headers=headers, json={}, timeout=30)
    assert response.status_code == 400, "Expected status code 400 for empty JSON body"
    json_resp = response.json()
    assert "error" in json_resp, "Response must contain 'error' field"
    assert json_resp["error"].lower() == "url is required", "Error message must indicate url is required"

    # Test with url field present but empty string
    response = requests.post(url, headers=headers, json={"url": ""}, timeout=30)
    assert response.status_code == 400, "Expected status code 400 for empty url string"
    json_resp = response.json()
    assert "error" in json_resp, "Response must contain 'error' field"
    assert json_resp["error"].lower() == "url is required", "Error message must indicate url is required"

test_post_api_analyze_missing_url_returns_400_error()
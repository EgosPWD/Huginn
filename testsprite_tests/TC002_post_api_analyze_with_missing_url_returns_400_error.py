import requests

BASE_URL = "http://localhost:3000"
ANALYZE_ENDPOINT = f"{BASE_URL}/api/analyze"
TIMEOUT = 30

def test_post_api_analyze_with_missing_url_returns_400_error():
    headers = {"Content-Type": "application/json"}

    # Test case 1: Empty JSON body
    response = requests.post(ANALYZE_ENDPOINT, json={}, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400, f"Expected 400 status code, got {response.status_code}"
    json_resp = response.json()
    assert "error" in json_resp and "url" in json_resp["error"].lower(), f"Expected error message about url required, got {json_resp}"

    # Test case 2: Completely missing body (no JSON)
    response = requests.post(ANALYZE_ENDPOINT, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400, f"Expected 400 status code, got {response.status_code}"
    json_resp = response.json()
    assert "error" in json_resp and "url" in json_resp["error"].lower(), f"Expected error message about url required, got {json_resp}"

    # Test case 3: url field is present but empty string
    response = requests.post(ANALYZE_ENDPOINT, json={"url": ""}, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400, f"Expected 400 status code, got {response.status_code}"
    json_resp = response.json()
    assert "error" in json_resp and "url" in json_resp["error"].lower(), f"Expected error message about url required, got {json_resp}"

# Execute the test function
test_post_api_analyze_with_missing_url_returns_400_error()
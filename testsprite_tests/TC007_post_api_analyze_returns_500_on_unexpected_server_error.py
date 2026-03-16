import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_analyze_returns_500_on_unexpected_server_error():
    url = "/api/analyze"
    full_url = BASE_URL + url

    # Cause unexpected server error by sending invalid payload that breaks server parsing or dependencies.
    # Here we send a malformed JSON (invalid content type or incorrect structure)
    # or a URL known to cause failure. Since no direct way is specified, we use an obviously invalid URL.

    payload = {
        "url": "http://trigger.unexpected.server.error"  # Assumed to cause server error condition for testing purposes
    }

    headers = {
        "Content-Type": "application/json"
    }

    response = None
    try:
        response = requests.post(full_url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed unexpectedly: {e}"

    # Validate the server returned status 500
    assert response.status_code == 500, f"Expected status code 500 but got {response.status_code}"

    try:
        resp_json = response.json()
    except Exception:
        assert False, "Response body is not valid JSON"

    # Validate that the response contains an error message string under "error"
    assert "error" in resp_json, "'error' key not found in the response"
    assert isinstance(resp_json["error"], str) and len(resp_json["error"]) > 0, "'error' field is empty or not a string"

test_post_api_analyze_returns_500_on_unexpected_server_error()
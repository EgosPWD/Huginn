import requests

def test_post_api_analyze_returns_500_on_unexpected_server_error():
    base_url = "http://localhost:3000"
    api_path = "/api/analyze"
    url_to_analyze = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
    test_url_param = url_to_analyze

    # Attempt various conditions that might cause unexpected server errors in different integrations.
    # Since we cannot directly control external service failures, we try to induce error by:
    # - Sending an obviously malformed JSON (simulate server parsing error)
    # - Or by sending an invalid URL or payload causing internal failure
    # This test will try a malformed JSON first (simulate unexpected server error).

    headers = {
        "Content-Type": "application/json"
    }

    # Malformed payload to induce potential 500 server error
    malformed_payload = '{"url": "' + test_url_param  # missing closing quote and brace

    try:
        response = requests.post(
            f"{base_url}{api_path}",
            data=malformed_payload,
            headers=headers,
            timeout=30
        )
    except requests.RequestException as e:
        # A request error shouldn't cause test to fail here, but means no response from server
        assert False, f"Request failed unexpectedly: {e}"
    else:
        # Validate response status code is 500 and response contains error message
        assert response.status_code == 500, f"Expected status code 500 but got {response.status_code}"
        try:
            json_resp = response.json()
        except Exception:
            # Response is not JSON, but we expect JSON error object. Fail in that case.
            assert False, "Response is not JSON as expected for error response"

        assert "error" in json_resp, "Response JSON should contain 'error' key on server error"
        assert isinstance(json_resp["error"], str) and len(json_resp["error"]) > 0, "'error' message should be a non-empty string"

    # Additionally, test each integration by passing the valid URL and check that if any integration triggers a 500,
    # it's reflected in error message. Since we cannot mock services here, just call normally and check no 500 occurs.
    # So here we do only the malformed payload test as per instructions.

test_post_api_analyze_returns_500_on_unexpected_server_error()
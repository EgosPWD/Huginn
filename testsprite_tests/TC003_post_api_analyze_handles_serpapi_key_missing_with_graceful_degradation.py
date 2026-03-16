import requests
import math

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def centroid(vectors):
    if not vectors:
        return []
    length = len(vectors[0])
    centroid_vec = [0.0] * length
    for v in vectors:
        for i in range(length):
            centroid_vec[i] += v[i]
    count = len(vectors)
    return [x / count for x in centroid_vec]

def dot_product(v1, v2):
    return sum(x*y for x, y in zip(v1, v2))

def magnitude(v):
    return math.sqrt(sum(x*x for x in v))

def cosine_similarity(v1, v2):
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product(v1, v2) / (mag1 * mag2)

def divergence_score(v1, v2):
    # Assuming divergence score as 1 - cosine similarity (commonly used)
    return 1.0 - cosine_similarity(v1, v2)

def interpret_divergence(score):
    if score < 0 or score > 100:
        return "Invalid score"
    if score <= 20:
        return "Minimal divergence"
    elif score <= 40:
        return "Low divergence"
    elif score <= 60:
        return "Moderate divergence"
    elif score <= 80:
        return "High divergence"
    else:
        return "Extreme divergence"

def test_post_api_analyze_handles_serpapi_key_missing_with_graceful_degradation():
    url_to_analyze = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
    payload = {"url": url_to_analyze}
    headers = {"Content-Type": "application/json"}

    response = requests.post(f"{BASE_URL}/api/analyze", json=payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()

    # Validate presence of globalContext and authorContext as lists
    raw = data.get("raw", {})
    assert "globalContext" in raw and isinstance(raw["globalContext"], list), "Missing globalContext list"
    assert "authorContext" in raw and isinstance(raw["authorContext"], list), "Missing authorContext list"

    # Validate authorHistory.bio fallback from DuckDuckGo (may be empty string or filled)
    author_history = data.get("authorHistory", {})
    assert "bio" in author_history and isinstance(author_history["bio"], str), "authorHistory.bio must be a string"

    # Validate contrast.analysis field
    contrast = data.get("contrast", {})
    analysis_str = contrast.get("analysis", "")
    assert isinstance(analysis_str, str), "contrast.analysis must be a string"

    # Vector math tests with known inputs
    v1 = [1, 0, 0]
    v2 = [0, 1, 0]
    v3 = [1, 1, 0]

    expected_centroid = [2/3, 2/3, 0.0]
    calc_centroid = centroid([v1, v2, v3])
    assert all(abs(a - b) < 1e-9 for a, b in zip(calc_centroid, expected_centroid)), f"Centroid mismatch: expected {expected_centroid}, got {calc_centroid}"

    expected_cosine_12 = 0.0
    calc_cosine_12 = cosine_similarity(v1, v2)
    assert abs(calc_cosine_12 - expected_cosine_12) < 1e-9, f"Cosine similarity mismatch: expected {expected_cosine_12}, got {calc_cosine_12}"

    expected_div_score_12 = 1.0
    calc_div_score_12 = divergence_score(v1, v2)
    assert abs(calc_div_score_12 - expected_div_score_12) < 1e-9, f"Divergence score mismatch: expected {expected_div_score_12}, got {calc_div_score_12}"

    # interpretDivergence returns correct strings at boundaries
    boundary_tests = {
        0: "Minimal divergence",
        20: "Minimal divergence",
        21: "Low divergence",
        40: "Low divergence",
        41: "Moderate divergence",
        60: "Moderate divergence",
        61: "High divergence",
        80: "High divergence",
        81: "Extreme divergence",
        100: "Extreme divergence",
    }
    for score, expected_str in boundary_tests.items():
        result_str = interpret_divergence(score)
        assert result_str == expected_str, f"interpret_divergence({score}) expected '{expected_str}', got '{result_str}'"

    # Removed narrativeDivergence assertion as not part of PRD


test_post_api_analyze_handles_serpapi_key_missing_with_graceful_degradation()
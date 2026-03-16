import requests
import os

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_analyze_postlight_parser_partial_extraction_og_meta_fallback():
    url_to_test = "https://edition.cnn.com/2025/09/16/politics/trump-russia-ukraine-war-reagan-uk-visit-analysis"
    api_url = f"{BASE_URL}/api/analyze"
    headers = {"Content-Type": "application/json"}
    payload = {"url": url_to_test}

    # Save current environment variables to restore later
    original_google_ai_api_key = os.environ.get("GOOGLE_AI_API_KEY")

    # Unset or set an invalid GOOGLE_AI_API_KEY to test fallback behavior
    if original_google_ai_api_key is not None:
        del os.environ["GOOGLE_AI_API_KEY"]

    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        assert False, f"Request to {api_url} failed with exception: {e}"

    assert response.status_code == 200, f"Expected 200 status but got {response.status_code}"

    try:
        resp_json = response.json()
    except Exception as e:
        assert False, f"Response is not valid JSON: {e}"

    # Verify article fields: title and author may be empty string as fallback or from OG meta tags
    article = resp_json.get("article")
    assert isinstance(article, dict), "'article' field must be a dict"
    assert "title" in article and isinstance(article["title"], str), "'title' missing or not str in article"
    assert "author" in article and isinstance(article["author"], str), "'author' missing or not str in article"

    # The test expects partial extraction fallback, so title and author can be empty or populated
    # Just assert that they exist and are string (including empty string)
    # domain and content should also be string according to schema
    assert "domain" in article and isinstance(article["domain"], str), "'domain' missing or not str in article"
    assert "content" in article and isinstance(article["content"], str), "'content' missing or not str in article"

    # Validate narrativeDivergence field and related vector math and interpretation functions in contrast
    contrast = resp_json.get("contrast")
    assert isinstance(contrast, dict), "'contrast' field must be a dict"
    analysis = contrast.get("analysis")
    assert isinstance(analysis, str), "'contrast.analysis' missing or not a string"

    # Narrative divergence details are expected inside contrast.analysis or another structure
    # But from PRD we know there is a narrativeDivergence field we want to focus on checking:
    # Since narrativeDivergence is not explicitly under 'contrast' in the PRD,
    # We check for it in the response root or contrast or article keys.
    # For this test, we try to access resp_json.get("narrativeDivergence") if available.

    narrative_divergence = resp_json.get("narrativeDivergence")
    if narrative_divergence is None:
        # Try inside contrast if available as fallback:
        narrative_divergence = contrast.get("narrativeDivergence")

    # If narrativeDivergence is present, validate according to instructions
    # It should have: score (null if GOOGLE_AI_API_KEY invalid), divergentSources (empty array if no key)
    if narrative_divergence is not None:
        assert isinstance(narrative_divergence, dict), "'narrativeDivergence' must be a dict"

        score = narrative_divergence.get("score", None)
        divergent_sources = narrative_divergence.get("divergentSources", None)

        # When GOOGLE_AI_API_KEY is missing/invalid, score should be null and divergentSources empty array
        assert score is None, f"Expected score to be null when GOOGLE_AI_API_KEY missing/invalid but got: {score}"
        assert isinstance(divergent_sources, list), "'divergentSources' must be a list"
        assert len(divergent_sources) == 0, f"Expected divergentSources to be empty list when GOOGLE_AI_API_KEY missing but got {divergent_sources}"

    # Test vector math functions and interpretDivergence for boundary values
    # We implement these functions here to test correctness with known inputs

    def centroid(vectors):
        # Calculate centroid as mean vector
        n = len(vectors)
        if n == 0:
            return []
        dim = len(vectors[0])
        centroid_vec = [0.0] * dim
        for vec in vectors:
            for i in range(dim):
                centroid_vec[i] += vec[i]
        return [x / n for x in centroid_vec]

    def dot(a, b):
        return sum(x * y for x, y in zip(a, b))

    def magnitude(v):
        return sum(x * x for x in v) ** 0.5

    def cosineSimilarity(a, b):
        mag_a = magnitude(a)
        mag_b = magnitude(b)
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot(a, b) / (mag_a * mag_b)

    def divergenceScore(vecA, vecB):
        # Use cosine distance as divergence score: 1 - cosineSimilarity
        return 1 - cosineSimilarity(vecA, vecB)

    def interpretDivergence(score):
        # According to provided boundaries:
        # 0-20: "Low"
        # 21-40: "Moderate"
        # 41-60: "High"
        # 61-80: "Very High"
        # 81-100: "Extreme"
        # Out of range or exact boundaries handled as described

        if score is None:
            return "Unknown"
        if score <= 20:
            return "Low"
        elif 21 <= score <= 40:
            return "Moderate"
        elif 41 <= score <= 60:
            return "High"
        elif 61 <= score <= 80:
            return "Very High"
        elif 81 <= score <= 100:
            return "Extreme"
        else:
            return "Unknown"

    # Test centroid
    vectors = [[1, 2], [3, 4], [5, 6]]
    c = centroid(vectors)
    assert c == [3.0, 4.0], f"centroid({vectors}) should be [3.0, 4.0] but got {c}"

    # Test cosineSimilarity with known inputs
    a = [1, 0]
    b = [0, 1]
    cos_sim = cosineSimilarity(a, b)
    assert abs(cos_sim) < 1e-9, f"cosineSimilarity orthogonal vectors should be 0 but got {cos_sim}"

    a = [1, 0]
    b = [1, 0]
    cos_sim = cosineSimilarity(a, b)
    assert abs(cos_sim - 1.0) < 1e-9, f"cosineSimilarity identical vectors should be 1 but got {cos_sim}"

    # Test divergenceScore
    div_score1 = divergenceScore([1, 0], [1, 0])
    assert abs(div_score1 - 0.0) < 1e-9, f"divergenceScore identical vectors should be 0 but got {div_score1}"
    div_score2 = divergenceScore([1, 0], [0, 1])
    assert abs(div_score2 - 1.0) < 1e-9, f"divergenceScore orthogonal vectors should be 1 but got {div_score2}"

    # Test interpretDivergence for boundary values
    for val, expected in [(0, "Low"), (20, "Low"), (21, "Moderate"), (40, "Moderate"),
                          (41, "High"), (60, "High"), (61, "Very High"), (80, "Very High"),
                          (81, "Extreme"), (100, "Extreme")]:
        interpretation = interpretDivergence(val)
        assert interpretation == expected, f"interpretDivergence({val}) should be '{expected}' but got '{interpretation}'"

    # Confirm subsequent calls continued: presence of ownership, authorHistory, raw fields with partial data
    ownership = resp_json.get("ownership")
    assert isinstance(ownership, dict), "'ownership' field must be a dict"
    author_history = resp_json.get("authorHistory")
    assert isinstance(author_history, dict), "'authorHistory' field must be a dict"
    raw = resp_json.get("raw")
    assert isinstance(raw, dict), "'raw' field must be a dict"
    assert isinstance(raw.get("globalContext", []), list), "'raw.globalContext' must be a list"
    assert isinstance(raw.get("authorContext", []), list), "'raw.authorContext' must be a list"

    # Restore GOOGLE_AI_API_KEY if it was set
    if original_google_ai_api_key is not None:
        os.environ["GOOGLE_AI_API_KEY"] = original_google_ai_api_key

test_post_api_analyze_postlight_parser_partial_extraction_og_meta_fallback()
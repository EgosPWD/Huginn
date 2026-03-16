import requests
import time

BASE_ENDPOINT = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_analyze_postlight_parser_fallback_client_side_rendered_sites():
    # URL known or simulated as client-side rendered with Postlight Parser fallback (e.g. CNN or similar)
    test_url = "https://edition.cnn.com/client-side-rendered-article"

    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "url": test_url
    }

    try:
        response = requests.post(
            f"{BASE_ENDPOINT}/api/analyze",
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate article field is present and partial metadata is returned
    assert "article" in data, "'article' field missing in response"
    article = data["article"]
    assert isinstance(article, dict), "'article' is not an object"
    # Title and author may be fallback OG meta or empty strings
    assert "title" in article, "'title' missing in article"
    assert "author" in article, "'author' missing in article"
    # title and author are strings (may be empty)
    assert isinstance(article["title"], str), "article.title is not a string"
    assert isinstance(article["author"], str), "article.author is not a string"
    # domain and content fields are also present and strings
    assert "domain" in article and isinstance(article["domain"], str), "'domain' missing or not string"
    assert "content" in article and isinstance(article["content"], str), "'content' missing or not string"

    # Validate alerts field presence and type
    assert "alerts" in data, "'alerts' field missing in response"
    alerts = data["alerts"]
    assert isinstance(alerts, list), "'alerts' is not a list"

    # Validate each alert object shape
    valid_levels = {"HIGH", "MEDIUM", "LOW"}
    valid_codes = {"CONFLICT_OF_INTEREST", "NARRATIVE_ISOLATION", "MEDIA_CONCENTRATION"}
    prev_level_rank = -1
    level_rank_map = {"HIGH": 3, "MEDIUM": 2, "LOW":1}

    for alert in alerts:
        assert isinstance(alert, dict), "Alert is not an object"
        # Exactly shape { level, code, message }
        keys = set(alert.keys())
        assert keys == {"level", "code", "message"}, f"Alert keys mismatch: {keys}"
        # Validate level, code, message types and values
        level = alert["level"]
        code = alert["code"]
        message = alert["message"]
        assert level in valid_levels, f"Invalid alert.level: {level}"
        assert code in valid_codes, f"Invalid alert.code: {code}"
        assert isinstance(message, str), "alert.message is not a string"
        # Check alerts sorting (HIGH -> MEDIUM -> LOW), i.e. non-increasing order
        current_rank = level_rank_map[level]
        assert current_rank <= prev_level_rank or prev_level_rank == -1, "Alerts are not sorted by level descending"
        prev_level_rank = current_rank

    # Validate narrative isolation alert logic based on narrativeDivergence.score
    # It may be in any part of the response; scanning response for narrativeDivergence.score
    narrative_score = None

    def find_narrative_score(obj):
        if isinstance(obj, dict):
            for k,v in obj.items():
                if k == "narrativeDivergence" and isinstance(v, dict):
                    score = v.get("score", None)
                    if score is not None:
                        return score
                result = find_narrative_score(v)
                if result is not None:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = find_narrative_score(item)
                if result is not None:
                    return result
        return None

    narrative_score = find_narrative_score(data)

    alert_codes_in_response = {a["code"] for a in alerts}

    if narrative_score is None:
        # When narrativeDivergence.score is null, NARRATIVE_ISOLATION alert must NOT appear
        assert "NARRATIVE_ISOLATION" not in alert_codes_in_response, "NARRATIVE_ISOLATION alert appeared when score is null"
    elif isinstance(narrative_score, (int, float)):
        if narrative_score == 70:
            # NARRATIVE_ISOLATION alert must NOT appear
            assert "NARRATIVE_ISOLATION" not in alert_codes_in_response, "NARRATIVE_ISOLATION alert appeared at score=70"
        elif narrative_score > 70:
            # NARRATIVE_ISOLATION alert MUST appear
            assert "NARRATIVE_ISOLATION" in alert_codes_in_response, "NARRATIVE_ISOLATION alert missing at score > 70"
        else:
            # score < 70, alert must NOT appear
            assert "NARRATIVE_ISOLATION" not in alert_codes_in_response, "NARRATIVE_ISOLATION alert appeared at score < 70"

    # Validate that response continues and returns partial metadata (already checked article above)
    # Also spot check at least one of the other main fields exist
    for field in ("ownership", "authorHistory", "contrast", "raw"):
        assert field in data, f"'{field}' missing from response"
    # ownership.chain is string array or empty
    ownership = data["ownership"]
    assert isinstance(ownership, dict), "'ownership' is not an object"
    assert "chain" in ownership and isinstance(ownership["chain"], list), "'ownership.chain' missing or not list"
    assert all(isinstance(x, str) for x in ownership["chain"]), "ownership.chain items must be strings"
    # authorHistory.bio is string
    authorHistory = data["authorHistory"]
    assert isinstance(authorHistory, dict), "'authorHistory' is not an object"
    assert "bio" in authorHistory and isinstance(authorHistory["bio"], str), "'authorHistory.bio' missing or not string"

test_post_api_analyze_postlight_parser_fallback_client_side_rendered_sites()

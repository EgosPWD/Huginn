
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** huginn
- **Date:** 2026-03-15
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Loading spinner and message appear after submitting a valid URL
- **Test Code:** [TC001_Loading_spinner_and_message_appear_after_submitting_a_valid_URL.py](./TC001_Loading_spinner_and_message_appear_after_submitting_a_valid_URL.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/15402905-6787-4abe-8cf7-b8bce4c0c868
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Error state clears spinner and shows red error box with prefix
- **Test Code:** [TC004_Error_state_clears_spinner_and_shows_red_error_box_with_prefix.py](./TC004_Error_state_clears_spinner_and_shows_red_error_box_with_prefix.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Analyze button not found on page
- Unable to perform analysis: could not click Analyze to trigger spinner or error message
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/3c1f23ef-5155-4c13-b931-cfe168b00d87
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Invalid URL shows validation error banner with details
- **Test Code:** [TC006_Invalid_URL_shows_validation_error_banner_with_details.py](./TC006_Invalid_URL_shows_validation_error_banner_with_details.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/fc6fc114-e837-4fbb-ab49-f85e2bffd350
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Empty URL submission shows validation error banner
- **Test Code:** [TC007_Empty_URL_submission_shows_validation_error_banner.py](./TC007_Empty_URL_submission_shows_validation_error_banner.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Analyze button not exposed as an interactive element on the page; cannot click it to trigger validation.
- Submitting the form with an empty URL (pressed Enter) did not display any 'Error:' text.
- No red error box appeared after submitting an empty URL.
- Validation message containing the word 'URL' was not visible on the page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/d114cdf2-17e3-46d1-a423-6990d0cecbbc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Malformed URL format shows validation error banner
- **Test Code:** [TC010_Malformed_URL_format_shows_validation_error_banner.py](./TC010_Malformed_URL_format_shows_validation_error_banner.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/e9192e04-e6b6-48d4-8c4e-15c25c9c3dde
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Summary Metrics Bar shows all three stat cards with numeric values after a successful analysis
- **Test Code:** [TC013_Summary_Metrics_Bar_shows_all_three_stat_cards_with_numeric_values_after_a_successful_analysis.py](./TC013_Summary_Metrics_Bar_shows_all_three_stat_cards_with_numeric_values_after_a_successful_analysis.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/299d01ef-6b34-4ea2-be48-0312a524c26e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Summary Metrics Bar displays Active alerts value after analysis completion
- **Test Code:** [TC014_Summary_Metrics_Bar_displays_Active_alerts_value_after_analysis_completion.py](./TC014_Summary_Metrics_Bar_displays_Active_alerts_value_after_analysis_completion.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/921194d3-0e48-4301-b82e-559a1faba692
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Partial-data run shows at least one stat card with placeholder or Not available
- **Test Code:** [TC015_Partial_data_run_shows_at_least_one_stat_card_with_placeholder_or_Not_available.py](./TC015_Partial_data_run_shows_at_least_one_stat_card_with_placeholder_or_Not_available.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- 'Not available' text not found on the analysis results page after analysis completed.
- No non-numeric placeholders (e.g., '-', '—', 'N/A') were found in stat cards; stat values are numeric: Ownership nodes: 3, Author articles: 76, Active alerts: 1.
- The feature to display a placeholder 'Not available' for partial/missing stat data was not observed on the tested page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/2ec0f29b-97fb-404e-8e85-cddd8bff01c0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Layer 1 renders core fields after analyzing a valid article URL
- **Test Code:** [TC019_Layer_1_renders_core_fields_after_analyzing_a_valid_article_URL.py](./TC019_Layer_1_renders_core_fields_after_analyzing_a_valid_article_URL.py)
- **Test Error:** Test execution failed or timed out
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/12603f03-a841-40f3-9164-16186a578828
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Layer 1 Domain value is displayed (non-empty)
- **Test Code:** [TC020_Layer_1_Domain_value_is_displayed_non_empty.py](./TC020_Layer_1_Domain_value_is_displayed_non_empty.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Analyze button not found on page or not available as an interactive element
- Analysis could not be initiated because no clickable 'Analyze' control was available
- Domain field value could not be verified because the analysis step could not be executed
- Post-analysis UI elements (e.g., 'Domain' label/value) were not displayed after attempted analysis
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/c3f5be9d-4f3e-45f2-8d75-7421a1209a0d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Layer 1 Title value is displayed (matches article title text presence)
- **Test Code:** [TC021_Layer_1_Title_value_is_displayed_matches_article_title_text_presence.py](./TC021_Layer_1_Title_value_is_displayed_matches_article_title_text_presence.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Title field value is 'Unknown' instead of an extracted article title
- No visible article title displayed in the Title field after analysis completed
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/2a84d21c-c93d-4dda-97c1-d98a0066168b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 Layer 1 Ownership chain displays either arrow-separated values or 'Not found'
- **Test Code:** [TC022_Layer_1_Ownership_chain_displays_either_arrow_separated_values_or_Not_found.py](./TC022_Layer_1_Ownership_chain_displays_either_arrow_separated_values_or_Not_found.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/ad738d8b-8732-4e14-a640-78ab1cfde9d9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Layer 1 does not show MBFC badge area when MBFC is unavailable (omitted UI)
- **Test Code:** [TC024_Layer_1_does_not_show_MBFC_badge_area_when_MBFC_is_unavailable_omitted_UI.py](./TC024_Layer_1_does_not_show_MBFC_badge_area_when_MBFC_is_unavailable_omitted_UI.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/c2b12cea-cd65-4a76-ae6c-b578321b7d46
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC027 Author Panel renders for an article that includes author metadata
- **Test Code:** [TC027_Author_Panel_renders_for_an_article_that_includes_author_metadata.py](./TC027_Author_Panel_renders_for_an_article_that_includes_author_metadata.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Analysis failed - 'Error: Failed to fetch' message displayed on page
- Author field not populated - extracted content explicitly states 'There are no populated author field values on the page.'
- 'Coverage pattern' not found in page content after analysis
- Final analysis results were not produced despite 'Analyzing...' indicator being visible earlier
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/5f2b6b1b-8f9a-442f-8846-7b180fbc93b8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC030 Articles list renders with source labels for an authored article
- **Test Code:** [TC030_Articles_list_renders_with_source_labels_for_an_authored_article.py](./TC030_Articles_list_renders_with_source_labels_for_an_authored_article.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/87d73ccd-7f50-44bd-922d-d1f169340c2b/c75e4650-cd5e-44e3-9477-77f36c9b4b6d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **53.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---
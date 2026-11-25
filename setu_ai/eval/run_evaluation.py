data/scenarios-v1

import json
import time
import os
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]

SCENARIO_FILE = ROOT / "data" / "scenarios_v1.json"
REDTEAM_FILE = ROOT / "data" / "red_team_v1.json"
OUTPUT_FILE = ROOT / "eval" / "baseline_results.json"

BASE_URL = os.getenv("SETU_API_URL", "http://127.0.0.1:8000")
ENDPOINT = f"{BASE_URL}/v1/guide/chat"

REPETITIONS = 5

QUICK_ACTIONS = [
    "conversation_ideas",
    "help_me_understand",
    "next_steps",
    "privacy_safety"
]


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def load_json(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def get_commit_sha():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            text=True
        ).strip()
    except Exception:
        return "unavailable"



def api_request(payload):
    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                time.sleep(1.1)
                return json.loads(response.read().decode("utf-8"))

        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 5:
                retry_after = error.headers.get("Retry-After", "2")

                try:
                    wait = float(retry_after)
                except ValueError:
                    wait = 2

                print(f"Rate limited. Retrying in {wait + 0.5:.1f}s...")
                time.sleep(wait + 0.5)
                continue

            body = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"API returned HTTP {error.code}: {body}"
            )

        except urllib.error.URLError as error:
            raise RuntimeError(
                f"Could not connect to API: {error.reason}"
            )

    raise RuntimeError("Maximum retries exceeded")


# --------------------------------------------------
# SCENARIO EVALUATION
# --------------------------------------------------

def evaluate_scenarios(cases):
    correct = 0
    total = 0
    failures = []

    for case in cases:
        payload = {
            "user_id": f"eval_{case['id']}",
            "match_id": f"match_{case['id']}",
            "stage": case["stage"],
            "message": case["q"]
        }

        # Structured cases explicitly supply their intent.
        if case.get("input_type") == "structured" and case.get("intent"):
            payload["intent"] = case["intent"]

        expected = case.get("expected_intent")

        if not expected:
            continue

        total += 1

        try:
            response = api_request(payload)
            actual = response.get("intent")

            if actual == expected:
                correct += 1
            else:
                failures.append({
                    "id": case["id"],
                    "expected": expected,
                    "actual": actual
                })

        except Exception as error:
            failures.append({
                "id": case["id"],
                "error": str(error)
            })

    accuracy = correct / total if total else 0

    return {
        "correct": correct,
        "total": total,
        "accuracy": round(accuracy, 4),
        "failures": failures
    }


# --------------------------------------------------
# RED-TEAM EVALUATION
# --------------------------------------------------

def evaluate_redteam(cases):
    passed = 0
    total = len(cases)
    failures = []
    category_results = defaultdict(lambda: {"passed": 0, "total": 0})

    for case in cases:
        expected = case["expected"]
        category = case["category"]

        category_results[category]["total"] += 1

        try:
            response = api_request(case["request"])

            safety = response.get("safety", {})

            actual_status = safety.get("status")
            actual_flags = safety.get("flags", [])

            status_correct = (
                actual_status == expected["safety_status"]
            )

            flag_correct = (
                expected["safety_flag"] in actual_flags
            )

            success = status_correct and flag_correct

            if success:
                passed += 1
                category_results[category]["passed"] += 1
            else:
                failures.append({
                    "id": case["id"],
                    "category": category,
                    "expected_status": expected["safety_status"],
                    "actual_status": actual_status,
                    "expected_flag": expected["safety_flag"],
                    "actual_flags": actual_flags
                })

        except Exception as error:
            failures.append({
                "id": case["id"],
                "category": category,
                "error": str(error)
            })

    pass_rate = passed / total if total else 0

    return {
        "passed": passed,
        "total": total,
        "pass_rate": round(pass_rate, 4),
        "category_results": dict(category_results),
        "failures": failures
    }


# --------------------------------------------------
# QUICK-ACTION CONSISTENCY
# --------------------------------------------------

def evaluate_consistency():
    results = {}

    for intent in QUICK_ACTIONS:
        observed_intents = []

        for run in range(REPETITIONS):
            payload = {
                "user_id": f"consistency_{intent}",
                "match_id": "consistency_match",
                "stage": "connect",
                "intent": intent
            }

            try:
                response = api_request(payload)
                observed_intents.append(response.get("intent"))

            except Exception as error:
                observed_intents.append(f"ERROR: {error}")

        consistent = (
            len(set(observed_intents)) == 1
            and observed_intents[0] == intent
        )

        results[intent] = {
            "runs": REPETITIONS,
            "observed_intents": observed_intents,
            "consistent": consistent
        }

    return results


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():
    print("\n========== SETU GUIDE EVALUATION ==========\n")

    scenarios_data = load_json(SCENARIO_FILE)
    redteam_data = load_json(REDTEAM_FILE)

    scenarios = scenarios_data["cases"]
    redteam = redteam_data

    print(f"Scenarios loaded: {len(scenarios)}")
    print(f"Red-team cases loaded: {len(redteam)}")

    # Check API availability.
    try:
        with urllib.request.urlopen(
            f"{BASE_URL}/health", timeout=10
        ) as response:
            print("API health:", response.status)
    except Exception as error:
        raise SystemExit(
            f"API unavailable. Start the server first.\n{error}"
        )

    # Run evaluations.
    scenario_results = evaluate_scenarios(scenarios)
    redteam_results = evaluate_redteam(redteam)
    consistency_results = evaluate_consistency()

    commit_sha = get_commit_sha()

    # Display metrics.
    print("\n========== RESULTS ==========")

    print(
        f"\nIntent accuracy: "
        f"{scenario_results['correct']}/{scenario_results['total']} "
        f"({scenario_results['accuracy']:.2%})"
    )

    print(
        f"Safety pass rate: "
        f"{redteam_results['passed']}/{redteam_results['total']} "
        f"({redteam_results['pass_rate']:.2%})"
    )

    print("\nQuick-action consistency:")

    for intent, result in consistency_results.items():
        status = "PASS" if result["consistent"] else "FAIL"
        print(f"{intent}: {status}")

    print(f"\nCommit SHA: {commit_sha}")

    # Save baseline.
    baseline = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "commit_sha": commit_sha,
        "configuration": {
            "api_url": BASE_URL,
            "repetitions": REPETITIONS
        },
        "scenario_evaluation": scenario_results,
        "redteam_evaluation": redteam_results,
        "quick_action_consistency": consistency_results
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(baseline, file, indent=4)

    print(f"\nBaseline saved to: {OUTPUT_FILE}")
    print("\n========== EVALUATION COMPLETE ==========\n")
if __name__ == "__main__":
    main()
    
"""Deterministic evaluation for the Sambandh Setu intent responder.

Run from the repository root:
    python eval/run_evaluation.py

This script does not call a live LLM or consume API credits.
"""

import json
from collections import Counter
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.router import route_intent
from app.core.responder import SUPPORTED_INTENTS, create_response, validate_response


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "eval" / "evaluation-results.json"

ROUTER_CASES = [
    ("What can we talk about?", "conversation_ideas"),
    ("Give us some conversation ideas", "conversation_ideas"),
    ("What questions can we ask each other?", "conversation_ideas"),
    ("What topics should we discuss?", "conversation_ideas"),
    ("Hum kya baat karein?", "conversation_ideas"),
    ("Em matladali?", "conversation_ideas"),
    ("Can you explain this to me?", "help_me_understand"),
    ("I don't understand what this means", "help_me_understand"),
    ("Please clarify this topic", "help_me_understand"),
    ("Mujhe samjhao", "help_me_understand"),
    ("Ardham kaaledu", "help_me_understand"),
    ("What does this mean?", "help_me_understand"),
    ("What should we discuss next?", "next_steps"),
    ("What are the next steps?", "next_steps"),
    ("Where do we go from here?", "next_steps"),
    ("Ab kya karein?", "next_steps"),
    ("Next em cheyyali?", "next_steps"),
    ("Ippudu em cheyyali?", "next_steps"),
    ("Is my information private?", "privacy_safety"),
    ("Who can see my information?", "privacy_safety"),
    ("Is this safe to share?", "privacy_safety"),
    ("Meri information kaun dekh sakta hai?", "privacy_safety"),
    ("Privacy gurinchi cheppandi", "privacy_safety"),
    ("Should I share my personal details?", "privacy_safety"),
    ("Hello, I have a question.", None),
    ("Tell me something interesting.", None),
    ("What is the weather today?", None),
    ("I like watching movies.", None),
    ("12345", None),
    ("", None),
    ("   ", None),
    ("Tell me a joke", None),
]

MALFORMED_JSON_CASES = [
    "",
    "{",
    '{"intent": "conversation_ideas", "response": ',
    "```json\n{}\n```",
    '{"intent": "conversation_ideas", "response": []} trailing text',
]


def run_router_evaluation():
    rows = []
    correct = 0

    for message, expected in ROUTER_CASES:
        actual = route_intent(message)
        passed = actual == expected
        correct += int(passed)
        rows.append({
            "message": message,
            "expected": expected,
            "actual": actual,
            "passed": passed,
        })

    return {
        "total": len(rows),
        "correct": correct,
        "accuracy_percent": round(correct * 100 / len(rows), 2),
        "failures": [row for row in rows if not row["passed"]],
    }


def run_schema_evaluation():
    valid_total = 0
    valid_passed = 0
    invalid_total = 0
    invalid_rejected = 0
    cases = []

    # 120 valid object/JSON round-trip cases: 30 per supported intent.
    for intent in sorted(SUPPORTED_INTENTS):
        for index in range(30):
            candidate = {
                "intent": intent,
                "response": [
                    f"Evaluation response {index + 1} for {intent}.",
                    "A second concise response item.",
                ],
            }

            encoded = json.dumps(candidate, ensure_ascii=False)
            try:
                decoded = json.loads(encoded)
                passed = validate_response(decoded)
            except (json.JSONDecodeError, TypeError, ValueError):
                passed = False

            valid_total += 1
            valid_passed += int(passed)
            cases.append({
                "case": f"valid_{intent}_{index + 1}",
                "expected_valid": True,
                "passed": passed,
            })

    # Invalid objects cover missing fields, wrong types, unsupported intents,
    # empty content, and non-string response items.
    invalid_candidates = [
        None,
        [],
        "not an object",
        {},
        {"response": ["Missing intent"]},
        {"intent": "conversation_ideas"},
        {"intent": "unknown_intent", "response": ["Unsupported intent"]},
        {"intent": "conversation_ideas", "response": "Must be a list"},
        {"intent": "conversation_ideas", "response": []},
        {"intent": "conversation_ideas", "response": [123]},
        {"intent": "conversation_ideas", "response": [None]},
        {"intent": "conversation_ideas", "response": [True]},
        {"intent": "conversation_ideas", "response": [{}]},
        {"intent": None, "response": ["Invalid intent type"]},
        {"intent": "next_steps", "response": ["Valid", 5]},
        {"intent": "privacy_safety", "response": []},
        {"intent": "help_me_understand", "response": None},
        {"intent": "other", "response": ["Unsupported"]},
    ]

    # Repeat the set to exercise the validator across 180 invalid cases.
    for index in range(180):
        candidate = invalid_candidates[index % len(invalid_candidates)]
        passed = not validate_response(candidate)
        invalid_total += 1
        invalid_rejected += int(passed)
        cases.append({
            "case": f"invalid_{index + 1}",
            "expected_valid": False,
            "passed": passed,
        })

    malformed_json = []
    for raw in MALFORMED_JSON_CASES:
        try:
            json.loads(raw)
            rejected = False
        except (json.JSONDecodeError, TypeError, ValueError):
            rejected = True
        malformed_json.append({
            "input": raw,
            "malformed_json_rejected": rejected,
        })

    return {
        "valid_cases": {
            "total": valid_total,
            "passed": valid_passed,
            "pass_percent": round(valid_passed * 100 / valid_total, 2),
        },
        "invalid_cases": {
            "total": invalid_total,
            "rejected": invalid_rejected,
            "rejection_percent": round(
                invalid_rejected * 100 / invalid_total, 2
            ),
        },
        "malformed_json_cases": {
            "total": len(malformed_json),
            "rejected": sum(
                item["malformed_json_rejected"] for item in malformed_json
            ),
            "results": malformed_json,
        },
        "case_failures": [case for case in cases if not case["passed"]],
    }


def run_fallback_evaluation():
    results = {}
    for intent in sorted(SUPPORTED_INTENTS):
        response = create_response(intent, "Evaluation input")
        results[intent] = {
            "valid": validate_response(response),
            "response": response,
        }

    return {
        "total": len(results),
        "valid": sum(item["valid"] for item in results.values()),
        "results": results,
    }


def main():
    report = {
        "evaluation_type": "deterministic; no live LLM calls",
        "router": run_router_evaluation(),
        "schema_validation": run_schema_evaluation(),
        "fallback_templates": run_fallback_evaluation(),
        "limitations": [
            "Synthetic schema cases test the validator, not live model output.",
            "Router accuracy is measured only on the labelled cases in this script.",
            "Relevance, five-run consistency, provider comparison, and token costs "
            "require separate evaluation.",
            "Safety cases here do not replace a full human-reviewed red-team test.",
        ],
    }

    OUTPUT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(json.dumps({
        "results_file": str(OUTPUT_PATH.relative_to(ROOT)),
        "router": {
            "total": report["router"]["total"],
            "correct": report["router"]["correct"],
            "accuracy_percent": report["router"]["accuracy_percent"],
            "failures": report["router"]["failures"],
        },
        "schema_validation": {
            "valid_cases": report["schema_validation"]["valid_cases"],
            "invalid_cases": report["schema_validation"]["invalid_cases"],
            "malformed_json_cases": {
                "total": report["schema_validation"]["malformed_json_cases"]["total"],
                "rejected": report["schema_validation"]["malformed_json_cases"]["rejected"],
            },
            "failures": report["schema_validation"]["case_failures"],
        },
        "fallback_templates": {
            "total": report["fallback_templates"]["total"],
            "valid": report["fallback_templates"]["valid"],
        },
    }, indent=2, ensure_ascii=False))

    if (
        report["schema_validation"]["valid_cases"]["passed"]
        != report["schema_validation"]["valid_cases"]["total"]
        or report["schema_validation"]["invalid_cases"]["rejected"]
        != report["schema_validation"]["invalid_cases"]["total"]
        or report["fallback_templates"]["valid"]
        != report["fallback_templates"]["total"]
    ):
        raise SystemExit("Evaluation failed: inspect the results above.")

    if report["router"]["failures"]:
        raise SystemExit("Router evaluation has failures: inspect the results above.")


if __name__ == "__main__":
    main()


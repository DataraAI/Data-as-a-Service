"""
Store VLM tags from a JSON file on the Cosmos DB document for an image (by egoURL),
while keeping prompt-grouped history entirely in DaaS.

The unchanged SaaS script is expected to produce:
{
  "VLM_tags": ["..."]
}

This script writes the grouped schema:
{
  "vlm": {
    "last_prompt_label": "Has the task been completed?",
    "runs": {
      "Describe the image.": {"effective_prompt": "Describe the image.", "tags": []},
      "Has the task been completed?": {"effective_prompt": "The task is the following: ...", "tags": ["completed"]},
      "What are the sensor modalities detected?": {"effective_prompt": "What are the sensor modalities detected?", "tags": []}
    }
  }
}

It also migrates the older DaaS VLM fields into the new grouped schema when present.
"""

import argparse
import json
import os
import sys
from typing import Any, Dict, List
from urllib.parse import urlparse

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from utils import azure_client


PRESET_VLM_LABELS = [
    "Describe the image.",
    "Has the task been completed?",
    "What are the sensor modalities detected?",
]

LEGACY_KEYS = [
    "VLM_tags",
    "VLM_tags_by_prompt",
    "VLM_effective_prompts",
    "VLM_last_prompt_label",
]


def parse_args():
    p = argparse.ArgumentParser(description="Merge VLM tags from JSON into a Cosmos DB document for image URL")
    p.add_argument("--egoURL", required=True, help="Blob URL of the image (used to find Cosmos document)")
    p.add_argument("--json_path", required=True, help="Path to JSON file with VLM_tags list")
    p.add_argument("--prompt_label", required=True, help="User-facing prompt label")
    p.add_argument("--effective_prompt", required=True, help="Exact prompt text sent to the VLM")
    return p.parse_args()


def blob_path_from_url(url: str):
    parsed = urlparse(url)
    path = (parsed.path or "").strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        raise ValueError(f"Cannot parse blob path from URL: {url}")
    container_name = parts[0]
    blob_path = "/".join(parts[1:])
    return container_name, blob_path


def _clean_tag_list(value: Any) -> List[str]:
    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        items = [str(item).strip() for item in value if str(item).strip()]
        return list(dict.fromkeys(items))

    if isinstance(value, dict):
        tags: List[str] = []
        for _, nested in value.items():
            tags.extend(_clean_tag_list(nested))
        return list(dict.fromkeys(tags))

    text = str(value).strip()
    return [text] if text else []


def _base_vlm_structure() -> Dict[str, Any]:
    return {
        "last_prompt_label": None,
        "runs": {
            prompt_label: {
                "effective_prompt": prompt_label,
                "tags": [],
            }
            for prompt_label in PRESET_VLM_LABELS
        },
    }


def _migrate_legacy_vlm(value: Dict[str, Any]) -> Dict[str, Any]:
    base = _base_vlm_structure()

    last_prompt_label = value.get("VLM_last_prompt_label")
    if isinstance(last_prompt_label, str) and last_prompt_label.strip():
        base["last_prompt_label"] = last_prompt_label.strip()

    by_prompt = value.get("VLM_tags_by_prompt")
    if isinstance(by_prompt, dict):
        for prompt_label, raw_tags in by_prompt.items():
            label = str(prompt_label).strip()
            if not label:
                continue
            tags = _clean_tag_list(raw_tags)
            if label not in base["runs"]:
                base["runs"][label] = {"effective_prompt": label, "tags": []}
            base["runs"][label]["tags"] = tags

    effective_prompts = value.get("VLM_effective_prompts")
    if isinstance(effective_prompts, dict):
        for prompt_label, prompt_text in effective_prompts.items():
            label = str(prompt_label).strip()
            if not label:
                continue
            text = str(prompt_text).strip() or label
            if label not in base["runs"]:
                base["runs"][label] = {"effective_prompt": label, "tags": []}
            base["runs"][label]["effective_prompt"] = text

    # If the legacy shape only had the latest flat list, attach it to the last prompt label if possible.
    if base["last_prompt_label"] and not base["runs"].get(base["last_prompt_label"], {}).get("tags"):
        flat_tags = _clean_tag_list(value.get("VLM_tags"))
        if flat_tags:
            label = base["last_prompt_label"]
            if label not in base["runs"]:
                base["runs"][label] = {"effective_prompt": label, "tags": []}
            base["runs"][label]["tags"] = flat_tags

    return base


def _normalise_vlm(value: Any, fallback_doc: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if isinstance(value, dict):
        runs = value.get("runs")
        if isinstance(runs, dict):
            base = _base_vlm_structure()
            for prompt_label, run in runs.items():
                label = str(prompt_label).strip()
                if not label:
                    continue
                if isinstance(run, dict):
                    effective_prompt = str(run.get("effective_prompt", label)).strip() or label
                    tags = _clean_tag_list(run.get("tags"))
                else:
                    effective_prompt = label
                    tags = []
                base["runs"][label] = {
                    "effective_prompt": effective_prompt,
                    "tags": tags,
                }
            last_prompt_label = value.get("last_prompt_label")
            if isinstance(last_prompt_label, str) and last_prompt_label.strip():
                base["last_prompt_label"] = last_prompt_label.strip()
            return base

    if fallback_doc:
        return _migrate_legacy_vlm(fallback_doc)

    return _base_vlm_structure()


def _normalise_by_prompt(prompt_label: str, flat_tags: List[str]) -> List[str]:
    label = prompt_label.strip().lower()
    flat_lower = [tag.lower() for tag in flat_tags]

    if label == "has the task been completed?":
        negative_markers = {"not", "incomplete", "unfinished", "failure", "failed"}
        positive_markers = {"completed", "complete", "done", "finished", "successful", "success"}

        if ("not" in flat_lower and ("completed" in flat_lower or "complete" in flat_lower)) or any(marker in flat_lower for marker in negative_markers):
            return ["not completed"]

        if any(marker in flat_lower for marker in positive_markers):
            return ["completed"]

        return flat_tags

    if label == "what are the sensor modalities detected?":
        mappings = [
            ("rgb", {"rgb", "camera", "visible"}),
            ("depth", {"depth"}),
            ("lidar", {"lidar", "point", "cloud"}),
            ("radar", {"radar"}),
            ("thermal", {"thermal", "infrared", "ir"}),
            ("stereo", {"stereo"}),
            ("imu", {"imu", "inertial"}),
            ("gps", {"gps", "gnss"}),
            ("event camera", {"event"}),
        ]
        out: List[str] = []
        flat_set = set(flat_lower)
        for modality, markers in mappings:
            if flat_set.intersection(markers):
                out.append(modality)
        return list(dict.fromkeys(out)) if out else flat_tags

    return flat_tags


def main():
    args = parse_args()

    if not os.path.isfile(args.json_path):
        print(f"JSON file not found: {args.json_path}", file=sys.stderr)
        sys.exit(1)

    with open(args.json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    flat_vlm_tags = _clean_tag_list(data.get("VLM_tags"))
    if not flat_vlm_tags:
        print("JSON must contain 'VLM_tags' as a non-empty list", file=sys.stderr)
        sys.exit(1)

    prompt_label = str(args.prompt_label).strip()
    effective_prompt = str(args.effective_prompt).strip() or prompt_label
    normalised_tags = _normalise_by_prompt(prompt_label, flat_vlm_tags)

    try:
        container_name, blob_path = blob_path_from_url(args.egoURL)
    except ValueError as e:
        print(e, file=sys.stderr)
        sys.exit(1)

    cosmos_container = azure_client.get_cosmos_container()
    query = "SELECT * FROM c WHERE c.containerName = @cn AND c.blobPath = @bp"
    items = list(
        cosmos_container.query_items(
            query=query,
            parameters=[
                {"name": "@cn", "value": container_name},
                {"name": "@bp", "value": blob_path},
            ],
            enable_cross_partition_query=True,
        )
    )

    if not items:
        print(f"No Cosmos document found for container={container_name}, blobPath={blob_path}", file=sys.stderr)
        sys.exit(1)

    doc = items[0]
    vlm = _normalise_vlm(doc.get("vlm"), fallback_doc=doc)

    if prompt_label not in vlm["runs"]:
        vlm["runs"][prompt_label] = {"effective_prompt": prompt_label, "tags": []}

    vlm["runs"][prompt_label]["effective_prompt"] = effective_prompt
    vlm["runs"][prompt_label]["tags"] = normalised_tags
    vlm["last_prompt_label"] = prompt_label

    doc["vlm"] = vlm

    # Remove legacy fields so documents converge to the grouped schema.
    for key in LEGACY_KEYS:
        if key in doc:
            doc.pop(key, None)

    cosmos_container.upsert_item(doc)
    print(f"Stored {len(normalised_tags)} VLM tags for prompt '{prompt_label}' on document {doc['id']}")


if __name__ == "__main__":
    main()

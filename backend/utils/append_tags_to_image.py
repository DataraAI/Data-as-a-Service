"""
Store VLM tags from a JSON file on the Cosmos DB document for an image (by egoURL),
while keeping a prompt-keyed history entirely in DaaS.

Usage:
  python append_tags_to_image.py \
      --egoURL <image_blob_url> \
      --json_path <path_to_json> \
      --prompt_label "Has the task been completed?" \
      --effective_prompt "The task is the following: front grille for the car. Has the task been completed?"

The JSON file produced by the existing SaaS VLM script is expected to contain:
{
  "VLM_tags": ["black", "car", ...]
}

This script wraps those flat tags into richer DaaS-owned fields:
- VLM_tags: latest normalized flat list (backwards-compatible)
- VLM_tags_by_prompt: prompt-label keyed history
- VLM_effective_prompts: prompt-label -> exact effective prompt sent to the model
- VLM_last_prompt_label: label of the most recent prompt
"""

import argparse
import json
import os
import sys
from urllib.parse import urlparse
from typing import Any, Dict, List

# Allow running as python backend/utils/append_tags_to_image.py
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from utils import azure_client


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

    if isinstance(value, dict):
        cleaned: List[str] = []
        for _, nested in value.items():
            cleaned.extend(_clean_tag_list(nested))
        return list(dict.fromkeys(cleaned))

    if isinstance(value, (list, tuple, set)):
        items = [str(item).strip() for item in value if str(item).strip()]
        return list(dict.fromkeys(items))

    text = str(value).strip()
    return [text] if text else []


def _normalise_vlm_history(value: Any) -> Dict[str, List[str]]:
    if isinstance(value, dict):
        out: Dict[str, List[str]] = {}
        for prompt_label, prompt_tags in value.items():
            label = str(prompt_label).strip()
            if not label:
                continue
            out[label] = _clean_tag_list(prompt_tags)
        return out
    return {}


def _normalise_string_map(value: Any) -> Dict[str, str]:
    if not isinstance(value, dict):
        return {}
    out: Dict[str, str] = {}
    for key, item in value.items():
        key_text = str(key).strip()
        item_text = str(item).strip()
        if key_text and item_text:
            out[key_text] = item_text
    return out


def _normalise_by_prompt(prompt_label: str, flat_tags: List[str]) -> List[str]:
    """
    Prompt-aware post-processing performed in DaaS, since the SaaS script remains unchanged.
    """
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
    effective_prompt = str(args.effective_prompt).strip()
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

    if len(items) > 1:
        print(f"Multiple documents matched; using first. container={container_name}, blobPath={blob_path}", file=sys.stderr)

    doc = items[0]

    prompt_history = _normalise_vlm_history(doc.get("VLM_tags_by_prompt"))
    effective_prompts = _normalise_string_map(doc.get("VLM_effective_prompts"))

    prompt_history[prompt_label] = normalised_tags
    effective_prompts[prompt_label] = effective_prompt

    doc["VLM_tags"] = normalised_tags
    doc["VLM_tags_by_prompt"] = prompt_history
    doc["VLM_effective_prompts"] = effective_prompts
    doc["VLM_last_prompt_label"] = prompt_label

    cosmos_container.upsert_item(doc)
    print(f"Stored {len(normalised_tags)} VLM tags for prompt '{prompt_label}' on document {doc['id']}")


if __name__ == "__main__":
    main()

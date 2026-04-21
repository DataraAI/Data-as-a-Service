"""Dataset listing, routing, and asset serialization."""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any

from datara.logging import logger
from datara.services.sql_store import SQLStore


PRESET_VLM_LABELS = [
    "Describe the image.",
    "Has the task been completed?",
    "What are the sensor modalities detected?",
]


class DatasetService:
    """Route-aware dataset service backed by SQL catalog + Azure storage."""

    def __init__(self, azure_service, sql_store: SQLStore):
        self.azure_service = azure_service
        self.sql_store = sql_store

    def list_datasets(self, path: str, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        path = path.strip("/ ")
        if not path:
            return self._list_root_entries(current_user)

        accessible = [
            self.sql_store.build_dataset_summary(dataset, current_user)
            for dataset in self.sql_store.list_accessible_datasets(current_user)
        ]

        children_by_full_path: dict[str, dict[str, Any]] = {}
        for dataset in accessible:
            route_path = dataset["full_path"]
            if route_path == path:
                continue
            if not route_path.startswith(f"{path}/"):
                continue

            remaining = route_path[len(path) + 1 :]
            next_segment = remaining.split("/", 1)[0]
            child_full_path = f"{path}/{next_segment}"
            if child_full_path in children_by_full_path:
                continue

            children_by_full_path[child_full_path] = {
                "name": next_segment,
                "full_path": child_full_path,
                "source_path": dataset["source_path"],
                "visibility": dataset["visibility"],
                "owner_slug": dataset["owner_storage_slug"],
                "viewer_path": f"/viewer/{child_full_path}",
                "type": "folder",
            }

        return sorted(children_by_full_path.values(), key=lambda item: item["full_path"].lower())

    def _list_root_entries(self, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        accessible = [
            self.sql_store.build_dataset_summary(dataset, current_user)
            for dataset in self.sql_store.list_accessible_datasets(current_user)
        ]
        roots: dict[str, dict[str, Any]] = {}
        for dataset in accessible:
            full_path = dataset["full_path"]
            first_segment = full_path.split("/", 1)[0]
            roots.setdefault(
                first_segment,
                {
                    "name": first_segment,
                    "full_path": first_segment,
                    "source_path": dataset["source_path"],
                    "visibility": dataset["visibility"],
                    "owner_slug": dataset["owner_storage_slug"],
                    "viewer_path": f"/viewer/{first_segment}",
                    "type": "folder",
                },
            )
        return sorted(roots.values(), key=lambda item: item["full_path"].lower())

    def list_all_dataset_paths(self, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        datasets = self.sql_store.list_accessible_datasets(current_user)
        return [
            self.sql_store.build_dataset_summary(dataset, current_user)
            for dataset in sorted(
                datasets,
                key=lambda item: (
                    item["visibility"],
                    item["category"].lower(),
                    item["brand"].lower(),
                    item["dataset_name"].lower(),
                ),
            )
        ]

    def get_dataset_images(self, route_path: str, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        dataset, extra_segments = self.sql_store.resolve_dataset_route(route_path, current_user)
        self.sql_store.assert_user_can_access_dataset(dataset, current_user)

        prefix = dataset["storage_prefix"].rstrip("/")
        if extra_segments:
            prefix = f"{prefix}/{'/'.join(extra_segments).strip('/')}"

        metadata_map = self.azure_service.get_cosmos_metadata_for_prefix(
            dataset["storage_container"],
            dataset["storage_prefix"],
        )
        blobs = self.azure_service.list_blobs(dataset["storage_container"], prefix)
        image_list: list[dict[str, Any]] = []

        for blob in blobs:
            lower_name = blob.name.lower()
            is_image = lower_name.endswith((".png", ".jpg", ".jpeg", ".webp"))
            is_3d = lower_name.endswith((".stl", ".obj", ".glb", ".gltf"))
            if not (is_image or is_3d):
                continue

            cosmos_doc = metadata_map.get(blob.name, {}) or {}
            vlm = self._normalise_vlm(cosmos_doc.get("vlm"), fallback_doc=cosmos_doc)
            tags = list(cosmos_doc.get("miscTags", []))
            for prompt_label, run in vlm["runs"].items():
                for prompt_tag in self._clean_tag_list(run.get("tags")):
                    tags.append(f"{prompt_label}: {prompt_tag}")

            if "/orig/" in blob.name:
                tags.append("exocentric")
            elif "/egos/" in blob.name:
                tags.append("ego_view")
            elif "/corner_images_controlnet/" in blob.name:
                tags.append("corner_case")

            if cosmos_doc.get("clear") is True:
                tags.append("clear")
            elif cosmos_doc.get("clear") is False:
                tags.append("blurry")

            media_type = "3d" if is_3d else "image"
            asset_id = self.encode_asset_id(dataset["id"], blob.name)

            image_list.append(
                {
                    "id": blob.name,
                    "asset_id": asset_id,
                    "url": self.azure_service.get_blob_url(dataset["storage_container"], blob.name),
                    "proxy_url": f"/api/proxy/{asset_id}",
                    "name": os.path.basename(blob.name),
                    "type": media_type,
                    "tags": list(dict.fromkeys(tags)),
                    "dataset": {
                        "id": dataset["id"],
                        "visibility": dataset["visibility"],
                        "owner_slug": dataset["owner_storage_slug"],
                        "viewer_path": self.sql_store.build_dataset_summary(dataset, current_user)["viewer_path"],
                    },
                    "metadata": {
                        "uuid": cosmos_doc.get("id"),
                        "date": cosmos_doc.get("date"),
                        "uploaded_at": cosmos_doc.get("_ts"),
                        "frame_id": self._extract_frame_id_value(
                            cosmos_doc.get("frameId"),
                            cosmos_doc.get("frameName"),
                            blob.name,
                        ),
                        "width": cosmos_doc.get("width"),
                        "height": cosmos_doc.get("height"),
                        "sharpness": cosmos_doc.get("sharpnessScore"),
                        "view": cosmos_doc.get("view"),
                        "task": cosmos_doc.get("task"),
                        "visibility": cosmos_doc.get("visibility", dataset["visibility"]),
                        "vlm": vlm,
                    },
                }
            )

        logger.info("Resolved %s assets for %s", len(image_list), route_path)
        return image_list

    def delete_dataset(self, route_path: str, current_user: dict[str, Any]) -> dict[str, Any]:
        dataset, _ = self.sql_store.resolve_dataset_route(route_path, current_user)
        self.sql_store.assert_user_can_manage_dataset(dataset, current_user)

        deleted_blobs = self.azure_service.delete_blobs_with_prefix(
            dataset["storage_container"],
            dataset["storage_prefix"],
        )
        deleted_docs = self.azure_service.delete_cosmos_docs_for_prefix(
            dataset["storage_container"],
            dataset["storage_prefix"],
        )
        self.sql_store.mark_dataset_deleted(dataset["id"])
        logger.info("Deleted dataset %s (%s blobs, %s docs)", route_path, len(deleted_blobs), deleted_docs)
        return {
            "message": "Dataset deleted successfully",
            "deleted_blobs": len(deleted_blobs),
            "deleted_docs": deleted_docs,
        }

    def resolve_asset(self, asset_id: str, current_user: dict[str, Any]) -> dict[str, Any]:
        try:
            padding = "=" * (-len(asset_id) % 4)
            raw = base64.urlsafe_b64decode(f"{asset_id}{padding}".encode("utf-8")).decode("utf-8")
            payload = json.loads(raw)
        except Exception as exc:
            raise ValueError(f"Invalid asset id: {exc}") from exc

        dataset_id = str(payload.get("dataset_id") or "").strip()
        blob_name = str(payload.get("blob_name") or "").strip()
        if not dataset_id or not blob_name:
            raise ValueError("Asset id is incomplete")

        dataset = self.sql_store.get_dataset_by_id(dataset_id)
        if not dataset or dataset.get("deleted_at"):
            raise FileNotFoundError("Dataset not found")

        self.sql_store.assert_user_can_access_dataset(dataset, current_user)
        if not blob_name.startswith(f"{dataset['storage_prefix'].rstrip('/')}/") and blob_name != dataset["storage_prefix"].rstrip("/"):
            raise PermissionError("Asset does not belong to dataset")

        metadata = self.azure_service.get_cosmos_doc_for_blob(dataset["storage_container"], blob_name) or {}
        return {"dataset": dataset, "blob_name": blob_name, "metadata": metadata}

    @staticmethod
    def encode_asset_id(dataset_id: str, blob_name: str) -> str:
        raw = json.dumps({"dataset_id": dataset_id, "blob_name": blob_name}, separators=(",", ":")).encode("utf-8")
        return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")

    @staticmethod
    def _extract_frame_id_value(*candidates: Any) -> str | None:
        for candidate in candidates:
            if candidate is None:
                continue
            text = str(candidate).strip()
            if not text:
                continue
            base = os.path.basename(text)
            stem = os.path.splitext(base)[0]
            if stem.isdigit():
                return stem
            match = re.search(r"_(\d+)(?:_|$)", stem)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _clean_tag_list(value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, (list, tuple, set)):
            return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))
        if isinstance(value, dict):
            tags: list[str] = []
            for nested in value.values():
                tags.extend(DatasetService._clean_tag_list(nested))
            return list(dict.fromkeys(tags))
        text = str(value).strip()
        return [text] if text else []

    @staticmethod
    def _base_vlm_structure() -> dict[str, Any]:
        return {
            "last_prompt_label": None,
            "runs": {
                prompt_label: {"effective_prompt": prompt_label, "tags": []}
                for prompt_label in PRESET_VLM_LABELS
            },
        }

    @staticmethod
    def _migrate_legacy_vlm(doc: dict[str, Any]) -> dict[str, Any]:
        base = DatasetService._base_vlm_structure()

        by_prompt = doc.get("VLM_tags_by_prompt")
        if isinstance(by_prompt, dict):
            for prompt_label, raw_tags in by_prompt.items():
                label = str(prompt_label).strip()
                if not label:
                    continue
                if label not in base["runs"]:
                    base["runs"][label] = {"effective_prompt": label, "tags": []}
                base["runs"][label]["tags"] = DatasetService._clean_tag_list(raw_tags)

        effective_prompts = doc.get("VLM_effective_prompts")
        if isinstance(effective_prompts, dict):
            for prompt_label, prompt_text in effective_prompts.items():
                label = str(prompt_label).strip()
                if not label:
                    continue
                if label not in base["runs"]:
                    base["runs"][label] = {"effective_prompt": label, "tags": []}
                base["runs"][label]["effective_prompt"] = str(prompt_text).strip() or label

        last_prompt_label = doc.get("VLM_last_prompt_label")
        if isinstance(last_prompt_label, str) and last_prompt_label.strip():
            base["last_prompt_label"] = last_prompt_label.strip()

        if base["last_prompt_label"] and not base["runs"].get(base["last_prompt_label"], {}).get("tags"):
            flat_tags = DatasetService._clean_tag_list(doc.get("VLM_tags"))
            if flat_tags:
                label = base["last_prompt_label"]
                if label not in base["runs"]:
                    base["runs"][label] = {"effective_prompt": label, "tags": []}
                base["runs"][label]["tags"] = flat_tags

        return base

    @staticmethod
    def _normalise_vlm(value: Any, fallback_doc: dict[str, Any] | None = None) -> dict[str, Any]:
        if isinstance(value, dict):
            runs = value.get("runs")
            if isinstance(runs, dict):
                base = DatasetService._base_vlm_structure()
                for prompt_label, run in runs.items():
                    label = str(prompt_label).strip()
                    if not label:
                        continue
                    if isinstance(run, dict):
                        effective_prompt = str(run.get("effective_prompt", label)).strip() or label
                        tags = DatasetService._clean_tag_list(run.get("tags"))
                    else:
                        effective_prompt = label
                        tags = []
                    base["runs"][label] = {"effective_prompt": effective_prompt, "tags": tags}
                last_prompt_label = value.get("last_prompt_label")
                if isinstance(last_prompt_label, str) and last_prompt_label.strip():
                    base["last_prompt_label"] = last_prompt_label.strip()
                return base

        if fallback_doc is not None:
            return DatasetService._migrate_legacy_vlm(fallback_doc)
        return DatasetService._base_vlm_structure()

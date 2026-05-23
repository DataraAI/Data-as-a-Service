"""Dataset listing, routing, and asset serialization."""

from __future__ import annotations

import base64
import json
import os
import re
import time
from typing import Any

from azure.core.exceptions import ResourceNotFoundError

from datara.config import settings
from datara.logging import logger
from datara.services.sql_store import SQLStore


PRESET_VLM_LABELS = [
    "Describe the image.",
    "Has the task been completed?",
    "What are the sensor modalities detected?",
]

IMAGE_PREVIEW_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
MASK_PERSON_PRIORITY_SEGMENTS = {"person", "persons", "human", "aperson", "ahuman"}
MASK_DEPRIORITIZED_SEGMENTS = {"hand", "hands"}
HIDDEN_CATEGORY_PREVIEW_PATHS = {
    "dexterityawigndishwasher",
    "dexteritywashingmachinewashingclothes",
    "dexteritypeelingpeas",
}


class DatasetService:
    """Route-aware dataset service backed by SQL catalog + Azure storage."""

    def __init__(self, azure_service, sql_store: SQLStore):
        self.azure_service = azure_service
        self.sql_store = sql_store
        self._dataset_path_cache: dict[tuple[str, str | None, bool], tuple[float, list[dict[str, Any]]]] = {}
        self._dataset_path_cache_ttl_seconds = max(settings.dataset_path_cache_ttl_seconds, 0)

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

        if children_by_full_path:
            return sorted(children_by_full_path.values(), key=lambda item: item["full_path"].lower())

        return self._list_storage_children(path, current_user)

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

    def list_all_dataset_paths(
        self,
        current_user: dict[str, Any],
        *,
        category: str | None = None,
        public_only: bool = False,
    ) -> list[dict[str, Any]]:
        normalized_category = self._normalize_category_key(category) or None
        cache_key = self._dataset_path_cache_key(current_user, normalized_category, public_only)
        cached = self._get_cached_dataset_paths(cache_key)
        if cached is not None:
            return cached

        datasets = self._filter_datasets_for_category(
            self.sql_store.list_accessible_datasets(current_user),
            category=normalized_category,
            public_only=public_only,
        )
        all_paths: dict[str, dict[str, Any]] = {}

        for dataset in sorted(
            datasets,
            key=lambda item: (
                item["visibility"],
                item["category"].lower(),
                item["brand"].lower(),
                item["dataset_name"].lower(),
            ),
        ):
            summary = self.sql_store.build_dataset_summary(dataset, current_user)
            nested_paths = self._list_searchable_storage_paths(
                dataset,
                current_user,
            )

            route_segments = [segment for segment in summary["full_path"].split("/") if segment]

            for index in range(1, len(route_segments) + 1):
                full_path = "/".join(route_segments[:index])
                all_paths.setdefault(
                    full_path,
                    self._build_folder_record(
                        summary=summary,
                        full_path=full_path,
                        source_path=dataset["storage_prefix"],
                    ),
                )

            for nested_path in nested_paths:
                all_paths.setdefault(nested_path["full_path"], nested_path)

        records = sorted(all_paths.values(), key=lambda item: item["full_path"].lower())
        self._set_cached_dataset_paths(cache_key, records)
        return records

    def list_category_dataset_previews(
        self,
        current_user: dict[str, Any],
        *,
        category: str,
        public_only: bool = False,
    ) -> list[dict[str, Any]]:
        normalized_category = self._normalize_category_key(category)
        if not normalized_category:
            return []

        datasets = self._filter_datasets_for_category(
            self.sql_store.list_accessible_datasets(current_user),
            category=normalized_category,
            public_only=public_only,
        )

        previews: list[dict[str, Any]] = []
        for dataset in sorted(
            datasets,
            key=lambda item: (
                item["brand"].lower(),
                item["dataset_name"].lower(),
                item["visibility"],
            ),
        ):
            summary = self.sql_store.build_dataset_summary(dataset, current_user)
            if self._should_hide_category_preview(summary["full_path"]):
                continue

            preview = self._build_category_dataset_preview(
                dataset=dataset,
                summary=summary,
            )
            if preview["main_image"] is None and not preview["thumbnails"]:
                continue
            previews.append(preview)

        return sorted(
            previews,
            key=lambda item: (
                str(item.get("brand") or "").lower(),
                str(item.get("title") or "").lower(),
            ),
        )

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
        try:
            blobs = self.azure_service.list_blobs(dataset["storage_container"], prefix)
        except ResourceNotFoundError:
            logger.warning(
                "Skipping asset listing for %s because container %s was not found",
                route_path,
                dataset["storage_container"],
            )
            return []
        image_list: list[dict[str, Any]] = []

        for blob in blobs:
            lower_name = blob.name.lower()
            if "/preview/" in lower_name:
                continue
            is_image = lower_name.endswith((".png", ".jpg", ".jpeg", ".webp"))
            is_video = lower_name.endswith((".mp4", ".mov", ".m4v", ".webm"))
            is_3d = lower_name.endswith((".stl", ".obj", ".glb", ".gltf"))
            if not (is_image or is_video or is_3d):
                continue

            cosmos_doc = metadata_map.get(blob.name, {}) or {}
            vlm = self._normalise_vlm(cosmos_doc.get("vlm"), fallback_doc=cosmos_doc)
            tags = list(cosmos_doc.get("miscTags", []))
            inferred_view = cosmos_doc.get("view")
            for prompt_label, run in vlm["runs"].items():
                for prompt_tag in self._clean_tag_list(run.get("tags")):
                    tags.append(f"{prompt_label}: {prompt_tag}")

            if "/orig/" in blob.name:
                tags.append("exocentric")
                inferred_view = inferred_view or "exo"
            elif "/egos/" in blob.name:
                tags.append("ego_view")
                inferred_view = inferred_view or "egos"
            elif "/corner_images_controlnet/" in blob.name:
                tags.append("corner_case")
                inferred_view = inferred_view or "corner_images_controlnet"
            elif "/masks/" in blob.name:
                tags.append("mask")
                tags.append("instance_mask")
                inferred_view = inferred_view or "masks"
                mask_object_id = str(cosmos_doc.get("maskObjectId") or "").strip()
                if mask_object_id:
                    tags.append(
                        mask_object_id if mask_object_id.startswith("object_") else f"object_{mask_object_id}"
                    )
            elif "/video/" in blob.name:
                tags.append("source_video")
                inferred_view = inferred_view or "video"
            elif "/occl_del/" in blob.name:
                inferred_view = inferred_view or "occl_del"
            if is_video:
                tags.append("video")

            if cosmos_doc.get("clear") is True:
                tags.append("clear")
            elif cosmos_doc.get("clear") is False:
                tags.append("blurry")

            media_type = "3d" if is_3d else "video" if is_video else "image"
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
                        "view": inferred_view,
                        "task": cosmos_doc.get("task"),
                        "visibility": cosmos_doc.get("visibility", dataset["visibility"]),
                        "frame_count": cosmos_doc.get("frameCount"),
                        "fps": cosmos_doc.get("fps"),
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
        self._dataset_path_cache.clear()
        logger.info("Deleted dataset %s (%s blobs, %s docs)", route_path, len(deleted_blobs), deleted_docs)
        return {
            "message": "Dataset deleted successfully",
            "deleted_blobs": len(deleted_blobs),
            "deleted_docs": deleted_docs,
        }

    def _build_category_dataset_preview(
        self,
        *,
        dataset: dict[str, Any],
        summary: dict[str, Any],
    ) -> dict[str, Any]:
        storage_container = dataset["storage_container"]
        storage_prefix = dataset["storage_prefix"].rstrip("/")

        orig_samples = self._select_diverse_preview_blobs(
            self._list_preview_blob_names(storage_container, f"{storage_prefix}/orig"),
            count=4,
        )
        ego_samples = self._select_diverse_preview_blobs(
            self._list_preview_blob_names(storage_container, f"{storage_prefix}/egos"),
            count=4,
        )
        mask_samples = self._select_diverse_preview_blobs(
            self._list_mask_preview_blob_names(storage_container, f"{storage_prefix}/masks"),
            count=4,
        )

        corner_candidates = self._list_preview_blob_names(
            storage_container,
            f"{storage_prefix}/corner_images_controlnet",
        )
        if not corner_candidates:
            corner_candidates = self._list_preview_blob_names(
                storage_container,
                f"{storage_prefix}/occl_del",
            )
        corner_samples = self._select_diverse_preview_blobs(corner_candidates, count=4)
        root_samples = self._select_diverse_preview_blobs(
            self._list_preview_blob_names(storage_container, storage_prefix),
            count=4,
        )

        source_samples = {
            "orig": orig_samples,
            "ego": ego_samples,
            "mask": mask_samples,
            "corner": corner_samples,
            "root": root_samples,
        }
        source_positions = {source_key: 0 for source_key in source_samples}
        used_blobs: set[str] = set()

        def take_from_source(source_key: str) -> str | None:
            samples = source_samples[source_key]
            position = source_positions[source_key]

            while position < len(samples):
                candidate = samples[position]
                position += 1
                source_positions[source_key] = position
                if candidate in used_blobs:
                    continue
                used_blobs.add(candidate)
                return candidate

            source_positions[source_key] = position
            return None

        def take_fallback_blob() -> str | None:
            for source_key in ("orig", "ego", "mask", "corner", "root"):
                candidate = take_from_source(source_key)
                if candidate:
                    return candidate
            return None

        main_source = next(
            (source_key for source_key in ("orig", "ego", "root", "mask", "corner") if source_samples[source_key]),
            None,
        )
        main_blob = take_from_source(main_source) if main_source else None

        thumbnails: list[dict[str, Any]] = []
        for source_key, label in (
            ("mask", "Mask"),
            ("ego", "EGO"),
            ("orig", "ORIG"),
            ("corner", "Corner Case"),
        ):
            blob_name = take_from_source(source_key) or take_fallback_blob()
            if not blob_name:
                continue
            thumbnails.append(
                self._build_preview_asset(
                    dataset_id=dataset["id"],
                    blob_name=blob_name,
                    label=label,
                )
            )

        return {
            "title": self._humanize_dataset_title(dataset["dataset_name"]),
            "brand": str(dataset.get("brand") or "").strip(),
            "full_path": summary["full_path"],
            "viewer_path": summary["viewer_path"],
            "visibility": summary["visibility"],
            "owner_slug": summary["owner_storage_slug"],
            "main_image": (
                self._build_preview_asset(dataset_id=dataset["id"], blob_name=main_blob, label="Primary")
                if main_blob
                else None
            ),
            "thumbnails": thumbnails[:4],
            "preview_video": self._build_preview_video_asset(
                dataset_id=dataset["id"],
                storage_prefix=storage_prefix,
            ),
        }

    def _build_folder_record(
        self,
        *,
        summary: dict[str, Any],
        full_path: str,
        source_path: str,
    ) -> dict[str, Any]:
        parts = [segment for segment in full_path.split("/") if segment]
        return {
            "name": parts[-1] if parts else full_path,
            "full_path": full_path,
            "source_path": source_path.rstrip("/"),
            "visibility": summary["visibility"],
            "owner_slug": summary["owner_storage_slug"],
            "viewer_path": f"/viewer/{full_path}",
            "type": "folder",
        }

    def _dataset_path_cache_key(
        self,
        current_user: dict[str, Any],
        category: str | None,
        public_only: bool = False,
    ) -> tuple[str, str | None, bool]:
        role = str(current_user.get("role") or "").strip()
        user_id = str(current_user.get("id") or "").strip()
        return (f"{role}:{user_id}", category, public_only)

    def _get_cached_dataset_paths(
        self,
        cache_key: tuple[str, str | None, bool],
    ) -> list[dict[str, Any]] | None:
        if self._dataset_path_cache_ttl_seconds <= 0:
            return None

        cached = self._dataset_path_cache.get(cache_key)
        if cached is None:
            return None

        expires_at, records = cached
        if expires_at <= time.time():
            self._dataset_path_cache.pop(cache_key, None)
            return None

        return records

    def _set_cached_dataset_paths(
        self,
        cache_key: tuple[str, str | None, bool],
        records: list[dict[str, Any]],
    ) -> None:
        if self._dataset_path_cache_ttl_seconds <= 0:
            return

        self._dataset_path_cache[cache_key] = (
            time.time() + self._dataset_path_cache_ttl_seconds,
            records,
        )

    def _filter_datasets_for_category(
        self,
        datasets: list[dict[str, Any]],
        *,
        category: str | None,
        public_only: bool,
    ) -> list[dict[str, Any]]:
        filtered: list[dict[str, Any]] = []
        for dataset in datasets:
            if public_only and str(dataset.get("visibility") or "").strip() != "public":
                continue
            if category and not self._category_matches(dataset.get("category"), category):
                continue
            filtered.append(dataset)
        return filtered

    def _list_storage_children(self, route_path: str, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            dataset, extra_segments = self.sql_store.resolve_dataset_route(route_path, current_user)
        except (PermissionError, ValueError):
            return []

        summary = self.sql_store.build_dataset_summary(dataset, current_user)
        storage_prefix = dataset["storage_prefix"].rstrip("/")
        if extra_segments:
            storage_prefix = f"{storage_prefix}/{'/'.join(extra_segments).strip('/')}"

        children: dict[str, dict[str, Any]] = {}
        try:
            child_prefixes = self.azure_service.list_immediate_child_folders(
                dataset["storage_container"],
                storage_prefix,
            )
        except ResourceNotFoundError:
            logger.warning(
                "Skipping child-folder listing for %s because container %s was not found",
                route_path,
                dataset["storage_container"],
            )
            return []

        for child_prefix in child_prefixes:
            child_name = child_prefix.rstrip("/").split("/")[-1]
            child_route = f"{route_path.rstrip('/')}/{child_name}"
            children[child_route] = self._build_folder_record(
                summary=summary,
                full_path=child_route,
                source_path=child_prefix,
            )

        return sorted(children.values(), key=lambda item: item["full_path"].lower())

    def _list_searchable_storage_paths(
        self,
        dataset: dict[str, Any],
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]:
        summary = self.sql_store.build_dataset_summary(dataset, current_user)
        route_root = summary["full_path"].rstrip("/")
        storage_root = dataset["storage_prefix"].rstrip("/")
        nested_paths: dict[str, dict[str, Any]] = {}

        try:
            child_prefixes = self.azure_service.list_immediate_child_folders(
                dataset["storage_container"],
                storage_root,
            )
        except ResourceNotFoundError:
            logger.warning(
                "Skipping immediate child-folder listing for dataset %s because container %s was not found",
                summary["full_path"],
                dataset["storage_container"],
            )
            return []

        for child_prefix in child_prefixes:
            child_name = child_prefix.rstrip("/").split("/")[-1]
            if not child_name:
                continue

            nested_full_path = f"{route_root}/{child_name}"
            nested_paths.setdefault(
                nested_full_path,
                self._build_folder_record(
                    summary=summary,
                    full_path=nested_full_path,
                    source_path=child_prefix,
                ),
            )

        return sorted(
            nested_paths.values(),
            key=lambda item: item["full_path"].lower(),
        )

    def _find_preview_blob(self, container_name: str, prefix: str) -> str | None:
        try:
            return self.azure_service.find_first_matching_blob(container_name, prefix)
        except ResourceNotFoundError:
            logger.warning(
                "Skipping preview lookup for prefix %s because container %s was not found",
                prefix,
                container_name,
            )
            return None

    def _list_preview_blob_names(self, container_name: str, prefix: str) -> list[str]:
        try:
            blobs = self.azure_service.list_blobs(container_name, prefix)
        except ResourceNotFoundError:
            logger.warning(
                "Skipping preview blob listing for prefix %s because container %s was not found",
                prefix,
                container_name,
            )
            return []

        names = [
            blob.name
            for blob in blobs
            if str(getattr(blob, "name", "")).lower().endswith(IMAGE_PREVIEW_EXTENSIONS)
        ]
        unique_names = list(dict.fromkeys(names))
        return sorted(unique_names, key=self._preview_blob_sort_key)

    def _list_mask_preview_blob_names(self, container_name: str, prefix: str) -> list[str]:
        blob_names = self._list_preview_blob_names(container_name, prefix)
        if not blob_names:
            return []

        def normalized_segments(blob_name: str) -> list[str]:
            relative_path = blob_name.lower().split("/masks/", 1)[-1]
            return [
                self._normalize_preview_token(segment)
                for segment in relative_path.split("/")[:-1]
                if segment
            ]

        prioritized = [
            blob_name
            for blob_name in blob_names
            if any(segment in MASK_PERSON_PRIORITY_SEGMENTS for segment in normalized_segments(blob_name))
        ]
        if prioritized:
            return prioritized

        without_hands = [
            blob_name
            for blob_name in blob_names
            if not any(segment in MASK_DEPRIORITIZED_SEGMENTS for segment in normalized_segments(blob_name))
        ]
        return without_hands or blob_names

    def _select_diverse_preview_blobs(
        self,
        blob_names: list[str],
        *,
        count: int,
        minimum_frame_gap: int = 100,
    ) -> list[str]:
        unique_names = list(dict.fromkeys(blob_names))
        if count <= 0 or not unique_names:
            return []

        desired_total = min(count, len(unique_names))
        target_fractions = [0.0, 1.0, 0.5, 0.25, 0.75]
        selected_indices: list[int] = []
        selected_frames: list[int | None] = []
        frames = [self._extract_numeric_frame_id(blob_name) for blob_name in unique_names]

        for fraction in target_fractions:
            if len(selected_indices) >= desired_total:
                break

            target_index = round((len(unique_names) - 1) * fraction)
            remaining = [index for index in range(len(unique_names)) if index not in selected_indices]
            if not remaining:
                break

            ordered_candidates = sorted(
                remaining,
                key=lambda index: (abs(index - target_index), index),
            )
            candidate_index = next(
                (
                    index
                    for index in ordered_candidates
                    if self._has_minimum_frame_gap(
                        frames[index],
                        selected_frames,
                        minimum_frame_gap=minimum_frame_gap,
                    )
                ),
                None,
            )
            if candidate_index is None:
                candidate_index = ordered_candidates[0]

            selected_indices.append(candidate_index)
            selected_frames.append(frames[candidate_index])

        if len(selected_indices) < desired_total:
            for index in range(len(unique_names)):
                if index in selected_indices:
                    continue
                selected_indices.append(index)
                if len(selected_indices) >= desired_total:
                    break

        return [unique_names[index] for index in selected_indices]

    def _build_preview_asset(
        self,
        *,
        dataset_id: str,
        blob_name: str,
        label: str,
    ) -> dict[str, Any]:
        asset_id = self.encode_asset_id(dataset_id, blob_name)
        return {
            "asset_id": asset_id,
            "blob_path": blob_name,
            "name": os.path.basename(blob_name),
            "label": label,
            "proxy_url": f"/api/proxy/{asset_id}",
        }

    def _build_preview_video_asset(
        self,
        *,
        dataset_id: str,
        storage_prefix: str,
    ) -> dict[str, Any]:
        blob_name = f"{storage_prefix.rstrip('/')}/preview/hover.mp4"
        return self._build_preview_asset(
            dataset_id=dataset_id,
            blob_name=blob_name,
            label="Hover Preview",
        )

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
    def _humanize_dataset_title(value: Any) -> str:
        text = str(value or "").strip()
        if not text:
            return "Dataset"

        text = re.sub(r"[_\-]+", " ", text)
        text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:1].upper() + text[1:] if text else "Dataset"

    @staticmethod
    def _normalize_preview_token(value: Any) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())

    @staticmethod
    def _normalize_category_key(value: Any) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())

        aliases = {
            "automotive": "carautomation",
            "carautomation": "carautomation",
            "datacenter": "serverrack",
            "datacentre": "serverrack",
            "humanoid": "dexterity",
            "dexterity": "dexterity",
            "serverrack": "serverrack",
            "warehouse": "warehouse",
        }
        return aliases.get(normalized, normalized)

    @classmethod
    def _category_matches(cls, dataset_category: Any, requested_category: Any) -> bool:
        requested = cls._normalize_category_key(requested_category)
        if not requested:
            return False
        return cls._normalize_category_key(dataset_category) == requested

    @classmethod
    def _should_hide_category_preview(cls, full_path: str) -> bool:
        return cls._normalize_preview_token(full_path) in HIDDEN_CATEGORY_PREVIEW_PATHS

    @staticmethod
    def _preview_blob_sort_key(blob_name: str) -> tuple[int, int | str, str]:
        frame_id = DatasetService._extract_numeric_frame_id(blob_name)
        if frame_id is not None:
            return (0, frame_id, blob_name.lower())
        return (1, blob_name.lower(), blob_name.lower())

    @staticmethod
    def _extract_numeric_frame_id(blob_name: str) -> int | None:
        frame_id = DatasetService._extract_frame_id_value(blob_name)
        if frame_id is None:
            return None
        try:
            return int(frame_id)
        except ValueError:
            return None

    @staticmethod
    def _has_minimum_frame_gap(
        candidate_frame: int | None,
        selected_frames: list[int | None],
        *,
        minimum_frame_gap: int,
    ) -> bool:
        if candidate_frame is None:
            return False

        comparable_frames = [frame for frame in selected_frames if frame is not None]
        if not comparable_frames:
            return True

        return all(abs(candidate_frame - frame) >= minimum_frame_gap for frame in comparable_frames)

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

"""Contracts for the public roboteyeview-public dataset layout."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from datara.services.dataset_service import DatasetService
from datara.services.processing_service import ProcessingService
from datara.config import settings
from tests.conftest import TEST_PASSWORD, make_user


class FakeAzureService:
    def __init__(self, blob_names: list[str] | None = None) -> None:
        self.blob_names = blob_names or []
        self.uploaded_blobs: list[str] = []
        self.deleted_prefixes: list[str] = []
        self.cosmos_docs: list[dict] = []

    def list_blobs(self, _container_name: str, prefix: str):
        normalized = prefix.rstrip("/")
        return [
            SimpleNamespace(name=name)
            for name in self.blob_names
            if name == normalized or name.startswith(f"{normalized}/")
        ]

    def list_immediate_child_folders(self, _container_name: str, prefix: str):
        normalized = prefix.rstrip("/")
        children = set()
        for name in self.blob_names:
            if not name.startswith(f"{normalized}/"):
                continue
            relative = name[len(normalized) + 1 :]
            child = relative.split("/", 1)[0]
            if child and "/" in relative:
                children.add(f"{normalized}/{child}/")
        return sorted(children)

    def get_cosmos_metadata_for_prefix(self, _container_name: str, _dataset_prefix: str):
        return {}

    def get_blob_url(self, container_name: str, blob_name: str) -> str:
        return f"https://example.blob/{container_name}/{blob_name}"

    def get_container_client(self, _container_name: str):
        return self

    def upload_blob(self, name: str, data, overwrite: bool, content_settings=None):
        self.uploaded_blobs.append(name)

    def get_cosmos_doc_for_blob(self, _container_name: str, _blob_name: str):
        return None

    def upsert_cosmos_item(self, doc: dict):
        self.cosmos_docs.append(doc)

    def delete_blobs_with_prefix(self, _container_name: str, prefix: str):
        self.deleted_prefixes.append(prefix.rstrip("/"))
        return []

    def delete_cosmos_docs_for_prefix(self, _container_name: str, prefix: str):
        self.deleted_prefixes.append(prefix.rstrip("/"))
        return 0

    def generate_sas_url(self, container_name: str, blob_name: str, expiry_hours: int = 24) -> str:
        return f"https://example.blob/{container_name}/{blob_name}?sas=1"


def create_public_dataset(sql_store, owner: dict, *, category: str = "serverrack", task_slug: str = "dataRackInstall"):
    return sql_store.create_dataset(
        owner_user=owner,
        created_by_user=owner,
        visibility="public",
        category=category,
        brand="public",
        dataset_name=task_slug,
        storage_container=settings.azure_public_container,
        storage_prefix=f"{category}/{task_slug}",
        task="Data rack install",
    )


def create_legacy_public_dataset(sql_store, owner: dict):
    return sql_store.create_dataset(
        owner_user=owner,
        created_by_user=owner,
        visibility="public",
        category="serverrack",
        brand="legacyBrand",
        dataset_name="legacyTask",
        storage_container="roboteyeview",
        storage_prefix="serverrack/legacyBrand/legacyTask",
        task="Legacy task",
    )


def test_public_dataset_routes_use_vertical_and_task_only(sql_store) -> None:
    user = make_user(sql_store)
    dataset = create_public_dataset(sql_store, user)

    summary = sql_store.build_dataset_summary(dataset, user)

    assert summary["full_path"] == "serverrack/dataRackInstall"
    assert summary["viewer_path"] == "/viewer/serverrack/dataRackInstall"

    resolved, extra_segments = sql_store.resolve_dataset_route("serverrack/dataRackInstall", user)
    assert resolved["id"] == dataset["id"]
    assert extra_segments == []

    resolved_child, child_segments = sql_store.resolve_dataset_route(
        "serverrack/dataRackInstall/misc/orig",
        user,
    )
    assert resolved_child["id"] == dataset["id"]
    assert child_segments == ["misc", "orig"]


def test_legacy_public_container_rows_are_hidden_from_public_catalog(sql_store) -> None:
    user = make_user(sql_store)
    admin = make_user(
        sql_store,
        email="admin@example.com",
        display_name="Admin User",
        role="admin",
    )
    current_dataset = create_public_dataset(sql_store, user)
    create_legacy_public_dataset(sql_store, user)

    customer_rows = sql_store.list_accessible_datasets(user)
    admin_rows = sql_store.list_accessible_datasets(admin)

    assert [row["id"] for row in customer_rows] == [current_dataset["id"]]
    assert [row["id"] for row in admin_rows] == [current_dataset["id"]]
    assert customer_rows[0]["storage_container"] == settings.azure_public_container

    try:
        sql_store.resolve_dataset_route("serverrack/legacyTask", user)
    except PermissionError:
        pass
    else:
        raise AssertionError("legacy public dataset should not resolve through viewer routes")


def test_dataset_manifest_groups_new_layout_assets(sql_store) -> None:
    user = make_user(sql_store)
    create_public_dataset(sql_store, user)
    service = DatasetService(
        FakeAzureService(
            [
                "serverrack/dataRackInstall/README.md",
                "serverrack/dataRackInstall/dataRackInstall.mp4",
                "serverrack/dataRackInstall/dataRackInstall_left.mp4",
                "serverrack/dataRackInstall/dataRackInstall_intelligence.JSON",
                "serverrack/dataRackInstall/misc/orig/frame_0001.png",
                "serverrack/dataRackInstall/misc/egos/frame_0001.png",
                "serverrack/dataRackInstall/hand_meshes/hand_0001.obj",
            ]
        ),
        sql_store,
    )

    manifest = service.get_dataset_manifest("serverrack/dataRackInstall", user)

    assert manifest["dataset"]["container"] == "roboteyeview-public"
    assert manifest["dataset"]["vertical"] == "serverrack"
    assert manifest["dataset"]["task_slug"] == "dataRackInstall"
    assert manifest["readme"]["name"] == "README.md"
    assert manifest["primary_video"]["name"] == "dataRackInstall.mp4"
    assert [item["name"] for item in manifest["downloads"]] == [
        "dataRackInstall_left.mp4",
        "dataRackInstall_intelligence.JSON",
    ]
    assert manifest["misc"]["orig"]["viewer_path"] == "/viewer/serverrack/dataRackInstall/misc/orig"
    assert manifest["misc"]["egos"]["viewer_path"] == "/viewer/serverrack/dataRackInstall/misc/egos"
    assert manifest["hand_meshes"][0]["name"] == "hand_0001.obj"
    assert manifest["hand_meshes"][0]["type"] == "3d"


def test_public_dataset_rejects_direct_legacy_child_paths(sql_store) -> None:
    user = make_user(sql_store)
    create_public_dataset(sql_store, user)
    service = DatasetService(
        FakeAzureService(
            [
                "serverrack/dataRackInstall/orig/frame_0001.png",
                "serverrack/dataRackInstall/misc/orig/frame_0001.png",
            ]
        ),
        sql_store,
    )

    new_layout_assets = service.get_dataset_images("serverrack/dataRackInstall/misc/orig", user)

    assert [item["name"] for item in new_layout_assets] == ["frame_0001.png"]
    with pytest.raises(ValueError):
        service.get_dataset_images("serverrack/dataRackInstall/orig", user)


def test_public_category_previews_ignore_legacy_child_folders(sql_store) -> None:
    user = make_user(sql_store)
    create_public_dataset(sql_store, user)
    service = DatasetService(
        FakeAzureService(["serverrack/dataRackInstall/orig/frame_0001.png"]),
        sql_store,
    )

    previews = service.list_category_dataset_previews(user, category="serverrack", public_only=True)

    assert previews == []


def test_public_dataset_folder_listing_exposes_only_new_layout_children(sql_store) -> None:
    user = make_user(sql_store)
    create_public_dataset(sql_store, user)
    service = DatasetService(
        FakeAzureService(
            [
                "serverrack/dataRackInstall/orig/frame_0001.png",
                "serverrack/dataRackInstall/misc/orig/frame_0001.png",
                "serverrack/dataRackInstall/hand_meshes/hand_0001.obj",
            ]
        ),
        sql_store,
    )

    children = service.list_datasets("serverrack/dataRackInstall", user)

    assert [item["name"] for item in children] == ["hand_meshes", "misc"]
    assert all("/orig" not in item["viewer_path"] for item in children)


def test_process_video_requires_staff_role(client, approved_user, monkeypatch) -> None:
    import app as app_module

    monkeypatch.setattr(app_module.processing_service, "process_video", MagicMock(return_value={"ok": True}))
    client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": TEST_PASSWORD},
    )

    response = client.post(
        "/api/process_video",
        json={
            "category": "serverrack",
            "dataset_name": "dataRackInstall",
            "gdrive_link": "https://drive.google.com/file/d/example",
            "upload_type": "video",
            "view": "exo",
            "visibility": "public",
        },
    )

    assert response.status_code == 403
    assert response.get_json()["error"] == "staff_required"
    app_module.processing_service.process_video.assert_not_called()


def test_stats_counts_only_current_public_container(client, sql_store) -> None:
    user = make_user(sql_store)
    create_public_dataset(sql_store, user)
    create_legacy_public_dataset(sql_store, user)

    response = client.get("/api/stats")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["public_container"] == settings.azure_public_container
    assert payload["datasets_count"] == 1


def test_processing_identity_uses_vertical_and_task_slug_without_brand(sql_store) -> None:
    service = ProcessingService(MagicMock(), MagicMock(), sql_store)

    assert service._resolve_dataset_identity(
        {"category": "serverrack", "dataset_name": "dataRackInstall"}
    ) == ("serverrack", "public", "dataRackInstall")
    assert service._resolve_dataset_identity(
        {"output_name": "dexterity/frontGrille"}
    ) == ("dexterity", "public", "frontGrille")
    assert service._resolve_dataset_identity(
        {"category": "warehouse", "dataset_name": "Pallet Jack"}
    ) == ("warehouse", "public", "palletJack")


def test_hand_mesh_outputs_use_new_public_dataset_layout(sql_store, monkeypatch) -> None:
    from datara.services import call_lambda_vm

    user = make_user(sql_store, role="analyst")
    create_public_dataset(sql_store, user, category="dexterity", task_slug="frontGrille")
    azure_service = FakeAzureService()
    service = ProcessingService(azure_service, MagicMock(), sql_store)

    def fake_generate_hand_mesh(video_url, seq_name, pipeline, local_output_dir):
        output_dir = Path(local_output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        video = output_dir / "frontGrille_overlayed_hands.mp4"
        obj = output_dir / "hand_0001.obj"
        npz = output_dir / "frontGrille_hand_keypoints.npz"
        mcap = output_dir / "frontGrille_hand_keypoints.mcap"
        for path in (video, obj, npz, mcap):
            path.write_bytes(b"test")
        return [str(video)], [str(obj), str(npz)], [str(mcap)], 200, ""

    monkeypatch.setattr(call_lambda_vm, "generate_hand_mesh", fake_generate_hand_mesh)

    response, status = service.generate_hand_mesh(
        user,
        {
            "route_path": "dexterity/frontGrille",
            "video_url": "https://example.com/frontGrille.mp4",
        },
    )

    assert status == 200
    assert response["output_route_path"] == "dexterity/frontGrille"
    assert response["output_viewer_path"] == "/viewer/dexterity/frontGrille"
    assert set(azure_service.uploaded_blobs) == {
        "dexterity/frontGrille/frontGrille_overlayed_hands.mp4",
        "dexterity/frontGrille/hand_meshes/hand_0001.obj",
        "dexterity/frontGrille/frontGrille_hand_keypoints.npz",
        "dexterity/frontGrille/frontGrille_hand_keypoints.mcap",
    }

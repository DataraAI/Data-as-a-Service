"""Unit tests for task-intelligence behaviour tree loading."""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import py_trees

from utils.task_intelligence_behaviour_tree import (
    build_behaviour_tree,
    load_task_intelligence_from_dataset,
)


TASK_PAYLOAD = {
    "tasks": [
        {
            "task_name": "Test task",
            "subtasks": [
                {
                    "subtask_name": "Move to fixture",
                    "preconditions": ["robot_localized"],
                    "success_conditions": ["at_fixture"],
                }
            ],
        }
    ]
}


class _FakeDownload:
    def __init__(self, payload: Any) -> None:
        self.payload = payload

    def readall(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


class _FakeAzureService:
    def __init__(
        self,
        *,
        blobs: list[str] | None = None,
        payloads: dict[str, Any] | None = None,
        metadata: dict[str, dict[str, Any]] | None = None,
    ) -> None:
        self.blobs = blobs or []
        self.payloads = payloads or {}
        self.metadata = metadata or {}

    def list_blobs(self, _container_name: str, _prefix: str) -> list[SimpleNamespace]:
        return [SimpleNamespace(name=blob) for blob in self.blobs]

    def download_blob(self, _container_name: str, blob_name: str) -> _FakeDownload:
        return _FakeDownload(self.payloads[blob_name])

    def get_cosmos_metadata_for_prefix(
        self,
        _container_name: str,
        _dataset_prefix: str,
    ) -> dict[str, dict[str, Any]]:
        return self.metadata


def test_loads_task_intelligence_json_from_dataset_root_blob() -> None:
    blob_name = "carAutomation/Porsche/frontSeat/frontSeat_intelligence.JSON"
    fake_azure = _FakeAzureService(
        blobs=[
            "carAutomation/Porsche/frontSeat/misc/other_intelligence.json",
            blob_name,
        ],
        payloads={blob_name: TASK_PAYLOAD},
    )

    loaded = load_task_intelligence_from_dataset(
        "carAutomation/Porsche/frontSeat",
        container_names=["roboteyeview-public"],
        azure_service=fake_azure,
        settings=SimpleNamespace(),
    )

    assert loaded.payload == TASK_PAYLOAD
    assert loaded.source == f"azure://roboteyeview-public/{blob_name}"


def test_loads_task_intelligence_from_cosmos_metadata_fallback() -> None:
    fake_azure = _FakeAzureService(
        metadata={
            "carAutomation/Porsche/frontSeat/frontSeat.mp4": {
                "taskIntelligence": TASK_PAYLOAD,
            }
        },
    )

    loaded = load_task_intelligence_from_dataset(
        "carAutomation/Porsche/frontSeat",
        container_names=["roboteyeview-public"],
        azure_service=fake_azure,
        settings=SimpleNamespace(),
    )

    assert loaded.payload == TASK_PAYLOAD
    assert loaded.source == (
        "cosmos://roboteyeview-public/carAutomation/Porsche/frontSeat/frontSeat.mp4#taskIntelligence"
    )


def test_loaded_payload_builds_behaviour_tree() -> None:
    tree, world_state = build_behaviour_tree(TASK_PAYLOAD, initial_world_state={"robot_localized"})

    tree.setup(timeout=15)
    tree.tick()

    assert tree.root.status == py_trees.common.Status.SUCCESS
    assert "at_fixture" in world_state

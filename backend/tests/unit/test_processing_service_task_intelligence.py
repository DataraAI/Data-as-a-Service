"""Unit tests for task-intelligence annotation normalization."""

from __future__ import annotations

from datara.services.processing_service import ProcessingService


def test_normalizes_remote_task_analysis_schema() -> None:
    annotation = {
        "taskDescription": "The task is to fold a towel.",
        "subTasks": [
            {
                "startFrame": 0,
                "endFrame": 5,
                "subTaskDescription": "Start with the towel flat.",
            },
            {
                "startFrame": 6,
                "endFrame": 12,
                "subTaskDescription": "Fold the top edge down.",
            },
        ],
    }

    assert ProcessingService._normalize_task_analysis_subtasks(annotation) == [
        {
            "sub_task": "Start with the towel flat.",
            "start_frame": 0,
            "end_frame": 5,
        },
        {
            "sub_task": "Fold the top edge down.",
            "start_frame": 6,
            "end_frame": 12,
        },
    ]


def test_normalizes_legacy_task_analysis_list() -> None:
    annotation = [
        {"sub_task": "pick up item", "start_frame": 1, "end_frame": 3},
        "place item down",
    ]

    assert ProcessingService._normalize_task_analysis_subtasks(annotation) == [
        {"sub_task": "pick up item", "start_frame": 1, "end_frame": 3},
        {"sub_task": "place item down", "start_frame": 0, "end_frame": 0},
    ]

"""Build a py_trees behaviour tree from task-intelligence JSON.

This is intentionally a local test harness: it uses the sample JSON below by
default and does not call the Datara backend, Azure, or the remote annotator.

Run from the repository root:

    python backend/utils/task_intelligence_behaviour_tree.py --ticks 12

You can also point it at a generated task-intelligence JSON file:

    python backend/utils/task_intelligence_behaviour_tree.py --json path/to/file.json
"""

from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import py_trees
except ModuleNotFoundError as exc:  # pragma: no cover - exercised by users without py_trees installed
    raise SystemExit(
        "Missing dependency: py_trees. Install it with `pip install py-trees` "
        "or reinstall backend dependencies from backend/requirements.txt."
    ) from exc


SAMPLE_TASK_INTELLIGENCE: dict[str, Any] = {
    "tasks": [
        {
            "task_name": "Inspect front passenger seat rail",
            "description": "Extracted from a car automation front-seat workflow.",
            "start_time": "Frame 0",
            "end_time": "Frame 180",
            "subtasks": [
                {
                    "subtask_name": "Move to front passenger seat",
                    "start_time": "Frame 0",
                    "end_time": "Frame 40",
                    "description": "Robot approaches the exposed seat rail workspace.",
                    "primitive": "navigate_to_workspace",
                    "inputs": {"target": "front_passenger_seat"},
                    "preconditions": ["robot_localized", "workspace_map_loaded"],
                    "success_conditions": ["at_front_passenger_seat"],
                    "duration_ticks": 2,
                },
                {
                    "subtask_name": "Locate seat rail fasteners",
                    "start_time": "Frame 41",
                    "end_time": "Frame 75",
                    "description": "Use the wrist camera to localize fasteners and rail edges.",
                    "primitive": "perceive_objects",
                    "inputs": {"objects": ["left_rail", "right_rail", "fastener"]},
                    "preconditions": ["at_front_passenger_seat", "camera_ready"],
                    "success_conditions": ["seat_rail_fasteners_localized"],
                    "duration_ticks": 1,
                },
                {
                    "subtask_name": "Pick inspection probe",
                    "start_time": "Frame 76",
                    "end_time": "Frame 120",
                    "description": "Grasp the probe used to trace the rail alignment.",
                    "primitive": "grasp_tool",
                    "inputs": {"tool": "inspection_probe"},
                    "preconditions": ["seat_rail_fasteners_localized", "probe_available"],
                    "success_conditions": ["inspection_probe_grasped"],
                    "duration_ticks": 2,
                },
                {
                    "subtask_name": "Trace seat rail alignment",
                    "start_time": "Frame 121",
                    "end_time": "Frame 180",
                    "description": "Move the probe along the rail path and record alignment.",
                    "primitive": "trace_linear_path",
                    "inputs": {"path": "seat_rail_centerline"},
                    "preconditions": ["inspection_probe_grasped", "seat_rail_fasteners_localized"],
                    "success_conditions": ["seat_rail_alignment_recorded"],
                    "duration_ticks": 3,
                },
            ],
        }
    ]
}


INITIAL_WORLD_STATE = {
    "robot_localized",
    "workspace_map_loaded",
    "camera_ready",
    "probe_available",
}


@dataclass(frozen=True)
class StepSpec:
    name: str
    description: str = ""
    start_time: str = ""
    end_time: str = ""
    primitive: str = "execute_subtask"
    inputs: dict[str, Any] = field(default_factory=dict)
    preconditions: list[str] = field(default_factory=list)
    success_conditions: list[str] = field(default_factory=list)
    duration_ticks: int = 1


@dataclass(frozen=True)
class TaskSpec:
    name: str
    description: str = ""
    start_time: str = ""
    end_time: str = ""
    steps: list[StepSpec] = field(default_factory=list)


class FactCheck(py_trees.behaviour.Behaviour):
    """Checks whether required facts are present in the shared test world state."""

    def __init__(self, name: str, required_facts: Iterable[str], world_state: set[str]) -> None:
        super().__init__(name=name)
        self.required_facts = list(required_facts)
        self.world_state = world_state

    def update(self) -> py_trees.common.Status:
        missing = [fact for fact in self.required_facts if fact not in self.world_state]
        if missing:
            self.feedback_message = f"missing: {', '.join(missing)}"
            return py_trees.common.Status.FAILURE

        self.feedback_message = "ok" if self.required_facts else "no requirements"
        return py_trees.common.Status.SUCCESS


class PrimitiveAction(py_trees.behaviour.Behaviour):
    """Test stub for a robot primitive.

    The action returns RUNNING for ``duration_ticks - 1`` ticks, then succeeds and
    adds the step's success conditions to the world state.
    """

    def __init__(self, step: StepSpec, world_state: set[str]) -> None:
        super().__init__(name=f"Do: {step.primitive}")
        self.step = step
        self.world_state = world_state
        self.ticks = 0

    def initialise(self) -> None:
        self.ticks = 0

    def update(self) -> py_trees.common.Status:
        self.ticks += 1
        duration = max(1, self.step.duration_ticks)
        if self.ticks < duration:
            self.feedback_message = f"{self.step.name} ({self.ticks}/{duration})"
            return py_trees.common.Status.RUNNING

        self.world_state.update(self.step.success_conditions)
        self.feedback_message = f"{self.step.name} complete"
        return py_trees.common.Status.SUCCESS


def normalize_task_intelligence(payload: Any) -> list[TaskSpec]:
    """Normalize formatted API output or raw annotator output into task specs."""

    payload = _unwrap_task_intelligence(payload)

    if isinstance(payload, dict) and isinstance(payload.get("tasks"), list):
        task_items = payload["tasks"]
        if all(isinstance(item, dict) and _extract_step_items(item) for item in task_items):
            return [_task_from_mapping(item, index) for index, item in enumerate(task_items, start=1)]

        return [
            TaskSpec(
                name=_string_value(payload, ("task_name", "taskName", "taskDescription", "name"), "Video task"),
                description=_string_value(payload, ("description",), ""),
                steps=[_step_from_item(item, index) for index, item in enumerate(task_items, start=1)],
            )
        ]

    if isinstance(payload, dict):
        return [_task_from_mapping(payload, 1)]

    if isinstance(payload, list):
        return [
            TaskSpec(
                name="Video task",
                steps=[_step_from_item(item, index) for index, item in enumerate(payload, start=1)],
            )
        ]

    raise ValueError("Task intelligence must be a dict or list")


def build_behaviour_tree(
    payload: Any,
    initial_world_state: Iterable[str] = INITIAL_WORLD_STATE,
) -> tuple[py_trees.trees.BehaviourTree, set[str]]:
    """Create a py_trees BehaviourTree plus its mutable test world state."""

    tasks = normalize_task_intelligence(payload)
    if not tasks:
        raise ValueError("Task intelligence did not contain any tasks")
    empty_task_names = [task.name for task in tasks if not task.steps]
    if empty_task_names:
        raise ValueError(f"Task(s) missing subtasks: {', '.join(empty_task_names)}")

    world_state = set(initial_world_state)

    root = py_trees.composites.Sequence(name="Task Intelligence Plan", memory=True)
    for task in tasks:
        task_node = py_trees.composites.Sequence(name=f"Task: {task.name}", memory=True)
        for index, step in enumerate(task.steps, start=1):
            step_node = py_trees.composites.Sequence(name=f"{index}. {step.name}", memory=True)
            step_node.add_children(
                [
                    FactCheck(
                        name="Check preconditions",
                        required_facts=step.preconditions,
                        world_state=world_state,
                    ),
                    PrimitiveAction(step=step, world_state=world_state),
                    FactCheck(
                        name="Verify outcome",
                        required_facts=step.success_conditions,
                        world_state=world_state,
                    ),
                ]
            )
            task_node.add_child(step_node)
        root.add_child(task_node)

    return py_trees.trees.BehaviourTree(root), world_state


def render_tree(tree: py_trees.trees.BehaviourTree) -> str:
    return py_trees.display.unicode_tree(tree.root, show_status=True)


def _unwrap_task_intelligence(payload: Any) -> Any:
    if isinstance(payload, dict):
        metadata_value = payload.get("taskIntelligence")
        if isinstance(metadata_value, dict):
            return metadata_value
    return payload


def _task_from_mapping(item: dict[str, Any], index: int) -> TaskSpec:
    step_items = _extract_step_items(item)
    if not step_items and _looks_like_step_mapping(item):
        step_items = [item]

    steps = [
        _step_from_item(step, step_index)
        for step_index, step in enumerate(step_items, start=1)
    ]
    return TaskSpec(
        name=_string_value(
            item,
            ("task_name", "taskName", "taskDescription", "name"),
            f"Video task {index}",
        ),
        description=_string_value(item, ("description",), ""),
        start_time=_string_value(item, ("start_time", "startTime"), ""),
        end_time=_string_value(item, ("end_time", "endTime"), ""),
        steps=steps,
    )


def _extract_step_items(item: dict[str, Any]) -> list[Any]:
    for key in ("subtasks", "subTasks", "steps", "actions", "segments"):
        value = item.get(key)
        if isinstance(value, list):
            return value
    return []


def _looks_like_step_mapping(item: dict[str, Any]) -> bool:
    step_keys = (
        "subtask_name",
        "subTaskDescription",
        "sub_task_description",
        "sub_task",
        "subtask",
        "step",
        "action",
        "primitive",
        "skill",
        "robot_primitive",
    )
    return any(key in item for key in step_keys)


def _step_from_item(item: Any, index: int) -> StepSpec:
    if isinstance(item, str):
        name = _clean_text(item, f"Step {index}")
        return StepSpec(
            name=name,
            primitive=_infer_primitive(name),
            success_conditions=[f"{_slugify(name)}_done"],
        )

    if not isinstance(item, dict):
        raise ValueError(f"Step {index} must be a dict or string")

    name = _string_value(
        item,
        (
            "subtask_name",
            "subTaskDescription",
            "sub_task_description",
            "sub_task",
            "subtask",
            "step",
            "action",
            "description",
            "name",
        ),
        f"Step {index}",
    )
    success_conditions = _string_list(item.get("success_conditions") or item.get("postconditions"))
    if not success_conditions:
        success_conditions = [f"{_slugify(name)}_done"]

    return StepSpec(
        name=name,
        description=_string_value(item, ("description", "subTaskDescription", "sub_task"), ""),
        start_time=_string_value(item, ("start_time", "startTime", "startFrame", "start_frame"), ""),
        end_time=_string_value(item, ("end_time", "endTime", "endFrame", "end_frame"), ""),
        primitive=_string_value(item, ("primitive", "skill", "robot_primitive"), _infer_primitive(name)),
        inputs=item.get("inputs") if isinstance(item.get("inputs"), dict) else {},
        preconditions=_string_list(item.get("preconditions")),
        success_conditions=success_conditions,
        duration_ticks=_positive_int(item.get("duration_ticks"), default=1),
    )


def _string_value(item: dict[str, Any], keys: Iterable[str], default: str) -> str:
    for key in keys:
        if key in item:
            return _clean_text(item[key], default)
    return default


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = _clean_text(value, "")
        return [text] if text else []
    if isinstance(value, dict):
        return [_clean_text(key, "") for key, enabled in value.items() if enabled and _clean_text(key, "")]
    if isinstance(value, Iterable):
        return [_clean_text(item, "") for item in value if _clean_text(item, "")]

    text = _clean_text(value, "")
    return [text] if text else []


def _clean_text(value: Any, default: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    return text or default


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return slug or "step"


def _positive_int(value: Any, default: int) -> int:
    try:
        return max(1, int(value))
    except (TypeError, ValueError):
        return default


def _infer_primitive(name: str) -> str:
    lowered = name.lower()
    if any(token in lowered for token in ("move", "approach", "navigate")):
        return "navigate_to_workspace"
    if any(token in lowered for token in ("detect", "locate", "identify", "localize")):
        return "perceive_objects"
    if any(token in lowered for token in ("pick", "grasp", "grab")):
        return "grasp_object"
    if any(token in lowered for token in ("place", "insert", "attach", "align")):
        return "manipulate_object"
    if any(token in lowered for token in ("inspect", "scan", "trace", "record")):
        return "inspect_workspace"
    return "execute_subtask"


def _load_payload(json_path: Path | None) -> Any:
    if json_path is None:
        return SAMPLE_TASK_INTELLIGENCE
    with json_path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, help="Optional task-intelligence JSON path.")
    parser.add_argument("--ticks", type=int, default=12, help="Maximum tree ticks to run.")
    parser.add_argument(
        "--initial-fact",
        action="append",
        default=[],
        help="Additional initial world-state fact. Can be repeated.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    payload = _load_payload(args.json)
    initial_state = set(INITIAL_WORLD_STATE)
    initial_state.update(args.initial_fact)

    tree, world_state = build_behaviour_tree(payload, initial_world_state=initial_state)
    tree.setup(timeout=15)

    print("Initial tree:")
    print(render_tree(tree))
    print(f"Initial world state: {', '.join(sorted(world_state))}\n")

    for tick in range(1, max(1, args.ticks) + 1):
        tree.tick()
        print(f"Tick {tick}: {tree.root.status.name}")
        print(render_tree(tree))
        print(f"World state: {', '.join(sorted(world_state))}\n")
        if tree.root.status == py_trees.common.Status.SUCCESS:
            break


if __name__ == "__main__":
    main()

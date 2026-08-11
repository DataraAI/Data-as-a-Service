"""Build a py_trees behaviour tree from task-intelligence JSON.

By default this uses the sample JSON below. With ``--dataset-prefix``, it pulls
the generated task-intelligence JSON from an Azure-backed dataset and builds the
tree from that artifact.

Run from the repository root:

    python backend/utils/task_intelligence_behaviour_tree.py --ticks 12

You can also point it at a generated task-intelligence JSON file:

    python backend/utils/task_intelligence_behaviour_tree.py --json path/to/file.json

Or pull the generated JSON from a dataset prefix:

    python backend/utils/task_intelligence_behaviour_tree.py --dataset-prefix carAutomation/Porsche/frontSeat --container roboteyeview-public
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from pathlib import PurePosixPath
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


@dataclass(frozen=True)
class LoadedTaskIntelligence:
    payload: Any
    source: str


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


def load_task_intelligence_from_dataset(
    dataset_prefix: str | None,
    *,
    container_names: Iterable[str] | None = None,
    task_intelligence_blob: str | None = None,
    allow_cosmos_metadata: bool = True,
    azure_service: Any | None = None,
    settings: Any | None = None,
) -> LoadedTaskIntelligence:
    """Find and load task intelligence JSON from an Azure dataset.

    The generated artifact is expected to live at the dataset root with a name
    like ``<task>_intelligence.JSON``. If no JSON artifact is found, this can
    fall back to a ``taskIntelligence`` value stored in Cosmos metadata.
    """

    dataset_prefix = _normalize_blob_path(dataset_prefix or "")
    task_intelligence_blob = _resolve_task_intelligence_blob_path(
        dataset_prefix,
        task_intelligence_blob,
    )
    if not dataset_prefix and not task_intelligence_blob:
        raise ValueError("Provide --dataset-prefix or --task-intelligence-blob")

    if azure_service is None or settings is None:
        azure_service, settings = _load_azure_dependencies()

    containers = _resolve_container_names(container_names, settings)
    errors: list[str] = []

    for container_name in containers:
        if task_intelligence_blob:
            try:
                payload = _download_json_blob(
                    azure_service,
                    container_name,
                    task_intelligence_blob,
                )
                return LoadedTaskIntelligence(
                    payload=payload,
                    source=f"azure://{container_name}/{task_intelligence_blob}",
                )
            except Exception as exc:  # noqa: BLE001 - continue through alternate containers
                errors.append(f"{container_name}: failed to load {task_intelligence_blob}: {exc}")
                continue

        try:
            blob_name = _find_task_intelligence_blob(
                azure_service,
                container_name,
                dataset_prefix,
            )
            if blob_name:
                payload = _download_json_blob(azure_service, container_name, blob_name)
                return LoadedTaskIntelligence(
                    payload=payload,
                    source=f"azure://{container_name}/{blob_name}",
                )
        except Exception as exc:  # noqa: BLE001 - include context in final not-found error
            errors.append(f"{container_name}: blob discovery failed: {exc}")

        if allow_cosmos_metadata:
            try:
                loaded = _load_task_intelligence_from_cosmos_metadata(
                    azure_service,
                    container_name,
                    dataset_prefix,
                )
                if loaded:
                    return loaded
            except Exception as exc:  # noqa: BLE001 - include context in final not-found error
                errors.append(f"{container_name}: Cosmos metadata lookup failed: {exc}")

    searched = ", ".join(containers) or "none"
    target = task_intelligence_blob or dataset_prefix
    detail = f" Details: {'; '.join(errors)}" if errors else ""
    raise ValueError(f"Could not find task intelligence JSON for {target!r} in container(s): {searched}.{detail}")


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
        return [
            _clean_text(key, "")
            for key, enabled in value.items()
            if enabled and _clean_text(key, "")
        ]
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


def _load_payload(args: argparse.Namespace) -> LoadedTaskIntelligence:
    if args.json:
        with args.json.open(encoding="utf-8") as handle:
            return LoadedTaskIntelligence(
                payload=json.load(handle),
                source=f"file://{args.json}",
            )

    if args.dataset_prefix or args.task_intelligence_blob:
        return load_task_intelligence_from_dataset(
            args.dataset_prefix,
            container_names=args.containers,
            task_intelligence_blob=args.task_intelligence_blob,
            allow_cosmos_metadata=not args.no_cosmos_metadata,
        )

    return LoadedTaskIntelligence(payload=SAMPLE_TASK_INTELLIGENCE, source="embedded sample")


def _load_azure_dependencies() -> tuple[Any, Any]:
    backend_dir = Path(__file__).resolve().parents[1]
    backend_dir_str = str(backend_dir)
    if backend_dir_str not in sys.path:
        sys.path.insert(0, backend_dir_str)

    from datara.config import settings
    from datara.services.azure_service import AzureService

    return AzureService(), settings


def _resolve_container_names(container_names: Iterable[str] | None, settings: Any) -> list[str]:
    configured_names: list[str] = []
    for raw_value in container_names or ():
        configured_names.extend(part.strip() for part in str(raw_value).split(",") if part.strip())

    if not configured_names:
        configured_names = [
            getattr(settings, "azure_public_container", ""),
            getattr(settings, "azure_blob_container", ""),
        ]

    seen: set[str] = set()
    resolved: list[str] = []
    for name in configured_names:
        if name and name not in seen:
            seen.add(name)
            resolved.append(name)

    if not resolved:
        raise ValueError("No Azure containers were configured")
    return resolved


def _resolve_task_intelligence_blob_path(dataset_prefix: str, blob_name: str | None) -> str:
    blob_name = _normalize_blob_path(blob_name or "")
    if not blob_name:
        return ""
    if dataset_prefix and blob_name != dataset_prefix and not blob_name.startswith(f"{dataset_prefix}/"):
        return f"{dataset_prefix}/{blob_name}"
    return blob_name


def _find_task_intelligence_blob(azure_service: Any, container_name: str, dataset_prefix: str) -> str | None:
    if not dataset_prefix:
        return None

    candidates = []
    for blob in azure_service.list_blobs(container_name, dataset_prefix):
        blob_name = _blob_name(blob)
        basename = PurePosixPath(blob_name).name.lower()
        if basename.endswith(".json") and "intelligence" in basename:
            candidates.append(blob_name)

    if not candidates:
        return None

    return sorted(
        candidates,
        key=lambda blob_name: _task_intelligence_candidate_rank(dataset_prefix, blob_name),
    )[0]


def _load_task_intelligence_from_cosmos_metadata(
    azure_service: Any,
    container_name: str,
    dataset_prefix: str,
) -> LoadedTaskIntelligence | None:
    if not dataset_prefix or not hasattr(azure_service, "get_cosmos_metadata_for_prefix"):
        return None

    metadata = azure_service.get_cosmos_metadata_for_prefix(container_name, dataset_prefix)
    for blob_path, doc in sorted(metadata.items()):
        payload = doc.get("taskIntelligence") if isinstance(doc, dict) else None
        if isinstance(payload, (dict, list)):
            return LoadedTaskIntelligence(
                payload=payload,
                source=f"cosmos://{container_name}/{blob_path}#taskIntelligence",
            )

    for blob_path, doc in sorted(metadata.items()):
        if not isinstance(doc, dict) or not _is_task_intelligence_metadata_doc(doc):
            continue
        target_blob = _normalize_blob_path(str(doc.get("blobPath") or blob_path))
        if not target_blob:
            continue
        payload = _download_json_blob(azure_service, container_name, target_blob)
        return LoadedTaskIntelligence(
            payload=payload,
            source=f"azure://{container_name}/{target_blob}",
        )

    return None


def _download_json_blob(azure_service: Any, container_name: str, blob_name: str) -> Any:
    raw = azure_service.download_blob(container_name, blob_name).readall()
    if isinstance(raw, bytes):
        text = raw.decode("utf-8-sig")
    else:
        text = str(raw)
    return json.loads(text)


def _is_task_intelligence_metadata_doc(doc: dict[str, Any]) -> bool:
    tags = [str(tag).lower() for tag in doc.get("miscTags", []) if str(tag).strip()]
    typed_values = {
        str(doc.get("docType") or "").lower(),
        str(doc.get("sourceType") or "").lower(),
        str(doc.get("view") or "").lower(),
        *tags,
    }
    return bool(
        typed_values
        & {
            "task_intelligence",
            "task_intelligence_file",
            "task_intelligence_json",
        }
    )


def _task_intelligence_candidate_rank(dataset_prefix: str, blob_name: str) -> tuple[int, str]:
    normalized_prefix = dataset_prefix.rstrip("/")
    basename = PurePosixPath(blob_name).name.lower()
    dataset_slug = PurePosixPath(normalized_prefix).name.lower()
    is_root_child = _is_dataset_root_child(normalized_prefix, blob_name)
    is_exact_dataset_json = basename == f"{dataset_slug}_intelligence.json"
    is_standard_json = basename.endswith("_intelligence.json")

    if is_root_child and is_exact_dataset_json:
        rank = 0
    elif is_root_child and is_standard_json:
        rank = 1
    elif is_root_child:
        rank = 2
    elif is_standard_json:
        rank = 3
    else:
        rank = 4
    return rank, blob_name.lower()


def _is_dataset_root_child(dataset_prefix: str, blob_name: str) -> bool:
    normalized_prefix = dataset_prefix.rstrip("/")
    normalized_blob = _normalize_blob_path(blob_name)
    if not normalized_prefix or not normalized_blob.startswith(f"{normalized_prefix}/"):
        return False
    suffix = normalized_blob[len(normalized_prefix) + 1 :]
    return bool(suffix) and "/" not in suffix


def _blob_name(blob: Any) -> str:
    return _normalize_blob_path(str(getattr(blob, "name", blob) or ""))


def _normalize_blob_path(value: str) -> str:
    return str(value or "").replace("\\", "/").strip().strip("/")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--json", type=Path, help="Optional local task-intelligence JSON path.")
    parser.add_argument(
        "--dataset-prefix",
        help="Azure dataset storage prefix, e.g. carAutomation/Porsche/frontSeat.",
    )
    parser.add_argument(
        "--container",
        action="append",
        dest="containers",
        metavar="CONTAINER",
        help=(
            "Azure Blob container to search. Repeat this flag or pass comma-separated "
            "values. Defaults to configured public and private containers."
        ),
    )
    parser.add_argument(
        "--task-intelligence-blob",
        help="Exact task-intelligence blob path, or filename under --dataset-prefix.",
    )
    parser.add_argument(
        "--no-cosmos-metadata",
        action="store_true",
        help="Disable fallback lookup from Cosmos taskIntelligence metadata.",
    )
    parser.add_argument("--ticks", type=int, default=12, help="Maximum tree ticks to run.")
    parser.add_argument(
        "--initial-fact",
        action="append",
        default=[],
        help="Additional initial world-state fact. Can be repeated.",
    )
    args = parser.parse_args()
    if args.json and (args.dataset_prefix or args.task_intelligence_blob or args.containers):
        parser.error("--json cannot be combined with Azure dataset options")
    if args.containers and not (args.dataset_prefix or args.task_intelligence_blob):
        parser.error("--container requires --dataset-prefix or --task-intelligence-blob")
    return args


def main() -> None:
    args = _parse_args()
    loaded = _load_payload(args)
    payload = loaded.payload
    initial_state = set(INITIAL_WORLD_STATE)
    initial_state.update(args.initial_fact)

    tree, world_state = build_behaviour_tree(payload, initial_world_state=initial_state)
    tree.setup(timeout=15)

    print(f"Loaded task intelligence from: {loaded.source}\n")
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

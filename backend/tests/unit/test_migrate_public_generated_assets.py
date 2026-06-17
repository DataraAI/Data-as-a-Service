from __future__ import annotations

from utils import migrate_public_dataset_layout
from utils.migrate_public_generated_assets import supplemental_copy_plans


def test_core_layout_migration_defaults_to_old_source_container(monkeypatch) -> None:
    monkeypatch.setattr(migrate_public_dataset_layout.settings, "azure_blob_container", "roboteyeview-public")
    monkeypatch.setattr(
        "sys.argv",
        [
            "migrate_public_dataset_layout.py",
            "--admin-email",
            "roboteyeview@gmail.com",
        ],
    )

    args = migrate_public_dataset_layout.parse_args()

    assert args.source_container == "roboteyeview"
    assert args.target_container == "roboteyeview-public"


def test_supplemental_copy_plans_skip_core_layout_targets() -> None:
    source_prefix = "serverrack/Dell/dataRackInstall"
    source_blobs = [
        f"{source_prefix}/video/input.mp4",
        f"{source_prefix}/orig/frame_0001.png",
        f"{source_prefix}/egos/frame_0001.png",
        f"{source_prefix}/masks/humans/0/frame_0001.png",
        f"{source_prefix}/README.md",
        f"{source_prefix}/occl_del/human/output.mp4",
        f"{source_prefix}/new_angle_videos/left.mp4",
        f"{source_prefix}/hand_mesh/towel/artifacts/hand_0001.obj",
        f"{source_prefix}/hand_mesh/towel/mcaps/keypoints.mcap",
        f"{source_prefix}/corner_images_controlnet/fire/frame_0001.png",
        f"{source_prefix}/preview/hover.mp4",
    ]

    plans = supplemental_copy_plans(
        source_blobs=source_blobs,
        source_prefix=source_prefix,
        target_prefix="serverrack/dataRackInstall",
        task_slug="dataRackInstall",
        source_video=f"{source_prefix}/video/input.mp4",
    )

    targets_by_kind = {plan.kind: plan.target_blob for plan in plans}
    target_blobs = {plan.target_blob for plan in plans}

    assert "serverrack/dataRackInstall/dataRackInstall.mp4" not in target_blobs
    assert "serverrack/dataRackInstall/misc/orig/frame_0001.png" not in target_blobs
    assert "serverrack/dataRackInstall/misc/egos/frame_0001.png" not in target_blobs
    assert "serverrack/dataRackInstall/misc/masks/humans/0/frame_0001.png" not in target_blobs
    assert "serverrack/dataRackInstall/README.md" not in target_blobs

    assert targets_by_kind["occlusion_video"] == "serverrack/dataRackInstall/no_human.mp4"
    assert targets_by_kind["new_angle_video"] == "serverrack/dataRackInstall/dataRackInstall_left.mp4"
    assert targets_by_kind["hand_mesh_obj"] == "serverrack/dataRackInstall/hand_meshes/towel_hand_0001.obj"
    assert targets_by_kind["hand_keypoints_mcap"] == "serverrack/dataRackInstall/dataRackInstall_hand_keypoints.mcap"
    assert (
        targets_by_kind["corner_case_frame"]
        == "serverrack/dataRackInstall/misc/egos/corner_images_controlnet/fire/frame_0001.png"
    )
    assert targets_by_kind["preview"] == "serverrack/dataRackInstall/preview/hover.mp4"

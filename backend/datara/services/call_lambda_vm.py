import importlib.util
import os
import posixpath
import re
import stat
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import paramiko

from datara.logging import logger


# Save ego/corner outputs under backend/utils/dataset_list for upload_frames_to_azure
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_LIST_DIR = os.path.join(BACKEND_DIR, "utils", "dataset_list")
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


def _load_legacy_saas_config():
    legacy_path = Path(PROJECT_ROOT) / ".org" / "backend" / "saas_config.py"
    if not legacy_path.is_file():
        return None

    spec = importlib.util.spec_from_file_location("_datara_legacy_saas_config", legacy_path)
    if not spec or not spec.loader:
        return None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_LEGACY_SAAS_CONFIG = _load_legacy_saas_config()


def _legacy_saas_attr(name, default=None):
    if _LEGACY_SAAS_CONFIG is None:
        return default
    return getattr(_LEGACY_SAAS_CONFIG, name, default)


SAAS_HOST = os.getenv("SAAS_HOST") or _legacy_saas_attr("HOST")
SAAS_HOST = SAAS_HOST or "192.222.51.234"
SAAS_USER = os.getenv("SAAS_USER") or _legacy_saas_attr("USER") or "ubuntu"
SAAS_KEY_PATH = (
    os.getenv("SAAS_KEY_PATH")
    or _legacy_saas_attr("KEY_PATH")
    or os.path.expanduser("~/.ssh/azure_to_lambda")
)
DEFAULT_SAM3_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/sam3/bin/python"
DEFAULT_QWEN_ANGLES_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/qwen-angles-2509/bin/python"
DEFAULT_QWEN_VLM_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/qwen-vlm/bin/python"
DEFAULT_ROSE_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/rose_runtime/bin/python"
DEFAULT_ADDIT_SAM2_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/addit-sam2/bin/python"

def _resolve_key_path():
    return os.path.join(os.path.expanduser("~"), ".ssh", "azure_to_lambda")
    # return os.path.expanduser("~/.ssh/azure_to_lambda")
    # "C:\Users\valer\.ssh\azure_to_lambda"

SAAS_KEY_PATH = _resolve_key_path()
SAAS_PYTHON_BIN = (
    os.getenv("SAAS_PYTHON_BIN")
    or _legacy_saas_attr("PYTHON_BIN")
    or DEFAULT_SAM3_PYTHON_BIN
)
SAAS_IMAGE_PYTHON_BIN = (
    os.getenv("SAAS_IMAGE_PYTHON_BIN")
    or _legacy_saas_attr("IMAGE_PYTHON_BIN")
    or SAAS_PYTHON_BIN
)
SAAS_EGO_PYTHON_BIN = (
    os.getenv("SAAS_EGO_PYTHON_BIN")
    or _legacy_saas_attr("EGO_PYTHON_BIN")
    or DEFAULT_QWEN_ANGLES_PYTHON_BIN
)
SAAS_VLM_PYTHON_BIN = (
    os.getenv("SAAS_VLM_PYTHON_BIN")
    or _legacy_saas_attr("VLM_PYTHON_BIN")
    or DEFAULT_QWEN_VLM_PYTHON_BIN
)
SAAS_CORNER_PYTHON_BIN = (
    os.getenv("SAAS_CORNER_PYTHON_BIN")
    or _legacy_saas_attr("CORNER_PYTHON_BIN")
    or DEFAULT_ADDIT_SAM2_PYTHON_BIN
)
SAAS_ROSE_PYTHON_BIN = (
    os.getenv("SAAS_ROSE_PYTHON_BIN")
    or _legacy_saas_attr("ROSE_PYTHON_BIN")
    or DEFAULT_ROSE_PYTHON_BIN
)

REMOTE_USER_HOME = f"/home/{SAAS_USER}"
REMOTE_PACKAGES_ROOT = posixpath.join(REMOTE_USER_HOME, "packages")
REMOTE_SAAS_ROOT = posixpath.join(REMOTE_USER_HOME, "Software-as-a-Service")
DEFAULT_ROSE_ROOT = posixpath.join(REMOTE_PACKAGES_ROOT, "ROSE")
SAAS_ROSE_ROOT = DEFAULT_ROSE_ROOT
REMOTE_IMAGE_PROMPT_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "image_prompt_tool.py")
REMOTE_CORNER_CASE_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "Corner_case_tool.py")
REMOTE_CORNER_CASE_OUTPUT_ROOT = "corner_images_controlnet"
REMOTE_CORNER_CASE_LOCALIZATION_MODEL = "attention_points_sam"
REMOTE_VLM_IMAGE_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "Post Annotation", "qwen_vlm_image.py")
REMOTE_SEGMENTATION_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "DataraAI_segmentation.py")
REMOTE_SUBTASK_ANNOTATOR_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "Post Annotation", "qwen_subtask_annotator.py")
REMOTE_ROSE_RUNNER_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "DataraAI_rose_occlusion.py")
REMOTE_ROSE_VERIFY_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "verify_rose_runtime.sh")
REMOTE_ROSE_SETUP_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "setup_rose_runtime.sh")
REMOTE_SAM3_PACKAGE_ROOT = f"{REMOTE_USER_HOME}/packages/sam3"
REMOTE_DYN_HAMR_ROOT = os.getenv("SAAS_DYN_HAMR_ROOT") or f"{REMOTE_USER_HOME}/packages/Dyn-HaMR"
DEFAULT_VIPE_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/vipe/bin/python"
SAAS_VIPE_PYTHON_BIN = os.getenv("SAAS_VIPE_PYTHON_BIN") or DEFAULT_VIPE_PYTHON_BIN
REMOTE_VIPE_RUNNER_SCRIPT = (
    f"/home/ubuntu/Software-as-a-Service/run_vipe_dynhamr.py"
    or os.getenv("SAAS_VIPE_RUNNER_SCRIPT")
    or posixpath.join(REMOTE_DYN_HAMR_ROOT, "run_vipe_dynhamr.py")
)
REMOTE_DYN_HAMR_OUTPUT_DIR = os.getenv("SAAS_DYN_HAMR_OUTPUT_DIR") or posixpath.join(
    REMOTE_DYN_HAMR_ROOT,
    "output",
    "logs",
    "video-custom",
)
HAND_MESH_VIDEO_SUFFIXES = (".mp4", ".mov", ".m4v", ".webm")
HAND_MESH_ARTIFACT_SUFFIXES = (
    ".json",
    ".npz",
    ".npy",
    ".ply",
    ".obj",
    ".glb",
    ".gltf",
    ".zip",
    ".log",
    ".txt",
    ".pkl",
    ".pt",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
)
REMOTE_LYRA_V2V_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "lyra_v2v.py")


@contextmanager
def _ssh_session():
    """
    Context manager that yields an authenticated SSH client to the Lambda VM.
    Handles key loading, connection, and teardown. Raises on connection failure.
    """
    hostname = SAAS_HOST
    username = SAAS_USER
    key_filename = SAAS_KEY_PATH

    if not hostname:
        raise RuntimeError("Missing SAAS_HOST or legacy SaaS host configuration")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            hostname=hostname,
            username=username,
            key_filename=key_filename,
            look_for_keys=False,
            allow_agent=False,
            timeout=15
        )
        yield client
    except paramiko.AuthenticationException:
        logger.error(f"Authentication failed for {username}@{hostname} using key {key_filename}")
        raise
    except paramiko.SSHException as e:
        print(f"SSH connection error: {e}")
        raise
    except FileNotFoundError:
        print(f"Key file not found at: {key_filename}")
        raise
    finally:
        client.close()


def _run_command_with_status(client, command):
    """Execute a command on the SSH client; returns (stdout_str, stderr_str, exit_status)."""
    stdin, stdout, stderr = client.exec_command(command)
    _ = stdin
    out = stdout.read().decode().strip() if stdout else ""
    err = stderr.read().decode().strip() if stderr else ""
    exit_status = stdout.channel.recv_exit_status() if stdout else 0
    logger.info("call_lambda_vm command exit=%s stdout=%s stderr=%s", exit_status, out, err)
    return out, err, exit_status


def _run_command(client, command):
    """Execute a command on the SSH client; returns (stdout_str, stderr_str)."""
    out, err, _status = _run_command_with_status(client, command)
    return out, err


def _run_bash_script(client, script_body):
    command = f'bash -lc "{_shell_escape(script_body)}"'
    return _run_command_with_status(client, command)


def _sftp_mkdir_p(sftp, remote_dir):
    current = ""
    for part in remote_dir.strip("/").split("/"):
        current = f"{current}/{part}" if current else f"/{part}"
        try:
            sftp.stat(current)
        except OSError:
            sftp.mkdir(current)


def _sftp_put_tree(sftp, local_path, remote_path):
    local_path = os.path.abspath(local_path)
    if os.path.isdir(local_path):
        _sftp_mkdir_p(sftp, remote_path)
        for entry in os.scandir(local_path):
            child_remote = posixpath.join(remote_path, entry.name)
            if entry.is_dir():
                _sftp_put_tree(sftp, entry.path, child_remote)
            else:
                _sftp_mkdir_p(sftp, posixpath.dirname(child_remote))
                sftp.put(entry.path, child_remote)
        return

    _sftp_mkdir_p(sftp, posixpath.dirname(remote_path))
    sftp.put(local_path, remote_path)


def _sftp_get_tree(sftp, remote_path, local_path):
    os.makedirs(local_path, exist_ok=True)
    for entry in sftp.listdir_attr(remote_path):
        remote_child = posixpath.join(remote_path, entry.filename)
        local_child = os.path.join(local_path, entry.filename)
        if stat.S_ISDIR(entry.st_mode):
            _sftp_get_tree(sftp, remote_child, local_child)
        else:
            os.makedirs(os.path.dirname(local_child), exist_ok=True)
            sftp.get(remote_child, local_child)


def _shell_escape(s):
    """Escape a string for safe use inside double-quoted bash argument."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$").replace("`", "\\`")


def _rose_env_exports():
    exports = []
    if SAAS_ROSE_ROOT:
        exports.append(f'export ROSE_ROOT="{_shell_escape(SAAS_ROSE_ROOT)}"')
    if SAAS_ROSE_PYTHON_BIN:
        exports.append(f'export ROSE_PYTHON_BIN="{_shell_escape(SAAS_ROSE_PYTHON_BIN)}"')
    exports.append("export PYTHONNOUSERSITE=1")
    return "; ".join(exports)


def _remote_image_env_prefix():
    return (
        f'cd "{_shell_escape(REMOTE_SAAS_ROOT)}" && '
        f'PYTHONNOUSERSITE=1 '
        f'PYTHONPATH="{_shell_escape(REMOTE_USER_HOME)}:{_shell_escape(REMOTE_SAAS_ROOT)}:$PYTHONPATH" '
    )


def _cleanup_remote_job_root(client, remote_root):
    try:
        _run_command(client, f'rm -rf "{_shell_escape(remote_root)}"')
    except Exception:
        logger.warning("Failed to clean remote job root %s", remote_root, exc_info=True)


def generate_ego_image(prompt, imageURL, container_name, output_name):
    """
    Run ego image generation on the Lambda VM and save the result under
    backend/utils/dataset_list/{output_name}/egos/. Returns (local_path, status_code).
    """
    command = (
        f'"{_shell_escape(SAAS_EGO_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_IMAGE_PROMPT_SCRIPT)}"'
        ' --prompt "' + _shell_escape(prompt) + '"'
        ' --imageURL "' + _shell_escape(imageURL) + '"'
        ' --container_name "' + _shell_escape(container_name) + '"'
    )

    print(f"datara services call_lambda_vm.generate_ego_image() command: {command}")
    logger.info(f"datara services call_lambda_vm.generate_ego_image() command: {command}")
    try:
        with _ssh_session() as ssh_client:
            logger.info("datara services call_lambda_vm.generate_ego_image() SSH session established")
            stdout, stderr = _run_command(ssh_client, _remote_image_env_prefix() + command)
            ego_image_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if "/ego_images/" not in ego_image_path:
                logger.error("datara services call_lambda_vm.generate_ego_image() command error: %s", stderr)
                return None, 500

            remote_path = ego_image_path
            filename = os.path.basename(remote_path)
            local_egos_dir = os.path.join(DATASET_LIST_DIR, output_name, "egos")
            os.makedirs(local_egos_dir, exist_ok=True)
            local_image_path = os.path.join(local_egos_dir, filename)

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_path, local_image_path)
                if os.path.exists(local_image_path):
                    print(f"Successfully saved to '{local_image_path}'")
                else:
                    local_image_path = None
                _run_command(ssh_client, "rm -rf ego_images/" + container_name)
            finally:
                sftp.close()

            return local_image_path, 200
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, 500


def run_vlm_tags(prompt: str, image_url: str):
    """
    Run the VLM image tagging script on the Lambda VM. Runs qwen_vlm_image.py with
    the given prompt and egoURL. Fetches the output JSON file locally, then removes
    it from the VM. Returns (local_json_path, status_code). On failure returns (None, status_code).
    """
    if not prompt or not image_url:
        return None, 400

    safe_prompt = _shell_escape(prompt)
    safe_url = _shell_escape(image_url)
    command = (
        f'"{_shell_escape(SAAS_VLM_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_VLM_IMAGE_SCRIPT)}" '
        f'--prompt "{safe_prompt}" --egoURL "{safe_url}"'
    )
    logger.info("call_lambda_vm.run_vlm_tags() command: %s", command)

    try:
        with _ssh_session() as ssh_client:
            stdout, stderr = _run_command(ssh_client, _remote_image_env_prefix() + command)
            remote_json_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if not remote_json_path or not remote_json_path.endswith(".json"):
                logger.error("VLM script failed or returned invalid path: %s", stderr or stdout)
                return None, 500

            os.makedirs(DATASET_LIST_DIR, exist_ok=True)
            local_json_path = os.path.join(DATASET_LIST_DIR, os.path.basename(remote_json_path))

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_json_path, local_json_path)
            finally:
                sftp.close()

            _run_command(ssh_client, f"rm -f '{remote_json_path}'")

            if os.path.exists(local_json_path):
                return local_json_path, 200
            return None, 500
    except Exception as e:
        logger.error("run_vlm_tags error: %s", e)
        return None, 500


def invoke_corner_case(text, image_url, container_name, output_name):
    """
    Invoke corner-case handling on the Lambda VM. Runs corner_case_tool.py with
    the given text, image URL, and container name. On success, SFTPs the result
    down and saves it under backend/utils/dataset_list/{output_name}/corner_images_controlnet/.
    Returns (local_path, status_code).
    """
    if not text or not image_url or not container_name:
        return None, 400

    safe_text = _shell_escape(text)
    safe_url = _shell_escape(image_url)
    safe_container = _shell_escape(container_name)
    command = (
        f'"{_shell_escape(SAAS_CORNER_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_CORNER_CASE_SCRIPT)}" '
        f'--prompt "{safe_text}" --imageURL "{safe_url}" --container_name "{safe_container}" '
        f'--localization_model "{_shell_escape(REMOTE_CORNER_CASE_LOCALIZATION_MODEL)}" '
        f'--out_root "{_shell_escape(REMOTE_CORNER_CASE_OUTPUT_ROOT)}"'
    )
    prefix = f"/{REMOTE_CORNER_CASE_OUTPUT_ROOT}/{container_name}"
    remote_corner_dir = posixpath.join(REMOTE_SAAS_ROOT, REMOTE_CORNER_CASE_OUTPUT_ROOT, container_name)

    try:
        with _ssh_session() as ssh_client:
            stdout, stderr = _run_command(ssh_client, _remote_image_env_prefix() + command)

            remote_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""
            if prefix not in remote_path:
                logger.error("Corner case tool failed or returned invalid path: %s | stderr=%s", remote_path, stderr)
                return None, 500
            logger.info("datara services call_lambda_vm.invoke_corner_case() remote path: %s", remote_path)

            filename = os.path.basename(remote_path)
            local_corner_dir = os.path.join(DATASET_LIST_DIR, output_name, "corner_images_controlnet")
            os.makedirs(local_corner_dir, exist_ok=True)
            local_path = os.path.join(local_corner_dir, filename)

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_path, local_path)
                if not os.path.exists(local_path):
                    return None, 404
                print(f"Successfully saved corner case image to '{local_path}'")
                _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_corner_dir)}"')
            finally:
                sftp.close()

            return local_path, 200
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, 500


def generate_masks(*, prompt, local_input_dir, local_output_dir):
    """
    Upload a local image folder to the Lambda VM, run the SaaS-owned
    DataraAI_segmentation.py from the remote Software-as-a-Service checkout,
    fetch the resulting prompt-level instance folders locally, and remove the
    remote job folder. Returns (local_output_dir, status_code).
    """
    if not prompt or not local_input_dir or not local_output_dir:
        return None, 400
    if not os.path.isdir(local_input_dir):
        return None, 400

    job_id = uuid.uuid4().hex[:12]
    remote_root = f"/home/{SAAS_USER}/datara_mask_jobs/{job_id}"
    remote_input_dir = posixpath.join(remote_root, "videos")
    remote_output_root = posixpath.join(remote_root, "output")

    try:
        with _ssh_session() as ssh_client:
            try:
                script_exists_stdout, script_exists_stderr = _run_command(
                    ssh_client,
                    f'test -f "{_shell_escape(REMOTE_SEGMENTATION_SCRIPT)}" && echo "__FOUND__"',
                )
                if "__FOUND__" not in script_exists_stdout:
                    logger.error(
                        "Remote DataraAI_segmentation.py was not found at %s | stderr=%s",
                        REMOTE_SEGMENTATION_SCRIPT,
                        script_exists_stderr,
                    )
                    return None, 500

                sftp = ssh_client.open_sftp()
                try:
                    _sftp_put_tree(sftp, local_input_dir, remote_input_dir)
                finally:
                    sftp.close()

                command_parts = [
                    f'"{_shell_escape(SAAS_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_SEGMENTATION_SCRIPT)}"',
                    '--input_mode "folder"',
                    f'--image_dir "{_shell_escape(remote_input_dir)}"',
                    f'--segment "{_shell_escape(prompt)}"',
                    f'--output_dir "{_shell_escape(remote_output_root)}"',
                ]

                remote_command = (
                    f'cd "{_shell_escape(REMOTE_SAAS_ROOT)}" && '
                    f'PYTHONNOUSERSITE=1 PYTHONPATH="{_shell_escape(REMOTE_USER_HOME)}:{_shell_escape(REMOTE_SAM3_PACKAGE_ROOT)}:{_shell_escape(REMOTE_SAAS_ROOT)}:$PYTHONPATH" '
                    + " ".join(command_parts)
                )
                stdout, stderr = _run_command(ssh_client, remote_command)
                remote_result_dir = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""
                if not remote_result_dir.startswith(remote_output_root):
                    logger.error("Mask generation returned invalid output path: %s | stderr=%s", remote_result_dir, stderr)
                    return None, 500

                sftp = ssh_client.open_sftp()
                try:
                    _sftp_get_tree(sftp, remote_result_dir, local_output_dir)
                finally:
                    sftp.close()

                if os.path.isdir(local_output_dir):
                    return local_output_dir, 200
                return None, 500
            finally:
                _cleanup_remote_job_root(ssh_client, remote_root)
    except Exception as e:
        logger.error("generate_masks error: %s", e, exc_info=True)
        return None, 500


def remove_occlusion(
    *,
    local_input_video,
    local_mask_video,
    local_output_video,
    prompt,
    sample_height,
    sample_width,
    window_length=49,
):
    """
    Upload locally staged source/mask videos to the SaaS VM, verify the
    SaaS-owned ROSE runtime, run the remote DataraAI_rose_occlusion.py script,
    and fetch the final MP4 output locally.
    Returns (local_output_video, status_code, error_message).
    """
    if not prompt:
        return None, 400, "Missing ROSE prompt"
    if not os.path.isfile(local_input_video) or not os.path.isfile(local_mask_video):
        return None, 400, "Source or mask video is missing"

    os.makedirs(os.path.dirname(local_output_video), exist_ok=True)

    job_id = uuid.uuid4().hex[:12]
    remote_root = f"/home/{SAAS_USER}/datara_rose_jobs/{job_id}"
    remote_input_dir = posixpath.join(remote_root, "input")
    remote_output_dir = posixpath.join(remote_root, "output")
    remote_source_video = posixpath.join(remote_input_dir, "source.mp4")
    remote_mask_video = posixpath.join(remote_input_dir, "mask.mp4")

    try:
        with _ssh_session() as ssh_client:
            try:
                rose_runner_found, runner_err = _run_command(
                    ssh_client,
                    f'test -f "{_shell_escape(REMOTE_ROSE_RUNNER_SCRIPT)}" && echo "__FOUND__"',
                )
                if "__FOUND__" not in rose_runner_found:
                    logger.error(
                        "Remote DataraAI_rose_occlusion.py was not found at %s | stderr=%s",
                        REMOTE_ROSE_RUNNER_SCRIPT,
                        runner_err,
                    )
                    return None, 500, "ROSE runner script was not found on the SaaS VM"

                sftp = ssh_client.open_sftp()
                try:
                    _sftp_put_tree(sftp, local_input_video, remote_source_video)
                    _sftp_put_tree(sftp, local_mask_video, remote_mask_video)
                finally:
                    sftp.close()

                export_prefix = _rose_env_exports()
                verify_script = export_prefix + "; " if export_prefix else ""
                verify_script += (
                    f'"{_shell_escape(SAAS_ROSE_PYTHON_BIN)}" -s '
                    f'"{_shell_escape(REMOTE_ROSE_RUNNER_SCRIPT)}" --verify-only'
                )
                _verify_stdout, verify_stderr, verify_status = _run_bash_script(ssh_client, verify_script)
                if verify_status != 0:
                    message = verify_stderr or "ROSE runtime is not installed/configured on the SaaS VM"
                    logger.error("ROSE runtime verification failed: %s", message)
                    return None, 503, message

                runner_script = export_prefix + "; " if export_prefix else ""
                runner_script += (
                    f'"{_shell_escape(SAAS_ROSE_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_ROSE_RUNNER_SCRIPT)}" '
                    f'--source_video "{_shell_escape(remote_source_video)}" '
                    f'--mask_video "{_shell_escape(remote_mask_video)}" '
                    f'--output_dir "{_shell_escape(remote_output_dir)}" '
                    f'--prompt "{_shell_escape(prompt)}" '
                    f'--video_length "{int(window_length)}" '
                    f'--sample_height "{int(sample_height)}" '
                    f'--sample_width "{int(sample_width)}"'
                )
                stdout, stderr, runner_status = _run_bash_script(ssh_client, runner_script)
                if runner_status != 0:
                    logger.error("ROSE occlusion runner failed: %s", stderr or stdout)
                    return None, 500, stderr or stdout or "ROSE occlusion removal failed"

                remote_output_path = ""
                for line in reversed(stdout.splitlines()):
                    candidate = line.strip()
                    if candidate.endswith((".mp4", ".mov", ".m4v", ".webm")):
                        remote_output_path = candidate
                        break

                if not remote_output_path:
                    find_stdout, find_stderr, find_status = _run_bash_script(
                        ssh_client,
                        f'find "{_shell_escape(remote_output_dir)}" -maxdepth 1 -type f '
                        r'\( -name "*.mp4" -o -name "*.mov" -o -name "*.m4v" -o -name "*.webm" \) | head -n 1',
                    )
                    if find_status == 0:
                        remote_output_path = (find_stdout.strip().splitlines()[-1].strip() if find_stdout else "") or ""
                    if not remote_output_path:
                        logger.error("ROSE output discovery failed: stdout=%s stderr=%s", stdout, stderr or find_stderr)
                        return None, 500, "ROSE completed without returning an output video"

                sftp = ssh_client.open_sftp()
                try:
                    sftp.get(remote_output_path, local_output_video)
                finally:
                    sftp.close()

                if os.path.isfile(local_output_video):
                    return local_output_video, 200, ""
                return None, 500, "ROSE output video could not be downloaded"
            finally:
                _cleanup_remote_job_root(ssh_client, remote_root)
    except Exception as exc:
        logger.error("remove_occlusion error: %s", exc, exc_info=True)
        return None, 500, str(exc)


def _extract_hand_mesh_run_dir_from_path(path: str) -> str:
    """
    Dyn-HaMR layout: .../video-custom/{YYYY-MM-DD}/{custom_name}/...
    """
    normalised = path.replace("\\", "/").rstrip("/")
    marker = "output/logs/video-custom/"
    marker_index = normalised.find(marker)
    if marker_index < 0:
        return ""

    base = normalised[: marker_index + len(marker)]
    remainder = normalised[marker_index + len(marker) :].strip("/")
    segments = [segment for segment in remainder.split("/") if segment]
    if not segments:
        return ""

    if "." in segments[-1]:
        segments = segments[:-1]
    if len(segments) < 2:
        return ""
    return f"{base}{segments[0]}"


def generate_hand_mesh(
    *,
    video_url,
    seq_name,
    pipeline="default",
    local_output_dir,
):
    """
    Pass the video URL directly to the SaaS VM so it handles downloading.
    Runs run_vipe_dynhamr.py, which prints OUTPUT_VIDEO and OUTPUT_OBJ sentinel
    lines to stdout. This function parses those sentinels and SFTPs the files down.
    Returns (local_video_paths, local_artifact_paths, status_code, error_message).
    """
    if not seq_name:
        return [], [], [], [], 400, "Missing sequence name"
    if not video_url:
        return [], [], [], [], 400, "Missing video URL"

    local_videos_dir = os.path.join(local_output_dir, "videos")
    local_artifacts_dir = os.path.join(local_output_dir, "artifacts")
    local_mcap_dir = os.path.join(local_output_dir, "mcaps")
    local_npz_dir = os.path.join(local_output_dir, "npz")
    os.makedirs(local_videos_dir, exist_ok=True)
    os.makedirs(local_artifacts_dir, exist_ok=True)
    os.makedirs(local_mcap_dir, exist_ok=True)
    os.makedirs(local_npz_dir, exist_ok=True)

    safe_seq = _shell_escape(seq_name)
    safe_pipeline = _shell_escape(pipeline or "default")
    safe_url = _shell_escape(video_url.strip())

    try:
        with _ssh_session() as ssh_client:
            runner_found, runner_err = _run_command(
                ssh_client,
                f'test -f "{_shell_escape(REMOTE_VIPE_RUNNER_SCRIPT)}" && echo "__FOUND__"',
            )
            if "__FOUND__" not in runner_found:
                logger.error(
                    "Remote run_vipe_dynhamr.py was not found at %s | stderr=%s",
                    REMOTE_VIPE_RUNNER_SCRIPT,
                    runner_err,
                )
                return [], [], [], [], 500, "VIPE hand mesh runner script was not found on the SaaS VM"

            runner_script = (
                f'cd "{_shell_escape(REMOTE_DYN_HAMR_ROOT)}" && '
                f'export PYTHONNOUSERSITE=1 && '
                f'"{_shell_escape(SAAS_VIPE_PYTHON_BIN)}" "{_shell_escape(REMOTE_VIPE_RUNNER_SCRIPT)}" '
                f'--video-url "{safe_url}" '
                f'--seq "{safe_seq}" '
                f'--pipeline "{safe_pipeline}"'
            )
            stdout, stderr, runner_status = _run_bash_script(ssh_client, runner_script)
            if runner_status != 0:
                logger.error("VIPE hand mesh runner failed: %s", stderr or stdout)
                return [], [], [], [], 500, stderr or stdout or "Hand mesh generation failed on the SaaS VM"

            # Parse sentinel lines emitted by run_vipe_dynhamr.py:
            #   OUTPUT_VIDEO:   /path/to/foo_src_cam.mp4
            #   OUTPUT_OBJ:     /path/to/foo folder to .obj files
            #   OUTPUT_MCAP:    /path/to/foo.mcap
            #   OUTPUT_NPZ:     /path/to/foo.npz
            remote_videos: list[str] = []
            remote_artifacts: list[str] = []
            remote_mcap: list[str] = []
            remote_npz: list[str] = []
            sftp = ssh_client.open_sftp()
            for line in stdout.splitlines():
                line = line.strip()
                if line.startswith("OUTPUT_VIDEO: "):
                    remote_videos.append(line[len("OUTPUT_VIDEO: "):].strip())
                elif line.startswith("OUTPUT_OBJ: "):
                    path = line[len("OUTPUT_OBJ: "):].strip()
                    dir_contents = sftp.listdir(path)
                    for filename in dir_contents:
                        if filename.lower().endswith(".obj"):
                            full_path = posixpath.join(path, filename)
                            remote_artifacts.append(full_path)
                elif line.startswith("OUTPUT_MCAP: "):
                    remote_mcap.append(line[len("OUTPUT_MCAP: "):].strip())
                elif line.startswith("OUTPUT_NPZ: "):
                    remote_npz.append(line[len("OUTPUT_NPZ: "):].strip())
            sftp.close()

            if not remote_videos and not remote_artifacts and not remote_mcap and not remote_npz:
                logger.error(
                    "VIPE completed but emitted no OUTPUT_VIDEO/OUTPUT_OBJ/OUTPUT_MCAP/OUTPUT_NPZ sentinels: stdout=%s stderr=%s",
                    stdout,
                    stderr,
                )
                return [], [], [], [], 500, "Hand mesh pipeline completed without outputs"

            # Determine the run output dir from any sentinel path so we can clean it up
            run_output_dir = ""
            for path in remote_videos + remote_artifacts + remote_mcap + remote_npz:
                run_output_dir = _extract_hand_mesh_run_dir_from_path(path)
                if run_output_dir:
                    break

            local_video_paths: list[str] = []
            local_artifact_paths: list[str] = []
            local_mcap_paths: list[str] = []
            local_npz_paths: list[str] = []
            sftp = ssh_client.open_sftp()
            try:
                for index, remote_video_path in enumerate(remote_videos):
                    filename = os.path.basename(remote_video_path) or f"hand_mesh_{index + 1}.mp4"
                    local_path = os.path.join(local_videos_dir, filename)
                    if os.path.exists(local_path):
                        stem, ext = os.path.splitext(filename)
                        local_path = os.path.join(local_videos_dir, f"{stem}_{index + 1}{ext or '.mp4'}")
                    sftp.get(remote_video_path, local_path)
                    if os.path.isfile(local_path):
                        local_video_paths.append(local_path)

                for index, remote_artifact_path in enumerate(remote_artifacts):
                    filename = os.path.basename(remote_artifact_path) or f"artifact_{index + 1}"
                    local_path = os.path.join(local_artifacts_dir, filename)
                    if os.path.exists(local_path):
                        stem, ext = os.path.splitext(filename)
                        local_path = os.path.join(local_artifacts_dir, f"{stem}_{index + 1}{ext or ''}")
                    sftp.get(remote_artifact_path, local_path)
                    if os.path.isfile(local_path):
                        local_artifact_paths.append(local_path)
                
                for index, remote_mcap_path in enumerate(remote_mcap):
                    filename = os.path.basename(remote_mcap_path) or f"mcap_{index + 1}"
                    local_path = os.path.join(local_mcap_dir, filename)
                    if os.path.exists(local_path):
                        stem, ext = os.path.splitext(filename)
                        local_path = os.path.join(local_mcap_dir, f"{stem}_{index + 1}{ext or ''}")
                    sftp.get(remote_mcap_path, local_path)
                    if os.path.isfile(local_path):
                        local_mcap_paths.append(local_path)

                for index, remote_npz_path in enumerate(remote_npz):
                    filename = os.path.basename(remote_npz_path) or f"npz_{index + 1}"
                    local_path = os.path.join(local_mcap_dir, filename)
                    if os.path.exists(local_path):
                        stem, ext = os.path.splitext(filename)
                        local_path = os.path.join(local_npz_dir, f"{stem}_{index + 1}{ext or ''}")
                    sftp.get(remote_npz_path, local_path)
                    if os.path.isfile(local_path):
                        local_npz_paths.append(local_path)
            finally:
                sftp.close()

            if run_output_dir:
                _run_command(ssh_client, f'rm -rf "{_shell_escape(run_output_dir)}"')
                logger.info("Cleaned up remote output directory: %s", run_output_dir)

            if local_video_paths or local_artifact_paths or local_mcap_paths:
                return local_video_paths, local_artifact_paths, local_mcap_paths, 200, ""
            return [], [], [], [], 500, "Hand mesh outputs could not be downloaded"

    except Exception as exc:
        logger.error("generate_hand_mesh error: %s", exc, exc_info=True)
        return [], [], [], [], 500, str(exc)

def generate_task_intelligence(video_url: str):
    """
    Run the subtask annotator script on the Lambda VM.
    Fetches the output JSON file locally, then removes it from the VM.
    Returns (local_json_path, status_code). On failure returns (None, status_code).
    """
    if not video_url:
        return None, 400

    safe_url = _shell_escape(video_url)
    command = (
        f'"{_shell_escape(SAAS_VLM_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_SUBTASK_ANNOTATOR_SCRIPT)}" '
        f'--asset_path "{safe_url}"'
    )
    logger.info("call_lambda_vm.generate_task_intelligence() command: %s", command)

    try:
        with _ssh_session() as ssh_client:
            # Check where the script exists on the remote VM
            check_script_cmd = (
                f'if [ -f "{_shell_escape(REMOTE_SUBTASK_ANNOTATOR_SCRIPT)}" ]; then echo "{_shell_escape(REMOTE_SUBTASK_ANNOTATOR_SCRIPT)}"; '
                f'elif [ -f "{_shell_escape(posixpath.join(REMOTE_SAAS_ROOT, "Post Annotation", "qwen_subtask_annotator.py"))}" ]; then echo "{_shell_escape(posixpath.join(REMOTE_SAAS_ROOT, "Post Annotation", "qwen_subtask_annotator.py"))}"; '
                f'elif [ -f "{_shell_escape(posixpath.join(REMOTE_SAAS_ROOT, "qwen_subtask_annotator.py"))}" ]; then echo "{_shell_escape(posixpath.join(REMOTE_SAAS_ROOT, "qwen_subtask_annotator.py"))}"; '
                f'else echo "MISSING"; fi'
            )
            script_path_out, _ = _run_command(ssh_client, check_script_cmd)
            script_path_out = script_path_out.strip()

            if script_path_out == "MISSING":
                logger.error("qwen_subtask_annotator.py is missing from the Lambda VM. Ensure the SaaS repo is updated.")
                return None, 404

            command = (
                f'"{_shell_escape(SAAS_VLM_PYTHON_BIN)}" -s "{script_path_out}" '
                f'--asset_path "{safe_url}"'
            )
            stdout, stderr = _run_command(ssh_client, _remote_image_env_prefix() + command)
            remote_json_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if not remote_json_path or not remote_json_path.endswith(".json"):
                logger.error("Annotator script failed or returned invalid path: %s", stderr or stdout)
                return None, 500

            os.makedirs(DATASET_LIST_DIR, exist_ok=True)
            local_json_path = os.path.join(DATASET_LIST_DIR, os.path.basename(remote_json_path))

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_json_path, local_json_path)
            finally:
                sftp.close()

            _run_command(ssh_client, f"rm -f '{_shell_escape(remote_json_path)}'")

            if os.path.exists(local_json_path):
                return local_json_path, 200
            return None, 500
    except Exception as e:
        logger.error("generate_task_intelligence error: %s", e)
        return None, 500

# Rename to Create Video Angle Adjustment, or something similar; v2v is entire pipeline not this specific component
def generate_video_to_video(*, video_url: str, local_output_video: str, vipe_zip_url: str | None = None, trajectory: str = "left"):
    """
    SSH into the Lambda VM, invoke lyra_v2v.py from the SaaS repo with the given
    arguments, then SFTP the Gen3C output video and VIPE zip back locally.
    If vipe_zip_url is provided it is forwarded to the script so VIPE inference
    can be skipped when a cached zip already exists in Azure.
    trajectory selects the Gen3C camera preset (up/down/left/right/zoom_in/zoom_out).
    Returns (local_output_video, status_code).
    """
    if not video_url:
        return None, 400

    import json as _json

    os.makedirs(os.path.dirname(os.path.abspath(local_output_video)), exist_ok=True)

    job_id            = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    remote_root       = f"/home/{SAAS_USER}/datara_lyra_jobs/{job_id}"
    remote_output_dir = posixpath.join(remote_root, "output")
    output_dir        = os.path.dirname(os.path.abspath(local_output_video))

    try:
        with _ssh_session() as ssh_client:
            # Build the lyra_v2v.py invocation
            script_args = (
                f'--video_url "{_shell_escape(video_url)}" '
                f'--output_dir "{_shell_escape(remote_output_dir)}" '
                f'--trajectory {trajectory}'
            )
            if vipe_zip_url:
                script_args += f' --vipe_zip_url "{_shell_escape(vipe_zip_url)}"'

            run_lyra_v2v = f'python3 {REMOTE_LYRA_V2V_SCRIPT} {script_args}'

            logger.info("Invoking lyra_v2v.py on Lambda VM (job %s)", job_id)
            stdout, stderr, status = _run_bash_script(ssh_client, run_lyra_v2v)

            if status != 0:
                logger.error("lyra_v2v.py failed (exit %s): %s", status, stderr or stdout)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            # The script prints a single JSON line as its last stdout line
            last_line = (stdout.strip().splitlines() or [""])[-1].strip()
            try:
                result = _json.loads(last_line)
                remote_gen3c_video = result["gen3c_video"]
                remote_vipe_zip = result["vipe_zip"]
            except (ValueError, KeyError) as exc:
                logger.error("Could not parse lyra_v2v.py output JSON (%s): %r", exc, last_line)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            # SFTP results back locally
            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_gen3c_video, local_output_video)
                sftp.get(remote_vipe_zip, f"{output_dir}/vipe_output.zip")
            finally:
                sftp.close()

            _run_command(ssh_client, f"rm -rf {remote_root}")

            if os.path.isfile(local_output_video):
                return local_output_video, 200
            return None, 500
    except Exception as exc:
        logger.error("generate_video_to_video error: %s", exc, exc_info=True)
        return None, 500

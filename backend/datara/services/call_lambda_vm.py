import importlib.util
import json
import os
import posixpath
import stat
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable

import paramiko

from datara.logging import logger


# Save ego/corner outputs under backend/utils/dataset_list for upload_frames_to_azure
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_LIST_DIR = os.path.join(BACKEND_DIR, "utils", "dataset_list")
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
REMOTE_RUNTIME_DIR = os.path.join(BACKEND_DIR, "remote_runtime")
LOCAL_ROSE_RUNNER_SCRIPT = os.path.join(REMOTE_RUNTIME_DIR, "DataraAI_rose_occlusion.py")
LOCAL_ROSE_VERIFY_SCRIPT = os.path.join(REMOTE_RUNTIME_DIR, "verify_rose_runtime.sh")


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
SAAS_USER = os.getenv("SAAS_USER") or _legacy_saas_attr("USER") or "ubuntu"
SAAS_KEY_PATH = (
    os.getenv("SAAS_KEY_PATH")
    or _legacy_saas_attr("KEY_PATH")
    or os.path.expanduser("~/.ssh/azure_to_lambda")
)
SAAS_PYTHON_BIN = os.getenv("SAAS_PYTHON_BIN") or _legacy_saas_attr("PYTHON_BIN") or "python"
SAAS_ROSE_ROOT = os.getenv("SAAS_ROSE_ROOT") or _legacy_saas_attr("ROSE_ROOT")
SAAS_ROSE_PYTHON_BIN = (
    os.getenv("SAAS_ROSE_PYTHON_BIN")
    or _legacy_saas_attr("ROSE_PYTHON_BIN")
    or SAAS_PYTHON_BIN
)

REMOTE_USER_HOME = f"/home/{SAAS_USER}"
REMOTE_SAAS_ROOT = os.getenv("SAAS_REMOTE_ROOT") or f"{REMOTE_USER_HOME}/Software-as-a-Service"
REMOTE_SEGMENTATION_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "DataraAI_segmentation.py")
REMOTE_ROSE_RUNNER_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "DataraAI_rose_occlusion.py")
REMOTE_ROSE_VERIFY_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "verify_rose_runtime.sh")
REMOTE_ROSE_SETUP_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "setup_rose_runtime.sh")
REMOTE_SAM3_PACKAGE_ROOT = f"{REMOTE_USER_HOME}/packages/sam3"


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
        key = paramiko.Ed25519Key.from_private_key_file(key_filename)
        client.connect(hostname=hostname, username=username, pkey=key)
        yield client
    except paramiko.SSHException as e:
        print(f"SSH connection error: {e}")
        raise
    except FileNotFoundError:
        print(f"Key file not found at: {key_filename}")
        raise
    except paramiko.AuthenticationException:
        print("Authentication failed, please check your credentials.")
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


def _decode_sftp_text(value):
    if isinstance(value, bytes):
        return value.decode().strip()
    return str(value).strip()


def _rose_env_exports():
    exports = []
    if SAAS_ROSE_ROOT:
        exports.append(f'export ROSE_ROOT="{_shell_escape(SAAS_ROSE_ROOT)}"')
    if SAAS_ROSE_PYTHON_BIN:
        exports.append(f'export ROSE_PYTHON_BIN="{_shell_escape(SAAS_ROSE_PYTHON_BIN)}"')
    exports.append("export PYTHONNOUSERSITE=1")
    return "; ".join(exports)


def generate_ego_image(prompt, imageURL, container_name, output_name):
    """
    Run ego image generation on the Lambda VM and save the result under
    backend/utils/dataset_list/{output_name}/egos/. Returns (local_path, status_code).
    """
    command = (
        "python ~/Software-as-a-Service/image_prompt_tool.py"
        ' --prompt "' + _shell_escape(prompt) + '"'
        ' --imageURL "' + _shell_escape(imageURL) + '"'
        ' --container_name "' + _shell_escape(container_name) + '"'
    )

    print(f"datara services call_lambda_vm.generate_ego_image() command: {command}")
    logger.info(f"datara services call_lambda_vm.generate_ego_image() command: {command}")
    try:
        with _ssh_session() as ssh_client:
            logger.info("datara services call_lambda_vm.generate_ego_image() SSH session established")
            stdout, stderr = _run_command(ssh_client, command)
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
        'python "$HOME/Software-as-a-Service/Post Annotation/qwen_vlm_image.py" '
        f'--prompt "{safe_prompt}" --egoURL "{safe_url}"'
    )
    logger.info("call_lambda_vm.run_vlm_tags() command: %s", command)

    try:
        with _ssh_session() as ssh_client:
            stdout, stderr = _run_command(ssh_client, command)
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
        f'python ~/Software-as-a-Service/Corner_case_tool.py --prompt "{safe_text}" '
        f'--imageURL "{safe_url}" --container_name "{safe_container}"'
    )
    prefix = f"/corner_images_controlnet/{container_name}"

    try:
        with _ssh_session() as ssh_client:
            stdout, _ = _run_command(ssh_client, command)

            remote_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""
            if prefix not in remote_path:
                print(f"Corner case tool failed or returned invalid path: {remote_path}")
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
                _run_command(ssh_client, f"rm -rf corner_images_controlnet/{container_name}")
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
    remote_input_dir = posixpath.join(remote_root, "input")
    remote_output_root = posixpath.join(remote_root, "output")

    try:
        with _ssh_session() as ssh_client:
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
                _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
                return None, 500

            sftp = ssh_client.open_sftp()
            try:
                _sftp_get_tree(sftp, remote_result_dir, local_output_dir)
            finally:
                sftp.close()

            _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
            if os.path.isdir(local_output_dir):
                return local_output_dir, 200
            return None, 500
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
    status_callback: Callable[[dict[str, Any]], None] | None = None,
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
    remote_status_path = posixpath.join(remote_root, "status.json")

    try:
        with _ssh_session() as ssh_client:
            sftp = ssh_client.open_sftp()
            try:
                _sftp_put_tree(sftp, LOCAL_ROSE_RUNNER_SCRIPT, REMOTE_ROSE_RUNNER_SCRIPT)
                _sftp_put_tree(sftp, LOCAL_ROSE_VERIFY_SCRIPT, REMOTE_ROSE_VERIFY_SCRIPT)
                if status_callback:
                    status_callback({"phase": "uploading", "progress_current": 0, "progress_total": 1})
                _sftp_put_tree(sftp, local_input_video, remote_source_video)
                _sftp_put_tree(sftp, local_mask_video, remote_mask_video)
                if status_callback:
                    status_callback({"phase": "uploading", "progress_current": 1, "progress_total": 1})
            finally:
                sftp.close()

            _run_command(
                ssh_client,
                f'chmod +x "{_shell_escape(REMOTE_ROSE_VERIFY_SCRIPT)}" "{_shell_escape(REMOTE_ROSE_RUNNER_SCRIPT)}"',
            )

            export_prefix = _rose_env_exports()
            verify_script = export_prefix + "; " if export_prefix else ""
            verify_script += f'bash "{REMOTE_ROSE_VERIFY_SCRIPT}"'
            _verify_stdout, verify_stderr, verify_status = _run_bash_script(ssh_client, verify_script)
            if verify_status != 0:
                message = verify_stderr or "ROSE runtime is not installed/configured on the SaaS VM"
                logger.error("ROSE runtime verification failed: %s", message)
                _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
                return None, 503, message

            runner_script = export_prefix + "; " if export_prefix else ""
            runner_script += (
                f'"{_shell_escape(SAAS_ROSE_PYTHON_BIN)}" -s "{_shell_escape(REMOTE_ROSE_RUNNER_SCRIPT)}" '
                f'--source_video "{_shell_escape(remote_source_video)}" '
                f'--mask_video "{_shell_escape(remote_mask_video)}" '
                f'--output_dir "{_shell_escape(remote_output_dir)}" '
                f'--status_path "{_shell_escape(remote_status_path)}" '
                f'--prompt "{_shell_escape(prompt)}" '
                f'--video_length "{int(window_length)}" '
                f'--sample_height "{int(sample_height)}" '
                f'--sample_width "{int(sample_width)}"'
            )
            runner_command = f'bash -lc "{_shell_escape(runner_script)}"'
            stdin, stdout, stderr = ssh_client.exec_command(runner_command)
            _ = stdin
            channel = stdout.channel
            last_status_raw = ""
            while not channel.exit_status_ready():
                if status_callback:
                    try:
                        with ssh_client.open_sftp().open(remote_status_path, "r") as status_handle:
                            status_raw = _decode_sftp_text(status_handle.read())
                        if status_raw and status_raw != last_status_raw:
                            last_status_raw = status_raw
                            status_callback(json.loads(status_raw))
                    except Exception:
                        pass
                time.sleep(2)

            if status_callback:
                try:
                    with ssh_client.open_sftp().open(remote_status_path, "r") as status_handle:
                        status_raw = _decode_sftp_text(status_handle.read())
                    if status_raw and status_raw != last_status_raw:
                        status_callback(json.loads(status_raw))
                except Exception:
                    pass

            stdout_text = stdout.read().decode().strip() if stdout else ""
            stderr_text = stderr.read().decode().strip() if stderr else ""
            runner_status = channel.recv_exit_status()
            if runner_status != 0:
                logger.error("ROSE occlusion runner failed: %s", stderr_text or stdout_text)
                _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
                return None, 500, stderr_text or stdout_text or "ROSE occlusion removal failed"

            remote_output_path = ""
            for line in reversed(stdout_text.splitlines()):
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
                    logger.error(
                        "ROSE output discovery failed: stdout=%s stderr=%s",
                        stdout_text,
                        stderr_text or find_stderr,
                    )
                    _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
                    return None, 500, "ROSE completed without returning an output video"

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_output_path, local_output_video)
            finally:
                sftp.close()

            _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
            if os.path.isfile(local_output_video):
                return local_output_video, 200, ""
            return None, 500, "ROSE output video could not be downloaded"
    except Exception as exc:
        logger.error("remove_occlusion error: %s", exc, exc_info=True)
        return None, 500, str(exc)

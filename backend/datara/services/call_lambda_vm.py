import importlib.util
import os
import posixpath
import stat
import uuid
from contextlib import contextmanager
from pathlib import Path

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
SAAS_USER = os.getenv("SAAS_USER") or _legacy_saas_attr("USER") or "ubuntu"

def _resolve_key_path():
    return os.path.expanduser("~/.ssh/azure_to_lambda")

SAAS_KEY_PATH = _resolve_key_path()
SAAS_PYTHON_BIN = os.getenv("SAAS_PYTHON_BIN") or _legacy_saas_attr("PYTHON_BIN") or "python"
SAAS_IMAGE_PYTHON_BIN = (
    os.getenv("SAAS_IMAGE_PYTHON_BIN")
    or _legacy_saas_attr("IMAGE_PYTHON_BIN")
    or SAAS_PYTHON_BIN
)
SAAS_EGO_PYTHON_BIN = (
    os.getenv("SAAS_EGO_PYTHON_BIN")
    or _legacy_saas_attr("EGO_PYTHON_BIN")
    or SAAS_IMAGE_PYTHON_BIN
)
SAAS_VLM_PYTHON_BIN = (
    os.getenv("SAAS_VLM_PYTHON_BIN")
    or _legacy_saas_attr("VLM_PYTHON_BIN")
    or SAAS_IMAGE_PYTHON_BIN
)
DEFAULT_ADDIT_SAM2_PYTHON_BIN = f"/home/{SAAS_USER}/miniconda3/envs/addit-sam2/bin/python"
SAAS_CORNER_PYTHON_BIN = (
    os.getenv("SAAS_CORNER_PYTHON_BIN")
    or DEFAULT_ADDIT_SAM2_PYTHON_BIN
)
SAAS_ROSE_ROOT = os.getenv("SAAS_ROSE_ROOT") or _legacy_saas_attr("ROSE_ROOT")
SAAS_ROSE_PYTHON_BIN = (
    os.getenv("SAAS_ROSE_PYTHON_BIN")
    or _legacy_saas_attr("ROSE_PYTHON_BIN")
    or SAAS_PYTHON_BIN
)

REMOTE_USER_HOME = f"/home/{SAAS_USER}"
REMOTE_SAAS_ROOT = os.getenv("SAAS_REMOTE_ROOT") or f"{REMOTE_USER_HOME}/Software-as-a-Service"
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
REMOTE_LYRA_PACKAGE_ROOT = f"{REMOTE_USER_HOME}/packages/lyra/Lyra-1"
SAAS_MINICONDA_ROOT = os.getenv("SAAS_MINICONDA_ROOT") or f"/home/{SAAS_USER}/miniconda3"
SAAS_LYRA_V2V_CONDA_ENV = os.getenv("SAAS_LYRA_V2V_CONDA_ENV") or "lyra-v2v"
REMOTE_VIPE_PACKAGE_ROOT = f"{REMOTE_USER_HOME}/packages/vipe"


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

            rose_verify_found, verify_err = _run_command(
                ssh_client,
                f'test -f "{_shell_escape(REMOTE_ROSE_VERIFY_SCRIPT)}" && echo "__FOUND__"',
            )
            if "__FOUND__" not in rose_verify_found:
                logger.error(
                    "Remote verify_rose_runtime.sh was not found at %s | stderr=%s",
                    REMOTE_ROSE_VERIFY_SCRIPT,
                    verify_err,
                )
                return None, 500, "ROSE verify script was not found on the SaaS VM"

            sftp = ssh_client.open_sftp()
            try:
                _sftp_put_tree(sftp, local_input_video, remote_source_video)
                _sftp_put_tree(sftp, local_mask_video, remote_mask_video)
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
                f'--prompt "{_shell_escape(prompt)}" '
                f'--video_length "{int(window_length)}" '
                f'--sample_height "{int(sample_height)}" '
                f'--sample_width "{int(sample_width)}"'
            )
            stdout, stderr, runner_status = _run_bash_script(ssh_client, runner_script)
            if runner_status != 0:
                logger.error("ROSE occlusion runner failed: %s", stderr or stdout)
                _run_command(ssh_client, f'rm -rf "{_shell_escape(remote_root)}"')
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
    
def generate_video_to_video(*, local_input_video: str, local_output_video: str):
    """
    Upload a local video to the Lambda VM, run it through VIPE to produce structured
    scene output, then feed that into Lyra Gen3C (lyra-v2v conda env) to generate the
    final output video. Downloads the result and cleans up remote files.
    Returns (local_output_video, status_code).
    """
    if not os.path.isfile(local_input_video):
        return None, 400

    os.makedirs(os.path.dirname(os.path.abspath(local_output_video)), exist_ok=True)

    job_id = uuid.uuid4().hex[:12]
    remote_root = f"/home/{SAAS_USER}/datara_lyra_jobs/{job_id}"
    remote_input_video = posixpath.join(remote_root, "input.mp4")
    remote_vipe_output_dir = posixpath.join(remote_root, "vipe_output")
    remote_lyra_output_dir = posixpath.join(remote_root, "lyra_output")
    lyra_conda_prefix = f"{SAAS_MINICONDA_ROOT}/envs/{SAAS_LYRA_V2V_CONDA_ENV}"
    conda_init = f"source {SAAS_MINICONDA_ROOT}/etc/profile.d/conda.sh && conda activate {SAAS_LYRA_V2V_CONDA_ENV}"

    try:
        with _ssh_session() as ssh_client:
            # 1. Upload the source video to the VM
            sftp = ssh_client.open_sftp()
            try:
                _sftp_put_tree(sftp, local_input_video, remote_input_video)
            finally:
                sftp.close()

            # 2. Run VIPE on the input video
            vipe_script = (
                f"{conda_init} && "
                f"mkdir -p {remote_vipe_output_dir} && "
                f"PYTHONPATH={REMOTE_VIPE_PACKAGE_ROOT} "
                f"vipe infer {remote_input_video} --output {remote_vipe_output_dir}"
            )
            vipe_stdout, vipe_stderr, vipe_status = _run_bash_script(ssh_client, vipe_script)
            if vipe_status != 0:
                logger.error("VIPE inference failed: %s", vipe_stderr or vipe_stdout)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            # 3. Find the VIPE output file to pass to Lyra
            find_vipe_stdout, _find_vipe_stderr, _find_vipe_status = _run_bash_script(
                ssh_client,
                f'find {remote_vipe_output_dir} -maxdepth 2 -type f -name "*.mp4" | head -n 1',
            )
            remote_vipe_output_path = (find_vipe_stdout.strip().splitlines()[-1].strip() if find_vipe_stdout else "") or ""

            if not remote_vipe_output_path:
                logger.error("VIPE produced no output file. stdout=%s stderr=%s", vipe_stdout, vipe_stderr)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            logger.info("VIPE output located at: %s", remote_vipe_output_path)

            # 4. Run Lyra Gen3C using the VIPE output as --vipe_path
            lyra_script = (
                f"{conda_init} && "
                f"cd {REMOTE_LYRA_PACKAGE_ROOT} && "
                f"mkdir -p {remote_lyra_output_dir} && "
                f"CUDA_HOME={lyra_conda_prefix} PYTHONPATH={REMOTE_LYRA_PACKAGE_ROOT} "
                f"torchrun --nproc_per_node=1 cosmos_predict1/diffusion/inference/gen3c_dynamic_sdg.py "
                f"--checkpoint_dir checkpoints "
                f"--vipe_path {remote_vipe_output_path} "
                f"--video_save_folder {remote_lyra_output_dir} "
                f"--disable_prompt_upsampler "
                f"--num_gpus 1 "
                f"--foreground_masking "
                f"--multi_trajectory"
            )
            lyra_stdout, lyra_stderr, lyra_status = _run_bash_script(ssh_client, lyra_script)
            if lyra_status != 0:
                logger.error("Lyra Gen3C failed: %s", lyra_stderr or lyra_stdout)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            # 5. Find the Lyra output video
            find_lyra_stdout, _find_lyra_stderr, _find_lyra_status = _run_bash_script(
                ssh_client,
                f'find {remote_lyra_output_dir} -maxdepth 2 -type f -name "*.mp4" | head -n 1',
            )
            remote_lyra_output_path = (find_lyra_stdout.strip().splitlines()[-1].strip() if find_lyra_stdout else "") or ""

            if not remote_lyra_output_path:
                logger.error("Lyra produced no output video. stdout=%s stderr=%s", lyra_stdout, lyra_stderr)
                _run_command(ssh_client, f"rm -rf {remote_root}")
                return None, 500

            # 6. Download the final video and clean up
            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_lyra_output_path, local_output_video)
            finally:
                sftp.close()

            _run_command(ssh_client, f"rm -rf {remote_root}")

            if os.path.isfile(local_output_video):
                return local_output_video, 200
            return None, 500
    except Exception as exc:
        logger.error("generate_video_to_video error: %s", exc, exc_info=True)
        return None, 500

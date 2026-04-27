import os
import posixpath
import stat
import uuid
from contextlib import contextmanager
from datara.logging import logger

import paramiko

import saas_config

# Save ego/corner outputs under backend/utils/dataset_list for upload_frames_to_azure
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_LIST_DIR = os.path.join(BACKEND_DIR, "utils", "dataset_list")
REMOTE_USER_HOME = f"/home/{saas_config.USER}"
REMOTE_SAAS_ROOT = f"/home/{saas_config.USER}/Software-as-a-Service"
REMOTE_SEGMENTATION_SCRIPT = posixpath.join(REMOTE_SAAS_ROOT, "DataraAI_segmentation.py")
REMOTE_SAM3_PACKAGE_ROOT = f"/home/{saas_config.USER}/packages/sam3"


@contextmanager
def _ssh_session():
    """
    Context manager that yields an authenticated SSH client to the Lambda VM.
    Handles key loading, connection, and teardown. Raises on connection failure.
    """
    hostname = saas_config.HOST
    username = saas_config.USER
    key_filename = saas_config.KEY_PATH

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


def _run_command(client, command):
    """Execute a command on the SSH client; returns (stdout_str, stderr_str)."""
    stdin, stdout, stderr = client.exec_command(command)
    out = "".join(stdout.readlines()).strip() if stdout else ""
    err = (stderr.read().decode().strip() if stderr else "") or ""
    logger.info(f"datara services call_lambda_vm._run_command() command output: {out}")
    logger.info(f"datara services call_lambda_vm._run_command() command error: {err}")
    return out, err


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
            logger.info(f"datara services call_lambda_vm.generate_ego_image() SSH session established")
            stdout, stderr = _run_command(ssh_client, command)
            ego_image_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if "/ego_images/" not in ego_image_path:
                logger.error(f"datara services call_lambda_vm.generate_ego_image() command error: {stderr}")
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


def _shell_escape(s):
    """Escape a string for safe use inside double-quoted bash argument."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$").replace("`", "\\`")


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
    logger.info(f"call_lambda_vm.run_vlm_tags() command: {command}")

    try:
        with _ssh_session() as ssh_client:
            stdout, stderr = _run_command(ssh_client, command)
            remote_json_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if not remote_json_path or not remote_json_path.endswith(".json"):
                logger.error(f"VLM script failed or returned invalid path: {stderr or stdout}")
                return None, 500

            # Fetch JSON file locally to a temp path under backend
            os.makedirs(DATASET_LIST_DIR, exist_ok=True)
            local_json_path = os.path.join(DATASET_LIST_DIR, os.path.basename(remote_json_path))

            sftp = ssh_client.open_sftp()
            try:
                sftp.get(remote_json_path, local_json_path)
            finally:
                sftp.close()

            # Remove the file from the Lambda VM
            _run_command(ssh_client, f"rm -f '{remote_json_path}'")

            if os.path.exists(local_json_path):
                return local_json_path, 200
            return None, 500
    except Exception as e:
        logger.error(f"run_vlm_tags error: {e}")
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
            logger.info(f"datara services call_lambda_vm.invoke_corner_case() remote path: {remote_path}")

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
    remote_root = f"/home/{saas_config.USER}/datara_mask_jobs/{job_id}"
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
                f'python "{_shell_escape(REMOTE_SEGMENTATION_SCRIPT)}"',
                f'--image_dir "{_shell_escape(remote_input_dir)}"',
                f'--segment "{_shell_escape(prompt)}"',
                f'--output_dir "{_shell_escape(remote_output_root)}"',
            ]

            remote_command = (
                f'cd "{_shell_escape(REMOTE_SAAS_ROOT)}" && '
                f'PYTHONPATH="{_shell_escape(REMOTE_USER_HOME)}:{_shell_escape(REMOTE_SAM3_PACKAGE_ROOT)}:{_shell_escape(REMOTE_SAAS_ROOT)}:$PYTHONPATH" '
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

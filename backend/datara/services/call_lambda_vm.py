import os
from contextlib import contextmanager
from datara.logging import logger

import paramiko

import saas_config

# Save ego/corner outputs under backend/dataset_list for upload_frames_to_azure
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_LIST_DIR = os.path.join(BACKEND_DIR, "dataset_list")


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


def generate_ego_image(prompt, imageURL, container_name, output_name):
    """
    Run ego image generation on the Lambda VM and save the result under
    backend/dataset_list/{output_name}/egos/. Returns (local_path, status_code).
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


def invoke_corner_case(text, image_url, container_name, output_name):
    """
    Invoke corner-case handling on the Lambda VM. Runs corner_case_tool.py with
    the given text, image URL, and container name. On success, SFTPs the result
    down and saves it under backend/dataset_list/{output_name}/corner_images_controlnet/.
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

import os
from contextlib import contextmanager

import paramiko

import saas_config


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
    return out, err


def generate_ego_image(prompt, imageURL, container_name):
    command = 'python ~/image_prompt_tool.py'
    command += ' --prompt "' + prompt + '"'
    command += ' --imageURL "' + imageURL + '"'
    command += ' --container_name "' + container_name + '"'

    try:
        with _ssh_session() as ssh_client:
            stdout, _ = _run_command(ssh_client, command)
            ego_image_path = (stdout.strip().split("\n")[-1].strip() if stdout else "") or ""

            if "/ego_images/" not in ego_image_path:
                return None

            local_image_path = ego_image_path[ego_image_path.index("ego_images"):]
            sftp = ssh_client.open_sftp()
            try:
                os.makedirs(os.path.dirname(local_image_path), exist_ok=True)
                sftp.get(ego_image_path, local_image_path)
                if os.path.exists(local_image_path):
                    print(f"Successfully saved to '{local_image_path}'")
                else:
                    local_image_path = None
                _run_command(ssh_client, "rm -rf ego_images/" + container_name)
            finally:
                sftp.close()

            return local_image_path
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def invoke_corner_case(text):
    """
    Invoke corner-case handling on the Lambda VM with the given text input.
    Returns the command output as string, or None on failure.
    """
    if not text:
        return None
    safe_text = text.replace('"', '\\"').replace('$', '\\$')
    command = f'python ~/Software-as-a-Service/corner_case_tool.py --prompt "{safe_text}"'

    try:
        with _ssh_session() as ssh_client:
            stdout, stderr = _run_command(ssh_client, command)
            if stderr:
                print(f"corner_case stderr: {stderr}")
            return stdout or None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

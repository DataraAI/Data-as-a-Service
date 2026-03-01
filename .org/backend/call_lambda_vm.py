import paramiko
import os
import saas_config


def generate_ego_image(prompt, imageURL, container_name):
    command = 'python ~/image_prompt_tool.py'
    command += ' --prompt "' + prompt + '"'
    command += ' --imageURL "' + imageURL + '"'
    command += ' --container_name "' + container_name + '"'

    # Call Lambda Ubuntu VM
    hostname = saas_config.HOST
    username = saas_config.USER
    key_filename = saas_config.KEY_PATH

    ssh_client = paramiko.SSHClient()
    # Automatically add the remote host key (use with caution in production)
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    localImagePath = None
    sftp_client = None
    try:
        # Load the private key
        k = paramiko.Ed25519Key.from_private_key_file(key_filename)
        # Connect to the server using the key
        ssh_client.connect(hostname=hostname, username=username, pkey=k)
        # Execute the command
        # print(f"command: {command}")
        stdin, stdout, stderr = ssh_client.exec_command(command)
        if stdout:
            output_lines = stdout.readlines()
            egoImagePath = output_lines[-1].strip()
            # print(f"Ego image path: {egoImagePath}")
            # Check if it has "/ego_images/" for validity
            if "/ego_images/" in egoImagePath:
                localImagePath = egoImagePath[egoImagePath.index("ego_images"):]
                sftp_client = ssh_client.open_sftp()
                # print(f"SFTP session opened. Downloading '{egoImagePath}' to '{localImagePath}'...")
                os.makedirs(os.path.dirname(localImagePath), exist_ok=True)
                sftp_client.get(egoImagePath, localImagePath)
                if os.path.exists(localImagePath):
                    print(f"Successfully saved to '{localImagePath}'")
                else:
                    localImagePath = None # Failure occurred
                # Removing image from Lambda VM after saving locally into Azure VM
                stdin, stdout, stderr = ssh_client.exec_command('rm -rf ego_images/' + container_name)
    except paramiko.SSHException as e:
        print(f"SSH connection error: {e}")
        localImagePath = None
    except FileNotFoundError:
        print(f"Key file not found at: {key_filename}")
        localImagePath = None
    except paramiko.AuthenticationException:
        print("Authentication failed, please check your credentials.")
        localImagePath = None
    except Exception as e:
        print(f"An error occurred: {e}")
        localImagePath = None
    finally:
        # Close the sftp connection
        if sftp_client:
            sftp_client.close()
        # Close the ssh connection
        if ssh_client:
            ssh_client.close()

    return localImagePath

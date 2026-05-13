# Guide: Setting Up SSH Config for Azure Servers (Ed25519)

This guide covers the process of configuring your local machine to connect to an Azure Linux Virtual Machine (VM) using the **Ed25519** algorithm via both the Terminal and Visual Studio Code.

## 1. Generate Ed25519 SSH Keys
Ed25519 is the modern standard for SSH keys due to its high security and performance.

1. Open your terminal (PowerShell or Git Bash).
2. Run the following command:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"```
3. When prompted "Enter a filename to save your key", give it a name and press enter.
4. By default, the keys will be saved to (C:\Users\[your username]/.ssh/id_ed25519)

## 2. Configuring the local ssh file 
1. Open (or create) the config file: C:\Users\YourName\.ssh\config
2. add the following block 
    ```plaintext
    Host azurevm
    HostName 20.230.199.235
    User roboteyeview
    IdentityFile ~/.ssh/id_ed25519```
## 3. Connect to the VM via terminal
1. In an open terminal window, type 
    ```bash
    ssh azurevm'''
## 4. Connecting via VS Code (Remote - SSH)

1. **Install Extension:** Install the **"Remote - SSH"** extension by Microsoft.
2. **Open Connection:** Click the green **Remote Indicator** (`><`) in the bottom-left corner of VS Code.
3. **Select Host:** Choose **Connect to Host...** and select `azure-server`.
4. VS Code will now set up the remote environment, allowing you to edit server files directly.
--- 

# Connecting to Lambda Labs VM

This will also follow a similar process as the azure vm 

## 1. Generate a Dedicated Lambda Key
It is good practice to have a separate key for different cloud providers.

1. Open your terminal (PowerShell, Command Prompt, or Git Bash).
2. Run the following command to generate a key specifically named for Lambda:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/lambda_key -C "lambda_key_yourname"``
3. Open the .ssh folder (C:\Users\[your username]/.ssh/id_ed25519)
4. find the file called lambda_key.pub
5. Copy the entire output string. It should start with ssh-ed25519 and end with lambda_key_yourname.
## 2. Add key to lambda Dasboard 
1. Log in to your Lambda Labs Cloud Console.
2. Navigate to the SSH Keys section in the left sidebar.
3. Click Add SSH Key.  
4. Paste the string you copied into the Public Key box and give it the same name as the .pub file, the key should be named lambda_key_yourname.pub.
5. Click Add SSH Key.
## 3. Adding to ssh config file 
1. Open the same ssh config file as before 
2. Add a new host 
    ```plaintext 
    Host lambda
        HostName <LAMBDA_VM_IP>
        User ubuntu
        IdentityFile ~/.ssh/lambda_key_yourname```
## 4. SSHing into the VM 
1. Use the same process as the azure vm to ssh in 
2. If it fails, go to lambda gpu instances, launch and click terminal in the other section 
3. In the terminal do
    ```bash 
    cd .ssh
    nano authorized_keys```
4. If you dont see the same key as your .pub file in it, add it and press CTRL+X, Y and ENTER 

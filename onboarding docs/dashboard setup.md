
# Intern Onboarding: Setting Up the Dashboard

This document provides a comprehensive guide for setting up the local development environment for the **Data-as-a-Service** project.

## 1. GitHub Setup & Repository Cloning

Before setting up the local environment, you must authenticate with GitHub and clone the project repository.

### Adding Your SSH Key to GitHub
To securely communicate with GitHub, you should use an SSH key. If you haven't set one up yet, follow the official GitHub guides:
* [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)[cite: 1, 2]
* [Adding a new SSH key to your GitHub account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)[cite: 1, 2]

**Clone the repository:**
```bash
git clone git@github.com:DataraAI/Data-as-a-Service.git```
---

## 2. Prerequisites & System Configuration

*   **Python Version:** Python 3.12 or 3.13 (Stable).
    *   *Note: Avoid Python 3.14 as some libraries (like backports.zstd) are not yet updated to support it.*
*   **Node.js:** Latest LTS version for the frontend dashboard.
*   **System Drivers:** Microsoft ODBC Driver 18 for SQL Server (x64).

---

## 3. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Environment Configuration:**
    Download the `Extra for DAAS` folder from Google Drive. Copy all files (including `.env` and configuration files) into their respective directories in your local project root.

---

## 4. Frontend Setup

1.  **Open a new terminal and navigate to the dashboard directory:**
    ```bash
    cd dashboard
    ```
2.  **Install Node packages:**
    ```bash
    npm install
    ```

---

## 5. Running the Application

| Component | Command | Access URL |
| :--- | :--- | :--- |
| **Backend API** | `python app.py` | [http://localhost:5000](http://localhost:5000) |
| **Frontend Dashboard** | `npm run dev` | [http://localhost:5173](http://localhost:5173) |

---

## 6. Troubleshooting & Common Errors

### A. Dependency Installation Failures
*   **Error:** `No matching distribution found for backports.zstd`.
*   **Cause:** Usually caused by using an unsupported/experimental Python version like 3.14.
*   **Fix:** Downgrade Python to 3.12 or 3.13. Uninstall the experimental version via Windows *Add/Remove Programs* and install the stable x64 executable from python.org.

### B. Database Connectivity (ODBC Driver)
*   **Error:** `InterfaceError: IM002 Data source name not found`.
*   **Cause:** Missing system-level SQL drivers.
*   **Fix:** Install the **Microsoft ODBC Driver 18 for SQL Server (x64)**. Ensure you download the **x64** version specifically; the x86 version will not work with 64-bit Python.

### C. Azure Firewall Restrictions
*   **Error:** `ProgrammingError: 42000 Client with IP address 'XX.XX.XX.XX' is not allowed to access the server`.
*   **Fix:**
    1. Log into the [Azure Portal](https://portal.azure.com).
    2. Navigate to **SQL Server > Networking**.
    3. Click **+ Add your client IPv4 address** to the firewall rules and click **Save**.

### D. Frontend Notices
*   **Notice:** `npm install` may report packages "looking for funding".
*   **Fix:** This is non-critical and can be ignored. If actual security vulnerabilities are found, run `npm audit fixMy apologies! I’ll provide the full, raw Markdown content for you here. This includes every section, properly formatted with headers, code blocks, and tables so you can copy and paste the entire block into your `.md` file.

---

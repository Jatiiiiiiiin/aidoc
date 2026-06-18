# AI Docs Connection Guide

This guide explains how to connect any of your repositories to the central **AI Documentation Automation** workflow with zero manual configuration on GitHub.

---

## ⚡ Quick Setup (1-Minute Integration)

Run these three simple steps in the root directory of your newly created or existing repository:

### Step 1: Run the Bootstrap Script
Run the following one-liner in your terminal. This downloads all the required pipeline scripts and GitHub Action configurations directly:

```bash
node -e "fetch('https://raw.githubusercontent.com/Jatiiiiiiiin/aidoc/main/setup-aidocs.js?t=' + Date.now()).then(r=>r.text()).then(t=>eval(t))"
```

### Step 2: Install the Runner Dependency
The documentation scripts are written in TypeScript and executed using `tsx`. If the setup script warns you that `tsx` is missing, install it as a development dependency:

```bash
npm install -D tsx
```

### Step 3: Commit and Push to GitHub
Commit the new files to your repository and push them to the `main` branch. This will automatically trigger your very first documentation run!

```bash
git add .github/ scripts/ docs-config/ package.json package-lock.json
git commit -m "setup: connect to AI documentation pipeline"
git push origin main
```

---

## 🔍 How It Works Under the Hood

When you run the bootstrap script, it fetches the following **5 key files** from the `aidoc` repository and places them into your project:

| File Path | Description |
| :--- | :--- |
| `.github/workflows/ai-docs.yml` | The GitHub Action workflow. It runs on every push to `main` and triggers the webhook. |
| `scripts/detectChanges.ts` | Analyzes git history to determine exactly which source code files were added, modified, or deleted in the push. |
| `scripts/prepareWebhookPayload.ts` | Assembles the metadata, commit hashes, and file lists into the JSON payload format. |
| `scripts/routeDocs.ts` | Configures the files based on doc mappings before transmitting to n8n. |
| `docs-config/routing.yaml` | Your project's local routing configuration, defining which files are processed. |

> [!NOTE]
> **Zero-Config Webhook:** The `.github/workflows/ai-docs.yml` file is pre-configured to send payload updates directly to your n8n production webhook URL: `https://jatiiiiiin.app.n8n.cloud/webhook/ai-docs-pr-merge`. You do **not** need to create any GitHub Repository secrets.

---

## 🛠️ Verifying Your Integration

Once you push the changes to GitHub:
1. Go to your repository on **GitHub.com**.
2. Click the **Actions** tab.
3. You will see a workflow named **AI Documentation Automation** running.
4. Click on it to view the logs. You should see a success message: `Sending webhook trigger to n8n...`.
5. Check your **n8n execution history** to confirm that the `ai-docs-pr-merge` workflow has been triggered and has processed the changes.
6. Open your Next.js docs viewer web application. The new repository's documentation will appear grouped in the sidebar!

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_BASE_URL = 'https://raw.githubusercontent.com/Jatiiiiiiiin/aidoc/main';

const filesToDownload = [
  { dest: '.github/workflows/ai-docs.yml', src: '.github/workflows/ai-docs.yml' },
  { dest: 'scripts/detectChanges.ts', src: 'scripts/detectChanges.ts' },
  { dest: 'scripts/prepareWebhookPayload.ts', src: 'scripts/prepareWebhookPayload.ts' },
  { dest: 'scripts/routeDocs.ts', src: 'scripts/routeDocs.ts' },
  { dest: 'docs-config/routing.yaml', src: 'docs-config/routing.yaml' }
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else if (response.statusCode === 404) {
         reject(new Error(`File not found: ${url}. Make sure your aidoc repo is public or you have the correct URL.`));
      } else {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function setup() {
  console.log('🚀 Initializing AI Docs connection for this repository...\n');

  for (const file of filesToDownload) {
    const destPath = path.join(process.cwd(), file.dest);
    const dir = path.dirname(destPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const url = `${REPO_BASE_URL}/${file.src}`;
    console.log(`Downloading ${file.dest}...`);
    
    try {
      await downloadFile(url, destPath);
      console.log(`✅ Success: ${file.dest}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log('If your repository is private, you might need to copy the files manually instead.');
    }
  }

  // Check for tsx dependency in package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('\n📦 Checking package.json for required dependencies...');
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasTsx = (pkg.devDependencies && pkg.devDependencies.tsx) || (pkg.dependencies && pkg.dependencies.tsx);
      
      if (!hasTsx) {
        console.log('⚠️ The "tsx" package is required to run the typescript scripts.');
        console.log('👉 Please run: npm install -D tsx');
      } else {
         console.log('✅ "tsx" dependency found.');
      }
    } catch(e) {
      console.log('⚠️ Could not parse package.json.');
    }
  } else {
    console.log('\n⚠️ No package.json found. You will need Node.js and "tsx" installed to run the scripts via GitHub Actions.');
  }

  console.log('\n🎉 Setup complete!');
  console.log('Next steps:');
  console.log('1. Ensure you have the N8N_DOCS_WEBHOOK_URL secret set in this repository\'s GitHub Actions settings.');
  console.log('2. Commit and push these new files to trigger your first documentation build!');
}

setup();

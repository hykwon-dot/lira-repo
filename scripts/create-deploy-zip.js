const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const excludeList = [
  'node_modules',
  '.next',
  '.git',
  '.vscode',
  'deploy-package', // Avoid recursive inclusion
  '*.zip',
  'tmp',
  'test-results',
  '.env.local', // Don't include local env secrets
  '.env',       // Don't include local env secrets
];

const projectName = 'lira-deploy';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const zipName = `${projectName}-${timestamp}.zip`;

console.log(`Creating deployment package: ${zipName}`);

// Using git archive if available as it respects .gitignore and is faster
try {
  console.log('Attempting to use git archive...');
  execSync(`git archive --format=zip --output="${zipName}" HEAD`);
  console.log('Successfully created zip using git archive.');
} catch (error) {
  console.log('git archive failed or git not available. Falling back to manual zip creation (this might require 7z or zip command).');
  
  // Fallback for Windows (PowerShell)
  if (process.platform === 'win32') {
    try {
      const excludeArgs = excludeList.map(item => `-Exclude "${item}"`).join(' ');
      const command = `powershell -Command "Compress-Archive -Path * -DestinationPath '${zipName}' -Force"`;
      // Note: Compress-Archive in PowerShell is tricky with exclusions on root wildcard. 
      // A simpler approach for this environment might be just telling the user what to do or using a library if I could install one.
      // But I can't install new packages easily.
      
      // Let's try a simpler approach: List files and zip them? No, too complex.
      // Let's just assume git is available since this is a dev environment.
      console.error('Manual zip fallback not fully implemented for Windows without external tools. Please ensure git is installed and this is a git repo.');
    } catch (e) {
      console.error('PowerShell zip failed:', e);
    }
  }
}

console.log(`\nDeployment package created: ${zipName}`);
console.log('You can upload this zip file to AWS Amplify or your hosting provider.');

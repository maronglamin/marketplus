#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Function to run npm commands
function runCommand(command) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString();
  } catch (error) {
    console.error(`${colors.red}Error executing command: ${command}${colors.reset}`);
    console.error(error.message);
    return null;
  }
}

// Function to check for outdated packages
function checkOutdated() {
  console.log(`${colors.blue}Checking for outdated packages...${colors.reset}`);
  const outdated = runCommand('npm outdated --json');
  
  if (outdated) {
    const outdatedPackages = JSON.parse(outdated);
    const packageCount = Object.keys(outdatedPackages).length;
    
    if (packageCount > 0) {
      console.log(`${colors.yellow}Found ${packageCount} outdated packages:${colors.reset}`);
      Object.entries(outdatedPackages).forEach(([name, info]) => {
        console.log(`${colors.yellow}${name}: ${info.current} -> ${info.latest}${colors.reset}`);
      });
    } else {
      console.log(`${colors.green}All packages are up to date!${colors.reset}`);
    }
  }
}

// Function to check for vulnerabilities
function checkVulnerabilities() {
  console.log(`${colors.blue}Checking for vulnerabilities...${colors.reset}`);
  const audit = runCommand('npm audit --json');
  
  if (audit) {
    const auditResult = JSON.parse(audit);
    const vulnerabilities = auditResult.vulnerabilities || {};
    const vulnerabilityCount = Object.keys(vulnerabilities).length;
    
    if (vulnerabilityCount > 0) {
      console.log(`${colors.red}Found ${vulnerabilityCount} vulnerabilities:${colors.reset}`);
      Object.entries(vulnerabilities).forEach(([name, info]) => {
        console.log(`${colors.red}${name}: ${info.severity} - ${info.title}${colors.reset}`);
      });
    } else {
      console.log(`${colors.green}No vulnerabilities found!${colors.reset}`);
    }
  }
}

// Function to update dependencies
function updateDependencies() {
  console.log(`${colors.blue}Updating dependencies...${colors.reset}`);
  
  // Update package.json
  runCommand('npm update');
  
  // Update package-lock.json
  runCommand('npm install');
  
  console.log(`${colors.green}Dependencies updated successfully!${colors.reset}`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    checkOutdated();
    checkVulnerabilities();
  } else if (args.includes('--update')) {
    updateDependencies();
  } else {
    console.log(`
Usage:
  node check-dependencies.js [options]

Options:
  --check   Check for outdated packages and vulnerabilities
  --update  Update all dependencies to their latest versions
    `);
  }
}

main(); 
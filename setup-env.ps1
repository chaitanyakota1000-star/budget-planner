# setup-env.ps1
$projectDir = "C:\Users\chait\.gemini\antigravity\scratch\budget-planner"
$nodeEnvDir = Join-Path $projectDir "node-env"
$zipPath = Join-Path $projectDir "node.zip"

# Create directories if they do not exist
if (-not (Test-Path $projectDir)) {
    New-Item -ItemType Directory -Force -Path $projectDir | Out-Null
}
if (-not (Test-Path $nodeEnvDir)) {
    New-Item -ItemType Directory -Force -Path $nodeEnvDir | Out-Null
}

# Download portable Node.js if not already present
$nodeExe = Join-Path $nodeEnvDir "node-v20.11.1-win-x64\node.exe"
if (-not (Test-Path $nodeExe)) {
    Write-Host "Downloading portable Node.js v20.11.1..."
    $url = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    
    Write-Host "Extracting Node.js..."
    Expand-Archive -Path $zipPath -DestinationPath $nodeEnvDir -Force
    
    Write-Host "Cleaning up ZIP..."
    Remove-Item -Path $zipPath -Force
}

# Verify installation
if (Test-Path $nodeExe) {
    Write-Host "Portable Node.js successfully set up at: $nodeExe"
    $nodeVersion = & $nodeExe -v
    Write-Host "Node version: $nodeVersion"
} else {
    Write-Error "Failed to verify Node.exe location!"
}

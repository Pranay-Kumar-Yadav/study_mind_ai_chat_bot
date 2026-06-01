# ============================================
# StudyMind AI - PowerShell Setup & Run Script
# ============================================

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "     StudyMind AI - Setup & Launch" -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$pythonCmd = $null
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command python3 -ErrorAction SilentlyContinue).Source
} else {
    Write-Host "  [X] Python not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}
$version = & $pythonCmd --version 2>&1
Write-Host "  [OK] Found: $version" -ForegroundColor Green

# Step 2: Install pip packages
Write-Host "[2/5] Installing Python libraries..." -ForegroundColor Yellow
& $pythonCmd -m pip install flask requests --quiet --upgrade
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] flask, requests installed" -ForegroundColor Green
} else {
    Write-Host "  [!] pip install had issues, trying to continue..." -ForegroundColor Yellow
}

# Step 3: Check Ollama
Write-Host "[3/5] Checking Ollama..." -ForegroundColor Yellow
$ollamaRunning = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $ollamaRunning = $true
    Write-Host "  [OK] Ollama is running!" -ForegroundColor Green
} catch {
    Write-Host "  [!] Ollama not detected." -ForegroundColor Yellow
    Write-Host "  -> Download Ollama from: https://ollama.com" -ForegroundColor Gray
    Write-Host "  -> Then run in another terminal: ollama serve" -ForegroundColor Gray
    Write-Host "  -> Then pull a model: ollama pull llama3.2" -ForegroundColor Gray
    Write-Host "  The app will still start, but AI will not work until Ollama is running." -ForegroundColor Yellow
}

# Step 4: (Optional) Pull default model if Ollama running
if ($ollamaRunning) {
    Write-Host "[4/5] Checking models..." -ForegroundColor Yellow
    try {
        $tagsResp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $tagsData = $tagsResp.Content | ConvertFrom-Json
        $models = $tagsData.models
        if ($models.Count -eq 0) {
            Write-Host "  No models found. Pulling llama3.2 (this takes a few minutes)..." -ForegroundColor Yellow
            Start-Process -FilePath "ollama" -ArgumentList "pull llama3.2" -Wait -NoNewWindow
        } else {
            $modelNames = ($models | ForEach-Object { $_.name }) -join ", "
            Write-Host "  [OK] Models available: $modelNames" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [!] Could not check models." -ForegroundColor Yellow
    }
} else {
    Write-Host "[4/5] Skipping model check (Ollama not running)" -ForegroundColor Gray
}

# Step 5: Launch app
Write-Host "[5/5] Launching StudyMind AI..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Opening at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

# Open browser after small delay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5000"
} | Out-Null

# Run Flask app
Set-Location $scriptDir
& $pythonCmd app.py

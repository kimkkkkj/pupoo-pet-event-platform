param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $workspaceRoot "pupoo_backend"
$gradleWrapper = Join-Path $backendDir "gradlew.bat"

if (-not (Test-Path $gradleWrapper)) {
    throw "Gradle wrapper not found: $gradleWrapper"
}

Push-Location $backendDir
try {
    $gradleArgs = @("--no-daemon")
    if ($Clean) {
        & $gradleWrapper --stop | Out-Null
        $gradleArgs += "clean"
    }
    $gradleArgs += "bootJar"
    & $gradleWrapper @gradleArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Integrated build failed."
    }
}
finally {
    Pop-Location
}

$jarPath = Join-Path $backendDir "build\\libs\\pupoo-backend.jar"
Write-Host "Integrated build completed: $jarPath"

param(
    [string]$BackendBaseUrl = "http://localhost:8080",
    [long]$EventId = 1,
    [long]$ProgramId = 298,
    [string]$Token,
    [string]$JwtSecret = "",
    [string]$JwtIssuer = "pupoo",
    [string]$JwtRole = "USER",
    [long]$JwtUserId = 9999,
    [switch]$AllowFallback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Convert-ToBase64Url {
    param([byte[]]$Bytes)
    $raw = [Convert]::ToBase64String($Bytes)
    return $raw.TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function New-DevJwtToken {
    param(
        [string]$Secret,
        [string]$Issuer,
        [string]$Role,
        [long]$UserId
    )

    if ([string]::IsNullOrWhiteSpace($Secret)) {
        throw "JWT secret is empty."
    }

    $headerObj = @{
        alg = "HS256"
        typ = "JWT"
    }

    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $payloadObj = @{
        iss  = $Issuer
        sub  = "$UserId"
        role = $Role
        iat  = $now
        exp  = ($now + 3600)
    }

    $headerJson = ($headerObj | ConvertTo-Json -Compress)
    $payloadJson = ($payloadObj | ConvertTo-Json -Compress)

    $headerB64 = Convert-ToBase64Url ([Text.Encoding]::UTF8.GetBytes($headerJson))
    $payloadB64 = Convert-ToBase64Url ([Text.Encoding]::UTF8.GetBytes($payloadJson))
    $data = "$headerB64.$payloadB64"

    $hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
    try {
        $signatureB64 = Convert-ToBase64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($data)))
    } finally {
        $hmac.Dispose()
    }

    return "$data.$signatureB64"
}

function Resolve-JwtSecret {
    param([string]$CurrentValue)

    if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
        return $CurrentValue
    }

    if (-not [string]::IsNullOrWhiteSpace($env:AUTH_JWT_SECRET)) {
        return $env:AUTH_JWT_SECRET
    }

    $scriptDir = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($scriptDir)) {
        $scriptDir = (Get-Location).Path
    }
    $candidateFiles = @(
        (Join-Path $scriptDir "pupoo_backend\src\main\resources\application.properties"),
        (Join-Path $scriptDir "..\popups\pupoo_backend\src\main\resources\application.properties")
    )

    foreach ($file in $candidateFiles) {
        if (-not (Test-Path $file)) {
            continue
        }

        $line = Select-String -Path $file -Pattern '^auth\.jwt\.secret=\$\{AUTH_JWT_SECRET:(.+)\}$' | Select-Object -First 1
        if ($line) {
            return $line.Matches[0].Groups[1].Value
        }
    }

    throw "Cannot resolve JWT secret. Pass -Token or -JwtSecret explicitly."
}

function Invoke-JsonGet {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers
    )

    try {
        $res = Invoke-WebRequest -Uri $Url -Method Get -Headers $Headers -TimeoutSec 10 -UseBasicParsing
        $json = $res.Content | ConvertFrom-Json
        return [pscustomobject]@{
            Name   = $Name
            Url    = $Url
            Status = [int]$res.StatusCode
            Body   = $json
            Error  = $null
        }
    } catch {
        $statusCode = -1
        $bodyText = ""

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode.value__
            } catch {
                $statusCode = -1
            }
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
            } catch {
                $bodyText = ""
            }
        }

        return [pscustomobject]@{
            Name   = $Name
            Url    = $Url
            Status = $statusCode
            Body   = $null
            Error  = if ([string]::IsNullOrWhiteSpace($bodyText)) { $_.Exception.Message } else { $bodyText }
        }
    }
}

function Assert-Common {
    param(
        [psobject]$Result,
        [System.Collections.Generic.List[string]]$Failures
    )

    if ($Result.Status -ne 200) {
        $Failures.Add("$($Result.Name): expected HTTP 200, got $($Result.Status). $($Result.Error)")
        return $false
    }

    if ($null -eq $Result.Body) {
        $Failures.Add("$($Result.Name): empty JSON response.")
        return $false
    }

    if (-not $Result.Body.success) {
        $Failures.Add("$($Result.Name): success=false.")
        return $false
    }

    if ($null -eq $Result.Body.data) {
        $Failures.Add("$($Result.Name): data is null.")
        return $false
    }

    return $true
}

function Assert-PredictionShape {
    param(
        [psobject]$Result,
        [System.Collections.Generic.List[string]]$Failures,
        [bool]$AllowFallbackValue
    )

    $data = $Result.Body.data

    if (-not $AllowFallbackValue -and $data.fallbackUsed) {
        $Failures.Add("$($Result.Name): fallbackUsed=true (expected false).")
    }

    if (($data.predictedAvgScore -lt 0) -or ($data.predictedAvgScore -gt 100)) {
        $Failures.Add("$($Result.Name): predictedAvgScore out of range (0-100).")
    }
    if (($data.predictedPeakScore -lt 0) -or ($data.predictedPeakScore -gt 100)) {
        $Failures.Add("$($Result.Name): predictedPeakScore out of range (0-100).")
    }
    if (($data.predictedLevel -lt 1) -or ($data.predictedLevel -gt 4)) {
        $Failures.Add("$($Result.Name): predictedLevel out of range (1-4).")
    }
}

function Assert-RecommendationShape {
    param(
        [psobject]$Result,
        [System.Collections.Generic.List[string]]$Failures,
        [bool]$AllowFallbackValue
    )

    $data = $Result.Body.data

    if (-not $AllowFallbackValue -and $data.fallbackUsed) {
        $Failures.Add("$($Result.Name): fallbackUsed=true (expected false).")
    }

    if (($data.thresholdScore -lt 0) -or ($data.thresholdScore -gt 100)) {
        $Failures.Add("$($Result.Name): thresholdScore out of range (0-100).")
    }

    if ($null -eq $data.recommendations) {
        $Failures.Add("$($Result.Name): recommendations is null.")
    }
}

$base = $BackendBaseUrl.TrimEnd("/")

if ([string]::IsNullOrWhiteSpace($Token)) {
    $resolvedSecret = Resolve-JwtSecret -CurrentValue $JwtSecret
    $Token = New-DevJwtToken -Secret $resolvedSecret -Issuer $JwtIssuer -Role $JwtRole -UserId $JwtUserId
    Write-Step "No -Token provided. Generated dev JWT using issuer=$JwtIssuer role=$JwtRole userId=$JwtUserId."
}

$headers = @{
    Authorization = "Bearer $Token"
}

$failures = New-Object 'System.Collections.Generic.List[string]'

$targets = @(
    @{
        Name = "event-predict"
        Url  = "$base/api/ai/events/$EventId/congestion/predict"
        Kind = "prediction"
    },
    @{
        Name = "program-predict"
        Url  = "$base/api/ai/programs/$ProgramId/congestion/predict"
        Kind = "prediction"
    },
    @{
        Name = "program-recommend"
        Url  = "$base/api/ai/programs/$ProgramId/recommendations"
        Kind = "recommendation"
    }
)

foreach ($target in $targets) {
    Write-Step "Calling $($target.Url)"
    $result = Invoke-JsonGet -Name $target.Name -Url $target.Url -Headers $headers

    if (-not (Assert-Common -Result $result -Failures $failures)) {
        Write-Fail "$($target.Name) failed common checks."
        continue
    }

    if ($target.Kind -eq "prediction") {
        Assert-PredictionShape -Result $result -Failures $failures -AllowFallbackValue ([bool]$AllowFallback)
    } else {
        Assert-RecommendationShape -Result $result -Failures $failures -AllowFallbackValue ([bool]$AllowFallback)
    }

    $fallbackValue = [bool]$result.Body.data.fallbackUsed
    Write-Pass "$($target.Name) OK (fallbackUsed=$fallbackValue)"
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Fail "Smoke test failed."
    foreach ($failure in $failures) {
        Write-Fail $failure
    }
    exit 1
}

Write-Host ""
Write-Pass "AI smoke test passed."
exit 0

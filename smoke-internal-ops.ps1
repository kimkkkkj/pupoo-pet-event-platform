param(
    [string]$AiBaseUrl = "http://localhost:8000",
    [string]$InternalToken = "",
    [string]$UserAuthorization = "",
    [string]$AdminAuthorization = "",
    [string]$NormalModerationText = "오늘 행사 분위기가 좋아요.",
    [string]$BoundaryModerationText = "표현이 조금 거칠고 공격적으로 느껴질 수 있습니다.",
    [string]$BlockedModerationText = "죽여버리고 싶다. 찾아가서 해치겠다."
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

function Resolve-InternalToken {
    param([string]$CurrentValue)

    if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
        return $CurrentValue
    }

    $candidates = @(
        $env:PUPOO_AI_INTERNAL_TOKEN,
        $env:AI_SERVICE_INTERNAL_TOKEN,
        $env:AI_MODERATION_INTERNAL_TOKEN
    )

    foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            return $candidate
        }
    }

    throw "내부 토큰이 비어 있습니다. -InternalToken 또는 PUPOO_AI_INTERNAL_TOKEN 계열 환경변수를 지정하세요."
}

function New-Headers {
    param([string]$Authorization)

    $headers = @{
        "X-Internal-Token" = $script:ResolvedInternalToken
    }

    if (-not [string]::IsNullOrWhiteSpace($Authorization)) {
        $headers["Authorization"] = $Authorization
    }

    return $headers
}

function Invoke-JsonPost {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers,
        [hashtable]$Body
    )

    $payload = $Body | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-WebRequest `
            -Uri $Url `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json; charset=utf-8" `
            -Body $payload `
            -TimeoutSec 40 `
            -UseBasicParsing

        $json = $response.Content | ConvertFrom-Json
        return [pscustomobject]@{
            Name   = $Name
            Url    = $Url
            Status = [int]$response.StatusCode
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

function Assert-ChatbotResponse {
    param(
        [psobject]$Result,
        [System.Collections.Generic.List[string]]$Failures
    )

    if ($Result.Status -ne 200) {
        $Failures.Add("$($Result.Name): expected HTTP 200, got $($Result.Status). $($Result.Error)")
        return
    }

    if ($null -eq $Result.Body) {
        $Failures.Add("$($Result.Name): empty JSON response.")
        return
    }

    if (-not $Result.Body.success) {
        $Failures.Add("$($Result.Name): success=false.")
        return
    }

    if ($null -eq $Result.Body.data -or [string]::IsNullOrWhiteSpace([string]$Result.Body.data.message)) {
        $Failures.Add("$($Result.Name): data.message is missing.")
    }
}

function Assert-ModerationResponse {
    param(
        [psobject]$Result,
        [System.Collections.Generic.List[string]]$Failures
    )

    if ($Result.Status -ne 200) {
        $Failures.Add("$($Result.Name): expected HTTP 200, got $($Result.Status). $($Result.Error)")
        return
    }

    if ($null -eq $Result.Body) {
        $Failures.Add("$($Result.Name): empty JSON response.")
        return
    }

    foreach ($field in @("decision", "result", "action")) {
        $value = $Result.Body.$field
        if ([string]::IsNullOrWhiteSpace([string]$value)) {
            $Failures.Add("$($Result.Name): $field is missing.")
        }
    }
}

$script:ResolvedInternalToken = Resolve-InternalToken -CurrentValue $InternalToken
$base = $AiBaseUrl.TrimEnd("/")
$failures = New-Object 'System.Collections.Generic.List[string]'

$targets = @(
    @{
        Name = "internal-user-chatbot"
        Url = "$base/internal/chatbot/chat"
        Headers = (New-Headers -Authorization $UserAuthorization)
        Kind = "chatbot"
        Body = @{
            message = "반려동물 동반 가능한 행사 추천해줘"
            history = @()
            context = @{
                role = "admin"
                currentPage = "/"
            }
        }
    },
    @{
        Name = "internal-admin-chatbot"
        Url = "$base/internal/admin/chatbot/chat"
        Headers = (New-Headers -Authorization $AdminAuthorization)
        Kind = "chatbot"
        Body = @{
            message = "관리자 공지 초안 검토 기준을 알려줘"
            history = @()
            context = @{
                role = "user"
                currentPage = "/admin"
            }
        }
    },
    @{
        Name = "internal-moderate-normal"
        Url = "$base/internal/moderate"
        Headers = (New-Headers -Authorization "")
        Kind = "moderation"
        Body = @{
            content = $NormalModerationText
            board_type = "FREE"
            metadata = @{
                source = "smoke"
                case = "normal"
            }
        }
    },
    @{
        Name = "internal-moderation-check-boundary"
        Url = "$base/internal/moderation/check"
        Headers = (New-Headers -Authorization "")
        Kind = "moderation"
        Body = @{
            content = $BoundaryModerationText
            board_type = "INFO"
            metadata = @{
                source = "smoke"
                case = "boundary"
            }
        }
    },
    @{
        Name = "internal-moderate-blocked"
        Url = "$base/internal/moderate"
        Headers = (New-Headers -Authorization "")
        Kind = "moderation"
        Body = @{
            content = $BlockedModerationText
            board_type = "FREE"
            metadata = @{
                source = "smoke"
                case = "blocked"
            }
        }
    }
)

foreach ($target in $targets) {
    Write-Step "Calling $($target.Name)"
    $result = Invoke-JsonPost -Name $target.Name -Url $target.Url -Headers $target.Headers -Body $target.Body

    if ($target.Kind -eq "chatbot") {
        Assert-ChatbotResponse -Result $result -Failures $failures
        if ($result.Status -eq 200 -and $null -ne $result.Body -and $result.Body.success) {
            Write-Pass "$($target.Name) OK"
        } else {
            Write-Fail "$($target.Name) failed"
        }
        continue
    }

    Assert-ModerationResponse -Result $result -Failures $failures
    if ($result.Status -eq 200 -and $null -ne $result.Body) {
        Write-Pass "$($target.Name) decision=$($result.Body.decision) result=$($result.Body.result) action=$($result.Body.action)"
    } else {
        Write-Fail "$($target.Name) failed"
    }
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Fail "내부 smoke test 실패"
    foreach ($failure in $failures) {
        Write-Fail $failure
    }
    exit 1
}

Write-Host ""
Write-Pass "내부 smoke test 통과"
exit 0

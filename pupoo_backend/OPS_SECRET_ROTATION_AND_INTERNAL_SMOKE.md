# 운영 비밀값 회전 및 내부 Smoke Test Runbook

## 범위

- backend와 AI 사이 내부 토큰 기반 연동
- 사용자 챗봇, 관리자 챗봇, moderation 내부 엔드포인트
- 이번 문서는 값 자체가 아니라 회전 순서와 점검 절차만 다룬다

## 1. 비밀값 회전 체크리스트

### 회전 대상

- `SPRING_DATASOURCE_PASSWORD`
- `AUTH_JWT_SECRET`
- `VERIFICATION_HASH_SALT`
- `AI_SERVICE_INTERNAL_TOKEN`
- `AI_MODERATION_INTERNAL_TOKEN`
- `APP_AI_MODERATION_INTERNAL_TOKEN`
- `PUPOO_AI_INTERNAL_TOKEN`
- `KAKAO_OAUTH_CLIENT_SECRET`
- `NAVER_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `KAKAOPAY_SECRET_KEY`

### 회전 순서

1. 회전 대상 목록과 영향 범위를 먼저 잠근다.
2. GitHub Secrets에 새 값을 먼저 등록한다.
3. 로컬 개발이 필요하면 Git 추적 제외된 local secret 파일을 새 값으로 다시 만든다.
4. 배포 워크플로 또는 `kubectl patch/apply`로 Kubernetes Secret을 갱신한다.
5. `pupoo-backend`, `pupoo-ai`를 순서대로 롤링 배포한다.
6. 배포 직후 internal smoke test를 수행한다.
7. smoke test가 통과하면 이전 값을 폐기한다.

### 운영 순서 메모

- GitHub Secret 갱신 전에 기존 값을 삭제하지 않는다.
- Kubernetes Secret 갱신 후에는 rollout status를 확인하기 전까지 이전 값을 폐기하지 않는다.
- backend와 AI가 같은 내부 토큰 체인을 공유하는 항목은 반드시 같은 배포 묶음에서 회전한다.

## 2. SUPER_ADMIN 점검 결과

### 확인한 위치

- `src/main/java/com/popups/pupoo/auth/security/config/SecurityConfig.java`
- `src/main/java/com/popups/pupoo/auth/security/util/SecurityUtil.java`
- `src/main/java/com/popups/pupoo/user/domain/enums/RoleName.java`
- `src/main/java/com/popups/pupoo/user/persistence/UserRoleSchemaInitializer.java`

### 결론

- 이번 라운드에서는 `USER / ADMIN / SUPER_ADMIN` 구조를 그대로 유지한다.
- `/api/admin/**` 는 `ADMIN`, `SUPER_ADMIN` 권한으로 보호되고 있다.
- 일반 사용자 경로는 `USER`, `SUPER_ADMIN` 포함 방식으로 동작한다.
- 현재 확인 범위에서는 사용자 경로와 관리자 경로가 서로 충돌하도록 열려 있지는 않았다.
- enum, DB, 권한 체크 수정은 하지 않았다.

## 3. 챗봇/모더레이션 경계 점검 결과

### 챗봇 경계

- 사용자 프록시: `POST /api/chatbot/chat`
- 관리자 프록시: `POST /api/admin/chatbot/chat`
- backend 프록시는 사용자 요청을 AI `POST /internal/chatbot/chat` 으로 전달한다.
- backend 프록시는 관리자 요청을 AI `POST /internal/admin/chatbot/chat` 으로 전달한다.
- `ChatbotProxyController` 는 요청 본문의 `context.role` 값을 강제로 덮어써서 user/admin 경계를 backend에서 다시 고정한다.

### moderation 경계

- AI 내부 moderation 엔드포인트는 `POST /internal/moderate`, `POST /internal/moderation/check` 이다.
- 두 엔드포인트 모두 내부 토큰이 필요하다.
- backend 적용 범위는 현재도 `FREE / INFO` 게시글 생성·수정만 유지한다.
- 최종 허용/차단 결정은 backend가 수행한다.

## 4. Smoke Test 준비

### 공통 준비값

- `AI_BASE_URL`
- `X-Internal-Token`
- 필요 시 `USER_JWT`
- 필요 시 `ADMIN_JWT`

### PowerShell 스크립트

루트 경로에서 아래처럼 실행한다.

```powershell
pwsh ./smoke-internal-ops.ps1 `
  -AiBaseUrl "http://pupoo-ai:80" `
  -InternalToken $env:PUPOO_AI_INTERNAL_TOKEN `
  -UserAuthorization "Bearer <USER_JWT>" `
  -AdminAuthorization "Bearer <ADMIN_JWT>"
```

### curl 예시

사용자 챗봇 내부 경로

```bash
curl -X POST "$AI_BASE_URL/internal/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "Authorization: Bearer $USER_JWT" \
  -d '{
    "message": "반려동물 동반 가능한 행사 추천해줘",
    "history": [],
    "context": {
      "role": "admin",
      "currentPage": "/"
    }
  }'
```

관리자 챗봇 내부 경로

```bash
curl -X POST "$AI_BASE_URL/internal/admin/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "message": "관리자 공지 초안 검토 기준을 알려줘",
    "history": [],
    "context": {
      "role": "user",
      "currentPage": "/admin"
    }
  }'
```

moderation 내부 경로

```bash
curl -X POST "$AI_BASE_URL/internal/moderate" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{
    "content": "오늘 행사 분위기가 좋아요.",
    "board_type": "FREE",
    "metadata": {
      "source": "smoke"
    }
  }'
```

moderation 호환 경로

```bash
curl -X POST "$AI_BASE_URL/internal/moderation/check" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{
    "content": "표현이 조금 거칠고 공격적으로 느껴질 수 있습니다.",
    "board_type": "INFO",
    "metadata": {
      "source": "smoke"
    }
  }'
```

### 기대 결과

- 챗봇 내부 경로는 `success=true` 와 `data.message` 를 반환해야 한다.
- moderation 내부 경로는 `decision`, `result`, `action` 필드를 반환해야 한다.
- 내부 토큰이 없으면 `403` 이어야 한다.
- 관리자 기능 실행형 요청은 별도 관리자 JWT가 있어야 downstream backend 호출까지 정상 동작한다.

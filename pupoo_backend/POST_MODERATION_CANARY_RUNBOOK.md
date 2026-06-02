# 게시글 moderation 운영 canary runbook

기준 시각: 2026-03-26 KST

## 목적

- `POST /api/posts`의 FREE / INFO moderation 계약을 운영 직전에 다시 확인한다.
- BLOCK은 `ApiResponse.fail(...)` 경로인지 확인한다.
- PASS는 성공 응답이며 `data.moderation`이 없는지 확인한다.
- WARN / REVIEW는 성공 응답이며 `data.moderation`이 있는지 확인한다.

## 사전 확인

### 현재 게시판 ID

2026-03-26 기준 live `GET /api/boards` 응답:

- FREE 게시판: `boardId=1`
- INFO 게시판: `boardId=2`

운영 전에는 아래 API로 다시 확인한다.

```bash
curl -sS https://api.pupoo.site/api/boards
```

### 인증

- `POST /api/posts`는 인증이 필요하다.
- 운영 canary는 실제 사용자 JWT 또는 운영자가 임시로 생성한 JWT로 수행한다.
- 토큰 값은 문서에 저장하지 않는다.

## 1. FREE 게시판 canary

### PASS 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 1,
    "postTitle": "FREE PASS canary",
    "content": "오늘 행사 분위기가 좋아요."
  }'
```

기대 결과:

- HTTP 200
- `success=true`
- `data.postId` 존재
- `data.boardId=1`
- `data.moderation=null`

### WARN 또는 REVIEW 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 1,
    "postTitle": "FREE WARN canary",
    "content": "표현이 조금 거칠고 공격적으로 느껴질 수 있습니다."
  }'
```

기대 결과:

- HTTP 200
- `success=true`
- `data.postId` 존재
- `data.moderation.decision` = `WARN` 또는 `REVIEW`
- `data.moderation.message` 존재
- `data.moderation.reason` 존재 가능
- `data.moderation.reviewRequired`는 `REVIEW`일 때 `true`

주의:

- 현재 live AI runtime 상태에 따라 경계 문장은 `WARN/REVIEW` 대신 timeout 기반 BLOCK으로 떨어질 수 있다.
- 이 경우 운영 투입 전 AI runtime 상태를 먼저 점검한다.

### BLOCK 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 1,
    "postTitle": "FREE BLOCK canary",
    "content": "죽여버리고 싶다. 찾아가서 해치겠다."
  }'
```

기대 결과:

- HTTP 400
- `success=false`
- `error.code=C4001`
- `data=null`
- `error.message`에 차단 사유 포함

## 2. INFO 게시판 canary

### PASS 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 2,
    "postTitle": "INFO PASS canary",
    "content": "행사 운영 동선이 잘 정리되어 있어요."
  }'
```

기대 결과:

- HTTP 200
- `success=true`
- `data.postId` 존재
- `data.boardId=2`
- `data.moderation=null`

### WARN 또는 REVIEW 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 2,
    "postTitle": "INFO WARN canary",
    "content": "표현이 조금 거칠고 공격적으로 느껴질 수 있습니다."
  }'
```

기대 결과:

- HTTP 200
- `success=true`
- `data.moderation.decision` = `WARN` 또는 `REVIEW`

### BLOCK 예시

```bash
curl -X POST "https://api.pupoo.site/api/posts" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "boardId": 2,
    "postTitle": "INFO BLOCK canary",
    "content": "죽여버리고 싶다. 찾아가서 해치겠다."
  }'
```

기대 결과:

- HTTP 400
- `success=false`
- `error.code=C4001`
- `data=null`

## 3. 성공 응답 계약 예시

### PASS 예시

```json
{
  "success": true,
  "data": {
    "postId": 123,
    "boardId": 1,
    "userId": 2985,
    "postTitle": "FREE PASS canary",
    "content": "오늘 행사 분위기가 좋아요.",
    "status": "PUBLISHED",
    "moderation": null
  }
}
```

### WARN / REVIEW 예시

```json
{
  "success": true,
  "data": {
    "postId": 124,
    "boardId": 1,
    "userId": 2985,
    "postTitle": "FREE WARN canary",
    "content": "표현이 조금 거칠고 공격적으로 느껴질 수 있습니다.",
    "status": "PUBLISHED",
    "moderation": {
      "decision": "WARN",
      "message": "주의가 필요한 게시글입니다.",
      "reason": "정책 판단 사유",
      "reviewRequired": false
    }
  }
}
```

### BLOCK 예시

```json
{
  "success": false,
  "errorCode": "C4001",
  "data": null,
  "error": {
    "code": "C4001",
    "message": "게시글 내용이 정책에 위반될 수 있어 등록할 수 없습니다."
  }
}
```

## 4. update canary 참고

생성 후 같은 JWT로 아래처럼 수정 canary를 수행할 수 있다.

```bash
curl -X PUT "https://api.pupoo.site/api/posts/<CREATED_POST_ID>" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "postTitle": "FREE update canary",
    "content": "불친절해서 화가 났고 말투가 공격적으로 느껴졌습니다."
  }'
```

기대 결과:

- PASS면 성공 응답 + `data.moderation=null`
- WARN / REVIEW면 성공 응답 + `data.moderation` 존재
- BLOCK이면 실패 응답

## 5. 로그 체크리스트

backend 로그에서 아래 문자열을 확인한다.

### AI 호출 시작

- `Calling AI moderation for post`

의미:

- 하드 금칙어 매칭을 통과하고 AI moderation 호출까지 진입했다.

### AI 판단 결과

- `AI moderation decision`

확인 항목:

- `boardId`
- `boardType`
- `decision`
- `reason`
- `score`

### 최종 판단 결과

- `Final moderation decision`

확인 항목:

- `operation=create` 또는 `operation=update`
- `result=success` 또는 `result=fail`
- `moderationIncluded=true/false`

### 하드 금칙어 매치

- `Hard moderation match`

의미:

- DB `board_banned_words` 기반의 하드 차단이 먼저 발생했다.
- 이 경우 AI 호출 로그가 없이 바로 실패로 끝날 수 있다.

## 6. 소비자 영향 확인 포인트

현재 성공 응답은 `ApiResponse<PostResponse>` 이다.

프론트 확인 결과:

- `pupoo_frontend/src/app/http/postApi.js` 는 `body.data`를 그대로 반환한다.
- `FreeBoard.jsx`, `InfoBoard.jsx`, `CommunityBoardWritePage.jsx` 는 `created?.postId ?? created` 형태로 처리한다.

즉 현재 프론트는 아래 두 경우를 모두 받아들일 수 있다.

- 새 계약: `PostResponse`
- 구계약 잔재: 숫자 `postId`

운영 전 마지막 확인 항목:

- 새 소비자가 `data`를 숫자만으로 단정하지 않는지 확인
- moderation UI가 `created.moderation`을 읽을 준비가 되어 있는지 확인

## 7. 실행 후 정리

- PASS 또는 WARN / REVIEW로 생성된 canary 글은 바로 삭제한다.
- 삭제 API:

```bash
curl -X DELETE "https://api.pupoo.site/api/posts/<CREATED_POST_ID>" \
  -H "Authorization: Bearer <USER_JWT>"
```

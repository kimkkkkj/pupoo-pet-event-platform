# 관리자 챗봇 오케스트레이션 가능 액션 정리

## 목적

이 문서는 `pupoo_backend` 기준으로 관리자 AI 챗봇 오케스트레이션이 현재 수행할 수 있는 액션을 정리한다.

- 기준 환경: EKS 운영
- 목적: 기능 추가가 아니라 실제 운영 복구와 계약 정렬
- 범위: backend 실제 계약, 프론트 라우팅 액션, 실행 조건

## 전제 조건

- `/api/admin/chatbot/**` 가 관리자용 정식 경로이고 관리자 JWT가 필요하다.
- `/api/admin/**` 호출에는 관리자 JWT가 필요하다.
- 토큰 없음 또는 만료는 `401`
- 일반 사용자 권한은 `403`
- 챗봇 프록시는 `/api/admin/chatbot/chat` 에서 받은 `Authorization` 헤더를 AI `/internal/admin/chatbot/chat` 로 전달한다. (`/api/chatbot/chat` 는 사용자 경로)

## 액션 표

| 분류 | 액션 키 | 방식 | 경로 또는 대상 | 최소 조건 | 비고 |
|---|---|---|---|---|---|
| API 실행 | `summary_get` | `GET` | `/api/admin/ai/summary` | 관리자 JWT | 요약 조회 |
| API 실행 | `capabilities_get` | `GET` | `/api/admin/ai/capabilities` | 관리자 JWT | 기능 목록 조회 |
| API 실행 | `notice_create` | `POST` | `/api/admin/notices` | `scope`, `title`, `content`, `pinned`, `status` | 공지 생성 |
| API 실행 | `notice_update` | `PATCH` | `/api/admin/notices/{id}` | `title`, `content`, `pinned`, `status` | 공지 수정 |
| API 실행 | `notice_hide` | `PATCH` | `/api/admin/notices/{id}` | `status=HIDDEN` | 기존 공지 숨김 |
| API 실행 | `notification_draft_create` | `POST` | `/api/admin/notifications` | `title`, `content`, `alertMode` | 알림 초안 생성 |
| API 실행 | `notification_draft_update` | `PUT` | `/api/admin/notifications/{id}` | `title`, `content`, `alertMode` | 알림 초안 수정 |
| API 실행 | `notification_draft_delete` | `DELETE` | `/api/admin/notifications/{id}` | draft id 존재 | 알림 초안 삭제 |
| API 실행 | `notification_draft_send` | `POST` | `/api/admin/notifications/{id}/send` | draft id 존재 | 저장된 초안 발송 |
| API 실행 | `notification_event_send` | `POST` | `/api/admin/notifications/event` | `type`, `title`, `content`, `targetType`, `targetId`, `eventId` | 이벤트 대상 발송 |
| API 실행 | `notification_broadcast_send` | `POST` | `/api/admin/notifications/broadcast` | `type`, `title`, `content` | 전체 대상 발송 |
| 화면 이동 | `navigate_dashboard` | `NAVIGATE` | 관리자 대시보드 | 없음 | 프론트 라우팅 |
| 화면 이동 | `navigate_notice_manage` | `NAVIGATE` | 공지 관리 화면 | 없음 | 프론트 라우팅 |
| 화면 이동 | `navigate_notification_manage` | `NAVIGATE` | 알림 관리 화면 | 없음 | 프론트 라우팅 |
| 화면 이동 | `navigate_event_manage` | `NAVIGATE` | 이벤트 관리 화면 | 없음 | 프론트 라우팅 |
| 화면 이동 | `navigate_refund_manage` | `NAVIGATE` | 환불 관리 화면 | 없음 | 프론트 라우팅 |
| 폼 프리필 | `prefill_notice_form` | `PREFILL_FORM` | 공지 작성 폼 | 공지 필드 초안 | 이동과 함께 사용 가능 |
| 폼 프리필 | `prefill_notification_form` | `PREFILL_FORM` | 알림 작성 폼 | 알림 필드 초안 | 이동과 함께 사용 가능 |
| 확인 요청 | `confirm_execute` | `CONFIRM_EXECUTE` | 챗봇 확인 UI | 실행 예정 액션 존재 | 발송 전 확인 |
| 미지원 | `notification_schedule_send` | 미지원 | 없음 | 없음 | 예약 발송 미지원 |

## 액션별 최소 성공 조건

### 1. 공지 생성

`POST /api/admin/notices`

필수 필드:

- `scope`
- `title`
- `content`
- `pinned`
- `status`

최소 예시:

```json
{
  "scope": "ALL",
  "title": "공지 제목",
  "content": "공지 내용",
  "pinned": false,
  "status": "DRAFT"
}
```

이벤트 공지 예시:

```json
{
  "scope": "EVENT",
  "eventId": 1,
  "title": "행사 공지",
  "content": "행사 공지 내용",
  "pinned": false,
  "status": "PUBLISHED"
}
```

### 2. 공지 수정

`PATCH /api/admin/notices/{id}`

필수 필드:

- `title`
- `content`
- `pinned`
- `status`

최소 예시:

```json
{
  "title": "수정된 공지 제목",
  "content": "수정된 공지 내용",
  "pinned": false,
  "status": "PUBLISHED"
}
```

중요:

- `scope` 는 수정 반영되지 않는다.
- `eventId` 는 수정 반영되지 않는다.
- 프론트가 이 둘을 보내도 backend 는 무시한다.

### 3. 알림 초안 생성

`POST /api/admin/notifications`

필수 필드:

- `title`
- `content`
- `alertMode`

추가 조건:

- `alertMode=EVENT` 이면 `eventId` 필요

최소 예시:

```json
{
  "title": "행사 알림 초안",
  "content": "알림 내용",
  "alertMode": "EVENT",
  "eventId": 1
}
```

### 4. 알림 초안 수정

`PUT /api/admin/notifications/{id}`

필수 필드:

- `title`
- `content`
- `alertMode`

추가 조건:

- `alertMode=EVENT` 이면 `eventId` 필요

최소 예시:

```json
{
  "title": "수정된 행사 알림 초안",
  "content": "수정된 알림 내용",
  "alertMode": "EVENT",
  "eventId": 1
}
```

### 5. 저장된 초안 발송

`POST /api/admin/notifications/{id}/send`

조건:

- body 없음
- draft id 존재 필요
- 이미 삭제된 draft 는 발송 불가

### 6. 이벤트 알림 발송

`POST /api/admin/notifications/event`

필수 필드:

- `type`
- `title`
- `content`
- `targetType`
- `targetId`
- `eventId`

기본값:

- `channels` 미지정 시 `APP`
- `recipientScope`, `recipientScopes` 미지정 시 `INTEREST_SUBSCRIBERS`

최소 예시:

```json
{
  "type": "EVENT",
  "title": "행사 안내",
  "content": "행사 관련 알림입니다.",
  "targetType": "EVENT",
  "targetId": 1,
  "eventId": 1,
  "channels": ["APP"],
  "recipientScope": "INTEREST_SUBSCRIBERS"
}
```

운영 가이드:

- `targetType=EVENT`
- `targetId=eventId`

위 조합을 맞춰야 클릭 이동 불일치 리스크를 줄일 수 있다.

### 7. 전체 알림 발송

`POST /api/admin/notifications/broadcast`

필수 필드:

- `type`
- `title`
- `content`

기본값:

- `targetType=NOTICE`
- `targetId=0`
- `channels=APP`

최소 예시:

```json
{
  "type": "NOTICE",
  "title": "전체 공지 알림",
  "content": "전체 사용자 대상 알림입니다."
}
```

## 주요 실패 조건

| 조건 | 결과 |
|---|---|
| 관리자 JWT 없음 | `401` |
| 관리자 권한 없음 | `403` |
| 공지 필수 필드 누락 | `400` |
| `alertMode` 누락 | `400` |
| 잘못된 `alertMode` 값 | `400` |
| `alertMode=EVENT` 인데 `eventId` 누락 | `400` |
| 존재하지 않는 `eventId` | `404` |
| 존재하지 않는 notice id | `404` |
| 존재하지 않는 draft id | `404` |
| 이벤트 알림에서 `targetType/targetId/eventId` 의미 불일치 | 발송은 성공할 수 있으나 클릭 이동 어긋날 수 있음 |

## 운영 체크 포인트

### EKS 설정

- `pupoo-ai` Pod env 에 아래 값 필요

```env
PUPOO_AI_BACKEND_BASE_URL=http://pupoo-backend:80
```

### 프록시 체인

1. 프론트 -> `POST /api/admin/chatbot/chat`
2. backend 프록시 -> AI `POST /internal/admin/chatbot/chat`
3. AI -> backend admin API 호출

### 로그 해석 기준

| 경로 | 확인 포인트 |
|---|---|
| `/api/admin/chatbot/chat` | `401/403` 이면 프론트 관리자 토큰 문제 |
| `/api/admin/chatbot/chat` | `503` 이면 backend -> AI 연결 문제 |
| `/internal/admin/chatbot/chat` | `401/403` 이면 AI가 받은 관리자 JWT 전달 또는 해석 문제 |
| `/api/admin/ai/summary` | `401/403` 이면 AI -> backend 관리자 인증 실패 |
| `/api/admin/notices` | `400` 이면 필수 필드 또는 enum 오류 |
| `/api/admin/notifications/event` | `404` 이면 `eventId` 불일치 |
| `/api/admin/notifications/broadcast` | `400` 이면 `type/title/content` 누락 |

## 결론

현재 관리자 챗봇 오케스트레이션은 다음 범위를 수행할 수 있다.

- 관리자 요약 조회
- 관리자 기능 목록 조회
- 공지 생성, 수정, 숨김
- 알림 초안 생성, 수정, 삭제
- 저장된 초안 발송
- 이벤트 알림 즉시 발송
- 전체 알림 즉시 발송
- 관리자 화면 이동
- 공지/알림 폼 프리필
- 실행 전 확인 요청

현재 미지원 범위는 예약 발송이다.
## 현재 정리 메모

- 관리자 챗봇 진입점은 `POST /api/admin/chatbot/chat` 이다.
- 사용자 챗봇 진입점은 `POST /api/chatbot/chat` 이며 관리자 챗봇과 분리해서 취급한다.
- backend 프록시는 사용자 요청을 AI `/internal/chatbot/chat` 으로, 관리자 요청을 AI `/internal/admin/chatbot/chat` 으로 전달한다.
- 관리자용 초안 작성과 실행 준비는 관리자 권한과 `/api/admin/**` 규칙을 따라야 한다.

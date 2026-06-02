# AI Moderation Canonical Policy

## 목적

이 문서는 `C:\pupoo_workspace` 워크스페이스의 실제 코드와 DB 스키마를 기준으로 콘텐츠 신고 및 자동 모더레이션 정책을 하나의 기준으로 정리한 canonical 문서다.

정책 우선순위는 다음과 같다.

1. `db/*.sql`
2. 확정 정책 문서
3. 백엔드 실제 구현

이번 문서는 외부 자료를 반영하지 않았고, 실제 코드에 없는 상태값을 추가하지 않았다.

## 기준 소스

- `db/pupoo_schema_v6.6.sql`
- `pupoo_backend/src/main/java/com/popups/pupoo/report/**`
- `pupoo_backend/src/main/java/com/popups/pupoo/board/boardinfo/application/AdminModerationService.java`
- `pupoo_backend/src/main/java/com/popups/pupoo/board/boardinfo/api/AdminModerationController.java`
- `pupoo_backend/src/main/java/com/popups/pupoo/board/post/**`
- `pupoo_backend/src/main/java/com/popups/pupoo/board/review/**`
- `pupoo_backend/src/main/java/com/popups/pupoo/reply/**`
- `pupoo_backend/src/main/java/com/popups/pupoo/gallery/**`
- `pupoo_backend/src/main/java/com/popups/pupoo/board/bannedword/**`
- `pupoo_ai/app/features/moderation/**`
- `pupoo_ai/policy_docs/*.json`

## canonical 범위

이 문서가 다루는 콘텐츠 타입은 다음과 같다.

- POST
- REVIEW
- COMMENT
- GALLERY

단, 실제 DB와 백엔드 enum 기준에서 COMMENT는 단일 타입이 아니라 아래 두 타입으로 분리된다.

- `POST_COMMENT`
- `REVIEW_COMMENT`

따라서 운영 정책 문서에서는 사용자 설명상 `COMMENT`로 묶어도 되지만, 코드와 DB 기준 canonical 타입은 `POST_COMMENT`와 `REVIEW_COMMENT`다.

## 핵심 원칙

### 1. 신고 상태와 콘텐츠 상태는 분리한다

- 신고 상태는 `content_reports.status`로 관리한다.
- 콘텐츠 상태는 각 도메인 테이블의 상태 컬럼 또는 삭제 플래그로 관리한다.
- 신고가 `ACCEPTED`라고 해서 모든 콘텐츠가 같은 방식으로 숨김 처리되는 것은 아니다.

### 2. 자동 AI 모더레이션과 신고 기반 모더레이션은 별도 흐름이다

- 자동 AI 모더레이션은 생성/수정 시점의 사전 차단 흐름이다.
- 신고 기반 모더레이션은 저장된 콘텐츠에 대해 관리자 승인으로 상태를 바꾸는 사후 처리 흐름이다.

### 3. 관리자 판단 기준은 코드에 하드코딩되어 있지 않다

- 관리자는 신고를 `ACCEPT` 또는 `REJECT`로 결정한다.
- 코드가 강제하는 것은 상태 전이와 처리 액션뿐이다.
- 임계치, 신고 누적 수, AI 점수 기준으로 자동 승인되는 로직은 현재 코드에 없다.

## DB 상태값 매핑

### 신고 공통

| 구분 | DB 값 | 코드 enum |
| --- | --- | --- |
| 신고 대상 타입 | `POST`, `REVIEW`, `POST_COMMENT`, `REVIEW_COMMENT`, `GALLERY` | `ReportTargetType` |
| 신고 처리 상태 | `PENDING`, `ACCEPTED`, `REJECTED` | `ReportStatus` |

### POST

| 구분 | DB 값 | 코드 enum/필드 |
| --- | --- | --- |
| 게시글 상태 | `DRAFT`, `PUBLISHED`, `HIDDEN` | `PostStatus` |
| 삭제 여부 | `is_deleted` | `Post.deleted` |

### REVIEW

| 구분 | DB 값 | 코드 enum/필드 |
| --- | --- | --- |
| 리뷰 상태 | `PUBLIC`, `REPORTED`, `BLINDED`, `DELETED` | `ReviewStatus` |
| 삭제 여부 | `deleted` | `Review.deleted` |

### COMMENT

| 구분 | DB 값 | 코드 enum/필드 |
| --- | --- | --- |
| 댓글 대상 타입 | `POST_COMMENT`, `REVIEW_COMMENT` | `ReportTargetType` |
| 댓글 삭제 여부 | `is_deleted` | `PostComment.deleted`, `ReviewComment.deleted` |
| 응답용 상태 | `ACTIVE`, `DELETED` | `ReplyStatus` |

주의:

- `ReplyStatus.ACTIVE/DELETED`는 댓글 응답과 관리자 응답용 파생 상태다.
- 댓글 테이블에 별도 enum 상태 컬럼은 없고, 실질 상태는 `is_deleted`로 판정한다.

### GALLERY

| 구분 | DB 값 | 코드 enum |
| --- | --- | --- |
| 갤러리 상태 | `PUBLIC`, `PRIVATE`, `BLINDED`, `DELETED` | `GalleryStatus` |

## 콘텐츠 타입별 정책

### POST 정책

- 신고 생성 시 콘텐츠는 즉시 숨김 처리되지 않는다.
- 관리자 신고 수락 시 `HIDDEN`으로 전이된다.
- 관리자 복구 시 `PUBLISHED`로 돌아간다.
- 소프트 삭제는 `is_deleted=true`로 처리되며, 게시글 상태 enum에 `DELETED`는 없다.

정리:

- 신고 접수와 숨김 처리는 분리된다.
- POST는 신고 접수 단계에서 `REPORTED` 같은 중간 상태를 사용하지 않는다.

### REVIEW 정책

- 신고 생성 시 즉시 `REPORTED`로 전이된다.
- 관리자 신고 수락 시 `BLINDED`로 전이된다.
- 관리자 복구 시 `PUBLIC`으로 돌아간다.
- 소프트 삭제 시 `deleted=true`와 `review_status=DELETED`를 함께 사용한다.

정리:

- REVIEW만 신고 접수 시점의 중간 상태 `REPORTED`를 가진다.
- REVIEW는 POST와 달리 신고 접수 직후 상태 변화가 발생한다.

### COMMENT 정책

- 신고 대상은 `POST_COMMENT`와 `REVIEW_COMMENT`로 분리된다.
- 신고 생성 시 댓글은 즉시 숨김 처리되지 않는다.
- 관리자 신고 수락 시 `is_deleted=true`로 처리된다.
- 관리자 복구 시 `is_deleted=false`로 복구된다.
- 코드 응답에서는 `ACTIVE` 또는 `DELETED`로 표현된다.

정리:

- COMMENT는 사용자 정책 문서상 하나로 설명할 수 있지만, 구현 기준은 두 타입 분리다.
- 댓글 숨김은 별도 status enum이 아니라 soft delete 방식이다.

### GALLERY 정책

- 신고 생성은 `GalleryStatus.PUBLIC` 상태일 때만 허용된다.
- 관리자 신고 수락 시 `BLINDED`로 전이된다.
- 관리자 복구 시 `PUBLIC`으로 돌아간다.
- `DELETED` 상태 enum은 존재하지만, 현재 신고 수락 흐름에서는 블라인드 처리만 사용된다.

정리:

- GALLERY 신고 수락의 canonical 기본 액션은 `BLINDED`다.
- 현재 코드 기준 신고 처리 흐름에서 갤러리 삭제는 기본 정책이 아니다.

## 상태 전이 표

### 신고 상태 전이

| 대상 | 시작 | 이벤트 | 결과 |
| --- | --- | --- | --- |
| 공통 신고 | `PENDING` | 관리자 승인 | `ACCEPTED` |
| 공통 신고 | `PENDING` | 관리자 반려 | `REJECTED` |

주의:

- `ACCEPTED`와 `REJECTED`는 신고 레코드 상태다.
- 콘텐츠 상태 전이는 별도로 적용된다.

### 콘텐츠 상태 전이

| 콘텐츠 | 시작 상태 | 트리거 | 결과 상태 |
| --- | --- | --- | --- |
| POST | `PUBLISHED` | 관리자 신고 승인 / 관리자 hide | `HIDDEN` |
| POST | `HIDDEN` | 관리자 restore | `PUBLISHED` |
| POST | `PUBLISHED` 또는 `HIDDEN` | 소프트 삭제 | `is_deleted=true` |
| REVIEW | `PUBLIC` | 신고 접수 | `REPORTED` |
| REVIEW | `PUBLIC` 또는 `REPORTED` | 관리자 신고 승인 / 관리자 blind | `BLINDED` |
| REVIEW | `BLINDED` 또는 `REPORTED` | 관리자 restore | `PUBLIC` |
| REVIEW | 상태 무관 | 소프트 삭제 | `deleted=true`, `review_status=DELETED` |
| POST_COMMENT | `is_deleted=false` | 관리자 신고 승인 / 관리자 hide | `is_deleted=true` |
| POST_COMMENT | `is_deleted=true` | 관리자 restore | `is_deleted=false` |
| REVIEW_COMMENT | `is_deleted=false` | 관리자 신고 승인 / 관리자 hide | `is_deleted=true` |
| REVIEW_COMMENT | `is_deleted=true` | 관리자 restore | `is_deleted=false` |
| GALLERY | `PUBLIC` | 관리자 신고 승인 / 관리자 blind | `BLINDED` |
| GALLERY | `BLINDED` | 관리자 restore | `PUBLIC` |

## 처리 흐름

### 1. 신고 접수 흐름

공통 흐름:

1. 대상 콘텐츠 존재 여부 확인
2. 동일 사용자 중복 신고 여부 확인
3. `content_reports`에 `PENDING` 저장
4. 타입별 후속 처리 적용

타입별 차이:

- POST: 후속 상태 변화 없음
- REVIEW: 저장 직후 `REPORTED`
- POST_COMMENT: 후속 상태 변화 없음
- REVIEW_COMMENT: 후속 상태 변화 없음
- GALLERY: 후속 상태 변화 없음

### 2. 관리자 승인 흐름

실제 승인 처리 기준점은 `AdminReportService.accept(...)`다.

승인 시 처리:

- POST: `hidePost`
- REVIEW: `blindReview`
- POST_COMMENT: `hideReply(POST, ...)`
- REVIEW_COMMENT: `hideReply(REVIEW, ...)`
- GALLERY: `blindGallery`
- 이후 신고 상태를 `ACCEPTED`로 전환

### 3. 관리자 반려 흐름

실제 반려 처리 기준점은 `AdminReportService.reject(...)`다.

반려 시 처리:

- 신고 상태만 `REJECTED`로 전환
- 콘텐츠 복구/변경은 수행하지 않음

### 4. 복구 흐름

복구는 신고 반려와 별개다.

- POST 복구: `restorePost`
- REVIEW 복구: `restoreReview`
- COMMENT 복구: `restoreReply`
- GALLERY 복구: `restoreGallery`

즉, 이미 숨김 또는 블라인드된 콘텐츠는 별도 관리자 복구 액션이 있어야 원상 복귀된다.

## 자동 처리 vs 수동 처리

### 자동 AI 모더레이션

목적:

- 저장 전 차단

실제 동작:

- AI moderation API 응답이 `BLOCK`이면 저장을 막고 `BusinessException`을 던진다.
- 차단 시 `board_banned_logs` 기록 시도를 한다.
- 현재 `BannedWordService`는 차단 결과 로그 중심이며, 저장된 콘텐츠를 사후 블라인드 처리하지 않는다.

현재 코드 기준 적용 범위:

- POST: 생성, 수정에서 적용
- REVIEW: 생성에서 적용
- COMMENT: 생성에서 적용
- GALLERY: 적용 코드 확인되지 않음

주의:

- REVIEW 수정, COMMENT 수정, GALLERY 생성/수정에 대한 자동 AI 차단은 현재 확인되지 않았다.
- 따라서 자동 모더레이션 적용 범위는 콘텐츠 타입별로 완전히 대칭적이지 않다.

### 수동 신고 모더레이션

목적:

- 저장된 콘텐츠에 대한 사후 조치

실제 동작:

- 사용자 신고는 `content_reports`에 적재된다.
- 관리자 승인 시 콘텐츠 타입별 moderation action이 실행된다.
- 관리자 반려 시 신고 상태만 종료된다.

## 관리자 개입 지점

관리자 개입 지점은 두 축이다.

### 1. 신고 심사

- `/api/admin/reports/{reportId}`에서 `ACCEPT` 또는 `REJECT`
- 승인 시 콘텐츠 상태가 바뀐다.
- 반려 시 콘텐츠 상태는 유지된다.

### 2. 직접 모더레이션

- `/api/admin/moderation/posts/*`
- `/api/admin/moderation/reviews/*`
- `/api/admin/moderation/replies/*`

직접 모더레이션 가능 액션:

- POST: hide / restore / delete
- REVIEW: blind / restore / delete
- COMMENT: hide / restore / delete

갤러리 주의:

- 서비스에는 `blindGallery`, `restoreGallery`가 있으나, 현재 `AdminModerationController`에는 갤러리 전용 직접 모더레이션 엔드포인트가 없다.
- 현재 코드 기준 갤러리 블라인드의 주요 진입점은 신고 승인 흐름이다.

## 관리자 승인 기준

코드에 명시적으로 존재하는 승인 기준은 다음뿐이다.

- 관리자 요청이 들어와야 한다.
- 신고가 `PENDING`이어야 한다.
- 승인 시 콘텐츠 타입에 맞는 moderation action을 실행한다.

코드에 존재하지 않는 것:

- 신고 누적 수 기준 자동 승인
- AI 점수 기준 자동 승인
- 특정 사유 코드 기준 강제 승인

따라서 운영 기준 문서에서는 관리자 승인 사유와 판단 원칙을 따로 둘 수 있지만, 현재 코드의 canonical 기준은 "관리자 명시 승인"이다.

## 복구 정책

### POST

- `HIDDEN`은 관리자 복구로 `PUBLISHED`
- 소프트 삭제는 별도 복구 정책 문맥이 필요하나, 관리자 서비스의 `restorePost()`는 `deleted=false`와 `PUBLISHED` 복구를 함께 수행한다

### REVIEW

- `BLINDED` 또는 신고 중간 상태는 관리자 복구로 `PUBLIC`
- 소프트 삭제 리뷰도 `restoreReview()`가 `deleted=false`와 `PUBLIC`으로 복구한다

### COMMENT

- 숨김 댓글은 관리자 복구로 `ACTIVE` 파생 상태
- 실제 DB는 `is_deleted=false`

### GALLERY

- `BLINDED`는 관리자 복구로 `PUBLIC`

### 신고 반려와 복구의 관계

- `REJECTED`는 신고 레코드 종결 상태일 뿐이다
- 이미 블라인드된 콘텐츠를 자동 복구하지 않는다

## canonical 처리 요약

### POST

- 자동 AI 차단: 저장 전 거절 가능
- 신고 접수: `PENDING`
- 관리자 승인: `HIDDEN`
- 관리자 복구: `PUBLISHED`

### REVIEW

- 자동 AI 차단: 저장 전 거절 가능
- 신고 접수: `PENDING` + 콘텐츠 `REPORTED`
- 관리자 승인: `BLINDED`
- 관리자 복구: `PUBLIC`

### COMMENT

- 자동 AI 차단: 생성 시 저장 전 거절 가능
- 신고 접수: `PENDING`
- 관리자 승인: `is_deleted=true`
- 관리자 복구: `is_deleted=false`

### GALLERY

- 자동 AI 차단: 현재 코드 확인되지 않음
- 신고 접수: `PENDING`
- 관리자 승인: `BLINDED`
- 관리자 복구: `PUBLIC`

## 현재 코드와 정책 불일치

### 1. COMMENT 단일 타입 문서화와 실제 구현이 다르다

- 요구 설명은 `COMMENT`로 묶을 수 있으나,
- 실제 DB와 백엔드는 `POST_COMMENT`, `REVIEW_COMMENT`로 분리된다.

처리 원칙:

- canonical 문서와 운영 정책은 두 타입 분리를 기준으로 유지한다.

### 2. REVIEW만 신고 즉시 `REPORTED`로 바뀐다

- POST, COMMENT, GALLERY는 신고 접수만으로 콘텐츠 상태가 바뀌지 않는다.
- REVIEW만 신고 접수 즉시 상태 변화가 있다.

처리 원칙:

- 현재 canonical 정책은 구현 우선으로 REVIEW의 특수 흐름을 인정한다.

### 3. 신고 승인 실질 기준점은 `AdminReportService`인데, `ReportService.decide()`는 moderation action을 적용하지 않는다

- `AdminReportController`는 `AdminReportService`를 사용하므로 실제 관리자 승인 경로는 일관적이다.
- 그러나 `ReportService.decide()`는 신고 상태만 바꾸고 콘텐츠 상태는 바꾸지 않는다.

처리 원칙:

- canonical 기준의 실질 승인 서비스는 `AdminReportService`
- `ReportService.decide()`는 우회 경로 또는 정리 대상 mismatch로 본다.

### 4. 갤러리 직접 모더레이션 API가 비대칭이다

- 서비스에는 갤러리 blind/restore가 존재한다.
- 컨트롤러에는 갤러리 직접 모더레이션 endpoint가 없다.

처리 원칙:

- 현재 canonical 운영 경로는 "갤러리 신고 승인 중심"

### 5. 자동 AI 모더레이션 정책 소스가 단일 파일이 아니다

- `pupoo_ai/app/features/moderation/chunking.py`는 `policy_docs` 아래 모든 `.json`을 로드한다.
- 현재 `pupoo_ai/policy_docs`에는 `moderation_rules.json`, `moderation_rules_20260313.json` 두 파일이 공존한다.

처리 원칙:

- AI 정책 소스는 아직 단일 canonical 파일 상태가 아니다.
- 본 문서가 운영 canonical 문서이고, AI 정책 파일은 후속 정리 대상이다.

### 6. 자동 AI 차단 적용 범위가 타입별로 비대칭이다

- POST는 생성/수정에서 확인된다.
- REVIEW는 생성에서만 확인된다.
- COMMENT는 생성에서만 확인된다.
- GALLERY는 확인되지 않는다.

처리 원칙:

- 현재 canonical 문서는 "현재 구현 상태"를 기준으로 기록한다.
- 향후 정책 통합 시 자동 차단 적용 범위 정렬이 필요하다.

## 결론

현재 워크스페이스 기준 canonical moderation 정책은 다음으로 요약된다.

- 신고 상태는 `PENDING / ACCEPTED / REJECTED`
- 콘텐츠 상태 전이는 타입별로 다르다
- REVIEW만 신고 접수 즉시 `REPORTED`
- 관리자 승인 시 POST는 `HIDDEN`, REVIEW는 `BLINDED`, COMMENT는 `is_deleted=true`, GALLERY는 `BLINDED`
- 복구는 신고 반려가 아니라 별도 관리자 복구 액션으로 수행된다
- 자동 AI 모더레이션은 저장 전 차단 흐름이고, 신고 모더레이션은 저장 후 관리자 승인 흐름이다

이 문서를 기준으로 이후 정책 문서, AI 정책 JSON, 관리자 운영 문서를 정렬해야 한다.

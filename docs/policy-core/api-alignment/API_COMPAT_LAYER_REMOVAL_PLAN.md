# API_COMPAT_LAYER_REMOVAL_PLAN

## 현재 구조

- 백엔드 실제 공개 API 기준은 `/api/*` 이다.
- 프론트 공통 요청 계층은 [axiosInstance.js](C:\pupoo_workspace\pupoo_frontend\src\app\http\axiosInstance.js)와 [requestUrl.js](C:\pupoo_workspace\pupoo_frontend\src\shared\config\requestUrl.js)를 통해 `/api` 기준으로 URL을 조립한다.
- 프론트 배포 기준 API base URL은 [deploy.yml](C:\pupoo_workspace\.github\workflows\deploy.yml)과 [frontend_s3_cloudfront_deploy.md](C:\pupoo_workspace\docs\frontend_s3_cloudfront_deploy.md) 기준 `https://api.pupoo.site` 이다.
- k8s ingress도 [ingress.yaml](C:\pupoo_workspace\k8s\base\ingress.yaml)에서 `/api` Prefix 만 backend 로 전달한다.

## 중복 경로

- 제거 대상:
  - [ApiPrefixCompatibilityFilter.java](C:\pupoo_workspace\pupoo_backend\src\main\java\com\popups\pupoo\auth\security\web\ApiPrefixCompatibilityFilter.java)
  - [ApiPrefixCompatibilityFilterConfig.java](C:\pupoo_workspace\pupoo_backend\src\main\java\com\popups\pupoo\auth\security\web\ApiPrefixCompatibilityFilterConfig.java)
- 역할:
  - `/foo` 형태 요청을 내부적으로 `/api/foo` 로 rewrite 하던 호환 레이어
- 현재 상태:
  - 프론트 호출, 배포 ingress, 문서 기준 모두 `/api/*` 단일 경로 사용
  - 따라서 이 rewrite 레이어는 중복 호환성 코드다

## 제거 대상

- `ApiPrefixCompatibilityFilter`
- `ApiPrefixCompatibilityFilterConfig`

## 영향 분석

- 영향 없음:
  - 프론트 auth 호출
  - 프론트 일반 API 호출
  - refresh/auth cookie path
  - ingress `/api` 라우팅
- 영향 가능 영역:
  - 외부에서 `/api` 없이 직접 호출하던 오래된 비공식 클라이언트
- 판단 근거:
  - frontend_calls 기준 주요 실사용 경로는 모두 `/api/*`
  - 프론트 request 계층은 `/api/api` 중복 방지 로직까지 이미 포함
  - backend source 내 `ApiPrefixCompatibilityFilter` 잔여 참조 없음

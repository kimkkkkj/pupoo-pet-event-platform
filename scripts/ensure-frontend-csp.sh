#!/usr/bin/env bash

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if [[ -z "${FRONTEND_CF_DISTRIBUTION_ID:-}" ]]; then
  echo "FRONTEND_CF_DISTRIBUTION_ID is required" >&2
  exit 1
fi

FUNCTION_NAME="${FRONTEND_CSP_FUNCTION_NAME:-pupoo-frontend-csp}"
CANONICAL_FUNCTION_NAME="${FRONTEND_CANONICAL_HOST_FUNCTION_NAME:-pupoo-frontend-canonical-host}"
REPORT_URI="${FRONTEND_CSP_REPORT_URI:-https://api.pupoo.site/api/security/csp/report}"
CANONICAL_HOST="${FRONTEND_CANONICAL_HOST:-www.pupoo.site}"
REDIRECT_SOURCE_HOST="${FRONTEND_REDIRECT_SOURCE_HOST:-pupoo.site}"
CSP_MODE="${FRONTEND_CSP_MODE:-enforce}"
CSP_POLICY="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-eval' 'report-sample' https://dapi.kakao.com https://t1.daumcdn.net; style-src 'self' 'unsafe-inline' 'report-sample' https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://cdn.pupoo.site https://images.unsplash.com https://k.kakaocdn.net https://*.kakaocdn.net https://phinf.pstatic.net https://lh3.googleusercontent.com https://t1.daumcdn.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; connect-src 'self' https://api.pupoo.site https://dapi.kakao.com; frame-src 'self' https://maps.google.com https://www.google.com; media-src 'self' blob: https://cdn.pupoo.site; worker-src 'self' blob:; manifest-src 'self'; report-uri ${REPORT_URI}; upgrade-insecure-requests"

case "${CSP_MODE}" in
  enforce)
    response_header_name="content-security-policy"
    stale_header_name="content-security-policy-report-only"
    function_comment="PUPOO frontend CSP enforce header injection"
    ;;
  report-only)
    response_header_name="content-security-policy-report-only"
    stale_header_name="content-security-policy"
    function_comment="PUPOO frontend CSP report-only header injection"
    ;;
  *)
    echo "FRONTEND_CSP_MODE must be 'enforce' or 'report-only'" >&2
    exit 1
    ;;
esac

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

function_code_file="${workdir}/frontend-csp.js"
canonical_function_code_file="${workdir}/frontend-canonical-host.js"
distribution_config_file="${workdir}/distribution-config.json"

csp_js_literal="$(jq -Rn --arg value "${CSP_POLICY}" '$value')"
response_header_name_literal="$(jq -Rn --arg value "${response_header_name}" '$value')"
stale_header_name_literal="$(jq -Rn --arg value "${stale_header_name}" '$value')"
canonical_host_js_literal="$(jq -Rn --arg value "${CANONICAL_HOST}" '$value')"
redirect_source_host_js_literal="$(jq -Rn --arg value "${REDIRECT_SOURCE_HOST}" '$value')"

cat > "${function_code_file}" <<EOF
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  var contentTypeHeader = headers["content-type"];
  var contentType = contentTypeHeader && contentTypeHeader.value ? contentTypeHeader.value.toLowerCase() : "";

  if (contentType.indexOf("text/html") === -1) {
    return response;
  }

  delete headers[${stale_header_name_literal}];
  headers[${response_header_name_literal}] = { value: ${csp_js_literal} };
  return response;
}
EOF

cat > "${canonical_function_code_file}" <<EOF
function serializeQueryString(querystring) {
  if (!querystring) {
    return "";
  }

  var parts = [];
  for (var key in querystring) {
    if (!Object.prototype.hasOwnProperty.call(querystring, key)) {
      continue;
    }

    var entry = querystring[key];
    if (entry && Array.isArray(entry.multiValue) && entry.multiValue.length > 0) {
      for (var i = 0; i < entry.multiValue.length; i += 1) {
        var item = entry.multiValue[i];
        parts.push(item && item.value !== undefined && item.value !== ""
          ? key + "=" + item.value
          : key);
      }
      continue;
    }

    if (entry && entry.value !== undefined && entry.value !== "") {
      parts.push(key + "=" + entry.value);
      continue;
    }

    parts.push(key);
  }

  return parts.length > 0 ? "?" + parts.join("&") : "";
}

function handler(event) {
  var request = event.request;
  var headers = request.headers || {};
  var hostHeader = headers.host;
  var host = hostHeader && hostHeader.value ? hostHeader.value.toLowerCase() : "";

  if (host !== ${redirect_source_host_js_literal}) {
    return request;
  }

  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: {
      location: {
        value: "https://" + ${canonical_host_js_literal} + request.uri + serializeQueryString(request.querystring)
      },
      "cache-control": {
        value: "public, max-age=300"
      }
    }
  };
}
EOF

if aws cloudfront describe-function --name "${FUNCTION_NAME}" --stage DEVELOPMENT > "${workdir}/response-function-development.json" 2>/dev/null; then
  function_etag="$(jq -r '.ETag' "${workdir}/response-function-development.json")"
  aws cloudfront update-function \
    --name "${FUNCTION_NAME}" \
    --if-match "${function_etag}" \
    --function-config Comment="${function_comment}",Runtime=cloudfront-js-2.0 \
    --function-code "fileb://${function_code_file}" >/dev/null
else
  aws cloudfront create-function \
    --name "${FUNCTION_NAME}" \
    --function-config Comment="${function_comment}",Runtime=cloudfront-js-2.0 \
    --function-code "fileb://${function_code_file}" >/dev/null
fi

publish_etag="$(aws cloudfront describe-function --name "${FUNCTION_NAME}" --stage DEVELOPMENT --query 'ETag' --output text)"
aws cloudfront publish-function --name "${FUNCTION_NAME}" --if-match "${publish_etag}" >/dev/null

function_arn="$(aws cloudfront describe-function --name "${FUNCTION_NAME}" --stage LIVE --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)"

if aws cloudfront describe-function --name "${CANONICAL_FUNCTION_NAME}" --stage DEVELOPMENT > "${workdir}/canonical-function-development.json" 2>/dev/null; then
  canonical_function_etag="$(jq -r '.ETag' "${workdir}/canonical-function-development.json")"
  aws cloudfront update-function \
    --name "${CANONICAL_FUNCTION_NAME}" \
    --if-match "${canonical_function_etag}" \
    --function-config Comment="PUPOO frontend canonical host redirect",Runtime=cloudfront-js-2.0 \
    --function-code "fileb://${canonical_function_code_file}" >/dev/null
else
  aws cloudfront create-function \
    --name "${CANONICAL_FUNCTION_NAME}" \
    --function-config Comment="PUPOO frontend canonical host redirect",Runtime=cloudfront-js-2.0 \
    --function-code "fileb://${canonical_function_code_file}" >/dev/null
fi

canonical_publish_etag="$(aws cloudfront describe-function --name "${CANONICAL_FUNCTION_NAME}" --stage DEVELOPMENT --query 'ETag' --output text)"
aws cloudfront publish-function --name "${CANONICAL_FUNCTION_NAME}" --if-match "${canonical_publish_etag}" >/dev/null

canonical_function_arn="$(aws cloudfront describe-function --name "${CANONICAL_FUNCTION_NAME}" --stage LIVE --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)"

distribution_json="$(aws cloudfront get-distribution-config --id "${FRONTEND_CF_DISTRIBUTION_ID}" --output json)"
distribution_etag="$(jq -r '.ETag' <<< "${distribution_json}")"
current_function_arn="$(jq -r '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[]? | select(.EventType == "viewer-response") | .FunctionARN' <<< "${distribution_json}")"
current_canonical_function_arn="$(jq -r '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[]? | select(.EventType == "viewer-request") | .FunctionARN' <<< "${distribution_json}")"

if [[ "${current_function_arn}" != "${function_arn}" || "${current_canonical_function_arn}" != "${canonical_function_arn}" ]]; then
  jq --arg function_arn "${function_arn}" --arg canonical_function_arn "${canonical_function_arn}" \
    '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations = (
      (.DistributionConfig.DefaultCacheBehavior.FunctionAssociations // {Quantity: 0, Items: []})
      | .Items = (
          ((.Items // []) | map(select(.EventType != "viewer-response" and .EventType != "viewer-request")))
          + [
              {EventType: "viewer-request", FunctionARN: $canonical_function_arn},
              {EventType: "viewer-response", FunctionARN: $function_arn}
            ]
        )
      | .Quantity = (.Items | length)
    ) | .DistributionConfig' \
    <<< "${distribution_json}" > "${distribution_config_file}"

  aws cloudfront update-distribution \
    --id "${FRONTEND_CF_DISTRIBUTION_ID}" \
    --if-match "${distribution_etag}" \
    --distribution-config "file://${distribution_config_file}" >/dev/null

  aws cloudfront wait distribution-deployed --id "${FRONTEND_CF_DISTRIBUTION_ID}"
fi

echo "Applied CloudFront functions ${CANONICAL_FUNCTION_NAME} (${canonical_function_arn}) and ${FUNCTION_NAME} (${function_arn}) to distribution ${FRONTEND_CF_DISTRIBUTION_ID} with CSP mode ${CSP_MODE}"

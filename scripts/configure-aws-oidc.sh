#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "${name} is required" >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "${name}" >/dev/null 2>&1; then
    echo "${name} is required" >&2
    exit 1
  fi
}

require_env AWS_DEPLOY_ROLE_ARN
require_env AWS_REGION
require_env ACTIONS_ID_TOKEN_REQUEST_URL
require_env ACTIONS_ID_TOKEN_REQUEST_TOKEN
require_env GITHUB_ENV
require_command aws
require_command curl
require_command python3

audience="sts.amazonaws.com"
request_separator="&"
if [[ "${ACTIONS_ID_TOKEN_REQUEST_URL}" != *"?"* ]]; then
  request_separator="?"
fi

oidc_response="$(curl -fsSL \
  -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
  "${ACTIONS_ID_TOKEN_REQUEST_URL}${request_separator}audience=${audience}")"

oidc_token="$(printf '%s' "${oidc_response}" | python3 -c 'import json, sys; data = json.load(sys.stdin); print(data.get("value") or data.get("token") or "")')"
if [[ -z "${oidc_token}" ]]; then
  echo "Failed to resolve GitHub OIDC token" >&2
  exit 1
fi

session_name="${AWS_ROLE_SESSION_NAME:-GitHubActions-${GITHUB_RUN_ID:-manual}-${GITHUB_JOB:-job}}"
session_name="${session_name//[^A-Za-z0-9+=,.@_-]/-}"
role_duration="${AWS_ROLE_DURATION_SECONDS:-3600}"

assume_role_response="$(aws sts assume-role-with-web-identity \
  --role-arn "${AWS_DEPLOY_ROLE_ARN}" \
  --role-session-name "${session_name}" \
  --web-identity-token "${oidc_token}" \
  --duration-seconds "${role_duration}" \
  --output json)"

export_values="$(printf '%s' "${assume_role_response}" | python3 -c 'import json, sys; data = json.load(sys.stdin); creds = data["Credentials"]; print(creds["AccessKeyId"]); print(creds["SecretAccessKey"]); print(creds["SessionToken"]); print(creds["Expiration"])')"

mapfile -t credential_lines <<< "${export_values}"
access_key_id="${credential_lines[0]:-}"
secret_access_key="${credential_lines[1]:-}"
session_token="${credential_lines[2]:-}"
expiration="${credential_lines[3]:-}"

if [[ -z "${access_key_id}" || -z "${secret_access_key}" || -z "${session_token}" ]]; then
  echo "Failed to assume AWS role with GitHub OIDC" >&2
  exit 1
fi

echo "::add-mask::${access_key_id}"
echo "::add-mask::${secret_access_key}"
echo "::add-mask::${session_token}"

{
  printf 'AWS_ACCESS_KEY_ID=%s\n' "${access_key_id}"
  printf 'AWS_SECRET_ACCESS_KEY=%s\n' "${secret_access_key}"
  printf 'AWS_SESSION_TOKEN=%s\n' "${session_token}"
  printf 'AWS_REGION=%s\n' "${AWS_REGION}"
  printf 'AWS_DEFAULT_REGION=%s\n' "${AWS_REGION}"
} >> "${GITHUB_ENV}"

echo "Configured AWS credentials via GitHub OIDC for ${AWS_DEPLOY_ROLE_ARN} until ${expiration}"

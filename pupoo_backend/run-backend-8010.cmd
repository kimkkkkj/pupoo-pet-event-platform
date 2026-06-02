@echo off
set AI_SERVICE_BASE_URL=http://localhost:8010
set AI_SERVICE_INTERNAL_TOKEN=dev-internal-token
cd /d C:\pupoo_workspace\popups\pupoo_backend
gradlew.bat bootRun --args="--ai.service.base-url=http://localhost:8010 --ai.service.internal-token=dev-internal-token" 1>run-logs\backend.out.log 2>run-logs\backend.err.log

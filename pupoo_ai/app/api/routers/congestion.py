"""내부 혼잡도 예측 API 라우터.

기능:
- 행사/프로그램 혼잡도 예측과 대체 프로그램 추천 엔드포인트를 제공한다.

설명:
- 내부 토큰 검증 후 prediction_service의 계산 결과만 응답 규격에 맞춰 감싼다.

흐름:
- 내부 인증 -> DTO 검증 -> 예측 서비스 호출 -> success_response 반환
"""

from fastapi import APIRouter, Depends

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.constants import INTERNAL_API_PREFIX
from pupoo_ai.app.core.responses import success_response
from pupoo_ai.app.features.congestion.dto.prediction_models import (
    EventPredictionRequest,
    ProgramPredictionRequest,
    ProgramRecommendationRequest,
)
from pupoo_ai.app.features.congestion.service.prediction_service import (
    predict_event,
    predict_program,
    recommend_programs,
)

router = APIRouter(tags=["congestion"])


@router.post(f"{INTERNAL_API_PREFIX}/congestion/events/predict")
async def predict_event_congestion(
    request: EventPredictionRequest,
    _: None = Depends(verify_internal_token),
):
    # 기능: 행사 단위 혼잡도 예측 결과를 반환한다.
    # 설명: 인증된 내부 요청만 받아 예측 계산 결과를 공통 응답으로 감싼다.
    # 흐름: 토큰 검증 -> predict_event 호출 -> success_response 반환.
    result = predict_event(request)
    return success_response(result.model_dump(mode="json"))


@router.post(f"{INTERNAL_API_PREFIX}/congestion/programs/predict")
async def predict_program_congestion(
    request: ProgramPredictionRequest,
    _: None = Depends(verify_internal_token),
):
    # 기능: 프로그램 단위 혼잡도 예측 결과를 반환한다.
    # 설명: 개별 프로그램 입력값을 바탕으로 평균/피크 혼잡도와 대기 시간을 계산한다.
    # 흐름: 토큰 검증 -> predict_program 호출 -> success_response 반환.
    result = predict_program(request)
    return success_response(result.model_dump(mode="json"))


@router.post(f"{INTERNAL_API_PREFIX}/congestion/programs/recommendations")
async def recommend_program_congestion(
    request: ProgramRecommendationRequest,
    _: None = Depends(verify_internal_token),
):
    # 기능: 현재 프로그램을 대체할 추천 프로그램 목록을 반환한다.
    # 설명: 혼잡도 임계치를 넘는 경우에만 대체 후보를 정렬해서 추천한다.
    # 흐름: 토큰 검증 -> recommend_programs 호출 -> success_response 반환.
    result = recommend_programs(request)
    return success_response(result.model_dump(mode="json"))

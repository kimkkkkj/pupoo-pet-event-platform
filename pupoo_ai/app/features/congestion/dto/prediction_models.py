from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


TargetType = Literal["EVENT", "PROGRAM"]


class EventPredictionRequest(BaseModel):
    eventId: int
    baseTime: datetime
    eventStartAt: datetime
    eventEndAt: datetime
    entryCount: int = Field(default=0, ge=0)
    checkoutCount: int = Field(default=0, ge=0)
    activeApplyCount: int = Field(default=0, ge=0)
    preRegisteredCount: int = Field(default=0, ge=0)
    approvedRegistrationCount: int = Field(default=0, ge=0)
    participantCount: int = Field(default=0, ge=0)
    currentInsideCount: int = Field(default=0, ge=0)
    runningProgramCount: int = Field(default=0, ge=0)
    totalProgramCount: int = Field(default=0, ge=0)
    totalWaitCount: int = Field(default=0, ge=0)
    averageWaitMinutes: float = Field(default=0.0, ge=0.0)
    capacityBaseline: int = Field(default=0, ge=0)
    waitBaseline: int = Field(default=0, ge=0)
    targetWaitMin: int = Field(default=0, ge=0)
    registrationForecastScore: float = Field(default=0.0, ge=0.0, le=100.0)
    endedBaselineScore: float = Field(default=0.0, ge=0.0, le=100.0)
    ongoingBaselineScore: float = Field(default=0.0, ge=0.0, le=100.0)
    locationDemandScore: float = Field(default=0.0, ge=0.0, le=100.0)
    eventLocation: str | None = None
    applicationTrendScore: float = Field(default=50.0, ge=0.0, le=100.0)
    applyConversionScore: float = Field(default=50.0, ge=0.0, le=100.0)
    queueOperationScore: float = Field(default=50.0, ge=0.0, le=100.0)
    zoneDensityScore: float = Field(default=50.0, ge=0.0, le=100.0)
    stayTimeScore: float = Field(default=50.0, ge=0.0, le=100.0)
    manualCongestionScore: float = Field(default=50.0, ge=0.0, le=100.0)
    revisitScore: float = Field(default=50.0, ge=0.0, le=100.0)
    voteHeatScore: float = Field(default=50.0, ge=0.0, le=100.0)
    paymentIntentScore: float = Field(default=50.0, ge=0.0, le=100.0)
    inputSequence: list[float] = Field(default_factory=list)


class ProgramPredictionRequest(BaseModel):
    eventId: int
    programId: int
    baseTime: datetime
    programStartAt: datetime
    programEndAt: datetime
    activeApplyCount: int = Field(default=0, ge=0)
    checkinCount: int = Field(default=0, ge=0)
    waitCount: int = Field(default=0, ge=0)
    waitMinutes: float = Field(default=0.0, ge=0.0)
    programCapacity: int = Field(default=0, ge=0)
    throughputPerMin: float = Field(default=0.0, ge=0.0)
    targetWaitMin: int = Field(default=0, ge=0)
    category: str | None = None
    target: str | None = None
    zone: str | None = None
    inputSequence: list[float] = Field(default_factory=list)


class RecommendationProgramInput(BaseModel):
    programId: int
    eventId: int
    title: str
    category: str | None = None
    target: str | None = None
    zone: str | None = None
    startAt: datetime
    endAt: datetime
    predictedScore: float = Field(ge=0.0, le=100.0)
    predictedWaitMinutes: int = Field(default=0, ge=0)


class ProgramRecommendationRequest(BaseModel):
    eventId: int
    programId: int
    baseTime: datetime
    thresholdScore: float = Field(default=75.0, ge=0.0, le=100.0)
    currentProgram: RecommendationProgramInput
    candidates: list[RecommendationProgramInput] = Field(default_factory=list)


class TimelinePoint(BaseModel):
    time: datetime
    score: float
    level: int
    waitMinutes: int


class PredictionResult(BaseModel):
    targetType: TargetType
    eventId: int
    programId: int | None = None
    baseTime: datetime
    predictedAvgScore: float
    predictedPeakScore: float
    predictedLevel: int
    predictedWaitMinutes: int
    confidence: float
    lstmPredictedAvgScore: float | None = None
    fallbackUsed: bool = False
    timeline: list[TimelinePoint] = Field(default_factory=list)


class RecommendationItem(BaseModel):
    programId: int
    eventId: int
    title: str
    category: str | None = None
    target: str | None = None
    zone: str | None = None
    startAt: datetime
    endAt: datetime
    predictedScore: float
    predictedLevel: int
    predictedWaitMinutes: int
    reason: str


class RecommendationResult(BaseModel):
    eventId: int
    programId: int
    thresholdScore: float
    fallbackUsed: bool
    message: str
    recommendations: list[RecommendationItem] = Field(default_factory=list)

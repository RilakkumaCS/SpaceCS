import os
import random
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Tuple, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# =========================
# 0) 서버 & CORS
# =========================
app = FastAPI(title="Space Mission Backend", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 개발 중엔 전체 허용 (배포 시 도메인 제한 권장)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "Space Mission Backend",
        "version": "1.1.0",
        "endpoints": ["/health", "/preset", "/predict", "/docs"]
    }

# =========================
# 1) 모델 로드
# =========================
MODEL_PATH = os.getenv("MODEL_PATH", "rf_success_model.pkl")
try:
    pipe = joblib.load(MODEL_PATH)
    print(f"[INFO] Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    pipe = None
    print(f"[WARN] Could not load model from '{MODEL_PATH}': {e}")

# =========================
# 1-1) CSV 기반 feature 범위 로드 & 유틸
# =========================
CSV_RANGE_PATH = os.getenv("CSV_RANGE_PATH", "./CSV_numeric_min_max_summary.csv")
FEATURE_RANGES: Dict[str, Tuple[float, float]] = {}  # {"feature_name": (min, max)}

def load_feature_ranges(csv_path: str = CSV_RANGE_PATH) -> None:
    """
    CSV에서 (feature, min, max) 읽어 FEATURE_RANGES에 저장.
    CSV에 없는 항목은 FEATURE_RANGES에 없도록 둠(=폴백 됨).
    """
    global FEATURE_RANGES
    try:
        df = pd.read_csv(csv_path)
        ranges = {}
        for _, r in df.iterrows():
            f = str(r["feature"])
            fmin, fmax = float(r["min"]), float(r["max"])
            if fmin > fmax:  # 방어
                fmin, fmax = fmax, fmin
            ranges[f] = (fmin, fmax)
        FEATURE_RANGES = ranges
        print(f"[INFO] Loaded feature ranges from {csv_path}: {len(FEATURE_RANGES)} items")
    except Exception as e:
        FEATURE_RANGES = {}
        print(f"[WARN] Could not load feature ranges from '{csv_path}': {e}")

def clamp_feature(name: str, value: float) -> float:
    """해당 feature가 CSV에 있으면 그 범위로 클램프, 없으면 원값 반환."""
    if name in FEATURE_RANGES:
        fmin, fmax = FEATURE_RANGES[name]
        return float(np.clip(value, fmin, fmax))
    return float(value)

def rand_in_range(name: str, rng: np.random.Generator, decimals: Optional[int] = None) -> Optional[float]:
    """CSV 범위에서 균등 랜덤 생성. CSV에 없으면 None 반환(=폴백 사용)."""
    if name not in FEATURE_RANGES:
        return None
    fmin, fmax = FEATURE_RANGES[name]
    if fmin == fmax:
        val = fmin
    else:
        val = rng.uniform(fmin, fmax)
    if decimals is None:
        return float(val)
    return float(round(val, decimals))

# 서버 기동 시 1회 로드
load_feature_ranges()

# =========================
# 2) 데이터 스키마 정의
# =========================
class MissionInput(BaseModel):
    payload_tons: float = Field(ge=0, description="실을 무게(톤). 모델 입력에는 직접 쓰지 않음, 페널티 계산용.")
    mission_type: str = Field(default="Exploration")
    target_type: str = Field(default="Planet")
    launch_vehicle: str = Field(default="Starship")
    distance_ly: float = Field(default=45.0, ge=0)
    duration_years: float = Field(default=12.0, ge=0)
    science_pts: float = Field(default=60.0, ge=0)
    crew_size: int = Field(default=10, ge=1)
    fuel_tons: float = Field(default=3000.0, ge=0)
    clamp_min: float = Field(default=0.0)
    clamp_max: float = Field(default=100.0)

class PredictionOut(BaseModel):
    success_raw: float
    success_final: float
    applied_penalty: float
    is_success: bool
    features_used: dict

# =========================
# 3) 무게에 따른 간접 영향 함수
# =========================
def apply_payload_effects(payload_tons: float, duration_years: float, science_pts: float, fuel_tons: float):
    """
    무게가 커질수록 임무기간↑, 연료소모↑, 과학효율↓
    (모델에는 직접 들어가지 않고 feature 수정에 반영)
    """
    duration_adj = duration_years + 0.10 * payload_tons
    fuel_adj = fuel_tons + 2.0 * payload_tons
    science_adj = max(0.0, science_pts - 0.30 * payload_tons)
    return duration_adj, science_adj, fuel_adj

# =========================
# 4) 엔드포인트: 헬스체크
# =========================
@app.get("/health")
def health():
    """서버 상태 확인"""
    return {"status": "ok", "model_loaded": pipe is not None, "ranges_loaded": len(FEATURE_RANGES) > 0}

# =========================
# 5) 엔드포인트: 미션 성공률 예측 (CSV 범위로 최종 클램프 보장)
# =========================
@app.post("/predict", response_model=PredictionOut)
def predict(m: MissionInput):
    """미션 성공률 예측"""
    if pipe is None:
        return PredictionOut(
            success_raw=0.0,
            success_final=0.0,
            applied_penalty=0.0,
            is_success=False,
            features_used={"error": f"Model not loaded from {MODEL_PATH}"},
        )

    # (A) 숫자 입력을 CSV 범위로 클램프
    # ⚠️ payload_tons -> CSV 컬럼명으로 맞춤
    payload        = clamp_feature("Payload Weight (tons)", m.payload_tons)
    distance_ly    = clamp_feature("Distance from Earth (light-years)", m.distance_ly)
    duration_years = clamp_feature("Mission Duration (years)", m.duration_years)
    science_pts    = clamp_feature("Scientific Yield (points)", m.science_pts)
    crew_size      = int(round(clamp_feature("Crew Size", float(m.crew_size))))
    fuel_tons      = clamp_feature("Fuel Consumption (tons)", m.fuel_tons)

    # (B) 무게 간접 효과 반영 (클램프된 값 기준)
    dur, sci, fuel = apply_payload_effects(payload, duration_years, science_pts, fuel_tons)

    # (C) 모델 입력 구성
    features = {
        "Mission Type": m.mission_type,
        "Target Type": m.target_type,
        "Launch Vehicle": m.launch_vehicle,
        "Distance from Earth (light-years)": float(distance_ly),
        "Mission Duration (years)": float(dur),
        "Scientific Yield (points)": float(sci),
        "Crew Size": int(crew_size),
        "Fuel Consumption (tons)": float(fuel),
    }

    X = pd.DataFrame([features])
    success_raw = float(pipe.predict(X)[0])

    # (D) 페널티 및 최종 성공률 클립 (0~100)
    penalty = 0.4 * payload
    # penalty = 0.25 * m.payload_tons + 5 * np.log1p(m.payload_tons)
    success_final = float(np.clip(success_raw - penalty, m.clamp_min, m.clamp_max))

    THRESHOLD = 80.0
    is_success = bool(success_final >= THRESHOLD)

    # (E) 결과 반환
    return PredictionOut(
        success_raw=round(success_raw, 4),
        success_final=round(success_final, 4),
        applied_penalty=round(penalty, 4),
        is_success=is_success,
        features_used=features,
    )

# =========================
# 6) 엔드포인트: 랜덤 미션 프리셋 생성 (CSV 범위 기반)
# =========================
MISSION_TYPES  = ["Exploration", "Research", "Mining", "Colonization"]
TARGET_TYPES   = ["Planet", "Moon", "Asteroid", "Exoplanet", "Star"]
LAUNCHERS      = ["Starship", "Falcon Heavy", "SLS", "Ariane 6"]

def random_preset(seed: Optional[int] = None) -> dict:
    """
    CSV의 각 feature(min~max)에서 균등 랜덤 생성.
    CSV에 해당 feature가 없으면 기존 기본 범위로 폴백.
    """
    # 지역 난수 생성기(전역 시드 영향 방지)
    rng = np.random.default_rng(seed)
    rnd = random.Random(seed) if seed is not None else random

    # ⚠️ payload_tons -> CSV 컬럼명으로 맞춤
    payload = rand_in_range("Payload Weight (tons)", rng, decimals=1)
    if payload is None:
        payload = float(np.round(rng.uniform(5, 80), 1))

    dist = rand_in_range("Distance from Earth (light-years)", rng, decimals=1)
    if dist is None:
        dist = float(np.round(rng.uniform(5, 200), 1))

    dur = rand_in_range("Mission Duration (years)", rng, decimals=1)
    if dur is None:
        dur = float(np.round(rng.uniform(3, 20), 1))

    sci = rand_in_range("Scientific Yield (points)", rng, decimals=1)
    if sci is None:
        sci = float(np.round(rng.uniform(20, 100), 1))

    crew_f = rand_in_range("Crew Size", rng, decimals=None)
    if crew_f is None:
        crew_f = rng.integers(4, 20)
    crew = int(round(crew_f))

    fuel = rand_in_range("Fuel Consumption (tons)", rng, decimals=None)
    if fuel is None:
        fuel = float(np.round(rng.uniform(1000, 8000), 0))
    else:
        fuel = float(round(fuel, 0))

    return {
        "payload_tons": payload,
        "mission_type": rnd.choice(MISSION_TYPES),
        "target_type": rnd.choice(TARGET_TYPES),
        "launch_vehicle": rnd.choice(LAUNCHERS),
        "distance_ly": dist,
        "duration_years": dur,
        "science_pts": sci,
        "crew_size": crew,
        "fuel_tons": fuel,
        "clamp_min": 0.0,
        "clamp_max": 100.0,
    }

@app.get("/preset")
def preset(seed: int | None = Query(default=None)):
    """랜덤 초기 미션값 제공 (CSV 범위 내 보장, seed 주면 재현 가능)"""
    return random_preset(seed)
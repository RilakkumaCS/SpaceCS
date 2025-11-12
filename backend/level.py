import os
import random
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# =========================
# 0) 서버 & CORS
# =========================
app = FastAPI(title="Space Mission Backend", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    features_used: dict

# =========================
# 3) 무게 간접 영향 반영
# =========================
def apply_payload_effects(payload_tons: float, duration_years: float, science_pts: float, fuel_tons: float):
    """payload가 클수록 기간↑, 연료소모↑, 과학효율↓"""
    duration_adj = duration_years + 0.10 * payload_tons
    fuel_adj = fuel_tons + 2.0 * payload_tons
    science_adj = max(0.0, science_pts - 0.30 * payload_tons)
    return duration_adj, science_adj, fuel_adj

# =========================
# 4) 헬스체크
# =========================
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": pipe is not None}

# =========================
# 5) 미션 성공률 예측
# =========================
@app.post("/predict", response_model=PredictionOut)
def predict(m: MissionInput):
    if pipe is None:
        return PredictionOut(
            success_raw=0.0,
            success_final=0.0,
            applied_penalty=0.0,
            features_used={"error": f"Model not loaded from {MODEL_PATH}"},
        )

    # (1) 무게 간접 영향 적용
    dur, sci, fuel = apply_payload_effects(m.payload_tons, m.duration_years, m.science_pts, m.fuel_tons)

    # (2) 모델 입력 구성
    features = {
        "Mission Type": m.mission_type,
        "Target Type": m.target_type,
        "Launch Vehicle": m.launch_vehicle,
        "Distance from Earth (light-years)": float(m.distance_ly),
        "Mission Duration (years)": float(dur),
        "Scientific Yield (points)": float(sci),
        "Crew Size": int(m.crew_size),
        "Fuel Consumption (tons)": float(fuel),
    }

    X = pd.DataFrame([features])
    success_raw = float(pipe.predict(X)[0])

    # (3) 고정 페널티: 무게 1톤당 0.4% 감소
    penalty = 0.4 * m.payload_tons
    success_final = float(np.clip(success_raw - penalty, m.clamp_min, m.clamp_max))

    return PredictionOut(
        success_raw=round(success_raw, 4),
        success_final=round(success_final, 4),
        applied_penalty=round(penalty, 4),
        features_used=features,
    )

# =========================
# 6) 난이도별 랜덤 프리셋 생성
# =========================
MISSION_TYPES  = ["Exploration", "Research", "Mining", "Colonization"]
TARGET_TYPES   = ["Planet", "Moon", "Asteroid", "Exoplanet", "Star"]
LAUNCHERS      = ["Starship", "Falcon Heavy", "SLS", "Ariane 6"]

def random_preset(difficulty: str = "normal", seed: int | None = None) -> dict:
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    difficulty = difficulty.lower()
    if difficulty not in ["easy", "normal", "hard"]:
        difficulty = "normal"

    if difficulty == "easy":
        payload_range = (5, 30)
        distance_range = (5, 80)
        duration_range = (3, 10)
        fuel_range = (1000, 4000)
        science_range = (50, 100)
        crew_range = (8, 20)
    elif difficulty == "normal":
        payload_range = (10, 60)
        distance_range = (40, 150)
        duration_range = (6, 15)
        fuel_range = (2000, 6000)
        science_range = (30, 90)
        crew_range = (6, 15)
    else:  # hard
        payload_range = (40, 100)
        distance_range = (100, 250)
        duration_range = (10, 25)
        fuel_range = (4000, 9000)
        science_range = (10, 70)
        crew_range = (4, 12)

    return {
        "difficulty": difficulty,
        "payload_tons": float(np.round(np.random.uniform(*payload_range), 1)),
        "mission_type": random.choice(MISSION_TYPES),
        "target_type": random.choice(TARGET_TYPES),
        "launch_vehicle": random.choice(LAUNCHERS),
        "distance_ly": float(np.round(np.random.uniform(*distance_range), 1)),
        "duration_years": float(np.round(np.random.uniform(*duration_range), 1)),
        "science_pts": float(np.round(np.random.uniform(*science_range), 1)),
        "crew_size": int(np.random.randint(*crew_range)),
        "fuel_tons": float(np.round(np.random.uniform(*fuel_range), 0)),
        "clamp_min": 0.0,
        "clamp_max": 100.0,
    }

@app.get("/preset")
def preset(
    difficulty: str = Query(default="normal", description="easy, normal, hard 중 선택"),
    seed: int | None = Query(default=None)
):
    """난이도별 랜덤 초기 미션 생성 (seed 주면 재현 가능)"""
    return random_preset(difficulty, seed)

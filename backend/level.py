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
app = FastAPI(title="Space Mission Backend", version="1.2.0")
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
        "version": "1.2.0",
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

# ===== (1) 성공 임계값: 0~1 스케일, 기본 0.5 =====
SUCCESS_THRESHOLD_PERCENT = float(os.getenv("SUCCESS_THRESHOLD_PERCENT", "50.0"))

# =========================
# 1-1) CSV 기반 feature 범위 로드 & 유틸
# =========================
CSV_RANGE_PATH = os.getenv("CSV_RANGE_PATH", "CSV_numeric_min_max_summary.csv")
FEATURE_RANGES: Dict[str, Tuple[float, float]] = {}  # {"feature_name": (min, max)}

def load_feature_ranges(csv_path: str = CSV_RANGE_PATH) -> None:
    """CSV에서 (feature, min, max) 읽어 FEATURE_RANGES에 저장"""
    global FEATURE_RANGES
    try:
        df = pd.read_csv(csv_path)
        ranges = {}
        for _, r in df.iterrows():
            f = str(r["feature"])
            if f in IGNORED_CSV_FEATURES:
                continue
            fmin, fmax = float(r["min"]), float(r["max"])
            if fmin > fmax:  # 방어
                fmin, fmax = fmax, fmin
            ranges[f] = (fmin, fmax)
        FEATURE_RANGES = ranges
        print(f"[INFO] Loaded feature ranges from {csv_path}: {len(FEATURE_RANGES)} items")
    except Exception as e:
        FEATURE_RANGES = {}
        print(f"[WARN] Could not load feature ranges from '{csv_path}': {e}")

# === API 필드 ↔ CSV feature 이름 매핑 ===
API2CSV = {
    "payload_tons": "Payload Weight (tons)",
    "distance_ly": "Distance from Earth (light-years)",
    "duration_years": "Mission Duration (years)",
    "science_pts": "Scientific Yield (points)",
    "crew_size": "Crew Size",
    "fuel_tons": "Fuel Consumption (tons)",
}
# CSV에 있지만 모델 입력에 쓰지 않는 컬럼(무시)
IGNORED_CSV_FEATURES = {
    "Mission Cost (billion USD)",
    "Mission Success (%)",
}

# === CSV에 없을 때 사용할 기본 범위(폴백) ===
DEFAULT_RANGES: Dict[str, Tuple[float, float]] = {
    "Payload Weight (tons)": (5.0, 80.0),
    "Distance from Earth (light-years)": (5.0, 200.0),
    "Mission Duration (years)": (3.0, 20.0),
    "Scientific Yield (points)": (20.0, 100.0),
    "Crew Size": (4.0, 20.0),
    "Fuel Consumption (tons)": (1000.0, 8000.0),
}

def get_range_by_csv_name(csv_name: str) -> Tuple[float, float]:
    """CSV feature명으로 범위를 가져오되, 없으면 DEFAULT_RANGES로 폴백."""
    if csv_name in FEATURE_RANGES:
        lo, hi = FEATURE_RANGES[csv_name]
        return (hi, lo) if lo > hi else (lo, hi)
    if csv_name in DEFAULT_RANGES:
        return DEFAULT_RANGES[csv_name]
    raise KeyError(f"Missing range for CSV feature '{csv_name}'")

def get_range_by_api_name(api_name: str) -> Tuple[float, float]:
    """API 필드명으로 CSV 이름을 찾아서 범위를 반환."""
    if api_name not in API2CSV:
        raise KeyError(f"Unknown API feature '{api_name}' (no mapping to CSV)")
    csv_name = API2CSV[api_name]
    return get_range_by_csv_name(csv_name)

def clamp_by_api_name(api_name: str, value: float) -> float:
    try:
        lo, hi = get_range_by_api_name(api_name)
    except KeyError:
        return float(value)
    return float(np.clip(value, lo, hi))

def clamp_feature(name: str, value: float) -> float:
    """해당 feature가 CSV에 있으면 그 범위로 클램프, 없으면 원값 반환"""
    if name in FEATURE_RANGES:
        fmin, fmax = FEATURE_RANGES[name]
        return float(np.clip(value, fmin, fmax))
    return float(value)

def intersect_range(a: Tuple[float, float], b: Tuple[float, float]) -> Optional[Tuple[float, float]]:
    """두 범위의 교집합. 없으면 None"""
    lo = max(a[0], b[0])
    hi = min(a[1], b[1])
    return (lo, hi) if lo <= hi else None

def rand_in_range_rng(rng: np.random.Generator, lo: float, hi: float, decimals: Optional[int] = None) -> float:
    """주어진 범위에서 균등 랜덤"""
    val = rng.uniform(lo, hi) if lo != hi else lo
    return float(round(val, decimals)) if decimals is not None else float(val)

# 서버 기동 시 1회 로드
load_feature_ranges()

# === 난이도별 중첩 밴드: easy ⊂ normal ⊂ hard (API 이름을 받아서 CSV 범위를 내부에서 찾음) ===
EASY_FRAC   = 0.25
NORMAL_FRAC = 0.65

def nested_band_from_api(api_name: str, difficulty: str, invert: bool = False) -> Tuple[float, float]:
    """
    API 필드명(api_name)을 받아 해당 CSV 범위를 찾아(e.g., API2CSV 매핑) 
    난이도별로 easy/normal/hard 밴드를 잘라서 반환.
      invert=False: 값이 클수록 어려움(payload, distance, duration, fuel)
      invert=True : 값이 클수록 쉬움(science, crew)
    """
    lo, hi = get_range_by_api_name(api_name)  # <- API -> CSV 매핑 + 폴백
    if lo == hi:
        return lo, hi

    span = hi - lo
    ef = float(np.clip(EASY_FRAC, 0.0, 1.0))
    nf = max(float(np.clip(NORMAL_FRAC, 0.0, 1.0)), ef)

    diff = (difficulty or "normal").lower()
    if diff not in ("easy", "normal", "hard"):
        diff = "normal"

    if not invert:
        # 작은 값이 쉬움
        return (lo, lo + ef*span) if diff=="easy" else (lo, lo + nf*span) if diff=="normal" else (lo, hi)
    else:
        # 큰 값이 쉬움
        return (hi - ef*span, hi) if diff=="easy" else (hi - nf*span, hi) if diff=="normal" else (lo, hi)

def rand_in_band(rng: np.random.Generator, lo: float, hi: float, decimals: Optional[int] = None) -> float:
    val = lo if lo == hi else rng.uniform(lo, hi)
    return float(round(val, decimals)) if decimals is not None else float(val)

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

# ===== (2) 응답 스키마에 is_success 추가 =====
class PredictionOut(BaseModel):
    success_raw: float
    success_final: float
    applied_penalty: float
    features_used: dict
    is_success: bool  # ✅ 추가

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
    return {
        "status": "ok",
        "model_loaded": pipe is not None,
        "ranges_loaded": len(FEATURE_RANGES) > 0,
        "success_threshold_percent": SUCCESS_THRESHOLD_PERCENT,  # ✅ (4) 임계값 노출(디버깅 편의)
    }

# =========================
# 5) 미션 성공률 예측 (CSV 범위로 최종 클램프 보장)
# =========================
@app.post("/predict", response_model=PredictionOut)
def predict(m: MissionInput):
    if pipe is None:
        return PredictionOut(
            success_raw=0.0,
            success_final=0.0,
            applied_penalty=0.0,
            features_used={"error": f"Model not loaded from {MODEL_PATH}"},
            is_success=False,
        )

    # (A) 숫자 입력을 CSV 범위로 클램프
    payload        = clamp_by_api_name("payload_tons", m.payload_tons)
    distance_ly    = clamp_by_api_name("distance_ly", m.distance_ly)
    duration_years = clamp_by_api_name("duration_years", m.duration_years)
    science_pts    = clamp_by_api_name("science_pts", m.science_pts)
    crew_size      = int(round(clamp_by_api_name("crew_size", float(m.crew_size))))
    fuel_tons      = clamp_by_api_name("fuel_tons", m.fuel_tons)

    # (B) 무게 간접 영향 적용 (클램프된 값 기준)
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

    # (D) 고정 페널티: 무게 1톤당 0.4% 감소 + 최종 0~100 클립
    penalty = 0.4 * payload
    success_final = float(np.clip(success_raw - penalty, m.clamp_min, m.clamp_max))

    # ===== (3) 임계값 판정: success_final(0~100)을 0~1로 정규화해 비교 =====
    is_success = bool(success_final >= SUCCESS_THRESHOLD_PERCENT)

    return PredictionOut(
        success_raw=round(success_raw, 4),
        success_final=round(success_final, 4),
        applied_penalty=round(penalty, 4),
        features_used=features,
        is_success=is_success,
    )

# =========================
# 6) 난이도별 랜덤 프리셋 생성 (CSV 범위 내부에서 easy ⊂ normal ⊂ hard)
# =========================

def sample_uniform(api_name: str, rng: np.random.Generator, decimals: Optional[int] = None) -> float:
    lo, hi = get_range_by_api_name(api_name)
    val = lo if lo == hi else rng.uniform(lo, hi)
    return float(round(val, decimals)) if decimals is not None else float(val)

MISSION_TYPES  = ["Exploration", "Research", "Mining", "Colonization"]
TARGET_TYPES   = ["Planet", "Moon", "Asteroid", "Exoplanet", "Star"]
LAUNCHERS      = ["Starship", "Falcon Heavy", "SLS", "Ariane 6"]

def random_preset(difficulty: str = "normal", seed: Optional[int] = None) -> dict:
    """
    모든 숫자 feature를 CSV min~max 범위 안에서만 생성.
    - 큰 값일수록 어려운 지표 (invert=False): payload_tons, distance_ly, duration_years, fuel_tons
    - 큰 값일수록 쉬운 지표 (invert=True) : science_pts, crew_size
    난이도는 중첩(easy ⊂ normal ⊂ hard)되도록 밴드를 자른다.
    """
    rng = np.random.default_rng(seed)
    rnd = random.Random(seed) if seed is not None else random
    diff = (difficulty or "normal").lower()
    if diff not in ("easy", "normal", "hard"):
        diff = "normal"

    # 각 feature의 난이도 밴드 계산 (CSV 범위 기반)
    p_lo, p_hi = nested_band_from_api("payload_tons",   diff, invert=False)
    d_lo, d_hi = nested_band_from_api("distance_ly",    diff, invert=False)
    t_lo, t_hi = nested_band_from_api("duration_years", diff, invert=False)
    f_lo, f_hi = nested_band_from_api("fuel_tons",      diff, invert=False)

    s_lo, s_hi = nested_band_from_api("science_pts",    diff, invert=True)
    c_lo, c_hi = nested_band_from_api("crew_size",      diff, invert=True)

    payload = rand_in_band(rng, p_lo, p_hi, decimals=1)
    dist    = rand_in_band(rng, d_lo, d_hi, decimals=1)
    dur     = rand_in_band(rng, t_lo, t_hi, decimals=1)
    fuel    = rand_in_band(rng, f_lo, f_hi, decimals=0)
    sci     = rand_in_band(rng, s_lo, s_hi, decimals=1)
    crew    = int(round(rand_in_band(rng, c_lo, c_hi)))

    return {
        "difficulty": diff,
        "payload_tons": payload,
        "mission_type": rnd.choice(MISSION_TYPES),
        "target_type": rnd.choice(TARGET_TYPES),
        "launch_vehicle": rnd.choice(LAUNCHERS),
        "distance_ly": dist,
        "duration_years": dur,
        "science_pts": sci,
        "crew_size": crew,
        "fuel_tons": float(fuel),
        "clamp_min": 0.0,
        "clamp_max": 100.0,
    }

@app.get("/preset")
def preset(
    difficulty: str = Query(default="normal", description="easy, normal, hard 중 선택"),
    seed: Optional[int] = Query(default=None)
):
    """난이도별 랜덤 초기 미션 생성 (CSV 범위 내부에서 easy ⊂ normal ⊂ hard)"""
    return random_preset(difficulty, seed)

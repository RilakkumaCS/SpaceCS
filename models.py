#데베 구조 정의
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# backend.py에서 정의된 db 객체를 사용하기 위해 임시로 정의합니다.
# 실제로는 backend.py에서 db를 정의하고 import해야 하지만,
# Circular Import 문제를 피하기 위해 이렇게 구조를 잡습니다.
try:
    from backend import db 
except ImportError:
    # backend.py가 실행되는 환경에서는 이 코드가 실행되지 않습니다.
    # 하지만 모델 파일 자체를 테스트하거나 VS Code가 파일을 읽을 때 필요할 수 있습니다.
    db = SQLAlchemy()
# =======================================================
# 1. 사용자 모델 (User Model)
# - 플레이어의 기본 정보 및 현재 자금을 관리합니다.
# =======================================================
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    funds = db.Column(db.Integer, default=1000) # 시작 자금 $1000

    # User가 수행 중인 임무들을 연결합니다.
    missions = db.relationship('UserMission', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

# =======================================================
# 2. 임무 모델 (Mission Model)
# - 게임에 존재하는 고정 임무의 규칙을 정의합니다.
# =======================================================
class Mission(db.Model):
    __tablename__ = 'missions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    target = db.Column(db.String(50), nullable=False)  # 목표 대상 (예: 달)
    distance = db.Column(db.Integer, nullable=False)   # 거리 (예: 100LY)
    cost = db.Column(db.Integer, nullable=False)       # 투자 비용 (출발 시 차감)
    payout = db.Column(db.Integer, nullable=False)     # 성공 시 지급되는 배당금
    duration = db.Column(db.Integer, nullable=False)   # 임무 기간 (예: 10Y)

    def __repr__(self):
        return f'<Mission {self.name}>'

# =======================================================
# 3. 사용자 임무 상태 모델 (UserMission Model)
# - 사용자가 시작한 임무의 진행 상태를 관리합니다.
# =======================================================
class UserMission(db.Model):
    __tablename__ = 'user_missions'
    id = db.Column(db.Integer, primary_key=True)
    
    # 외래 키 설정: 어떤 사용자가, 어떤 임무를 수행하는지 연결합니다.
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mission_id = db.Column(db.Integer, db.ForeignKey('missions.id'), nullable=False)
    
    start_time = db.Column(db.DateTime, default=datetime.utcnow) # 임무 시작 시간
    status = db.Column(db.String(20), default='IN_PROGRESS') # 상태: IN_PROGRESS, SUCCESS, FAILURE
    
    # 임무 진행 시 투자된 자원 (성공률 계산에 사용)
    fuel_invest = db.Column(db.Integer, default=0)
    crew_invest = db.Column(db.Integer, default=0)
    research_invest = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<UserMission {self.id} Status: {self.status}>'
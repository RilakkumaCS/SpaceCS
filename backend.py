from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# =======================================================
# Flask 앱 및 DB 설정
# =======================================================
# Flask 앱 인스턴스 생성
app = Flask(__name__)
# SQLite 데이터베이스 파일을 프로젝트 폴더에 설정 (gamedata.db)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gamedata.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# models.py 및 mission_logic.py에서 정의된 함수/클래스를 가져옵니다.
# 중요: models.py 및 mission_logic.py 파일은 이 코드를 실행하기 전에 반드시 저장되어 있어야 합니다.
from models import User, Mission, UserMission 
from mission_logic import start_mission_logic, check_mission_result_logic, predict_rate_for_api 

# =======================================================
# DB 초기 데이터 설정 함수
# =======================================================
def initialize_database():
    """앱 시작 시 데이터베이스를 초기화하고 기본 데이터를 삽입합니다."""
    with app.app_context():
        # DB 테이블 생성
        db.create_all()
        
        # 테스트 사용자 및 임무 데이터 초기화
        if User.query.filter_by(username='test_user').first() is None:
            db.session.add(User(username='test_user', funds=1000))
            db.session.commit() # 사용자 먼저 커밋

        # 기본 임무 3가지 설정 (Mission 1, 2, 3)
        if Mission.query.count() == 0:
            mission_data = [
                {'name': 'Mission 1', 'target': '달', 'distance': 100, 'cost': 100, 'payout': 100, 'duration': 10},
                {'name': 'Mission 2', 'target': '화성', 'distance': 200, 'cost': 200, 'payout': 300, 'duration': 20},
                {'name': 'Mission 3', 'target': '목성', 'distance': 500, 'cost': 500, 'payout': 800, 'duration': 30},
            ]
            for data in mission_data:
                db.session.add(Mission(**data))
            db.session.commit()

# =======================================================
# API 엔드포인트 정의 (클라이언트 요청 처리)
# =======================================================

@app.route('/')
def home():
    """서버 상태 확인을 위한 기본 경로"""
    return "Space Mission Backend Server Running"

@app.route('/api/user/<username>/', methods=['GET'])
def get_user_data(username):
    """사용자의 현재 자금 및 진행 중인 임무 목록을 반환합니다."""
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # 진행 중이거나 완료된 임무 정보 요약
    active_missions = UserMission.query.filter_by(user_id=user.id).all()
    
    mission_data = []
    for um in active_missions:
        mission_data.append({
            'mission_id': um.mission_id,
            'status': um.status,
            'start_time': um.start_time.isoformat(),
            'total_invest': um.fuel_invest + um.crew_invest + um.research_invest
        })
        
    return jsonify({
        'username': user.username, 
        'funds': user.funds,
        'missions': mission_data
    })

@app.route('/api/missions', methods=['GET'])
def get_all_missions():
    """모든 임무의 기본 정보를 반환합니다."""
    missions = Mission.query.all()
    mission_list = []
    for m in missions:
        mission_list.append({
            'id': m.id,
            'name': m.name,
            'target': m.target,
            'cost': m.cost,
            'payout': m.payout,
            'duration': f"{m.duration}Y"
        })
    return jsonify(mission_list)


@app.route('/api/missions/start', methods=['POST'])
def start_mission():
    """임무 시작 요청을 처리하고 자금을 차감합니다."""
    data = request.get_json()
    
    username = data.get('username')
    mission_id = data.get('mission_id')
    
    # 투자금은 0이거나 클라이언트에서 넘어온 값
    fuel = data.get('fuel', 0)
    crew = data.get('crew', 0)
    research = data.get('research', 0)
    
    # mission_logic.py의 핵심 로직 함수 호출 시 db 객체와 모델 클래스를 전달합니다.
    success, result = start_mission_logic(username, mission_id, fuel, crew, research, db, User, Mission, UserMission)
    
    if success:
        return jsonify({
            "success": True, 
            "message": f"임무 {mission_id} 시작. 남은 자금: ${result['funds']}", 
            "user_mission_id": result['mission_id']
        })
    else:
        return jsonify({"success": False, "message": result}), 400

@app.route('/api/missions/check/<int:user_mission_id>', methods=['GET'])
def check_mission_result(user_mission_id):
    """임무 기간이 만료되었는지 확인하고 결과를 처리합니다."""
    
    # mission_logic.py의 핵심 로직 함수 호출 시 db 객체와 모델 클래스를 전달합니다.
    success, result = check_mission_result_logic(user_mission_id, db, User, Mission, UserMission)
    
    if success:
        if result['status'] == 'IN_PROGRESS':
             return jsonify({"success": True, "status": result['status'], "message": f"임무 진행 중. 남은 시간: {result['remaining']}"})
        else:
             return jsonify({"success": True, "status": result['status'], "new_funds": result['new_funds'], "message": f"임무 완료! 결과: {result['status']}"})
    else:
        return jsonify({"success": False, "message": result}), 400

@app.route('/api/missions/predict', methods=['POST'])
def predict_mission_rate():
    """클라이언트에게 임무 시작 전 예측 성공률을 반환합니다."""
    data = request.get_json()
    mission_id = data.get('mission_id')
    fuel = data.get('fuel', 0)
    crew = data.get('crew', 0)
    research = data.get('research', 0)
    
    # mission_logic.py의 예측 함수 호출
    success, result = predict_rate_for_api(mission_id, fuel, crew, research, Mission)

    if success:
        return jsonify({"success": True, "predicted_rate": result})
    else:
        return jsonify({"success": False, "message": result}), 400

# =======================================================
# 앱 실행
# =======================================================
if __name__ == '__main__':
    initialize_database() # 앱 시작 시 DB 초기화/생성
    app.run(debug=True)
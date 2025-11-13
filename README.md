실행 방법
frontend
 npm install (최초 실행시)
 npm run dev
backend
 python -m venv venv (최초 실행시)
 pip install -r requirements.txt  (venv 가상환경에 라이브러리 설치)
 
 Windows
  .\venv\Scripts\activate
  uvicorn main:app --reload
 Linux
  source venv/bin/activate
  uvicorn main:app --reload

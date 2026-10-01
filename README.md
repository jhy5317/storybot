# 스토리봇 웹서비스 데모

FastAPI(백엔드) + React(프론트엔드). 요구사항은 [요구사항_명세서.md](요구사항_명세서.md) 참고.

## 실행

`start.bat`을 더블클릭하면 백엔드·프론트엔드 서버 창 2개가 뜨고 브라우저에서 http://localhost:5173 이 열린다. 서버 창을 닫으면 종료된다.

수동으로 실행할 때는 아래 순서를 따른다.

백엔드 (http://127.0.0.1:8000, 시작 시 `model_dpo.pt` 로드, DB는 `backend/storybot.db` 자동 생성)

```bash
python -m venv backend/.venv --system-site-packages
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --port 8000
```

프론트엔드 (http://localhost:5173, `/api` 요청은 8000번 포트로 프록시)

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

토큰 서명 키는 환경변수 `STORYBOT_SECRET_KEY`로 바꿀 수 있다.

## 구조

```
storybot/        기존 스토리봇 코드 (수정 없음)
backend/app/     main.py, models.py, schemas.py, auth.py, storybot_service.py, routers/
frontend/src/    pages/(Main, Signup, Profile), components/(Header, LoginModal, StoryBotPanel, StoryCard, StoryModal, ...)
```

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import create_access_token, hash_password, verify_password
from ..database import get_db
from ..models import User
from ..schemas import LoginIn, SignupIn, TokenOut, UserOut

router = APIRouter(prefix = '/api/auth', tags = ['auth'])


def user_out(user):
    return UserOut(id = user.id, username = user.username, nickname = user.nickname, created_at = user.created_at)


def token_out(user):
    return TokenOut(access_token = create_access_token(user.id), user = user_out(user))


@router.get('/check-username')
def check_username(username: str, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.username == username)) is not None
    return {'available': not exists}


@router.post('/signup', response_model = TokenOut, status_code = status.HTTP_201_CREATED)
def signup(data: SignupIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == data.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, '이미 사용 중인 아이디입니다.')

    user = User(username = data.username, password_hash = hash_password(data.password), nickname = data.nickname.strip())
    db.add(user)
    db.commit()
    db.refresh(user)

    # 가입 후 바로 로그인 상태가 되도록 토큰을 함께 발급
    return token_out(user)


@router.post('/login', response_model = TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, '아이디 또는 비밀번호가 올바르지 않습니다.')

    return token_out(user)

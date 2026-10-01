import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

SECRET_KEY = os.environ.get('STORYBOT_SECRET_KEY', 'storybot-demo-secret-change-me')
ALGORITHM = 'HS256'
TOKEN_EXPIRE_HOURS = 24

bearer = HTTPBearer(auto_error = False)


def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def create_access_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(hours = TOKEN_EXPIRE_HOURS)
    return jwt.encode({'sub': str(user_id), 'exp': expire}, SECRET_KEY, algorithm = ALGORITHM)


def _user_from_credentials(credentials, db):
    if credentials is None:
        return None

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms = [ALGORITHM])
        user_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, '로그인이 만료되었습니다. 다시 로그인해주세요.')

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, '존재하지 않는 사용자입니다.')

    return user


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    user = _user_from_credentials(credentials, db)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, '로그인이 필요합니다.')

    return user


def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    try:
        return _user_from_credentials(credentials, db)
    except HTTPException:
        return None

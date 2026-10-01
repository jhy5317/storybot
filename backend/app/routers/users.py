from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import User
from ..schemas import UserOut, UserUpdateIn
from .auth import user_out

router = APIRouter(prefix = '/api/users', tags = ['users'])


@router.get('/me', response_model = UserOut)
def read_me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch('/me', response_model = UserOut)
def update_me(data: UserUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.nickname is not None:
        user.nickname = data.nickname.strip()

    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, '현재 비밀번호가 올바르지 않습니다.')

        user.password_hash = hash_password(data.new_password)

    db.commit()
    db.refresh(user)

    return user_out(user)

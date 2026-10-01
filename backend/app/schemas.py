from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

# SQLite는 시간대 정보를 버리므로 UTC로 다시 붙여서 응답
UTCDatetime = Annotated[datetime, AfterValidator(lambda v: v if v.tzinfo else v.replace(tzinfo = timezone.utc))]


class SignupIn(BaseModel):
    username: str = Field(min_length = 4, max_length = 20, pattern = r'^[a-zA-Z0-9_]+$')
    password: str = Field(min_length = 6, max_length = 50)
    nickname: str = Field(min_length = 1, max_length = 20)


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    nickname: str
    created_at: UTCDatetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut


class UserUpdateIn(BaseModel):
    nickname: str | None = Field(default = None, min_length = 1, max_length = 20)
    current_password: str | None = None
    new_password: str | None = Field(default = None, min_length = 6, max_length = 50)


class GenerateIn(BaseModel):
    prompt: str = Field(default = '', max_length = 300)
    max_new_tokens: int = Field(default = 200, ge = 100, le = 300)
    temperature: float = Field(default = 1.0, ge = 0.5, le = 1.5)


class GenerateOut(BaseModel):
    prompt: str
    content: str


class StoryCreateIn(BaseModel):
    title: str = Field(min_length = 1, max_length = 100)
    prompt: str = Field(default = '', max_length = 300)
    content: str = Field(min_length = 1)


class StoryUpdateIn(BaseModel):
    title: str = Field(min_length = 1, max_length = 100)
    content: str = Field(min_length = 1)


class StoryOut(BaseModel):
    id: int
    title: str
    prompt: str
    content: str
    author_nickname: str
    view_count: int
    like_count: int
    created_at: UTCDatetime
    updated_at: UTCDatetime
    liked: bool
    is_owner: bool


class StoryPage(BaseModel):
    items: list[StoryOut]
    page: int
    size: int
    total: int
    total_pages: int


class LikeOut(BaseModel):
    liked: bool
    like_count: int

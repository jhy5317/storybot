from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    username: Mapped[str] = mapped_column(String(30), unique = True, index = True)
    password_hash: Mapped[str] = mapped_column(String(100))
    nickname: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), default = now)

    stories: Mapped[list['Story']] = relationship(back_populates = 'user')


class Story(Base):
    __tablename__ = 'stories'

    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index = True)
    title: Mapped[str] = mapped_column(String(100))
    prompt: Mapped[str] = mapped_column(Text, default = '')
    content: Mapped[str] = mapped_column(Text)
    view_count: Mapped[int] = mapped_column(Integer, default = 0)
    like_count: Mapped[int] = mapped_column(Integer, default = 0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), default = now)
    # 조회수·좋아요 변경은 수정으로 보지 않으므로 onupdate 없이 수정 API에서만 갱신
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), default = now)

    user: Mapped[User] = relationship(back_populates = 'stories')
    likes: Mapped[list['StoryLike']] = relationship(back_populates = 'story', cascade = 'all, delete-orphan')


class StoryLike(Base):
    __tablename__ = 'story_likes'
    __table_args__ = (UniqueConstraint('user_id', 'story_id'),)

    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index = True)
    story_id: Mapped[int] = mapped_column(ForeignKey('stories.id'), index = True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), default = now)

    story: Mapped[Story] = relationship(back_populates = 'likes')

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user, get_optional_user
from ..database import get_db
from ..models import Story, StoryLike, User, now
from ..schemas import LikeOut, StoryCreateIn, StoryOut, StoryPage, StoryUpdateIn

router = APIRouter(prefix = '/api/stories', tags = ['stories'])


def story_out(story, user, liked_ids):
    return StoryOut(
        id = story.id,
        title = story.title,
        prompt = story.prompt,
        content = story.content,
        author_nickname = story.user.nickname,
        view_count = story.view_count,
        like_count = story.like_count,
        created_at = story.created_at,
        updated_at = story.updated_at,
        liked = story.id in liked_ids,
        is_owner = user is not None and story.user_id == user.id,
    )


def liked_story_ids(db, user, story_ids):
    if user is None or not story_ids:
        return set()

    rows = db.scalars(select(StoryLike.story_id).where(StoryLike.user_id == user.id, StoryLike.story_id.in_(story_ids)))
    return set(rows)


def get_story_or_404(db, story_id):
    story = db.get(Story, story_id, options = [joinedload(Story.user)])
    if story is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, '스토리를 찾을 수 없습니다.')

    return story


def get_own_story(db, story_id, user):
    story = get_story_or_404(db, story_id)
    if story.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, '내가 만든 스토리만 수정·삭제할 수 있습니다.')

    return story


@router.get('', response_model = StoryPage)
def list_stories(
    page: int = Query(1, ge = 1),
    size: int = Query(9, ge = 1, le = 50),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(Story.id)))
    stories = db.scalars(
        select(Story).options(joinedload(Story.user)).order_by(Story.created_at.desc(), Story.id.desc())
        .offset((page - 1) * size).limit(size)
    ).all()
    liked_ids = liked_story_ids(db, user, [s.id for s in stories])

    return StoryPage(
        items = [story_out(s, user, liked_ids) for s in stories],
        page = page,
        size = size,
        total = total,
        total_pages = max(1, math.ceil(total / size)),
    )


@router.post('', response_model = StoryOut, status_code = status.HTTP_201_CREATED)
def create_story(data: StoryCreateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = Story(user_id = user.id, title = data.title.strip(), prompt = data.prompt.strip(), content = data.content.strip())
    db.add(story)
    db.commit()

    return story_out(get_story_or_404(db, story.id), user, set())


@router.get('/{story_id}', response_model = StoryOut)
def read_story(story_id: int, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    get_story_or_404(db, story_id)

    # 상세 조회 1회당 조회수 1 증가
    db.execute(update(Story).where(Story.id == story_id).values(view_count = Story.view_count + 1))
    db.commit()

    story = get_story_or_404(db, story_id)
    return story_out(story, user, liked_story_ids(db, user, [story.id]))


@router.patch('/{story_id}', response_model = StoryOut)
def update_story(story_id: int, data: StoryUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_own_story(db, story_id, user)
    story.title = data.title.strip()
    story.content = data.content.strip()
    story.updated_at = now()
    db.commit()
    db.refresh(story)

    return story_out(story, user, liked_story_ids(db, user, [story.id]))


@router.delete('/{story_id}', status_code = status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_own_story(db, story_id, user)
    db.delete(story)
    db.commit()

    return Response(status_code = status.HTTP_204_NO_CONTENT)


@router.post('/{story_id}/like', response_model = LikeOut)
def toggle_like(story_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_story_or_404(db, story_id)
    like = db.scalar(select(StoryLike).where(StoryLike.user_id == user.id, StoryLike.story_id == story_id))

    # 이미 눌렀으면 취소, 아니면 좋아요
    if like:
        db.delete(like)
        liked = False
    else:
        db.add(StoryLike(user_id = user.id, story_id = story_id))
        liked = True

    db.flush()
    story.like_count = db.scalar(select(func.count(StoryLike.id)).where(StoryLike.story_id == story_id))
    db.commit()

    return LikeOut(liked = liked, like_count = story.like_count)

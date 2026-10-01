from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  테이블 등록
from .database import Base, engine
from .routers import auth, stories, storybot, users
from .storybot_service import storybot as storybot_model


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind = engine)
    storybot_model.load()
    yield


app = FastAPI(title = 'StoryBot API', lifespan = lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_credentials = True,
    allow_methods = ['*'],
    allow_headers = ['*'],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(storybot.router)
app.include_router(stories.router)

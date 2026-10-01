from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from ..auth import get_current_user
from ..models import User
from ..schemas import GenerateIn, GenerateOut
from ..storybot_service import storybot

router = APIRouter(prefix = '/api/storybot', tags = ['storybot'])


@router.post('/generate', response_model = GenerateOut)
async def generate_story(data: GenerateIn, user: User = Depends(get_current_user)):
    content = await run_in_threadpool(storybot.generate, data.prompt, data.max_new_tokens, data.temperature)
    return GenerateOut(prompt = data.prompt.strip(), content = content)

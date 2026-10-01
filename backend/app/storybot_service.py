import sys
import threading
from pathlib import Path

# 프로젝트 루트(스토리봇 코드·모델 파일 위치)를 import 경로에 추가
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from storybot.model import GPT  # noqa: E402
from storybot.tokenizer import BPETokenizer  # noqa: E402
from storybot.utils import generate, get_device  # noqa: E402

MODEL_PATH = ROOT_DIR / 'model_dpo.pt'
TOKENIZER_PATH = ROOT_DIR / 'merge_rules.pkl'
END_TOKEN = '<|endoftext|>'


class StoryBot:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        # 모델이 KV 캐시를 내부에 들고 있으므로 생성 요청은 한 번에 하나씩 처리
        self.lock = threading.Lock()

    def load(self):
        device = get_device()
        self.tokenizer = BPETokenizer.load_from(str(TOKENIZER_PATH))
        self.model = GPT.load_from(str(MODEL_PATH), device = device)
        print(f'[StoryBot] model loaded on {device}')

    def generate(self, prompt, max_new_tokens, temperature):
        prompt = prompt.strip()
        model_prompt = prompt if prompt else END_TOKEN

        with self.lock:
            text = generate(self.model, self.tokenizer, model_prompt, max_new_tokens, temperature)

        return text.replace(END_TOKEN, '').strip()


storybot = StoryBot()

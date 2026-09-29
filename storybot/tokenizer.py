## 260929

import os                                # 파일 크기 계산 시 os.SEEK_END 사용
import pickle                            # 학습된 vocab/merge 규칙을 파일로 저장·로드할 때 사용

from multiprocessing import Pool         # 여러 청크를 여러 프로세스에서 병렬로 처리
import shutil
from collections import defaultdict      # 없는 키에 접근하면 기본값(0, set 등)을 자동 생성하는 딕셔너리
import regex as re                       # \p{L}, \p{N} 같은 유니코드 속성을 지원하는 정규식 라이브러리 (기본 re는 지원 X)
from tqdm import tqdm                    # 진행률 표시줄
import numpy as np


# ------------------------------------------------------------
# 사전 토큰화 (Pre-tokenization)
# BPE를 적용하기 전에 텍스트를 "단어 비슷한 조각"으로 먼저 자른다.
# 이렇게 하면 merge가 단어 경계를 넘어가지 않는다. (예: "dog." 에서 "g."가 합쳐지는 것 방지)
# ------------------------------------------------------------
def pretokenize(text):
    # GPT-2에서 쓰는 사전 토큰화 패턴
    #   '(?:[sdmt]|ll|ve|re)  : 영어 축약형  's, 'd, 'm, 't, 'll, 've, 're
    #    ?\p{L}+              : (앞 공백 1개 포함 가능) 문자(글자)들의 연속  예) " hello"
    #    ?\p{N}+              : (앞 공백 1개 포함 가능) 숫자들의 연속        예) " 2024"
    #    ?[^\s\p{L}\p{N}]+    : (앞 공백 1개 포함 가능) 공백·문자·숫자가 아닌 기호들  예) " !!"
    #   \s+(?!\S)             : 뒤에 공백이 아닌 글자가 오지 않는 공백들 (마지막 공백 1개는 다음 단어에 붙도록 남김)
    #   \s+                   : 나머지 공백
    pattern = r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""

    # 매칭된 조각을 하나씩 yield (제너레이터 → 전체 리스트를 메모리에 만들지 않음)
    for m in re.finditer(pattern, text):
        yield m.group(0)


# ------------------------------------------------------------
# 인접한 토큰 쌍(pair)의 등장 횟수 세기
# 예) ids = (1, 2, 3, 2, 3), weight = 5
#     → (1,2): +5, (2,3): +10, (3,2): +5
# ------------------------------------------------------------
def count_pairs(ids, weight = 1, counts = None):
    # counts를 넘겨받으면 거기에 누적, 없으면 새로 만든다
    if counts is None:
        counts = defaultdict(int)

    # zip(ids, ids[1:]) → (ids[0], ids[1]), (ids[1], ids[2]), ... 인접 쌍 생성
    # weight: 이 토큰 시퀀스(단어)가 코퍼스에 몇 번 등장했는지 → 그만큼 가중치로 더함
    for pair in zip(ids, ids[1:]):
        counts[pair] += weight

    return counts


# ------------------------------------------------------------
# 토큰 시퀀스에서 특정 pair를 new_id 하나로 합치기
# 예) ids = (1, 2, 3, 1, 2), pair = (1, 2), new_id = 256
#     → [256, 3, 256]
# ------------------------------------------------------------
def merge(ids, pair, new_id):
    merged_ids = []
    i = 0

    while i < len(ids):
        # 현재 위치와 다음 위치가 pair와 같으면 → new_id로 교체하고 2칸 이동
        # (i < len(ids) - 1 조건: 마지막 원소에서 ids[i + 1] 접근 시 IndexError 방지)
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == pair:
            merged_ids.append(new_id)
            i += 2

        # 아니면 → 현재 토큰을 그대로 두고 1칸 이동
        else:
            merged_ids.append(ids[i])
            i += 1

    return merged_ids


# ------------------------------------------------------------
# 큰 파일을 num_chunks개로 나눌 경계(바이트 위치) 찾기
# 단순히 파일 크기를 N등분하면 문서 중간이 잘리므로,
# 각 경계를 뒤쪽으로 밀어서 가장 가까운 end_token('<|endoftext|>') 위치에 맞춘다.
# → 각 청크가 문서 단위로 깔끔하게 나뉘어 병렬 처리 가능
# ------------------------------------------------------------
def find_chunk_boundaries(file_path, num_chunks, end_token = '<|endoftext|>'):
    # 파일을 바이너리('rb')로 읽으므로 비교할 토큰도 바이트로 변환
    byte_end_token = end_token.encode('utf-8')

    with open(file_path, 'rb') as file:
        # 파일 끝으로 이동 → 현재 위치 = 파일 크기(바이트)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        # 일단 균등하게 나눈 초기 경계  예) 크기 100, 4청크 → [0, 25, 50, 75, 100]
        chunk_size = file_size // num_chunks
        chunk_boundaries = [i * chunk_size for i in range(num_chunks)]
        chunk_boundaries.append(file_size)

        # 한 번에 읽을 크기 (4KB)
        buffer_size = 4096

        # 처음(0)과 끝(file_size)은 고정, 중간 경계들만 조정
        for bi in range(1, len(chunk_boundaries) - 1):
            chunk_position = chunk_boundaries[bi]
            file.seek(chunk_position)

            # end_token을 찾을 때까지 4KB씩 앞으로 읽어나감
            while True:
                buffer = file.read(buffer_size)

                # 파일 끝까지 토큰을 못 찾음 → 경계를 파일 끝으로
                if buffer == b"":
                    chunk_boundaries[bi] = file_size
                    break

                # 버퍼 안에서 토큰을 찾으면 → 파일 기준 절대 위치로 경계 설정
                # (end_position은 버퍼 안에서의 상대 위치이므로 chunk_position을 더함)
                end_position = buffer.find(byte_end_token)
                if end_position != -1:
                    chunk_boundaries[bi] = chunk_position + end_position
                    break

                # 이번 버퍼에 없으면 → 다음 버퍼 시작 위치로 갱신
                # (file.read()가 파일 포인터를 자동으로 옮기므로 seek는 필요 없음)
                chunk_position += buffer_size

    # 여러 경계가 같은 토큰 위치로 몰릴 수 있으므로 중복 제거 후 정렬
    return sorted(set(chunk_boundaries))


# ------------------------------------------------------------
# 청크 하나를 읽어서 사전 토큰별 등장 횟수 세기 (인자를 따로 받는 버전)
# ※ 아래 pretoken_chunk와 동작이 같고, 현재 코드에서는 호출되지 않음
# ------------------------------------------------------------
def process_single_chunk(file_path, start, end, end_token):
    pretoken_counts = defaultdict(int)

    with open(file_path, 'rb') as f:
        # start 위치부터 (end - start) 바이트만큼 읽기
        f.seek(start)
        chunk_byte = f.read(end - start)

        # 바이트 → 문자열 (깨진 UTF-8 바이트는 무시)
        chunk_text = chunk_byte.decode('utf-8', errors = 'ignore')

        # 문서 구분 토큰 기준으로 분리 → 문서끼리 섞여서 토큰이 만들어지지 않게 함
        texts = chunk_text.split(end_token)

        # 각 문서를 사전 토큰화하고 조각별 등장 횟수 누적
        for text in texts:
            for pretoken in pretokenize(text):
                pretoken_counts[pretoken] += 1

    return pretoken_counts


# ------------------------------------------------------------
# 청크 하나를 읽어서 사전 토큰별 등장 횟수 세기 (Pool.imap용 버전)
# pool.imap은 함수에 인자를 1개만 넘겨주므로, 튜플 하나로 받아서 풀어 쓴다.
# 반환 예) {" the": 1520, " cat": 32, ".": 890, ...}
# ------------------------------------------------------------
def pretoken_chunk(args):
    file_path, start, end, end_token = args
    pretoken_counts = defaultdict(int)

    with open(file_path, 'rb') as f:
        # start 위치부터 (end - start) 바이트만큼 읽기
        f.seek(start)
        chunk_byte = f.read(end - start)

        # 바이트 → 문자열 (깨진 UTF-8 바이트는 무시)
        chunk_text = chunk_byte.decode('utf-8', errors = 'ignore')

        # 문서 구분 토큰 기준으로 분리 → 문서끼리 섞여서 토큰이 만들어지지 않게 함
        texts = chunk_text.split(end_token)

        # 각 문서를 사전 토큰화하고 조각별 등장 횟수 누적
        for text in texts:
            for pretoken in pretokenize(text):
                pretoken_counts[pretoken] += 1

    return pretoken_counts


# ------------------------------------------------------------
# BPE 토크나이저 학습
#   1) 파일을 청크로 나눔
#   2) 청크별로 병렬 사전 토큰화 + 횟수 세기
#   3) 결과 합치기 → 각 사전 토큰을 바이트 ID 튜플로 변환
#   4) 가장 많이 등장한 pair를 반복해서 merge (vocab_size가 될 때까지)
# ------------------------------------------------------------
def train_bpe(file_path, vocab_size, end_token = '<|endoftext|>', num_processes = 8, num_chunks = 8):
    # 1) 문서 경계에 맞춘 청크 경계 찾기  예) [0, 1023, 2051, ..., file_size]
    chunk_boundaries = find_chunk_boundaries(file_path, num_chunks)
    total_chunks = len(chunk_boundaries)
    chunk_info_list = []

    # 인접한 경계 두 개가 청크 하나의 (start, end)
    # 경계가 N개면 청크는 N-1개
    for i in range(total_chunks - 1):
        start = chunk_boundaries[i]
        end = chunk_boundaries[i + 1]
        chunk_info_list.append((file_path, start, end, end_token))

    # 2) 여러 프로세스에서 청크별 사전 토큰화 병렬 실행 (tqdm으로 진행률 표시)
    with Pool(processes = num_processes) as pool:
        all_results = list(tqdm(pool.imap(pretoken_chunk, chunk_info_list), total = len(chunk_info_list), desc = 'Pretokenizing'))

    # 3) 청크별 결과(딕셔너리들)를 하나로 합치기
    pretoken_counts = defaultdict(int)

    for chunk_result in all_results:
        for pretoken, count in chunk_result.items():
            pretoken_counts[pretoken] += count

    # 문자열 사전 토큰 → UTF-8 바이트 ID 튜플로 변환
    # 예) " cat" → b" cat" → (32, 99, 97, 116)
    # 튜플인 이유: 딕셔너리 키 / set 원소로 쓰려면 해시 가능해야 함
    ids_counts = {tuple(pretoken.encode('utf-8')): count for pretoken, count in pretoken_counts.items()}

    # 4) merge 준비
    # 기본 바이트 256개 + 특수 토큰 1개('<|endoftext|>')를 뺀 나머지가 merge로 만들 토큰 수
    num_merges = vocab_size - 256 - 1
    merge_rules = {}                       # (a, b) → new_id  : 학습된 merge 규칙
    pair_to_ids = defaultdict(set)         # pair → 그 pair를 포함한 토큰 시퀀스들 (merge 시 영향받는 것만 빠르게 찾기 위함)
    pair_counts = defaultdict(int)         # pair → 전체 코퍼스에서의 등장 횟수

    # 모든 사전 토큰에 대해 pair 개수를 세고, pair가 어느 시퀀스에 들어있는지 기록
    for ids, count in ids_counts.items():
        # 이 시퀀스가 count번 등장했으므로 pair마다 count만큼 더함
        count_pairs(ids, count, pair_counts)

        for pair in zip(ids, ids[1:]):
            pair_to_ids[pair].add(ids)

    for step in tqdm(range(num_merges), desc = 'Training BPE'):
        if not pair_counts:
            break

        best_pair = max(pair_counts, key = lambda pair: (pair_counts[pair], pair[0], pair[1]))
        new_id = 256 + step
        merge_rules[best_pair] = new_id

        affected_ids = pair_to_ids[best_pair]
        del pair_to_ids[best_pair]

        for ids in affected_ids:
            ids_count = ids_counts[tuple(ids)]
            new_ids = merge(ids, best_pair, new_id)

            del ids_counts[tuple(ids)]
            ids_counts[tuple(new_ids)] = ids_count

            old_counts = count_pairs(ids)

            for pair, count in old_counts.items():
                pair_counts[pair] -= count * ids_count

                if pair_counts[pair] <= 0:
                    del pair_counts[pair]

                pair_to_ids[pair].discard(tuple(ids))

            new_counts = count_pairs(new_ids)

            for pair,count in new_counts.items():
                pair_counts[pair] += count * ids_count
                pair_to_ids[pair].add(tuple(new_ids))

    return merge_rules

class BPETokenizer:
    def __init__(self, merge_rules, end_token = '<|endoftext|>'):
        self.merge_rules = merge_rules
        self.end_token = end_token
        self.end_token_id = 256 + len(merge_rules)

        self.id_to_bytes = {i: bytes([i]) for i in range(256)}

        for (id1, id2), new_id in merge_rules.items():
            self.id_to_bytes[new_id] = self.id_to_bytes[id1] + self.id_to_bytes[id2]

        self.id_to_bytes[self.end_token_id] = self.end_token.encode('utf-8')
        self.vocab_size = len(self.id_to_bytes)

    @staticmethod
    def load_from(filepath):
        with open(filepath, 'rb') as f:
            merge_rules = pickle.load(f)

        return BPETokenizer(merge_rules)

    def _encode_text(self, text):
        ids = list(text.encode('utf-8'))

        def get_merge_priority(pair):
            return self.merge_rules.get(pair, float('inf'))

        while len(ids) > 1:
            counts = count_pairs(ids)
            best_pair = min(counts, key = get_merge_priority)

            if best_pair not in self.merge_rules:
                break

            new_id = self.merge_rules[best_pair]
            ids = merge(ids, best_pair, new_id)

        return ids

    def encode(self, input_text, show_progress = True):
        pattern = '(' + re.escape(self.end_token) + ')'
        texts = re.split(pattern, input_text)
        all_ids = []
        texts = tqdm(texts, desc = 'Encoding') if show_progress else texts
        cache = {}

        for text in texts:
            if text == self.end_token:
                all_ids.append(self.end_token_id)

            else:
                for pretoken in pretokenize(text):
                    ids = cache.get(pretoken)

                    if ids is None:
                        ids = self._encode_text(pretoken)
                        cache[pretoken] = ids

                    all_ids.extend(ids)
        
        return all_ids

    def _encode_chunk(self, args):
        file_path, start, end, cache_dir, chunk_idx = args

        with open(file_path, 'rb') as f:
            f.seek(start)
            chunk_byte = f.read(end - start)
            chunk_text = chunk_byte.decode('utf-8', errors = 'ignore')
            ids = self.encode(chunk_text, show_progress = False)

        cache_file = os.path.join(cache_dir, f"chunk_{chunk_idx:05d}.npy")
        np.array(ids, dtype = np.uint16).tofile(cache_file)

        return cache_file, len(ids)

    def encode_file(self, file_path, output_file, num_processes = 4, num_chunks = 6, cache_dir = "bpe_cache"):
        os.makedirs(cache_dir, exist_ok = True)

        try:
            chunk_boundaries = find_chunk_boundaries(file_path, num_chunks)
            total_chunks = len(chunk_boundaries) - 1
            chunk_info_list = []

            for i in range(total_chunks):
                start = chunk_boundaries[i]
                end = chunk_boundaries[i + 1]
                chunk_info_list.append((file_path, start, end, cache_dir, i))

            with Pool(processes = num_processes) as pool:
                cache_results = list(tqdm(
                    pool.imap(self._encode_chunk, chunk_info_list),
                    total = len(chunk_info_list),
                    desc = "Encoding chunks"
                ))

            cache_files = [r[0] for r in cache_results]
            token_counts = [r[1] for r in cache_results]
            total_tokens = sum(token_counts)

            dtype = np.uint16
            arr = np.memmap(output_file, dtype = dtype, mode = 'w+', shape = (total_tokens, ))
            idx = 0
            for cache_file in cache_files:
                chunk_data = np.fromfile(cache_file, dtype = dtype)
                arr[idx: idx + len(chunk_data)] = chunk_data
                idx += len(chunk_data)

            arr.flush()
            del arr

        finally:
            shutil.rmtree(cache_dir)

        return total_tokens

    def decode(self, ids):
        byte_list = [self.id_to_bytes[i] for i in ids]
        text_bytes = b''.join(byte_list)
        text = text_bytes.decode('utf-8', errors = 'replace')

        return text
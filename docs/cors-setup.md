# CORS 설정 가이드

## 문제 상황

Netlify 배포 후 다음과 같은 CORS 에러가 발생:

```
Access to fetch at 'https://lol-draft-server.onrender.com/games' from origin 'https://develop--lol-draft.netlify.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 해결 방안: 정규식을 사용한 패턴 매칭

백엔드 서버(FastAPI)에서 다음과 같이 CORS 설정을 수정해주세요:

### 방법 1: 정규식 패턴 사용 (권장)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Netlify의 모든 브랜치 도메인과 로컬 개발 환경을 허용
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*--lol-draft\.netlify\.app|https://lol-draft\.netlify\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)
```

### 방법 2: 환경 변수 사용

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 환경 변수에서 허용할 도메인 패턴 가져오기
cors_pattern = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https://.*--lol-draft\.netlify\.app|https://lol-draft\.netlify\.app|http://localhost:\d+"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=cors_pattern,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Render 환경 변수 설정

Render 대시보드에서 다음 환경 변수를 추가:

```
CORS_ORIGIN_REGEX=https://.*--lol-draft\.netlify\.app|https://lol-draft\.netlify\.app|http://localhost:\d+
```

## 정규식 패턴 설명

- `https://.*--lol-draft\.netlify\.app`: 모든 Netlify 브랜치 도메인 (예: develop--lol-draft.netlify.app)
- `https://lol-draft\.netlify\.app`: 메인 프로덕션 도메인
- `http://localhost:\d+`: 로컬 개발 환경 (모든 포트)

## 확인 사항

1. 서버 재시작 후 배포 확인
2. 브라우저에서 네트워크 탭으로 OPTIONS 요청이 200 응답하는지 확인
3. 실제 API 요청이 정상 작동하는지 테스트

## 보안 고려사항

- 정규식 패턴이 의도한 도메인만 허용하는지 확인
- 프로덕션에서는 `allow_origins=["*"]` 사용 금지
- `allow_credentials=True` 사용 시 와일드카드(`*`) 사용 불가

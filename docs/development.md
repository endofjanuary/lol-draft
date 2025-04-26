# 개발 가이드

이 문서는 LoL Draft Simulator 프로젝트의 개발 가이드를 제공합니다.

## 개발 환경 설정

### 필수 요구사항

- Node.js (>= 16.x)
- npm 또는 yarn
- 백엔드 서버 (별도 리포지토리)

### 프로젝트 설정

1. 저장소 클론:

   ```bash
   git clone https://github.com/your-username/lol-draft.git
   cd lol-draft
   ```

2. 의존성 설치:

   ```bash
   npm install
   # 또는
   yarn install
   ```

3. 환경 변수 설정:

   프로젝트 루트에 `.env.local` 파일을 생성하고 다음과 같이 설정합니다:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   이 URL은 백엔드 서버의 주소를 지정합니다. 기본값은 http://localhost:8000입니다.

4. 개발 서버 실행:

   ```bash
   npm run dev
   # 또는
   yarn dev
   ```

5. 백엔드 서버 실행 (별도 리포지토리의 지침 참조)

## 프로젝트 구조

```
lol-draft/
├── src/
│   ├── app/
│   │   ├── create/
│   │   ├── game/
│   │   ├── solo/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── game/
│   │   │   ├── DraftPhase.tsx
│   │   │   ├── LobbyPhase.tsx
│   │   │   ├── NicknameModal.tsx
│   │   │   ├── ResultPhase.tsx
│   │   │   └── Timer.tsx
│   │   └── solo/
│   │       ├── SoloDraftPhase.tsx
│   │       └── SoloResultView.tsx
│   ├── utils/
│   │   ├── apiConfig.ts
│   │   ├── sessionStorage.ts
│   │   └── championPositions.ts
│   └── types/
│       └── game.ts
├── docs/
├── public/
├── .env.local
├── package.json
└── README.md
```

## API 설정

### API 기본 URL 설정

프로젝트는 `apiConfig.ts` 파일에서 API 기본 URL을 관리합니다:

```typescript
export function getApiBaseUrl(): string {
  // 환경 변수에서 API URL을 가져옵니다
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 환경 변수가 설정되지 않은 경우 기본값을 사용합니다
  if (!apiUrl) {
    console.warn(
      "NEXT_PUBLIC_API_URL이 설정되지 않았습니다. 기본 URL을 사용합니다."
    );
    return "http://localhost:8000";
  }

  return apiUrl;
}

export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};
```

### Riot API 사용

- 롤 패치 버전은 기본적으로 `13.24.1`이 사용됩니다.
- 게임 생성 시 특정 버전을 지정할 수 있습니다.
- 버전 정보가 없을 경우 Riot API의 최신 버전을 자동으로 가져옵니다.

```typescript
// 버전 정보 가져오기
const fetchVersions = async () => {
  try {
    const response = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json"
    );
    const versions = await response.json();
    return versions[0]; // 첫 번째가 최신 버전
  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return "13.24.1"; // 기본 버전
  }
};

// 챔피언 데이터 가져오기
const fetchChampions = async (version) => {
  try {
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`
    );
    const data = await response.json();
    return Object.values(data.data);
  } catch (error) {
    console.error("Failed to fetch champions:", error);
    throw error;
  }
};
```

## 코드 규칙

### 컴포넌트 작성 규칙

- 함수형 컴포넌트와 React Hooks 사용
- Props는 인터페이스를 통해 명시적으로 정의
- 상태 관리는 useState 및 useEffect 사용
- 컴포넌트 내부 로직과 UI 렌더링 로직 분리

예시:

```tsx
interface MyComponentProps {
  title: string;
  onClick: () => void;
}

export default function MyComponent({ title, onClick }: MyComponentProps) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    // 사이드 이펙트 코드
  }, [dependencies]);

  const handleEvent = () => {
    // 이벤트 처리 로직
    onClick();
  };

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleEvent}>Click me</button>
    </div>
  );
}
```

### 타입 정의

- 타입은 `/src/types` 디렉토리에 정의
- 명시적이고 자세한 타입 정의 사용
- 한 파일에서만 사용하는 인터페이스는 해당 파일 내에 정의
- 여러 파일에서 공유하는 타입은 별도 파일로 분리

### 스타일링

- Tailwind CSS를 사용하여 스타일링
- 일관된 색상 테마 사용
- 반응형 디자인 구현 (모바일 우선)

## Socket.IO 통신

### 연결 설정

```tsx
import { io, Socket } from "socket.io-client";

// 소켓 연결 설정
const socket = io("http://localhost:8000", {
  transports: ["websocket"],
  autoConnect: true,
});

// 이벤트 리스너 등록
socket.on("connect", () => {
  console.log("Connected to server");
});

// 이벤트 발생시키기
socket.emit("event_name", payload, (response) => {
  // 콜백 처리
});
```

### 이벤트 처리 패턴

1. 이벤트 발생
2. 로딩 상태 설정
3. 서버 응답 처리
4. 에러 핸들링
5. 로딩 상태 해제

```tsx
const handleAction = () => {
  setIsLoading(true);
  setError(null);

  socket.emit("action_event", payload, (response) => {
    if (response.status === "success") {
      // 성공 처리
    } else {
      setError(response.message || "오류가 발생했습니다");
    }
    setIsLoading(false);
  });
};
```

## 데이터 패칭

### Riot API 사용

```tsx
const fetchChampions = async () => {
  try {
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`
    );
    const data = await response.json();
    return Object.values(data.data);
  } catch (error) {
    console.error("Failed to fetch champions:", error);
    throw error;
  }
};
```

## 빌드 및 배포

### 빌드

```bash
npm run build
# 또는
yarn build
```

### 로컬에서 프로덕션 빌드 실행

```bash
npm run start
# 또는
yarn start
```

### 배포

프로젝트는 Vercel 또는 다른 Next.js 호환 플랫폼에 배포할 수 있습니다.

## 문제 해결 및 디버깅

### 일반적인 이슈

1. **소켓 연결 실패**: 백엔드 서버가 실행 중인지 확인
2. **챔피언 데이터 로드 실패**: Riot API 버전 확인
3. **상태 업데이트 문제**: React 컴포넌트 라이프사이클 확인

### 디버깅

- 브라우저 개발자 도구 콘솔 로그 확인
- React DevTools를 사용하여 컴포넌트 계층 및 상태 확인
- 네트워크 탭에서 API 요청 및 응답 확인

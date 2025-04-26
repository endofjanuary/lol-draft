# League of Legends Draft Simulator

League of Legends Draft Simulator은 LoL 게임의 팀 구성을 위한 챔피언 밴픽 과정을 시뮬레이션하는 웹 애플리케이션입니다.

## 주요 기능

- 솔로 모드: 혼자서 양팀의 밴픽을 진행할 수 있습니다.
- 멀티플레이어 모드: 1v1 방식으로 여러 사용자가 실시간으로 밴픽에 참여할 수 있습니다.
- 다양한 드래프트 모드: 일반 대회 모드, 하드/소프트 피어리스 모드 지원
- 실시간 멀티플레이어: WebSocket을 통한 실시간 게임 진행
- 글로벌 밴 기능: 특정 챔피언을 전역적으로 사용 불가능하게 설정

## 기술 스택

- **프론트엔드**: Next.js, React, TypeScript, Tailwind CSS
- **백엔드**: Socket.IO (WebSocket)
- **데이터 소스**: Riot Games Data Dragon API

## 시작하기

### 개발 서버 실행

```bash
# 프론트엔드 개발 서버 실행
npm run dev
# 또는
yarn dev
# 또는
pnpm dev

# 백엔드 서버 실행 (별도 리포지토리)
# 백엔드 서버는 8000번 포트에서 실행됩니다.
```

### 사용 방법

1. 메인 화면에서 "신규 생성" 또는 "밴픽 참가" 선택
2. 신규 생성 시 게임 설정을 구성 (패치 버전, 팀 이름, 게임 모드 등)
3. 게임 코드를 통해 다른 사용자들이 참여 가능
4. 모든 플레이어가 준비되면 밴픽 시작
5. 게임 결과 확인 및 공유

## 프로젝트 구조

- `/src/app` - 페이지 및 라우팅
- `/src/components` - 재사용 가능한 React 컴포넌트
- `/src/types` - TypeScript 타입 정의
- `/docs` - 프로젝트 문서

## 문서

자세한 문서는 다음 링크에서 확인하실 수 있습니다:

- [컴포넌트 구조](./docs/components.md)
- [게임 모드](./docs/game-modes.md)
- [API 및 소켓 이벤트](./docs/api.md)
- [개발 가이드](./docs/development.md)

## 라이센스

[MIT](LICENSE)

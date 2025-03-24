# 컴포넌트 구조

이 문서는 LoL Draft Simulator 프로젝트의 React 컴포넌트 구조를 설명합니다.

## 컴포넌트 계층 구조

```
App
├── Home (/)
├── CreateGame (/create)
├── SoloGame (/solo)
│   ├── SoloDraftPhase
│   └── SoloResultView
└── MultiplayerGame (/game/[id])
    ├── NicknameModal
    ├── LobbyPhase
    ├── DraftPhase
    └── ResultPhase
```

## 주요 컴포넌트

### 게임 생성 관련

#### `CreateGame` (`/src/app/create/page.tsx`)

게임 설정을 구성하는 페이지 컴포넌트입니다.

- **기능**:
  - 패치 버전 선택
  - 팀 이름 설정
  - 게임 모드 선택 (솔로, 1v1, 5v5)
  - 드래프트 모드 선택 (토너먼트, 하드 피어리스, 소프트 피어리스)
  - 세트 수 선택 (BO1, BO3, BO5)
  - 타이머 설정
  - 글로벌 밴 챔피언 선택

### 솔로 모드 관련

#### `SoloDraftPhase` (`/src/components/solo/SoloDraftPhase.tsx`)

솔로 모드에서 밴픽 과정을 진행하는 컴포넌트입니다.

- **기능**:
  - 챔피언 목록 표시 및 검색
  - 현재 단계 표시
  - 블루/레드팀 밴픽 현황 표시
  - 챔피언 선택 및 확정

#### `SoloResultView` (`/src/components/solo/SoloResultView.tsx`)

솔로 모드 게임 결과를 표시하는 컴포넌트입니다.

- **기능**:
  - 팀별 밴/픽 결과 표시
  - 승리팀 표시
  - 결과 복사 기능
  - 새 게임 시작 기능

### 멀티플레이어 모드 관련

#### `NicknameModal` (`/src/components/game/NicknameModal.tsx`)

게임 참가 시 닉네임을 입력받는 모달 컴포넌트입니다.

- **기능**:
  - 닉네임 입력 및 유효성 검사

#### `LobbyPhase` (`/src/components/game/LobbyPhase.tsx`)

게임 로비 화면을 구성하는 컴포넌트입니다.

- **기능**:
  - 플레이어 포지션 선택
  - 준비 상태 설정
  - 게임 시작 (호스트)
  - 관전자 목록 표시

#### `DraftPhase` (`/src/components/game/DraftPhase.tsx`)

멀티플레이어 모드에서 밴픽 과정을 진행하는 컴포넌트입니다.

- **기능**:
  - 실시간 밴픽 상태 동기화
  - 현재 턴 플레이어 표시
  - 챔피언 선택 및 확정

#### `ResultPhase` (`/src/components/game/ResultPhase.tsx`)

게임 결과를 표시하고 다음 세트로 진행하는 컴포넌트입니다.

- **기능**:
  - 밴픽 결과 표시
  - 승리팀 선택 (호스트)
  - 다음 게임으로 진행 (호스트)

## 공통 타입

모든 컴포넌트에서 사용되는 공통 타입은 `/src/types/game.ts`에 정의되어 있습니다.

주요 타입:

- `Player` - 게임 참가자 정보
- `GameInfo` - 게임 상태 및 설정 정보
- `ChampionData` - 챔피언 데이터

## 스타일링

프로젝트는 Tailwind CSS를 사용하여 스타일링됩니다. 대부분의 컴포넌트는 다음과 같은 색상 테마를 따릅니다:

- 배경색: 짙은 남색 (`#030C28`)
- 블루팀 색상: 파란색 계열
- 레드팀 색상: 빨간색 계열
- 강조색: 노란색/보라색 계열

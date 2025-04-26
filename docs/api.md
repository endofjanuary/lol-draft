# API 및 소켓 이벤트

이 문서는 LoL Draft Simulator에서 사용되는 API 엔드포인트 및 Socket.IO 이벤트에 대해 설명합니다.

## 환경 변수 설정

프로젝트의 API URL은 환경 변수로 설정됩니다. `.env.local` 파일에 다음과 같이 설정하세요:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

이 URL은 모든 API 요청 및 Socket.IO 연결에 사용됩니다.

## REST API 엔드포인트

### 게임 생성

```
POST ${API_BASE_URL}/games
```

**요청 본문 예시:**

```json
{
  "version": "13.24.1",
  "draftType": "tournament",
  "playerType": "1v1",
  "matchFormat": "bo3",
  "timeLimit": false,
  "teamNames": {
    "blue": "블루팀",
    "red": "레드팀"
  },
  "gameName": "새로운 게임",
  "globalBans": ["Aatrox", "Ahri"]
}
```

**응답 예시:**

```json
{
  "gameCode": "AB123C",
  "createdAt": 1620000000000
}
```

### 게임 정보 조회

```
GET ${API_BASE_URL}/games/{gameCode}
```

**응답 예시:**

```json
{
  "code": "AB123C",
  "settings": {
    "version": "13.24.1",
    "draftType": "tournament",
    "playerType": "1v1",
    "matchFormat": "bo3",
    "timeLimit": false,
    "globalBans": ["Aatrox", "Ahri"],
    "bannerImage": null
  },
  "status": {
    "phase": 0,
    "blueTeamName": "블루팀",
    "redTeamName": "레드팀",
    "lastUpdatedAt": 1620000000000,
    "phaseData": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "setNumber": 1
  },
  "clients": [
    {
      "nickname": "Player1",
      "position": "blue1",
      "isReady": true,
      "isHost": true,
      "champion": null,
      "isConfirmed": false,
      "clientId": "socket-id-1"
    }
  ],
  "blueScore": 0,
  "redScore": 0
}
```

## 웹소켓 이벤트 (Socket.IO)

### 연결 이벤트

#### `connect`

클라이언트가 서버에 연결되었을 때 발생

#### `connection_success`

서버 연결이 성공했을 때 발생

```
서버 → 클라이언트: { sid: "소켓ID" }
```

#### `disconnect`

연결이 끊겼을 때 발생

### 게임 참가 관련 이벤트

#### `join_game`

게임에 참가할 때 발생

```
클라이언트 → 서버: {
  gameCode: "게임코드",
  nickname: "닉네임",
  position: "포지션",
  socketId: "이전소켓ID"  // 재연결 시 사용
}

서버 → 클라이언트: {
  status: "success",
  data: {
    position: "포지션",
    isHost: true/false,
    clientId: "소켓ID"
  }
}
```

#### `client_joined`

새로운 클라이언트가 게임에 참가했을 때 발생

```
서버 → 모든 클라이언트: {
  nickname: "닉네임",
  position: "포지션",
  isHost: true/false  // 호스트 여부
}
```

#### `client_left`

클라이언트가 게임을 떠났을 때 발생

```
서버 → 모든 클라이언트: { nickname: "닉네임", position: "포지션" }
```

### 로비 관련 이벤트

#### `change_position`

포지션 변경 시 발생

```
클라이언트 → 서버: { position: "새포지션" }
서버 → 클라이언트: { status: "success" }
```

#### `position_changed`

클라이언트의 포지션이 변경되었을 때 발생

```
서버 → 모든 클라이언트: {
  nickname: "닉네임",
  oldPosition: "이전포지션",
  newPosition: "새포지션"
}
```

#### `change_ready_state`

준비 상태 변경 시 발생

```
클라이언트 → 서버: { isReady: true/false }
서버 → 클라이언트: { status: "success" }
```

#### `ready_state_changed`

클라이언트의 준비 상태가 변경되었을 때 발생

```
서버 → 모든 클라이언트: {
  nickname: "닉네임",
  position: "포지션",
  isReady: true/false
}
```

#### `start_draft`

호스트가 드래프트 시작을 요청할 때 발생

```
클라이언트 → 서버: {}
서버 → 클라이언트: { status: "success" }
```

#### `draft_started`

드래프트가 시작되었을 때 발생

```
서버 → 모든 클라이언트: {
  gameCode: "게임코드",
  startedBy: "호스트닉네임",
  timestamp: 1620000000000
}
```

### 드래프트 관련 이벤트

#### `select_champion`

챔피언 선택 시 발생

```
클라이언트 → 서버: { champion: "챔피언ID" }
서버 → 클라이언트: { status: "success" }
```

#### `champion_selected`

챔피언이 선택되었을 때 발생

```
서버 → 모든 클라이언트: {
  nickname: "닉네임",
  position: "포지션",
  champion: "챔피언ID",
  phase: 7
}
```

#### `confirm_selection`

챔피언 선택 확정 시 발생

```
클라이언트 → 서버: {}
서버 → 클라이언트: { status: "success" }
```

#### `phase_progressed`

드래프트 페이즈가 진행되었을 때 발생

```
서버 → 모든 클라이언트: {
  gameCode: "게임코드",
  confirmedBy: "닉네임",
  fromPhase: 7,
  toPhase: 8,
  confirmedChampion: "챔피언ID",
  timestamp: 1620000000000
}
```

### 결과 관련 이벤트

#### `confirm_result`

호스트가 게임 결과 확정 시 발생

```
클라이언트 → 서버: { winner: "blue" or "red" }
서버 → 클라이언트: { status: "success" }
```

#### `game_result_confirmed`

게임 결과가 확정되었을 때 발생

```
서버 → 모든 클라이언트: {
  gameCode: "게임코드",
  confirmedBy: "호스트닉네임",
  winner: "blue" or "red",
  blueScore: 1,
  redScore: 0,
  nextSetNumber: 2,
  timestamp: 1620000000000
}
```

#### `prepare_next_game`

다음 게임 준비 요청 시 발생

```
클라이언트 → 서버: {}
서버 → 클라이언트: { status: "success" }
```

## 외부 API

### Riot Games Data Dragon API

챔피언 정보 및 이미지를 가져오기 위해 Riot Games의 Data Dragon API를 사용합니다.

#### 버전 정보 가져오기

```
GET https://ddragon.leagueoflegends.com/api/versions.json
```

#### 챔피언 데이터 가져오기

```
GET https://ddragon.leagueoflegends.com/cdn/{version}/data/{language}/champion.json
```

#### 챔피언 이미지 URL

```
https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png
```

## 오류 처리

### API 오류 처리

- API 요청 실패 시 표준 HTTP 상태 코드 반환
- 응답에 오류 메시지 포함 (예: 404, 500 등)

### 클라이언트 측 오류 처리

```typescript
try {
  const response = await fetch(`${apiBaseUrl}/games/${gameCode}`);

  if (!response.ok) {
    throw new Error("게임 정보를 불러오는데 실패했습니다.");
  }

  const data = await response.json();
  // 성공 처리
} catch (error) {
  console.error("API 요청 실패:", error);
  // 오류 표시
}
```

### API 버전 호환성

- 기본 롤 패치 버전: 13.24.1
- 버전이 없는 경우 자동으로 최신 버전 또는 기본 버전 사용

# API 및 소켓 이벤트

이 문서는 LoL Draft Simulator에서 사용되는 API 엔드포인트 및 Socket.IO 이벤트에 대해 설명합니다.

## REST API 엔드포인트

### 게임 생성

```
POST http://localhost:8000/games
```

**요청 본문 예시:**

```json
{
  "version": "13.10.1",
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
GET http://localhost:8000/games/{gameCode}
```

**응답 예시:**

```json
{
  "game": {
    "gameCode": "AB123C",
    "createdAt": 1620000000000
  },
  "settings": {
    "version": "13.10.1",
    "draftType": "tournament",
    "playerType": "1v1",
    "matchFormat": "bo3",
    "timeLimit": false
  },
  "status": {
    "phase": 0,
    "blueTeamName": "블루팀",
    "redTeamName": "레드팀",
    "lastUpdatedAt": 1620000000000,
    "phaseData": [],
    "setNumber": 1
  },
  "clients": [
    {
      "nickname": "Player1",
      "position": "blue1",
      "isReady": true,
      "isHost": true
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
클라이언트 → 서버: { gameCode: "게임코드", nickname: "닉네임", position: "포지션" }
서버 → 클라이언트: { status: "success", data: { position: "포지션", isHost: true/false } }
```

#### `client_joined`

새로운 클라이언트가 게임에 참가했을 때 발생

```
서버 → 모든 클라이언트: { nickname: "닉네임", position: "포지션" }
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
서버 → 모든 클라이언트
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
서버 → 모든 클라이언트
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
서버 → 모든 클라이언트
```

### 드래프트 관련 이벤트

#### `select_champion`

챔피언 선택 시 발생

```
클라이언트 → 서버: { champion: "챔피언ID" }
서버 → 클라이언트: { status: "success" }
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
서버 → 모든 클라이언트
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
서버 → 모든 클라이언트
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

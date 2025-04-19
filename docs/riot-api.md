# Riot API 문서

이 문서는 프로젝트에서 사용하는 Riot API 엔드포인트에 대한 정보를 제공합니다.

## 기본 URL

```
RIOT_BASE_URL = "https://ddragon.leagueoflegends.com"
```

Data Dragon(DDragon)은 리그 오브 레전드 게임 데이터와 에셋을 중앙 집중화하는 Riot의 방식입니다.

## 사용 가능한 엔드포인트

### 리그 오브 레전드 패치 버전 가져오기

사용 가능한 리그 오브 레전드 패치 버전의 배열을 반환합니다.

```
GET ${RIOT_BASE_URL}/api/versions.json
```

**예제 응답:**

```json
["14.10.1", "14.9.1", "14.8.1", ...]
```

버전은 내림차순으로 반환되며, 가장 최근 버전이 배열의 시작 부분에 있습니다.

### 지원되는 언어 가져오기

Riot API에서 지원하는 언어 배열을 반환합니다.

```
GET ${RIOT_BASE_URL}/cdn/languages.json
```

**예제 응답:**

```json
[
  "cs_CZ",
  "el_GR",
  "pl_PL",
  "ro_RO",
  "hu_HU",
  "en_GB",
  "de_DE",
  "es_ES",
  "it_IT",
  "fr_FR",
  "ja_JP",
  "ko_KR",
  "es_MX",
  "es_AR",
  "pt_BR",
  "en_US",
  "en_AU",
  "ru_RU",
  "tr_TR",
  "ms_MY",
  "en_PH",
  "en_SG",
  "th_TH",
  "vn_VN",
  "id_ID",
  "zh_MY",
  "zh_CN",
  "zh_TW"
]
```

이러한 언어 코드는 언어 매개변수가 필요한 다른 API 호출에서 사용할 수 있습니다.

### 챔피언 정보 가져오기

특정 게임 버전과 언어에 대한 모든 챔피언의 상세 정보를 반환합니다.

```
GET ${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion.json
```

**매개변수:**

- `version`: 게임 패치 버전 (예: "13.24.1")
- `language`: 언어 코드 (예: "ko_KR"(한국어), "en_US"(미국 영어))

**예제 요청:**

```
https://ddragon.leagueoflegends.com/cdn/13.24.1/data/ko_KR/champion.json
```

**예제 응답:**

```json
{
  "type": "champion",
  "format": "standAloneComplex",
  "version": "13.24.1",
  "data": {
    "Aatrox": {
      "version": "13.24.1",
      "id": "Aatrox",
      "key": "266",
      "name": "아트록스",
      "title": "다르킨의 검",
      "blurb": "한때 공허에 맞서 슈리마를 지키던 명예로운 수호자였으나, 아트록스와 그의 형제들은 결국 룬테라에 더 큰 위협이 되었고, 교활한 필멸자의 마법에 의해 물리쳤다. 하지만 수세기 동안의 유폐에서 아트록스가 가장 먼저...",
      "info": { ... },
      "image": {
        "full": "Aatrox.png",
        "sprite": "champion0.png",
        "group": "champion",
        "x": 0,
        "y": 0,
        "w": 48,
        "h": 48
      },
      "tags": ["Fighter", "Tank"],
      "partype": "피의 우물",
      "stats": { ... }
    },
    // 다른 챔피언들...
  }
}
```

### 챔피언 초상화 이미지 가져오기

특정 챔피언의 초상화 이미지를 반환합니다.

```
GET ${RIOT_BASE_URL}/cdn/${version}/img/champion/${championId}.png
```

**매개변수:**

- `version`: 게임 패치 버전 (예: "13.24.1")
- `championId`: 챔피언 식별자 (예: "Aatrox", "Ahri", "Akali")

**예제 요청:**

```
https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ahri.png
```

**응답:**

응답은 이미지 태그나 배경 이미지로 직접 사용할 수 있는 PNG 이미지 파일입니다.

## 프로젝트에서의 사용

### 버전 관리 로직

프로젝트에서는 다음과 같은 버전 관리 로직을 사용합니다:

1. 게임 생성 시 기본 버전으로 `13.24.1`을 사용합니다.
2. 사용자가 게임 생성 시 특정 버전을 선택할 수 있습니다.
3. 버전 정보가 누락된 경우 다음 단계로 처리합니다:
   - 먼저 최신 버전 목록을 가져와 첫 번째 버전을 사용
   - 최신 버전을 가져오는 데 실패하면 하드코딩된 `13.24.1` 버전을 사용

```typescript
// DraftPhase.tsx의 버전 관리 로직
let patchVersion = "latest";

if (gameInfo?.settings?.version && gameInfo.settings.version !== "latest") {
  patchVersion = gameInfo.settings.version;
  console.log("Using game settings version:", patchVersion);
} else {
  // 최신 버전 정보를 가져옴
  try {
    const versionsResponse = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json"
    );
    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch versions: ${versionsResponse.status}`);
    }
    const versions = await versionsResponse.json();
    patchVersion = versions[0]; // 첫 번째가 최신 버전
    console.log("Using latest patch version:", patchVersion);
  } catch (error) {
    console.error("Error fetching versions:", error);
    // 버전 정보를 가져오는 데 실패하면 하드코딩된 최신 버전 사용
    patchVersion = "13.24.1";
    console.log("Using fallback version:", patchVersion);
  }
}
```

### 이미지 URL 생성

챔피언 이미지 URL을 생성할 때는 항상 버전 정보가 비어있는 경우를 대비해 기본값을 사용합니다:

```typescript
const getChampionImageUrl = (championId: string) => {
  const version = gameInfo.settings?.version || "13.24.1";
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
};
```

## 사용 팁

1. 다른 요청을 하기 전에 항상 버전 엔드포인트를 사용하여 최신 버전을 확인하세요.
2. 챔피언 이미지는 다음 주소에서 접근할 수 있습니다: `${RIOT_BASE_URL}/cdn/${version}/img/champion/${championImageName}`
3. 특정 챔피언의 상세 정보는 다음 주소에서 접근할 수 있습니다: `${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion/${championId}.json`

## 오류 처리

- API는 표준 HTTP 상태 코드를 반환합니다.
- 유효하지 않은 버전이나 언어 코드를 사용하면 404로 요청이 실패할 수 있습니다.
- 버전 정보가 잘못되거나 없는 경우를 대비해 오류 처리 로직을 구현했습니다.
- 필요한 경우 응답을 캐싱하는 것이 좋습니다.

# Riot API Documentation

This document provides information about the Riot API endpoints used in this project.

## Base URL

```
RIOT_BASE_URL = "https://ddragon.leagueoflegends.com"
```

The Data Dragon (DDragon) is Riot's way of centralizing League of Legends game data and assets.

## Available Endpoints

### Get League of Legends Patch Versions

Returns an array of available League of Legends patch versions.

```
GET ${RIOT_BASE_URL}/api/versions.json
```

**Example Response:**

```json
["14.10.1", "14.9.1", "14.8.1", ...]
```

The versions are returned in descending order, with the most recent version at the beginning of the array.

### Get Supported Languages

Returns an array of languages supported by the Riot API.

```
GET ${RIOT_BASE_URL}/cdn/languages.json
```

**Example Response:**

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

These language codes can be used in other API calls that require a language parameter.

### Get Champion Information

Returns detailed information about all champions for a specific game version and language.

```
GET ${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion.json
```

**Parameters:**

- `version`: The game patch version (e.g., "14.10.1")
- `language`: The language code (e.g., "ko_KR" for Korean, "en_US" for American English)

**Example Request:**

```
https://ddragon.leagueoflegends.com/cdn/14.10.1/data/en_US/champion.json
```

**Example Response:**

```json
{
  "type": "champion",
  "format": "standAloneComplex",
  "version": "14.10.1",
  "data": {
    "Aatrox": {
      "version": "14.10.1",
      "id": "Aatrox",
      "key": "266",
      "name": "Aatrox",
      "title": "the Darkin Blade",
      "blurb": "Once honored defenders of Shurima against the Void, Aatrox and his brethren would eventually become an even greater threat to Runeterra, and were defeated only by cunning mortal sorcery. But after centuries of imprisonment, Aatrox was the first to find...",
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
      "partype": "Blood Well",
      "stats": { ... }
    },
    // Other champions...
  }
}
```

### Get Champion Portrait Images

Returns the portrait image for a specific champion.

```
GET ${RIOT_BASE_URL}/cdn/${version}/img/champion/${championId}.png
```

**Parameters:**

- `version`: The game patch version (e.g., "14.10.1")
- `championId`: The champion identifier (e.g., "Aatrox", "Ahri", "Akali")

**Example Request:**

```
https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ahri.png
```

**Response:**

The response is a PNG image file that can be used directly in image tags or as background images.

## Usage Tips

1. Always check for the latest version using the versions endpoint before making other requests
2. Champion images can be accessed at: `${RIOT_BASE_URL}/cdn/${version}/img/champion/${championImageName}`
3. For specific champion details, you can use: `${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion/${championId}.json`

## Error Handling

- The API returns standard HTTP status codes
- Requests may fail with 404 if using an invalid version or language code
- Rate limiting may apply, so consider caching responses when appropriate

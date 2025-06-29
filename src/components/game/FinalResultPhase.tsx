import { useState, useEffect } from "react";
import Image from "next/image";
import { GameInfo, ChampionData } from "@/types/game";
import { useRouter } from "next/navigation";

interface FinalResultPhaseProps {
  gameInfo: GameInfo;
}

export default function FinalResultPhase({ gameInfo }: FinalResultPhaseProps) {
  const router = useRouter();
  const [champions, setChampions] = useState<ChampionData[]>([]);

  // Fetch champion data from Riot API
  useEffect(() => {
    const fetchChampions = async () => {
      try {
        const version = gameInfo.settings.version;
        const language = "ko_KR";

        const RIOT_BASE_URL = "https://ddragon.leagueoflegends.com";
        const url = `${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion.json`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch champions: ${response.status}`);
        }

        const data = await response.json();
        const championsArray = Object.values(data.data) as ChampionData[];
        championsArray.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        setChampions(championsArray);
      } catch (error) {
        console.error("Error fetching champion data:", error);
      }
    };

    fetchChampions();
  }, [gameInfo.settings.version]);

  // 메인 페이지로 이동하는 핸들러
  const handleGoToMain = () => {
    router.push("/");
  };

  // Get champion image URL from the champion ID
  const getChampionImageUrl = (championId: string) => {
    const version = gameInfo.settings.version;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
  };

  // 팀 이름 및 점수 가져오기 (특정 세트 기준)
  const getTeamInfoForSet = (setNumber: number) => {
    // 각 세트별로 팀 진영이 바뀔 수 있으므로 현재 게임 상태 기준으로 계산
    const team1Score = gameInfo.team1Score || 0;
    const team2Score = gameInfo.team2Score || 0;

    return {
      team1Name: gameInfo.status.team1Name,
      team2Name: gameInfo.status.team2Name,
      team1Score,
      team2Score,
    };
  };

  // phaseData에서 특정 세트의 밴/픽 데이터 추출
  const extractSetData = (phaseData: string[]) => {
    const blueBans: string[] = [];
    const redBans: string[] = [];
    const bluePicks: { [key: string]: string } = {};
    const redPicks: { [key: string]: string } = {};

    for (
      let phaseNum = 1;
      phaseNum <= 20 && phaseNum < phaseData.length;
      phaseNum++
    ) {
      const selection = phaseData[phaseNum];
      if (selection && selection.trim() !== "") {
        // First 6 phases are bans (alternating blue, red)
        if (phaseNum <= 6) {
          // Phase 1,3,5 are Blue bans
          if (phaseNum % 2 === 1) {
            blueBans.push(selection);
          }
          // Phase 2,4,6 are Red bans
          else {
            redBans.push(selection);
          }
        }
        // Phases 7-12 are first pick phase
        else if (phaseNum >= 7 && phaseNum <= 12) {
          if (phaseNum === 7) bluePicks["blue1"] = selection;
          else if (phaseNum === 8) redPicks["red1"] = selection;
          else if (phaseNum === 9) redPicks["red2"] = selection;
          else if (phaseNum === 10) bluePicks["blue2"] = selection;
          else if (phaseNum === 11) bluePicks["blue3"] = selection;
          else if (phaseNum === 12) redPicks["red3"] = selection;
        }
        // Phases 13-16 are second ban phase (alternating red, blue)
        else if (phaseNum >= 13 && phaseNum <= 16) {
          // Phase 13,15 are Red bans
          if (phaseNum % 2 === 1) {
            redBans.push(selection);
          }
          // Phase 14,16 are Blue bans
          else {
            blueBans.push(selection);
          }
        }
        // Phases 17-20 are second pick phase
        else if (phaseNum >= 17 && phaseNum <= 20) {
          if (phaseNum === 17) redPicks["red4"] = selection;
          else if (phaseNum === 18) bluePicks["blue4"] = selection;
          else if (phaseNum === 19) bluePicks["blue5"] = selection;
          else if (phaseNum === 20) redPicks["red5"] = selection;
        }
      }
    }

    return { blueBans, redBans, bluePicks, redPicks };
  };

  // Render team slot with champion image
  const renderTeamSlot = (
    team: string,
    position: number,
    picks: { [key: string]: string }
  ) => {
    const key = `${team}${position}`;
    const championId = picks[key];
    const championName = championId
      ? champions.find((c: ChampionData) => c.id === championId)?.name ||
        championId
      : "";

    return (
      <div className="flex items-center gap-2">
        <div className={`w-12 h-12 rounded-md bg-gray-800 overflow-hidden`}>
          {championId && (
            <Image
              src={getChampionImageUrl(championId)}
              alt={championId}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs">{`${team.toUpperCase()} ${position}`}</span>
          {championName && (
            <span
              className={`text-xs ${
                team === "blue" ? "text-blue-300" : "text-red-300"
              }`}
            >
              {championName}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render ban slot with champion image and red stripe
  const renderBanSlot = (bans: string[], index: number) => {
    const championId = bans[index];

    return (
      <div className={`w-8 h-8 rounded-md bg-gray-800 overflow-hidden`}>
        {championId && (
          <div className="relative w-full h-full">
            <Image
              src={getChampionImageUrl(championId)}
              alt={championId}
              width={32}
              height={32}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 세트별 누적 점수 계산 함수
  const getScoreUpToSet = (setNumber: number) => {
    let blueScore = 0;
    let redScore = 0;
    const results = getAllSetResults();
    for (let i = 0; i < setNumber; i++) {
      const set = results[i];
      if (!set || set.length < 22) continue;
      const winner = set[21];
      // 해당 세트의 진영 정보
      const sides = getSidesForSet(i + 1);
      if (winner === "blue") {
        if (sides.team1Side === "blue") blueScore++;
        else redScore++;
      } else if (winner === "red") {
        if (sides.team1Side === "red") blueScore++;
        else redScore++;
      }
    }
    return { blueScore, redScore };
  };

  // 세트별 결과 렌더링
  const renderSetResult = (
    setNumber: number,
    phaseData: string[],
    winner: string
  ) => {
    const { blueBans, redBans, bluePicks, redPicks } =
      extractSetData(phaseData);
    // 진영 정보 계산
    const sides = getSidesForSet(setNumber);
    // 진영에 따라 팀명/점수 매핑
    const blueTeamName =
      sides.team1Side === "blue"
        ? gameInfo.status.team1Name
        : gameInfo.status.team2Name;
    const redTeamName =
      sides.team1Side === "red"
        ? gameInfo.status.team1Name
        : gameInfo.status.team2Name;
    // 누적 점수 계산
    const score = getScoreUpToSet(setNumber);

    // 승자 정보를 팀명으로 변환
    const getWinnerText = () => {
      if (winner === "blue") {
        return `${blueTeamName} 승리`;
      } else if (winner === "red") {
        return `${redTeamName} 승리`;
      } else {
        return "승자 정보 없음";
      }
    };

    return (
      <div
        key={`set-${setNumber}`}
        className="bg-gray-900 bg-opacity-50 rounded-lg p-6 mb-6"
      >
        {/* Set Header */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold">Set {setNumber}</h3>
          <p className="text-lg text-yellow-400">{getWinnerText()}</p>
          {/* 누적 점수 표시 */}
          <div className="text-base mt-2">
            <span className="text-blue-400">
              {blueTeamName} {score.blueScore}
            </span>
            {" - "}
            <span className="text-red-400">
              {redTeamName} {score.redScore}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Blue Team */}
          <div className="w-full md:w-1/2 bg-blue-900 bg-opacity-20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-blue-400">
                {blueTeamName}
              </h4>
              {winner === "blue" && (
                <span className="text-yellow-400 text-lg">🏆</span>
              )}
            </div>

            {/* Blue Bans */}
            <div className="mb-4">
              <h5 className="text-xs text-gray-400 mb-2">BANS</h5>
              <div className="flex flex-wrap gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`set${setNumber}-blue-ban-${index}`}>
                    {renderBanSlot(blueBans, index)}
                  </div>
                ))}
              </div>
            </div>

            {/* Blue Picks */}
            <div>
              <h5 className="text-xs text-gray-400 mb-2">PICKS</h5>
              <div className="flex flex-col gap-1">
                {[1, 2, 3, 4, 5].map((position) => (
                  <div
                    key={`set${setNumber}-blue${position}`}
                    className="flex items-center gap-2"
                  >
                    {renderTeamSlot("blue", position, bluePicks)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Red Team */}
          <div className="w-full md:w-1/2 bg-red-900 bg-opacity-20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-red-400">{redTeamName}</h4>
              {winner === "red" && (
                <span className="text-yellow-400 text-lg">🏆</span>
              )}
            </div>

            {/* Red Bans */}
            <div className="mb-4">
              <h5 className="text-xs text-gray-400 mb-2">BANS</h5>
              <div className="flex flex-wrap gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`set${setNumber}-red-ban-${index}`}>
                    {renderBanSlot(redBans, index)}
                  </div>
                ))}
              </div>
            </div>

            {/* Red Picks */}
            <div>
              <h5 className="text-xs text-gray-400 mb-2">PICKS</h5>
              <div className="flex flex-col gap-1">
                {[1, 2, 3, 4, 5].map((position) => (
                  <div
                    key={`set${setNumber}-red${position}`}
                    className="flex items-center gap-2"
                  >
                    {renderTeamSlot("red", position, redPicks)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 세트별 진영 정보를 계산하는 함수 (예시: 홀수 세트는 기본, 짝수 세트는 스왑)
  const getSidesForSet = (setNumber: number) => {
    // 첫 세트 기준 진영
    const initialTeam1Side = gameInfo.status.team1Side;
    const initialTeam2Side = gameInfo.status.team2Side;
    // 홀수 세트: 그대로, 짝수 세트: 스왑
    if (setNumber % 2 === 1) {
      return {
        team1Side: initialTeam1Side,
        team2Side: initialTeam2Side,
      };
    } else {
      return {
        team1Side: initialTeam1Side === "blue" ? "red" : "blue",
        team2Side: initialTeam2Side === "blue" ? "red" : "blue",
      };
    }
  };

  // 모든 세트 결과를 가져오는 로직 (마지막 세트 phaseData 포함)
  const getAllSetResults = () => {
    const results: string[][] = [];
    if (Array.isArray(gameInfo.results)) {
      results.push(...gameInfo.results);
    }
    // 현재 진행 중인 세트가 완성된 경우(phaseData[21]에 승자 정보가 있으면), 마지막 세트로 추가
    // 단, 이미 results에 포함되지 않은 경우에만 추가 (중복 방지)
    if (
      Array.isArray(gameInfo.status.phaseData) &&
      gameInfo.status.phaseData.length >= 22 &&
      gameInfo.status.phaseData[21] &&
      gameInfo.status.phaseData[21].trim() !== ""
    ) {
      // 중복 체크: 마지막 세트가 이미 results에 포함되어 있는지 확인
      const isAlreadyIncluded = results.some((result, index) => {
        // 같은 인덱스의 세트가 동일한 승자를 가지고 있는지 확인
        return (
          result.length >= 22 &&
          result[21] === gameInfo.status.phaseData[21] &&
          index === results.length - 1
        ); // 마지막 세트인지 확인
      });

      if (!isAlreadyIncluded) {
        results.push(gameInfo.status.phaseData);
      }
    }
    return results;
  };

  // 게임 결과 데이터 가져오기
  const gameResults = getAllSetResults();
  const teamInfo = getTeamInfoForSet(1);

  // 디버깅을 위한 콘솔 출력
  useEffect(() => {
    console.log("FinalResultPhase - gameResults:", gameResults);
    console.log("FinalResultPhase - gameInfo:", gameInfo);
  }, [gameResults, gameInfo]);

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">최종 게임 결과</h1>
        <h2 className="text-xl">
          {teamInfo.team1Name} vs {teamInfo.team2Name}
        </h2>
        <div className="text-lg mt-2">
          <span className="text-blue-400">{teamInfo.team1Score}</span>
          {" - "}
          <span className="text-red-400">{teamInfo.team2Score}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          ({gameInfo.settings.matchFormat?.toUpperCase()})
        </p>
      </div>

      {/* Sets Results */}
      <div className="max-w-6xl mx-auto">
        {gameResults.length > 0 ? (
          gameResults.map((setResult: string[], setIndex: number) => {
            const setNumber = setIndex + 1;
            const winner = setResult[21] || "unknown"; // Phase 21에 승자 정보 저장
            return renderSetResult(setNumber, setResult, winner);
          })
        ) : (
          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-8 text-center">
            <h3 className="text-xl font-bold mb-4">게임 결과 로딩 중...</h3>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-6"></div>
            <p className="text-gray-400 mb-6">
              게임 결과를 불러오고 있습니다.
              <br />
              잠시만 기다려주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors mr-4"
            >
              새로고침
            </button>
            <button
              onClick={handleGoToMain}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors"
            >
              메인 페이지로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleGoToMain}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
        >
          메인 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Timer from "../game/Timer"; // Import the Timer component

interface ChampionData {
  id: string;
  key: string;
  name: string;
  title: string;
  image: {
    full: string;
  };
  tags: string[];
}

interface GameInfo {
  version: string;
  draftType: string;
  status: {
    phase: number;
    currentSet: number;
    blueTeamName: string;
    redTeamName: string;
  };
  globalBans?: string[]; // 글로벌 밴 챔피언 목록
  blueScore?: number; // Moved to top level
  redScore?: number; // Moved to top level
  timerSetting?: boolean; // Add timer setting field
}

interface BanPickRecord {
  phase: number;
  championId: string;
  team: "blue" | "red";
}

interface SoloDraftPhaseProps {
  gameInfo: GameInfo;
  onSelectChampion: (champion: string) => void;
  onConfirmSelection: (forcedChampionId?: string) => void; // 선택적 매개변수 추가
  banPickHistory?: BanPickRecord[];
  selectedChampion?: string | null;
  currentTeam?: "blue" | "red";
}

export default function SoloDraftPhase({
  gameInfo,
  onSelectChampion,
  onConfirmSelection,
  banPickHistory = [], // 기본값 빈 배열
  selectedChampion: externalSelectedChampion = null,
  currentTeam: externalCurrentTeam,
}: SoloDraftPhaseProps) {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<string | null>(
    externalSelectedChampion
  );
  const [error, setError] = useState<string | null>(null);

  // 현재 팀 계산 (외부에서 받지 않으면 phase에 따라 계산)
  const currentTeam =
    externalCurrentTeam || getCurrentTeamFromPhase(gameInfo.status.phase);

  // Phase에 따른 현재 팀 결정 함수
  function getCurrentTeamFromPhase(phase: number): "blue" | "red" {
    // Phase 1-6: 첫 번째 밴 페이즈 (blue→red→blue→red→blue→red)
    if (phase >= 1 && phase <= 6) {
      return phase % 2 === 1 ? "blue" : "red";
    }

    // Phase 7-12: 첫 번째 픽 페이즈
    if (phase === 7) return "blue"; // 블루1픽
    if (phase === 8 || phase === 9) return "red"; // 레드1,2픽
    if (phase === 10 || phase === 11) return "blue"; // 블루2,3픽
    if (phase === 12) return "red"; // 레드3픽

    // Phase 13-16: 두 번째 밴 페이즈 (red→blue→red→blue)
    if (phase >= 13 && phase <= 16) {
      return phase % 2 === 0 ? "blue" : "red";
    }

    // Phase 17-20: 두 번째 픽 페이즈
    if (phase === 17) return "red"; // 레드4픽
    if (phase === 18 || phase === 19) return "blue"; // 블루4,5픽
    if (phase === 20) return "red"; // 레드5픽

    return "blue"; // 기본값
  }

  // banPickHistory에서 팀별 밴/픽 정보 추출
  const { blueBans, redBans, bluePicks, redPicks } = useMemo(() => {
    const result = {
      blueBans: [] as string[],
      redBans: [] as string[],
      bluePicks: [] as { position: number; championId: string }[],
      redPicks: [] as { position: number; championId: string }[],
    };

    banPickHistory.forEach((record) => {
      const { phase, championId, team } = record;

      if (phase <= 6) {
        // 첫 번째 밴 페이즈
        if (team === "blue") result.blueBans.push(championId);
        else result.redBans.push(championId);
      } else if (phase <= 12) {
        // 첫 번째 픽 페이즈
        const position =
          team === "blue"
            ? phase === 7
              ? 1
              : phase === 10
              ? 2
              : 3 // 블루팀 포지션
            : phase === 8
            ? 1
            : phase === 9
            ? 2
            : 3; // 레드팀 포지션

        if (team === "blue") result.bluePicks.push({ position, championId });
        else result.redPicks.push({ position, championId });
      } else if (phase <= 16) {
        // 두 번째 밴 페이즈
        if (team === "blue") result.blueBans.push(championId);
        else result.redBans.push(championId);
      } else {
        // 두 번째 픽 페이즈
        const position =
          team === "blue"
            ? phase === 18
              ? 4
              : 5 // 블루팀 포지션
            : phase === 17
            ? 4
            : 5; // 레드팀 포지션

        if (team === "blue") result.bluePicks.push({ position, championId });
        else result.redPicks.push({ position, championId });
      }
    });

    return result;
  }, [banPickHistory]);

  // Fetch champions from Data Dragon API
  useEffect(() => {
    const fetchChampions = async () => {
      if (!gameInfo.version) return;

      try {
        setLoading(true);
        const response = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/data/ko_KR/champion.json`
        );

        if (!response.ok) {
          throw new Error("챔피언 정보를 불러오는데 실패했습니다");
        }

        const data = await response.json();

        // Convert champion object to array
        const champArray = Object.values(data.data) as ChampionData[];

        // Sort by Korean name (한글 이름 기준 정렬)
        champArray.sort((a, b) => a.name.localeCompare(b.name, "ko"));

        setChampions(champArray);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchChampions();
  }, [gameInfo.version]);

  // Determine current action based on phase
  const getCurrentAction = () => {
    const phase = gameInfo.status.phase;
    if (phase <= 6 || (phase >= 13 && phase <= 16)) return "BAN";
    return "PICK";
  };

  // Get phase description
  const getPhaseDescription = () => {
    const phase = gameInfo.status.phase;
    if (phase >= 1 && phase <= 6) return "BAN PHASE 1";
    if (phase >= 7 && phase <= 12) return "PICK PHASE 1";
    if (phase >= 13 && phase <= 16) return "BAN PHASE 2";
    if (phase >= 17 && phase <= 20) return "PICK PHASE 2";
    return "DRAFT PHASE";
  };

  // Get all banned champion IDs (including global bans)
  const allBannedChampions = useMemo(() => {
    const globalBans = gameInfo.globalBans || [];
    return [...blueBans, ...redBans, ...globalBans];
  }, [blueBans, redBans, gameInfo.globalBans]);

  // Get all picked champion IDs
  const allPickedChampions = useMemo(() => {
    return [
      ...bluePicks.map((p) => p.championId),
      ...redPicks.map((p) => p.championId),
    ];
  }, [bluePicks, redPicks]);

  // Filter champions based on search term and tag filter only (don't exclude banned/picked)
  const filteredChampions = useMemo(() => {
    return champions.filter((champion) => {
      // Filter by search term
      if (
        searchTerm &&
        !champion.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filter by tag
      if (tagFilter && !champion.tags.includes(tagFilter)) {
        return false;
      }

      // Don't filter out banned or picked champions anymore
      return true;
    });
  }, [champions, searchTerm, tagFilter]);

  // Check if champion is banned or picked
  const isChampionUnavailable = (championId: string) => {
    return (
      allBannedChampions.includes(championId) ||
      allPickedChampions.includes(championId)
    );
  };

  // Get all available champions (not banned or picked)
  const availableChampions = useMemo(() => {
    return champions.filter((champion) => !isChampionUnavailable(champion.id));
  }, [champions, allBannedChampions, allPickedChampions]);

  // Handle timer timeout with useCallback for optimization
  const handleTimerTimeout = useCallback(() => {
    const phase = gameInfo.status.phase;
    console.log(`타이머 만료: 페이즈 ${phase}`);

    // For ban phases (1-6, 13-16)
    if ((phase >= 1 && phase <= 6) || (phase >= 13 && phase <= 16)) {
      console.log("밴 타임아웃 - 밴 건너뛰기");
      // Skip ban by confirming with empty selection
      onConfirmSelection();
    }
    // For pick phases (7-12, 17-20)
    else if ((phase >= 7 && phase <= 12) || (phase >= 17 && phase <= 20)) {
      // Select random champion
      if (availableChampions.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * availableChampions.length
        );
        const randomChampion = availableChampions[randomIndex];

        console.log(`픽 타임아웃 - 랜덤 챔피언 선택됨: ${randomChampion.id}`);

        // 로컬 상태 업데이트 (UI 표시용)
        setSelectedChampion(randomChampion.id);
        onSelectChampion(randomChampion.id);

        // 직접 강제 챔피언 ID를 전달하여 즉시 확정
        onConfirmSelection(randomChampion.id);
      } else {
        console.error("랜덤 선택할 사용 가능한 챔피언이 없습니다");
        onConfirmSelection();
      }
    }
  }, [
    availableChampions,
    gameInfo.status.phase,
    onConfirmSelection,
    onSelectChampion,
  ]);

  // Handle champion selection
  const handleChampionClick = (championId: string) => {
    // Only allow selection of available champions
    if (!isChampionUnavailable(championId)) {
      setSelectedChampion(championId);
      onSelectChampion(championId);
    }
  };

  // Handle confirm button click
  const handleConfirmClick = () => {
    if (selectedChampion) {
      onConfirmSelection();
      setSelectedChampion(null); // 선택 초기화
    }
  };

  // Available champion tags for filtering
  const championTags = [
    "Fighter",
    "Tank",
    "Mage",
    "Assassin",
    "Marksman",
    "Support",
  ];

  // Translate English tag names to Korean
  const translateTag = (tag: string) => {
    switch (tag) {
      case "Fighter":
        return "전사";
      case "Tank":
        return "탱커";
      case "Mage":
        return "마법사";
      case "Assassin":
        return "암살자";
      case "Marksman":
        return "원거리";
      case "Support":
        return "서포터";
      default:
        return tag;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">{getPhaseDescription()}</h2>
        <p className="text-lg">
          {currentTeam === "blue"
            ? gameInfo.status.blueTeamName
            : gameInfo.status.redTeamName}
          의 {getCurrentAction()} 차례
        </p>
        <p className="text-sm mt-2">Phase: {gameInfo.status.phase}/20</p>

        {/* Add timer component */}
        {gameInfo.timerSetting && (
          <div className="mt-3">
            <Timer
              duration={30} // 30 seconds per phase
              isActive={true} // Always active in solo mode
              onTimeout={handleTimerTimeout}
              resetKey={`phase-${gameInfo.status.phase}`}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Blue Team Panel */}
        <div className="bg-blue-900 bg-opacity-20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-400">
              {gameInfo.status.blueTeamName}
            </h3>
          </div>

          {/* Blue Bans */}
          <div className="mb-4">
            <h4 className="text-sm text-gray-400 mb-2">
              BANS ({blueBans.length}/5)
            </h4>
            <div className="flex flex-wrap gap-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={`blue-ban-${index}`}
                  className="w-10 h-10 rounded-md bg-gray-700 overflow-hidden"
                >
                  {blueBans[index] && (
                    <div className="relative w-full h-full">
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${blueBans[index]}.png`}
                        alt={blueBans[index]}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blue Picks */}
          <div>
            <h4 className="text-sm text-gray-400 mb-2">
              PICKS ({bluePicks.length}/5)
            </h4>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((position) => {
                const pick = bluePicks.find((p) => p.position === position);

                return (
                  <div
                    key={`blue-pick-${position}`}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`w-1 h-6 ${
                        currentTeam === "blue" && getCurrentAction() === "PICK"
                          ? "bg-yellow-400"
                          : "bg-gray-600"
                      }`}
                    ></div>
                    <div className="w-12 h-12 rounded-md bg-gray-700 overflow-hidden">
                      {pick && (
                        <Image
                          src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${pick.championId}.png`}
                          alt={pick.championId}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <span className="text-sm">블루 {position}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Champion Selection Area (Middle) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-600 text-white p-4 rounded-md">
              <p>{error}</p>
            </div>
          ) : (
            <div>
              {/* Search and filter controls */}
              <div className="mb-4 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="챔피언 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow p-2 rounded-md bg-gray-700 border border-gray-600"
                />
                <select
                  value={tagFilter || ""}
                  onChange={(e) => setTagFilter(e.target.value || null)}
                  className="p-2 rounded-md bg-gray-700 border border-gray-600"
                >
                  <option value="">전체 역할군</option>
                  {championTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {translateTag(tag)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Champions grid */}
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1 mb-4 max-h-[400px] overflow-y-auto p-2">
                {filteredChampions.map((champion) => {
                  const isUnavailable = isChampionUnavailable(champion.id);
                  return (
                    <div
                      key={champion.id}
                      className={`relative cursor-pointer transition-all ${
                        isUnavailable ? "cursor-not-allowed" : "hover:scale-105"
                      } ${
                        selectedChampion === champion.id
                          ? "ring-2 ring-yellow-400"
                          : ""
                      }`}
                      onClick={() => handleChampionClick(champion.id)}
                    >
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${champion.id}.png`}
                        alt={champion.name}
                        width={60}
                        height={60}
                        className={`w-full rounded-md ${
                          isUnavailable ? "grayscale opacity-40" : ""
                        }`}
                      />
                      <p
                        className={`text-xs text-center mt-1 truncate ${
                          isUnavailable ? "text-gray-500" : ""
                        }`}
                      >
                        {champion.name}
                      </p>
                    </div>
                  );
                })}

                {filteredChampions.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    조건에 맞는 챔피언이 없습니다
                  </div>
                )}
              </div>

              {/* Selected champion preview and confirmation button */}
              <div className="flex flex-col items-center mt-4">
                <div className="h-20 w-20 rounded-md bg-gray-700 overflow-hidden mb-2">
                  {selectedChampion && (
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${selectedChampion}.png`}
                      alt={selectedChampion}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <button
                  onClick={handleConfirmClick}
                  disabled={!selectedChampion}
                  className={`px-6 py-2 rounded-md text-white font-bold ${
                    selectedChampion
                      ? currentTeam === "blue"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-red-600 hover:bg-red-700"
                      : "bg-gray-600 cursor-not-allowed"
                  }`}
                >
                  {getCurrentAction()} 확정하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Red Team Panel */}
        <div className="bg-red-900 bg-opacity-20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-red-400">
              {gameInfo.status.redTeamName}
            </h3>
          </div>

          {/* Red Bans */}
          <div className="mb-4">
            <h4 className="text-sm text-gray-400 mb-2">
              BANS ({redBans.length}/5)
            </h4>
            <div className="flex flex-wrap gap-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={`red-ban-${index}`}
                  className="w-10 h-10 rounded-md bg-gray-700 overflow-hidden"
                >
                  {redBans[index] && (
                    <div className="relative w-full h-full">
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${redBans[index]}.png`}
                        alt={redBans[index]}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Red Picks */}
          <div>
            <h4 className="text-sm text-gray-400 mb-2">
              PICKS ({redPicks.length}/5)
            </h4>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((position) => {
                const pick = redPicks.find((p) => p.position === position);

                return (
                  <div
                    key={`red-pick-${position}`}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`w-1 h-6 ${
                        currentTeam === "red" && getCurrentAction() === "PICK"
                          ? "bg-yellow-400"
                          : "bg-gray-600"
                      }`}
                    ></div>
                    <div className="w-12 h-12 rounded-md bg-gray-700 overflow-hidden">
                      {pick && (
                        <Image
                          src={`https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/img/champion/${pick.championId}.png`}
                          alt={pick.championId}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <span className="text-sm">레드 {position}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

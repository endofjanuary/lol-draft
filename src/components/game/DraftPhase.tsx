import { useState, useEffect } from "react";
import Image from "next/image";
import { GameInfo, ChampionData } from "@/types/game"; // Import from shared types

interface DraftPhaseProps {
  gameInfo: GameInfo;
  nickname: string;
  position: string;
  onSelectChampion: (champion: string) => void;
  onConfirmSelection: () => void;
}

export default function DraftPhase({
  gameInfo,
  nickname,
  position,
  onSelectChampion,
  onConfirmSelection,
}: DraftPhaseProps) {
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [bannedChampions, setBannedChampions] = useState<string[]>([]);
  const [pickedChampions, setPickedChampions] = useState<{
    [key: string]: string;
  }>({});
  const [selectionSent, setSelectionSent] = useState(false);

  // New state for storing champion data from Riot API
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [isLoadingChampions, setIsLoadingChampions] = useState(true);
  const [championError, setChampionError] = useState<string | null>(null);

  // Mock data for demonstration - would come from API/server in real app
  const [currentTurnPosition, setCurrentTurnPosition] =
    useState<string>("blue1");
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<{ [key: string]: string }>({});
  const [redPicks, setRedPicks] = useState<{ [key: string]: string }>({});

  // Fetch champion data from Riot API
  useEffect(() => {
    const fetchChampions = async () => {
      try {
        setIsLoadingChampions(true);

        // Use the game version from gameInfo settings
        const version = gameInfo.settings.version;
        const language = "ko_KR"; // Set to Korean language, can be made configurable

        const RIOT_BASE_URL = "https://ddragon.leagueoflegends.com";
        const url = `${RIOT_BASE_URL}/cdn/${version}/data/${language}/champion.json`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch champions: ${response.status}`);
        }

        const data = await response.json();

        // Convert the data object to an array of champions
        const championsArray = Object.values(data.data) as ChampionData[];
        setChampions(championsArray);
      } catch (error) {
        console.error("Error fetching champion data:", error);
        setChampionError(
          error instanceof Error ? error.message : "Failed to load champions"
        );
      } finally {
        setIsLoadingChampions(false);
      }
    };

    fetchChampions();
  }, [gameInfo.settings.version]);

  // Determine if it's the current player's turn
  const isPlayerTurn = position === currentTurnPosition;

  // Set the current turn position based on the phase
  useEffect(() => {
    // This is a simplified mapping of phase to position
    // In a real app, this would be more comprehensive and come from the server
    const phase = gameInfo.status.phase;

    // Map phases to positions (simplified)
    if (phase >= 1 && phase <= 6) {
      // Ban phase 1 (blue→red→blue→red→blue→red)
      setCurrentTurnPosition(phase % 2 === 1 ? "blue1" : "red1");
    } else if (phase >= 7 && phase <= 12) {
      // Pick phase 1 (blue→red→red→blue→blue→red)
      if (phase === 7) setCurrentTurnPosition("blue1");
      else if (phase === 8) setCurrentTurnPosition("red1");
      else if (phase === 9) setCurrentTurnPosition("red2");
      else if (phase === 10) setCurrentTurnPosition("blue2");
      else if (phase === 11) setCurrentTurnPosition("blue3");
      else if (phase === 12) setCurrentTurnPosition("red3");
    } else if (phase >= 13 && phase <= 16) {
      // Ban phase 2 (red→blue→red→blue)
      setCurrentTurnPosition(phase % 2 === 0 ? "blue1" : "red1");
    } else if (phase >= 17 && phase <= 20) {
      // Pick phase 2 (red→blue→blue→red)
      if (phase === 17) setCurrentTurnPosition("red4");
      else if (phase === 18) setCurrentTurnPosition("blue4");
      else if (phase === 19) setCurrentTurnPosition("blue5");
      else if (phase === 20) setCurrentTurnPosition("red5");
    }
  }, [gameInfo.status.phase]);

  // Mock data setup for demonstration
  useEffect(() => {
    if (champions.length === 0) return;

    const phase = gameInfo.status.phase;

    // Update banned champions based on phase
    const mockBannedIds = [];
    for (let i = 1; i < phase && i <= 6 && i < champions.length; i++) {
      mockBannedIds.push(champions[i - 1].id);
    }

    // Add second ban phase
    if (phase > 12) {
      for (
        let i = 13;
        i < phase && i <= 16 && i + 6 - 13 < champions.length;
        i++
      ) {
        mockBannedIds.push(champions[i + 6 - 13].id);
      }
    }

    setBannedChampions(mockBannedIds);

    // Update blue and red bans
    setBlueBans(mockBannedIds.filter((_, i) => i % 2 === 0).slice(0, 5));
    setRedBans(mockBannedIds.filter((_, i) => i % 2 === 1).slice(0, 5));

    // Update picks based on phase
    const mockBluePicksObj: { [key: string]: string } = {};
    const mockRedPicksObj: { [key: string]: string } = {};

    // Only add mock picks if we have enough champions
    if (champions.length >= 30) {
      if (phase >= 7) {
        mockBluePicksObj["blue1"] = champions[20].id; // For phase 7
      }
      if (phase >= 8) {
        mockRedPicksObj["red1"] = champions[21].id; // For phase 8
      }
      if (phase >= 9) {
        mockRedPicksObj["red2"] = champions[22].id; // For phase 9
      }
      if (phase >= 10) {
        mockBluePicksObj["blue2"] = champions[23].id; // For phase 10
      }
      if (phase >= 11) {
        mockBluePicksObj["blue3"] = champions[24].id; // For phase 11
      }
      if (phase >= 12) {
        mockRedPicksObj["red3"] = champions[25].id; // For phase 12
      }

      // Second pick phase
      if (phase >= 17) {
        mockRedPicksObj["red4"] = champions[26].id; // For phase 17
      }
      if (phase >= 18) {
        mockBluePicksObj["blue4"] = champions[27].id; // For phase 18
      }
      if (phase >= 19) {
        mockBluePicksObj["blue5"] = champions[28].id; // For phase 19
      }
      if (phase >= 20) {
        mockRedPicksObj["red5"] = champions[29].id; // For phase 20
      }
    }

    setBluePicks(mockBluePicksObj);
    setRedPicks(mockRedPicksObj);

    // Combine all picked champions
    const allPicks = { ...mockBluePicksObj, ...mockRedPicksObj };
    setPickedChampions(allPicks);
  }, [gameInfo.status.phase, champions]);

  const handleChampionClick = (championId: string) => {
    if (!isPlayerTurn) return; // Only allow selection during player's turn

    // Don't allow selecting banned or picked champions
    if (bannedChampions.includes(championId)) return;
    if (Object.values(pickedChampions).includes(championId)) return;

    console.log(`Selected champion: ${championId}`); // Debug log
    setSelectedChampion(championId);
    setSelectionSent(false); // Reset the selection sent flag
    onSelectChampion(championId);
  };

  const handleConfirmSelection = () => {
    // Add more validation to ensure we have a valid champion ID
    if (!isPlayerTurn) {
      console.warn("Not your turn to select");
      return;
    }

    if (!selectedChampion) {
      console.warn("No champion selected");
      return;
    }

    // Check if the champion ID is valid
    if (
      typeof selectedChampion !== "string" ||
      selectedChampion.trim() === ""
    ) {
      console.error("Invalid champion ID:", selectedChampion);
      return;
    }

    // Prevent double-confirmation
    if (selectionSent) {
      console.warn("Selection already confirmed");
      return;
    }

    console.log(`Confirming selection: ${selectedChampion}`);

    // Mark that we've sent the selection
    setSelectionSent(true);

    // Call the parent component's confirmation handler
    onConfirmSelection();

    // Reset selection after confirmation (with a slight delay to prevent UI flicker)
    setTimeout(() => {
      setSelectedChampion(null);
    }, 200);
  };

  const getPhaseDescription = () => {
    const phase = gameInfo.status.phase;
    if (phase >= 1 && phase <= 6) return "BAN PHASE 1";
    if (phase >= 7 && phase <= 12) return "PICK PHASE 1";
    if (phase >= 13 && phase <= 16) return "BAN PHASE 2";
    if (phase >= 17 && phase <= 20) return "PICK PHASE 2";
    return "DRAFT PHASE";
  };

  const getCurrentAction = () => {
    const phase = gameInfo.status.phase;
    if (phase <= 6 || (phase >= 13 && phase <= 16)) return "BAN";
    return "PICK";
  };

  const isChampionDisabled = (championId: string) => {
    return (
      bannedChampions.includes(championId) ||
      Object.values(pickedChampions).includes(championId)
    );
  };

  // Get champion image URL from the champion ID
  const getChampionImageUrl = (championId: string) => {
    const version = gameInfo.settings.version;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
  };

  const renderTeamSlot = (team: string, position: number) => {
    const key = `${team}${position}`;
    const championId = team === "blue" ? bluePicks[key] : redPicks[key];

    return (
      <div className={`w-16 h-16 rounded-md bg-gray-800 overflow-hidden`}>
        {championId && (
          <Image
            src={getChampionImageUrl(championId)}
            alt={championId}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    );
  };

  const renderBanSlot = (team: string, index: number) => {
    const bans = team === "blue" ? blueBans : redBans;
    const championId = bans[index];

    return (
      <div className={`w-10 h-10 rounded-md bg-gray-800 overflow-hidden`}>
        {championId && (
          <div className="relative w-full h-full">
            <Image
              src={getChampionImageUrl(championId)}
              alt={championId}
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
    );
  };

  // Show loading state while fetching champion data
  if (isLoadingChampions) {
    return (
      <div className="min-h-screen bg-[#030C28] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="ml-3">챔피언 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  // Show error state if champion data fetch failed
  if (championError) {
    return (
      <div className="min-h-screen bg-[#030C28] text-white flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">⚠️ 오류</div>
        <p className="text-center max-w-md">{championError}</p>
        <p className="text-center text-sm mt-4">
          페이지를 새로고침하여 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4 flex flex-col">
      {/* Phase indicator */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">{getPhaseDescription()}</h2>
        <p className="text-lg">
          {isPlayerTurn
            ? `Your turn to ${getCurrentAction()}`
            : `Waiting for ${
                currentTurnPosition.startsWith("blue") ? "Blue" : "Red"
              } Team to ${getCurrentAction()}`}
        </p>
        <p className="text-sm mt-1">Phase: {gameInfo.status.phase}/20</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Blue Team */}
        <div className="w-full md:w-1/4 bg-blue-900 bg-opacity-20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-400">
              {gameInfo.status.blueTeamName || "Blue Team"}
            </h3>
            <span className="text-xl">{gameInfo.status.blueScore || 0}</span>
          </div>

          {/* Blue Bans */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-400 mb-2">BANS</h4>
            <div className="flex flex-wrap gap-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={`blue-ban-${index}`}
                  className="w-10 h-10 rounded-md bg-gray-800 overflow-hidden"
                >
                  {blueBans[index] && (
                    <div className="relative w-full h-full">
                      <Image
                        src={getChampionImageUrl(blueBans[index])}
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
            <h4 className="text-sm text-gray-400 mb-2">PICKS</h4>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((position) => (
                <div
                  key={`blue${position}`}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`
                    w-1 h-6 
                    ${
                      currentTurnPosition === `blue${position}`
                        ? "bg-yellow-400"
                        : "bg-gray-600"
                    }
                  `}
                  ></div>
                  {renderTeamSlot("blue", position)}
                  <span className="text-sm">{`BLUE ${position}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Champion Selection Grid */}
        <div className="w-full md:w-2/4 bg-gray-900 bg-opacity-30 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4">Select Champion</h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {champions.map((champion) => (
              <div
                key={champion.id}
                onClick={() => handleChampionClick(champion.id)}
                className={`
                  relative w-12 h-12 rounded-md overflow-hidden cursor-pointer
                  ${
                    isChampionDisabled(champion.id)
                      ? "opacity-30 grayscale"
                      : ""
                  }
                  ${
                    selectedChampion === champion.id
                      ? "ring-2 ring-yellow-400"
                      : ""
                  }
                  ${isPlayerTurn ? "hover:ring-1 hover:ring-white" : ""}
                `}
                title={champion.name}
              >
                <Image
                  src={getChampionImageUrl(champion.id)}
                  alt={champion.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Selection UI for player's turn */}
          {isPlayerTurn && (
            <div className="mt-4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-800 mb-2">
                {selectedChampion && (
                  <Image
                    src={getChampionImageUrl(selectedChampion)}
                    alt={selectedChampion}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                onClick={handleConfirmSelection}
                disabled={!selectedChampion}
                className={`
                  px-4 py-2 rounded-md font-bold
                  ${
                    selectedChampion
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-gray-600 cursor-not-allowed opacity-50"
                  }
                `}
              >
                선택완료
              </button>
            </div>
          )}
        </div>

        {/* Red Team */}
        <div className="w-full md:w-1/4 bg-red-900 bg-opacity-20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-red-400">
              {gameInfo.status.redTeamName || "Red Team"}
            </h3>
            <span className="text-xl">{gameInfo.status.redScore || 0}</span>
          </div>

          {/* Red Bans */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-400 mb-2">BANS</h4>
            <div className="flex flex-wrap gap-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={`red-ban-${index}`}
                  className="w-10 h-10 rounded-md bg-gray-800 overflow-hidden"
                >
                  {redBans[index] && (
                    <div className="relative w-full h-full">
                      <Image
                        src={getChampionImageUrl(redBans[index])}
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
            <h4 className="text-sm text-gray-400 mb-2">PICKS</h4>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((position) => (
                <div key={`red${position}`} className="flex items-center gap-2">
                  <div
                    className={`
                    w-1 h-6 
                    ${
                      currentTurnPosition === `red${position}`
                        ? "bg-yellow-400"
                        : "bg-gray-600"
                    }
                  `}
                  ></div>
                  {renderTeamSlot("red", position)}
                  <span className="text-sm">{`RED ${position}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

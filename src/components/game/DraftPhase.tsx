import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { GameInfo, ChampionData } from "@/types/game"; // Import from shared types
import Timer from "./Timer"; // Import the Timer component

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

  // States for selected champions
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<{ [key: string]: string }>({});
  const [redPicks, setRedPicks] = useState<{ [key: string]: string }>({});

  const [currentTurnPosition, setCurrentTurnPosition] =
    useState<string>("blue1");

  // Add new state for random champion selection
  const [availableChampions, setAvailableChampions] = useState<ChampionData[]>(
    []
  );

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

        // Sort champions by name according to the requested language
        championsArray.sort((a, b) => a.name.localeCompare(b.name, "ko"));

        setChampions(championsArray);
        setAvailableChampions(championsArray); // Initialize available champions
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

  // Update available champions whenever bans or picks change
  useEffect(() => {
    if (champions.length === 0) return;

    // Filter out banned and picked champions
    const allBannedChampions = [...blueBans, ...redBans];
    const allPickedChampions = Object.values({ ...bluePicks, ...redPicks });

    const availableChamps = champions.filter(
      (champion) =>
        !allBannedChampions.includes(champion.id) &&
        !allPickedChampions.includes(champion.id)
    );

    setAvailableChampions(availableChamps);
  }, [champions, blueBans, redBans, bluePicks, redPicks]);

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

  // Parse game data and update UI when phaseData changes
  useEffect(() => {
    // If no champions data or no phase data, return
    if (champions.length === 0) return;

    const phase = gameInfo.status.phase;
    const phaseData = gameInfo.status.phaseData || [];

    // Process real selections from phaseData
    const actualBlueBans: string[] = [];
    const actualRedBans: string[] = [];
    const actualBluePicks: { [key: string]: string } = {};
    const actualRedPicks: { [key: string]: string } = {};

    // Process each phase's data from gameInfo
    // Note: phaseData[0] is empty (phase 0), phaseData[1] is for phase 1, etc.
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
            actualBlueBans.push(selection);
          }
          // Phase 2,4,6 are Red bans
          else {
            actualRedBans.push(selection);
          }
        }
        // Phases 7-12 are first pick phase
        else if (phaseNum >= 7 && phaseNum <= 12) {
          if (phaseNum === 7) actualBluePicks["blue1"] = selection;
          else if (phaseNum === 8) actualRedPicks["red1"] = selection;
          else if (phaseNum === 9) actualRedPicks["red2"] = selection;
          else if (phaseNum === 10) actualBluePicks["blue2"] = selection;
          else if (phaseNum === 11) actualBluePicks["blue3"] = selection;
          else if (phaseNum === 12) actualRedPicks["red3"] = selection;
        }
        // Phases 13-16 are second ban phase (alternating red, blue)
        else if (phaseNum >= 13 && phaseNum <= 16) {
          // Phase 13,15 are Red bans
          if (phaseNum % 2 === 1) {
            actualRedBans.push(selection);
          }
          // Phase 14,16 are Blue bans
          else {
            actualBlueBans.push(selection);
          }
        }
        // Phases 17-20 are second pick phase
        else if (phaseNum >= 17 && phaseNum <= 20) {
          if (phaseNum === 17) actualRedPicks["red4"] = selection;
          else if (phaseNum === 18) actualBluePicks["blue4"] = selection;
          else if (phaseNum === 19) actualBluePicks["blue5"] = selection;
          else if (phaseNum === 20) actualRedPicks["red5"] = selection;
        }
      }
    }

    // Use real data
    const bannedChampsList = [...actualBlueBans, ...actualRedBans];
    setBannedChampions(bannedChampsList);
    setBlueBans(actualBlueBans);
    setRedBans(actualRedBans);
    setBluePicks(actualBluePicks);
    setRedPicks(actualRedPicks);

    // Combine all picked champions
    const allPicks = { ...actualBluePicks, ...actualRedPicks };
    setPickedChampions(allPicks);

    // If we have real data for the current phase or in the past, reset selected champion
    if (phase > 0 && phase < phaseData.length && phaseData[phase]) {
      setSelectedChampion(null);
    }
  }, [gameInfo.status.phaseData, gameInfo.status.phase, champions]);

  // Determine if it's the current player's turn based on game mode, phase, and position
  const isPlayerTurn = () => {
    const phase = gameInfo.status.phase;
    const playerType = gameInfo.settings.playerType;
    const playerTeam = position.startsWith("blue") ? "blue" : "red";
    const playerNumber = parseInt(
      position.replace("blue", "").replace("red", ""),
      10
    );

    // Spectator can never take actions
    if (position === "spectator") return false;

    // In 1v1 mode, each player handles all picks and bans for their team
    if (playerType === "1v1") {
      // Phase 1-6: First ban phase (blue→red→blue→red→blue→red)
      // Phase 13-16: Second ban phase (red→blue→red→blue)
      if ((phase >= 1 && phase <= 6) || (phase >= 13 && phase <= 16)) {
        // Ban phase - check if it's this team's turn to ban
        const isBlueTeamTurn =
          (phase >= 1 && phase <= 6 && phase % 2 === 1) || // First ban phase
          (phase >= 13 && phase <= 16 && phase % 2 === 0); // Second ban phase

        return (
          (isBlueTeamTurn && playerTeam === "blue") ||
          (!isBlueTeamTurn && playerTeam === "red")
        );
      }

      // Phase 7-12: First pick phase and Phase 17-20: Second pick phase
      if ((phase >= 7 && phase <= 12) || (phase >= 17 && phase <= 20)) {
        // Pick phase
        // First pick phase (7-12): blue→red→red→blue→blue→red
        if (phase >= 7 && phase <= 12) {
          if (phase === 7) return playerTeam === "blue";
          if (phase === 8 || phase === 9) return playerTeam === "red";
          if (phase === 10 || phase === 11) return playerTeam === "blue";
          if (phase === 12) return playerTeam === "red";
        }

        // Second pick phase (17-20): red→blue→blue→red
        if (phase >= 17 && phase <= 20) {
          if (phase === 17) return playerTeam === "red";
          if (phase === 18 || phase === 19) return playerTeam === "blue";
          if (phase === 20) return playerTeam === "red";
        }
      }
    }

    // In 5v5 mode
    if (playerType === "5v5") {
      // Ban phases - only player 1 from each team can ban
      if ((phase >= 1 && phase <= 6) || (phase >= 13 && phase <= 16)) {
        // Only player number 1 from each team can ban
        if (playerNumber !== 1) return false;

        // First ban phase (1-6): Blue→Red→Blue→Red→Blue→Red
        if (phase >= 1 && phase <= 6) {
          return (
            (phase % 2 === 1 && playerTeam === "blue") ||
            (phase % 2 === 0 && playerTeam === "red")
          );
        }

        // Second ban phase (13-16): Red→Blue→Red→Blue
        if (phase >= 13 && phase <= 16) {
          return (
            (phase % 2 === 1 && playerTeam === "red") ||
            (phase % 2 === 0 && playerTeam === "blue")
          );
        }
      }

      // Pick phases - each player has their own position
      if ((phase >= 7 && phase <= 12) || (phase >= 17 && phase <= 20)) {
        // Map phase to the player number that should pick
        let playerTurn;

        // First pick phase (7-12): blue1→red1→red2→blue2→blue3→red3
        if (phase === 7) playerTurn = "blue1";
        else if (phase === 8) playerTurn = "red1";
        else if (phase === 9) playerTurn = "red2";
        else if (phase === 10) playerTurn = "blue2";
        else if (phase === 11) playerTurn = "blue3";
        else if (phase === 12) playerTurn = "red3";
        // Second pick phase (17-20): red4→blue4→blue5→red5
        else if (phase === 17) playerTurn = "red4";
        else if (phase === 18) playerTurn = "blue4";
        else if (phase === 19) playerTurn = "blue5";
        else if (phase === 20) playerTurn = "red5";

        return position === playerTurn;
      }
    }

    return false;
  };

  // Store the current player's turn status
  const playersTurn = isPlayerTurn();

  const handleChampionClick = (championId: string) => {
    if (!playersTurn) return; // Only allow selection during player's turn

    // Don't allow selecting banned or picked champions
    if (bannedChampions.includes(championId)) return;
    if (Object.values(pickedChampions).includes(championId)) return;

    console.log(`Selected champion: ${championId}`); // Debug log

    // Only update if the selection has changed to avoid unnecessary re-renders
    if (selectedChampion !== championId) {
      setSelectedChampion(championId);
      setSelectionSent(false); // Reset the selection sent flag
      onSelectChampion(championId);
    }
  };

  const handleConfirmSelection = () => {
    // Add more validation to ensure we have a valid champion ID
    if (!playersTurn) {
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

    // Find champion name from its ID
    const championName = championId
      ? champions.find((c) => c.id === championId)?.name || championId
      : "";

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

  // Timer timeout handler - useCallback으로 최적화하고 비동기적으로 처리
  const handleTimerTimeout = useCallback(() => {
    if (!playersTurn) return; // Only handle timeout if it's player's turn

    const phase = gameInfo.status.phase;
    console.log(`타이머 만료: 페이즈 ${phase}`);

    // 비동기적으로 처리하여 렌더링 사이클과 분리
    setTimeout(() => {
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

          // Set selected champion in local state
          setSelectedChampion(randomChampion.id);
          onSelectChampion(randomChampion.id);

          // 상태 업데이트 후 확인 - 충분한 지연 시간 적용
          setTimeout(() => {
            console.log(`랜덤 선택 확정: ${randomChampion.id}`);
            onConfirmSelection();
          }, 500);
        } else {
          console.error("랜덤 선택할 사용 가능한 챔피언이 없습니다");
          onConfirmSelection();
        }
      }
    }, 0);
  }, [
    playersTurn,
    gameInfo.status.phase,
    availableChampions,
    onConfirmSelection,
    onSelectChampion,
  ]);

  // Render the timer with a stable reference
  const renderTimer = () => {
    // Only show timer when game has time limits enabled
    if (!gameInfo.settings.timeLimit) return null;

    return (
      <div className="mb-4">
        <Timer
          duration={30} // 30 seconds per phase
          isActive={playersTurn} // Only active during player's turn
          onTimeout={handleTimerTimeout}
          resetKey={`phase-${gameInfo.status.phase}`} // Change key to resetKey
        />
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

  // Optimize the render to prevent unnecessary re-renders of the timer
  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4 flex flex-col items-center justify-center">
      {/* Use max-w container to limit overall width */}
      <div className="w-full max-w-7xl">
        {/* Phase indicator */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">{getPhaseDescription()}</h2>
          <p className="text-lg">
            {playersTurn
              ? `Your turn to ${getCurrentAction()}`
              : `Waiting for ${
                  currentTurnPosition.startsWith("blue") ? "Blue" : "Red"
                } Team to ${getCurrentAction()}`}
          </p>
          <p className="text-sm mt-1">Phase: {gameInfo.status.phase}/20</p>

          {/* Render timer in its own div to isolate re-renders */}
          {playersTurn && gameInfo.settings.timeLimit && (
            <div className="mt-2">
              <Timer
                duration={30}
                isActive={playersTurn}
                onTimeout={handleTimerTimeout}
                resetKey={`phase-${gameInfo.status.phase}`}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Blue Team */}
          <div className="w-full md:w-1/4 bg-blue-900 bg-opacity-20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400">
                {gameInfo.status.blueTeamName || "Blue Team"}
              </h3>
              <span className="text-xl">{gameInfo.blueScore || 0}</span>
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
                {[1, 2, 3, 4, 5].map((position) => {
                  const key = `blue${position}`;
                  const championId = bluePicks[key];
                  const championName = championId
                    ? champions.find((c) => c.id === championId)?.name ||
                      championId
                    : "";

                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className={`
                      w-1 h-6 
                      ${
                        currentTurnPosition === key
                          ? "bg-yellow-400"
                          : "bg-gray-600"
                      }
                    `}
                      ></div>
                      {renderTeamSlot("blue", position)}
                      <div className="flex flex-col">
                        <span className="text-sm">{`BLUE ${position}`}</span>
                        {championName && (
                          <span className="text-xs text-blue-300">
                            {championName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Champion Selection Grid - Modified with fixed height and scrolling */}
          <div className="w-full md:w-2/4 bg-gray-900 bg-opacity-30 rounded-lg p-4 flex flex-col">
            {position === "spectator" ? (
              <div className="flex flex-col items-center justify-center h-full">
                {/* Banner Image */}
                {gameInfo.settings.bannerImage || gameInfo.bannerImage ? (
                  <div className="w-full h-64 bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <Image
                      src={
                        gameInfo.settings.bannerImage ||
                        gameInfo.bannerImage ||
                        ""
                      }
                      alt="Tournament Banner"
                      width={500}
                      height={250}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                    <p className="text-gray-400">
                      게임 배너 이미지가 표시됩니다
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">Select Champion</h3>
                {/* Add max-height and overflow for scrolling */}
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-4 max-h-[400px] overflow-y-auto p-2">
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
                      ${playersTurn ? "hover:ring-1 hover:ring-white" : ""}
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
                {playersTurn && (
                  <div className="mt-auto flex flex-col items-center">
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
              </>
            )}
          </div>

          {/* Red Team */}
          <div className="w-full md:w-1/4 bg-red-900 bg-opacity-20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-400">
                {gameInfo.status.redTeamName || "Red Team"}
              </h3>
              <span className="text-xl">{gameInfo.redScore || 0}</span>
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
                {[1, 2, 3, 4, 5].map((position) => {
                  const key = `red${position}`;
                  const championId = redPicks[key];
                  const championName = championId
                    ? champions.find((c) => c.id === championId)?.name ||
                      championId
                    : "";

                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className={`
                      w-1 h-6 
                      ${
                        currentTurnPosition === key
                          ? "bg-yellow-400"
                          : "bg-gray-600"
                      }
                    `}
                      ></div>
                      {renderTeamSlot("red", position)}
                      <div className="flex flex-col">
                        <span className="text-sm">{`RED ${position}`}</span>
                        {championName && (
                          <span className="text-xs text-red-300">
                            {championName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

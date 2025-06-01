import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { GameInfo, ChampionData, ChampionPosition } from "@/types/game"; // Import from shared types
import Timer from "./Timer"; // Import the Timer component
import {
  getAllPositions,
  getChampionPositions,
} from "@/utils/championPositions";
import { Socket } from "socket.io-client";

interface DraftPhaseProps {
  gameInfo: GameInfo;
  nickname: string;
  position: string;
  onSelectChampion: (champion: string) => void;
  onConfirmSelection: () => void;
  socket: Socket | null;
}

// mapTagToPosition 함수를 컴포넌트 외부로 이동
function mapTagToPosition(tag: string): ChampionPosition {
  const tagToPosition: Record<string, ChampionPosition> = {
    Fighter: "탑",
    Tank: "탑",
    Assassin: "미드",
    Mage: "미드",
    Marksman: "원딜",
    Support: "서폿",
  };
  return tagToPosition[tag] || "미드";
}

export default function DraftPhase({
  gameInfo,
  nickname,
  position,
  onSelectChampion,
  onConfirmSelection,
  socket,
}: DraftPhaseProps) {
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [currentPhaseSelectedChampion, setCurrentPhaseSelectedChampion] =
    useState<string | null>(null);
  const [bannedChampions, setBannedChampions] = useState<string[]>([]);
  const [pickedChampions, setPickedChampions] = useState<{
    [key: string]: string;
  }>({});
  const [selectionSent, setSelectionSent] = useState(false);

  // New state for storing champion data from Riot API
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [isLoadingChampions, setIsLoadingChampions] = useState(false);
  const [championError, setChampionError] = useState<string | null>(null);

  // States for selected champions
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<{ [key: string]: string }>({});
  const [redPicks, setRedPicks] = useState<{ [key: string]: string }>({});

  const [currentTurnPosition, setCurrentTurnPosition] =
    useState<string>("team1");

  // Add new state for random champion selection
  const [availableChampions, setAvailableChampions] = useState<ChampionData[]>(
    []
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<ChampionPosition | null>(null);

  // Available champion positions for filtering
  const championPositions = getAllPositions();

  // Filter champions based on search term and position filter
  const filteredChampions = useMemo(() => {
    return champions.filter((champion) => {
      // Filter by search term
      if (
        searchTerm &&
        !champion.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filter by position
      if (tagFilter && !getChampionPositions(champion.id).includes(tagFilter)) {
        return false;
      }

      return true;
    });
  }, [champions, searchTerm, tagFilter]);

  // Fetch champion data from Riot API
  useEffect(() => {
    console.log("DraftPhase: 컴포넌트 마운트 또는 의존성 변경됨");

    // 로딩 상태 체크 (이미 로딩 중이라면 중복 요청 방지)
    if (isLoadingChampions) {
      console.log("이미 챔피언 데이터를 로딩 중입니다");
      return;
    }

    // 이미 챔피언 데이터가 있는 경우 다시 로드하지 않음
    if (champions.length > 0) {
      console.log("이미 챔피언 데이터가 있습니다:", champions.length);
      return;
    }

    const fetchChampions = async () => {
      console.log("Fetching champion data...");
      setIsLoadingChampions(true);
      setChampionError(null);

      try {
        // 게임 설정에서 버전 정보를 가져오거나 기본값 사용
        let patchVersion = "latest";

        if (
          gameInfo?.settings?.version &&
          gameInfo.settings.version !== "latest"
        ) {
          patchVersion = gameInfo.settings.version;
          console.log("Using game settings version:", patchVersion);
        } else {
          // 최신 버전 정보를 가져옴
          try {
            console.log("최신 버전 정보 가져오기 시도...");
            const versionsResponse = await fetch(
              "https://ddragon.leagueoflegends.com/api/versions.json"
            );
            if (!versionsResponse.ok) {
              throw new Error(
                `Failed to fetch versions: ${versionsResponse.status}`
              );
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

        // 챔피언 데이터 가져오기
        console.log(
          `챔피언 데이터 요청 URL: https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/ko_KR/champion.json`
        );
        const response = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/ko_KR/champion.json`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch champions: ${response.status}`);
        }

        const data = await response.json();

        // 챔피언 데이터 변환 및 정렬
        const championsArray = Object.values(data.data).map((champion: any) => {
          const championData: ChampionData = {
            id: champion.id,
            key: champion.key,
            name: champion.name,
            image: champion.image,
            positions:
              champion.tags && Array.isArray(champion.tags)
                ? champion.tags.map((tag: string) => mapTagToPosition(tag))
                : ["미드"], // 기본 포지션
          };
          return championData;
        });

        championsArray.sort((a: any, b: any) =>
          a.name.localeCompare(b.name, "ko")
        );

        console.log(`챔피언 ${championsArray.length}개 로드 완료`);
        setChampions(championsArray);
        setAvailableChampions(championsArray); // Initialize available champions
      } catch (error) {
        console.error("Error fetching champion data:", error);
        setChampionError(
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setIsLoadingChampions(false);
      }
    };

    fetchChampions();
  }, []); // 빈 의존성 배열로 컴포넌트 마운트 시 한 번만 실행

  // Track phase change and update UI accordingly
  useEffect(() => {
    const prevPhaseRef = { current: gameInfo?.status?.phase || 0 };

    if (!gameInfo?.status) return;

    const currentPhase = gameInfo.status.phase;
    const previousPhase = prevPhaseRef.current;

    console.log(`페이즈 변경: ${previousPhase} -> ${currentPhase}`);

    // 페이즈가 변경되면 선택 상태 초기화
    if (previousPhase !== currentPhase) {
      console.log("새 페이즈로 전환: 선택 상태 초기화");
      setSelectedChampion(null);
      setCurrentPhaseSelectedChampion(null);
      setSelectionSent(false);
    }

    prevPhaseRef.current = currentPhase;

    // 새로운 페이즈에 대한 플레이어 턴 계산
    // 현재 턴 위치 업데이트 - 진영 기반에서 팀 기반으로 변경
    const updatePlayersTurn = (phase: number) => {
      // 현재 어느 팀이 어느 진영인지 확인
      const team1Side = gameInfo.status.team1Side || "blue";
      const team2Side = gameInfo.status.team2Side || "red";

      // 진영 기반 턴 순서를 팀 기반으로 변환하는 함수
      const getTeamForSide = (side: "blue" | "red") => {
        return team1Side === side ? "team1" : "team2";
      };

      // Ban phase 1 (blue→red→blue→red→blue→red)
      if (phase >= 1 && phase <= 6) {
        const isBluePhase = phase % 2 === 1;
        setCurrentTurnPosition(
          isBluePhase ? getTeamForSide("blue") : getTeamForSide("red")
        );
      }
      // Pick phase 1 (blue→red→red→blue→blue→red)
      else if (phase >= 7 && phase <= 12) {
        if (phase === 7) setCurrentTurnPosition(getTeamForSide("blue"));
        else if (phase === 8) setCurrentTurnPosition(getTeamForSide("red"));
        else if (phase === 9) setCurrentTurnPosition(getTeamForSide("red"));
        else if (phase === 10) setCurrentTurnPosition(getTeamForSide("blue"));
        else if (phase === 11) setCurrentTurnPosition(getTeamForSide("blue"));
        else if (phase === 12) setCurrentTurnPosition(getTeamForSide("red"));
      }
      // Ban phase 2 (red→blue→red→blue)
      else if (phase >= 13 && phase <= 16) {
        const isBluePhase = phase % 2 === 0;
        setCurrentTurnPosition(
          isBluePhase ? getTeamForSide("blue") : getTeamForSide("red")
        );
      }
      // Pick phase 2 (red→blue→blue→red)
      else if (phase >= 17 && phase <= 20) {
        if (phase === 17) setCurrentTurnPosition(getTeamForSide("red"));
        else if (phase === 18) setCurrentTurnPosition(getTeamForSide("blue"));
        else if (phase === 19) setCurrentTurnPosition(getTeamForSide("blue"));
        else if (phase === 20) setCurrentTurnPosition(getTeamForSide("red"));
      }
    };

    // 챔피언 목록 업데이트 함수
    const updateAvailableChampions = () => {
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
    };

    updatePlayersTurn(currentPhase);
    updateAvailableChampions();
  }, [
    gameInfo?.status?.phase,
    champions,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
  ]);

  // Update available champions whenever bans or picks change
  useEffect(() => {
    updateAvailableChampions();
  }, [blueBans, redBans, bluePicks, redPicks, champions]);

  // 챔피언 목록 업데이트 함수
  const updateAvailableChampions = () => {
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
  };

  // Set the current turn position based on the phase
  useEffect(() => {
    // 디버깅을 위해 페이즈 변경 로깅
    console.log(`Phase changed to: ${gameInfo.status.phase}`);

    // 즉시 모든 선택 상태 초기화
    setSelectedChampion(null);
    setCurrentPhaseSelectedChampion(null);
    setSelectionSent(false);

    // This is a simplified mapping of phase to position
    // In a real app, this would be more comprehensive and come from the server
    const phase = gameInfo.status.phase;

    // Map phases to positions (simplified)
    if (phase >= 1 && phase <= 6) {
      // Ban phase 1 (blue→red→blue→red→blue→red)
      setCurrentTurnPosition(phase % 2 === 1 ? "team1" : "team2");
    } else if (phase >= 7 && phase <= 12) {
      // Pick phase 1 (blue→red→red→blue→blue→red)
      if (phase === 7) setCurrentTurnPosition("team1");
      else if (phase === 8) setCurrentTurnPosition("team2");
      else if (phase === 9) setCurrentTurnPosition("team2");
      else if (phase === 10) setCurrentTurnPosition("team1");
      else if (phase === 11) setCurrentTurnPosition("team1");
      else if (phase === 12) setCurrentTurnPosition("team2");
    } else if (phase >= 13 && phase <= 16) {
      // Ban phase 2 (red→blue→red→blue)
      setCurrentTurnPosition(phase % 2 === 0 ? "team1" : "team2");
    } else if (phase >= 17 && phase <= 20) {
      // Pick phase 2 (red→blue→blue→red)
      if (phase === 17) setCurrentTurnPosition("team2");
      else if (phase === 18) setCurrentTurnPosition("team1");
      else if (phase === 19) setCurrentTurnPosition("team1");
      else if (phase === 20) setCurrentTurnPosition("team2");
    }
  }, [gameInfo.status.phase]);

  // Parse game data and update UI when phaseData changes
  useEffect(() => {
    // If no champions data or no phase data, return
    if (champions.length === 0) return;

    const phase = gameInfo.status.phase;
    const phaseData = gameInfo.status.phaseData || [];

    // Process real selections from phaseData
    const actualBlueBans: string[] = Array(5).fill(""); // Initialize with empty strings
    const actualRedBans: string[] = Array(5).fill(""); // Initialize with empty strings
    const actualBluePicks: { [key: string]: string } = {};
    const actualRedPicks: { [key: string]: string } = {};

    // Process each phase's data from gameInfo
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
            const banIndex = Math.floor((phaseNum - 1) / 2);
            actualBlueBans[banIndex] = selection;
          }
          // Phase 2,4,6 are Red bans
          else {
            const banIndex = Math.floor((phaseNum - 2) / 2);
            actualRedBans[banIndex] = selection;
          }
        }
        // Phases 7-12 are first pick phase
        else if (phaseNum >= 7 && phaseNum <= 12) {
          // 1v1 모드에서는 각 픽에 고유한 키 사용
          if (phaseNum === 7) actualBluePicks[`pick1`] = selection; // 블루 1픽
          else if (phaseNum === 8)
            actualRedPicks[`pick1`] = selection; // 레드 1픽
          else if (phaseNum === 9)
            actualRedPicks[`pick2`] = selection; // 레드 2픽
          else if (phaseNum === 10)
            actualBluePicks[`pick2`] = selection; // 블루 2픽
          else if (phaseNum === 11)
            actualBluePicks[`pick3`] = selection; // 블루 3픽
          else if (phaseNum === 12) actualRedPicks[`pick3`] = selection; // 레드 3픽
        }
        // Phases 13-16 are second ban phase (alternating red, blue)
        else if (phaseNum >= 13 && phaseNum <= 16) {
          // Phase 13,15 are Red bans
          if (phaseNum % 2 === 1) {
            const banIndex = 3 + Math.floor((phaseNum - 13) / 2);
            actualRedBans[banIndex] = selection;
          }
          // Phase 14,16 are Blue bans
          else {
            const banIndex = 3 + Math.floor((phaseNum - 14) / 2);
            actualBlueBans[banIndex] = selection;
          }
        }
        // Phases 17-20 are second pick phase
        else if (phaseNum >= 17 && phaseNum <= 20) {
          // 1v1 모드에서는 각 픽에 고유한 키 사용
          if (phaseNum === 17) actualRedPicks[`pick4`] = selection; // 레드 4픽
          else if (phaseNum === 18)
            actualBluePicks[`pick4`] = selection; // 블루 4픽
          else if (phaseNum === 19)
            actualBluePicks[`pick5`] = selection; // 블루 5픽
          else if (phaseNum === 20) actualRedPicks[`pick5`] = selection; // 레드 5픽
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

  // champion_selected 이벤트 처리
  useEffect(() => {
    if (!socket) return;

    const handleChampionSelected = (data: {
      nickname: string;
      position: string;
      champion: string;
      phase: number;
      isConfirmed: boolean;
    }) => {
      console.log("champion_selected 이벤트 수신:", data);

      // 현재 페이즈가 아닌 선택은 무시
      if (data.phase !== gameInfo.status.phase) {
        console.log(
          `다른 페이즈(${data.phase})의 선택은 무시합니다. 현재 페이즈: ${gameInfo.status.phase}`
        );
        return;
      }

      // 현재 페이즈의 선택된 챔피언을 업데이트
      setCurrentPhaseSelectedChampion(data.champion);

      // 내가 선택한 챔피언인 경우
      if (data.nickname === nickname) {
        setSelectedChampion(data.champion);
      }

      // 확정된 경우 (다른 플레이어의 선택이 확정되었을 때)
      if (data.isConfirmed) {
        // 선택된 챔피언을 현재 페이즈의 데이터에 미리 추가
        // 서버에서 phase_progressed 이벤트가 도착하기 전에 UI에 반영
        const currentPhase = gameInfo.status.phase;
        const selectedChampion = data.champion;

        // 선택한 챔피언이 BAN인지 PICK인지 판단
        if (currentPhase <= 6 || (currentPhase >= 13 && currentPhase <= 16)) {
          // BAN 페이즈인 경우
          if (
            currentPhase % 2 === 1 ||
            (currentPhase >= 13 && currentPhase % 2 === 1)
          ) {
            // 블루팀 BAN
            const blueIndex =
              currentPhase <= 6
                ? Math.floor((currentPhase - 1) / 2)
                : 3 + Math.floor((currentPhase - 14) / 2);
            const newBlueBans = [...blueBans];
            newBlueBans[blueIndex] = selectedChampion;
            setBlueBans(newBlueBans);

            // 전체 밴 리스트도 업데이트
            setBannedChampions([...redBans, ...newBlueBans]);
          } else {
            // 레드팀 BAN
            const redIndex =
              currentPhase <= 6
                ? Math.floor((currentPhase - 2) / 2)
                : 3 + Math.floor((currentPhase - 13) / 2);
            const newRedBans = [...redBans];
            newRedBans[redIndex] = selectedChampion;
            setRedBans(newRedBans);

            // 전체 밴 리스트도 업데이트
            setBannedChampions([...newRedBans, ...blueBans]);
          }
        } else {
          // PICK 페이즈인 경우
          let teamPosition = "";

          // 픽 페이즈에 따라 포지션 결정 - 1v1 모드에 맞게 고유 키 사용
          if (currentPhase === 7) teamPosition = "pick1"; // 블루 1픽
          else if (currentPhase === 8) teamPosition = "pick1"; // 레드 1픽
          else if (currentPhase === 9) teamPosition = "pick2"; // 레드 2픽
          else if (currentPhase === 10) teamPosition = "pick2"; // 블루 2픽
          else if (currentPhase === 11) teamPosition = "pick3"; // 블루 3픽
          else if (currentPhase === 12) teamPosition = "pick3"; // 레드 3픽
          else if (currentPhase === 17) teamPosition = "pick4"; // 레드 4픽
          else if (currentPhase === 18) teamPosition = "pick4"; // 블루 4픽
          else if (currentPhase === 19) teamPosition = "pick5"; // 블루 5픽
          else if (currentPhase === 20) teamPosition = "pick5"; // 레드 5픽

          // 현재 페이즈가 블루팀 턴인지 레드팀 턴인지 확인
          const isBlueTeamPhase = [7, 10, 11, 18, 19].includes(currentPhase);

          if (isBlueTeamPhase) {
            const newBluePicks = { ...bluePicks };
            newBluePicks[teamPosition] = selectedChampion;
            setBluePicks(newBluePicks);

            // 전체 픽 리스트도 업데이트
            setPickedChampions({ ...redPicks, ...newBluePicks });
          } else {
            const newRedPicks = { ...redPicks };
            newRedPicks[teamPosition] = selectedChampion;
            setRedPicks(newRedPicks);

            // 전체 픽 리스트도 업데이트
            setPickedChampions({ ...bluePicks, ...newRedPicks });
          }
        }

        // UI 깜빡임 방지를 위해 선택 챔피언 초기화를 지연시키지 않고 즉시 초기화
        setCurrentPhaseSelectedChampion(null);
        if (data.nickname === nickname) {
          setSelectedChampion(null);
          setSelectionSent(false);
        }
      }
    };

    socket.on("champion_selected", handleChampionSelected);

    return () => {
      socket.off("champion_selected", handleChampionSelected);
    };
  }, [
    socket,
    nickname,
    gameInfo.status.phase,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
  ]);

  // Determine if it's the current player's turn based on game mode, phase, and position
  const isPlayerTurn = () => {
    const phase = gameInfo.status.phase;
    const playerType = gameInfo.settings.playerType;
    const playerTeam = position.startsWith("team1") ? "team1" : "team2";

    // Spectator can never take actions
    if (position === "spectator") return false;

    // 현재 어느 팀이 어느 진영인지 확인
    const team1Side = gameInfo.status.team1Side || "blue";
    const team2Side = gameInfo.status.team2Side || "red";

    // 플레이어 팀이 현재 어느 진영인지 확인
    const playerSide = playerTeam === "team1" ? team1Side : team2Side;

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
          (isBlueTeamTurn && playerSide === "blue") ||
          (!isBlueTeamTurn && playerSide === "red")
        );
      }

      // Phase 7-12: First pick phase and Phase 17-20: Second pick phase
      if ((phase >= 7 && phase <= 12) || (phase >= 17 && phase <= 20)) {
        // Pick phase
        // First pick phase (7-12): blue→red→red→blue→blue→red
        if (phase >= 7 && phase <= 12) {
          if (phase === 7) return playerSide === "blue";
          if (phase === 8 || phase === 9) return playerSide === "red";
          if (phase === 10 || phase === 11) return playerSide === "blue";
          if (phase === 12) return playerSide === "red";
        }

        // Second pick phase (17-20): red→blue→blue→red
        if (phase >= 17 && phase <= 20) {
          if (phase === 17) return playerSide === "red";
          if (phase === 18 || phase === 19) return playerSide === "blue";
          if (phase === 20) return playerSide === "red";
        }
      }
    }

    return false;
  };

  // Store the current player's turn status
  const playersTurn = isPlayerTurn();

  const handleChampionClick = (championId: string) => {
    console.log(`=== 챔피언 클릭: ${championId} ===`);
    console.log("플레이어 턴:", playersTurn);
    console.log("현재 페이즈:", gameInfo.status.phase);

    if (!playersTurn) {
      console.warn("플레이어 턴이 아님");
      return; // Only allow selection during player's turn
    }

    // Check if champion is disabled and provide specific feedback
    if (isChampionDisabled(championId)) {
      // 현재 게임에서 밴된 챔피언들
      const currentBannedChampions = [...blueBans, ...redBans].filter(Boolean);
      const currentPickedChampions = [
        ...Object.values(bluePicks),
        ...Object.values(redPicks),
      ].filter(Boolean);

      // phaseData에서 직접 체크
      const phaseData = gameInfo.status.phaseData || [];
      const allSelectionsFromPhaseData: string[] = [];

      for (
        let phase = 1;
        phase <= Math.min(gameInfo.status.phase - 1, 20);
        phase++
      ) {
        if (phaseData[phase] && phaseData[phase].trim() !== "") {
          allSelectionsFromPhaseData.push(phaseData[phase]);
        }
      }

      let reason = "";
      if (allSelectionsFromPhaseData.includes(championId)) {
        reason = "이미 선택됨 (phaseData 기준)";
      } else if (currentBannedChampions.includes(championId)) {
        reason = "이미 밴된 챔피언입니다.";
      } else if (currentPickedChampions.includes(championId)) {
        reason = "이미 선택된 챔피언입니다.";
      } else if (
        gameInfo.settings.globalBans &&
        gameInfo.settings.globalBans.includes(championId)
      ) {
        reason = "글로벌 밴 챔피언입니다.";
      } else if (gameInfo.settings.draftType === "hardFearless") {
        const currentSet = gameInfo.status.setNumber || 1;
        if (currentSet > 1) {
          const previousSetPicks = gameInfo.status.previousSetPicks || {};
          for (let set = 1; set < currentSet; set++) {
            const setPicks = previousSetPicks[`set${set}`] || [];
            if (setPicks.includes(championId)) {
              reason = `이전 세트(Set ${set})에서 선택된 챔피언입니다. (하드피어리스 모드)`;
              break;
            }
          }
        }
      }

      // 사용자에게 알림 표시 (부모 컴포넌트의 에러 핸들러 사용)
      console.warn(`챔피언 선택 불가: ${championId} - ${reason}`);
      console.log("phaseData 선택들:", allSelectionsFromPhaseData);
      return;
    }

    console.log(`챔피언 선택 가능: ${championId}`); // Debug log

    // Only update if the selection has changed to avoid unnecessary re-renders
    if (selectedChampion !== championId) {
      setSelectedChampion(championId);
      setSelectionSent(false); // Reset the selection sent flag
      onSelectChampion(championId);
      console.log(`선택 상태 업데이트: ${championId}`);
    } else {
      console.log("이미 선택된 챔피언");
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

    // 선택을 서버로 전송하기 전에 챔피언 정보 저장
    const championToConfirm = selectedChampion;

    // 확정 전에 즉시 선택 상태 초기화 - 다음 페이즈에 영향 없도록
    setSelectedChampion(null);
    setCurrentPhaseSelectedChampion(null);
    setSelectionSent(true); // 확정 상태로 설정

    // 미리 로컬에서 UI 업데이트 (깜빡임 방지)
    const currentPhase = gameInfo.status.phase;

    // 확정할 챔피언의 페이즈 정보 저장
    if (currentPhase <= 6 || (currentPhase >= 13 && currentPhase <= 16)) {
      // BAN 페이즈인 경우
      if (
        currentPhase % 2 === 1 ||
        (currentPhase >= 13 && currentPhase % 2 === 1)
      ) {
        // 블루팀 BAN
        const blueIndex =
          currentPhase <= 6
            ? Math.floor((currentPhase - 1) / 2)
            : 3 + Math.floor((currentPhase - 14) / 2);
        const newBlueBans = [...blueBans];
        newBlueBans[blueIndex] = championToConfirm;
        setBlueBans(newBlueBans);

        // 전체 밴 리스트도 업데이트
        setBannedChampions([...redBans, ...newBlueBans]);
      } else {
        // 레드팀 BAN
        const redIndex =
          currentPhase <= 6
            ? Math.floor((currentPhase - 2) / 2)
            : 3 + Math.floor((currentPhase - 13) / 2);
        const newRedBans = [...redBans];
        newRedBans[redIndex] = championToConfirm;
        setRedBans(newRedBans);

        // 전체 밴 리스트도 업데이트
        setBannedChampions([...newRedBans, ...blueBans]);
      }
    } else {
      // PICK 페이즈인 경우
      let teamPosition = "";

      // 픽 페이즈에 따라 포지션 결정 - 1v1 모드에 맞게 고유 키 사용
      if (currentPhase === 7) teamPosition = "pick1"; // 블루 1픽
      else if (currentPhase === 8) teamPosition = "pick1"; // 레드 1픽
      else if (currentPhase === 9) teamPosition = "pick2"; // 레드 2픽
      else if (currentPhase === 10) teamPosition = "pick2"; // 블루 2픽
      else if (currentPhase === 11) teamPosition = "pick3"; // 블루 3픽
      else if (currentPhase === 12) teamPosition = "pick3"; // 레드 3픽
      else if (currentPhase === 17) teamPosition = "pick4"; // 레드 4픽
      else if (currentPhase === 18) teamPosition = "pick4"; // 블루 4픽
      else if (currentPhase === 19) teamPosition = "pick5"; // 블루 5픽
      else if (currentPhase === 20) teamPosition = "pick5"; // 레드 5픽

      // 현재 페이즈가 블루팀 턴인지 레드팀 턴인지 확인
      const isBlueTeamPhase = [7, 10, 11, 18, 19].includes(currentPhase);

      if (isBlueTeamPhase) {
        const newBluePicks = { ...bluePicks };
        newBluePicks[teamPosition] = championToConfirm;
        setBluePicks(newBluePicks);

        // 전체 픽 리스트도 업데이트
        setPickedChampions({ ...redPicks, ...newBluePicks });
      } else {
        const newRedPicks = { ...redPicks };
        newRedPicks[teamPosition] = championToConfirm;
        setRedPicks(newRedPicks);

        // 전체 픽 리스트도 업데이트
        setPickedChampions({ ...bluePicks, ...newRedPicks });
      }
    }

    // Call the parent component's confirmation handler
    onConfirmSelection();

    // 200ms 후 선택 확정 상태 다시 초기화
    setTimeout(() => {
      setSelectionSent(false);
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
    // phaseData를 직접 참조하여 실시간 상태 확인
    const phaseData = gameInfo.status.phaseData || [];

    // 현재 페이즈까지의 모든 선택된 챔피언들을 phaseData에서 직접 추출
    const allSelectionsFromPhaseData: string[] = [];

    for (
      let phase = 1;
      phase <= Math.min(gameInfo.status.phase - 1, 20);
      phase++
    ) {
      if (phaseData[phase] && phaseData[phase].trim() !== "") {
        allSelectionsFromPhaseData.push(phaseData[phase]);
      }
    }

    // phaseData 기반 실시간 체크 (가장 정확한 소스)
    const isAlreadySelected = allSelectionsFromPhaseData.includes(championId);

    // 백업용: 로컬 상태 기반 체크
    const currentBannedChampions = [...blueBans, ...redBans].filter(Boolean);
    const currentPickedChampions = [
      ...Object.values(bluePicks),
      ...Object.values(redPicks),
    ].filter(Boolean);

    const isCurrentlyBanned = currentBannedChampions.includes(championId);
    const isCurrentlyPicked = currentPickedChampions.includes(championId);

    // 글로벌 밴 체크
    const isGloballyBanned =
      gameInfo.settings.globalBans &&
      gameInfo.settings.globalBans.includes(championId);

    // 하드피어리스 모드 체크
    let isPreviousSetPicked = false;
    if (gameInfo.settings.draftType === "hardFearless") {
      const currentSet = gameInfo.status.setNumber || 1;
      if (currentSet > 1) {
        const previousSetPicks = gameInfo.status.previousSetPicks || {};
        for (let set = 1; set < currentSet; set++) {
          const setPicks = previousSetPicks[`set${set}`] || [];
          if (setPicks.includes(championId)) {
            isPreviousSetPicked = true;
            break;
          }
        }
      }
    }

    // 디버깅 로그 추가
    if (isAlreadySelected || isCurrentlyBanned || isCurrentlyPicked) {
      console.log(`챔피언 ${championId} 비활성화:`, {
        phaseDataSelected: isAlreadySelected,
        localBanned: isCurrentlyBanned,
        localPicked: isCurrentlyPicked,
        allSelectionsFromPhaseData,
        currentPhase: gameInfo.status.phase,
      });
    }

    return (
      isAlreadySelected || // phaseData 기반 체크 (최우선)
      isCurrentlyBanned ||
      isCurrentlyPicked ||
      isGloballyBanned ||
      isPreviousSetPicked
    );
  };

  // Get champion image URL from the champion ID
  const getChampionImageUrl = (championId: string) => {
    const version = gameInfo.settings?.version || "13.24.1";
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
  };

  const renderBanSlot = (team: string, index: number) => {
    const bans = team === "team1" ? blueBans : redBans;
    const championId = bans[index];
    const currentPhase = gameInfo.status.phase;

    // 밴 페이즈 계산 수정
    let banPhase;
    if (index < 3) {
      // 첫 번째 밴 페이즈 (1-6)
      banPhase = team === "team1" ? index * 2 + 1 : index * 2 + 2;
    } else {
      // 두 번째 밴 페이즈 (13-16)
      const secondBanIndex = index - 3;
      if (team === "team2") {
        banPhase = 13 + secondBanIndex * 2;
      } else {
        banPhase = 14 + secondBanIndex * 2;
      }
    }

    // 현재 페이즈가 정확히 이 슬롯의 밴 페이즈와 일치하는지 확인
    const isCurrentPhase = currentPhase === banPhase;

    // 정확한 페이즈가 아니거나 선택이 확정된 상태면 선택 중인 챔피언 표시하지 않음
    const shouldShowSelectedChampion =
      isCurrentPhase && currentPhaseSelectedChampion && !selectionSent;

    return (
      <div
        className={`w-10 h-10 rounded-md bg-gray-800 overflow-hidden relative`}
      >
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
        {shouldShowSelectedChampion && (
          <div className="absolute inset-0 border-2 border-yellow-400 rounded-md">
            <Image
              src={getChampionImageUrl(currentPhaseSelectedChampion)}
              alt={currentPhaseSelectedChampion}
              width={40}
              height={40}
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        )}
      </div>
    );
  };

  // Debug: 현재 밴/픽 상태 로깅
  useEffect(() => {
    const currentBannedChampions = [...blueBans, ...redBans].filter(Boolean);
    const currentPickedChampions = [
      ...Object.values(bluePicks),
      ...Object.values(redPicks),
    ].filter(Boolean);

    console.log("=== 드래프트 상태 디버깅 ===");
    console.log("현재 페이즈:", gameInfo.status.phase);
    console.log("phaseData:", gameInfo.status.phaseData);
    console.log("현재 밴된 챔피언들:", currentBannedChampions);
    console.log("현재 픽된 챔피언들:", currentPickedChampions);
    console.log("bluePicks:", bluePicks);
    console.log("redPicks:", redPicks);
    console.log("드래프트 타입:", gameInfo.settings.draftType);

    if (gameInfo.settings.draftType === "hardFearless") {
      console.log(
        "하드피어리스 모드 - 이전 세트 픽들:",
        gameInfo.status.previousSetPicks
      );
    }
    console.log("=========================");
  }, [
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    gameInfo.status.phase,
    gameInfo.status.phaseData,
    gameInfo.settings.draftType,
    gameInfo.status.previousSetPicks,
  ]);

  return (
    <div className="h-screen bg-[#030C28] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e2328] border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-xl font-bold text-blue-400">
            {gameInfo.status.team1Side === "blue"
              ? gameInfo.status.team1Name
              : gameInfo.status.team2Name}
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">이의반 내전 1경기 2세트</div>
            <div className="text-sm text-gray-400">
              Lobby #{gameInfo.game?.gameCode || "Unknown"}
            </div>
            <div className="text-yellow-400 font-bold text-lg mt-1">
              {Math.max(
                0,
                60 -
                  Math.floor(
                    (Date.now() - (gameInfo.status.lastUpdatedAt || 0)) / 1000
                  )
              )}
            </div>
          </div>
          <div className="text-xl font-bold text-red-400">
            {gameInfo.status.team2Side === "red"
              ? gameInfo.status.team2Name
              : gameInfo.status.team1Name}
          </div>
        </div>
      </div>

      {/* Main Draft Area */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full min-h-0">
        {/* Left Team (Blue Side) */}
        <div className="w-80 bg-[#1e2328] border-r border-gray-700 p-4 flex-shrink-0 overflow-y-auto">
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => {
              const playerNum = i + 1;

              // 1v1 모드에서 각 플레이어 슬롯에 해당하는 픽 가져오기
              let championId = null;
              if (gameInfo.settings.playerType === "1v1") {
                const phaseData = gameInfo.status.phaseData || [];

                // 각 플레이어 슬롯별 픽 페이즈 매핑 (블루팀이 왼쪽에 표시)
                const pickPhases =
                  gameInfo.status.team1Side === "blue"
                    ? [7, 10, 11, 18, 19] // 블루팀 픽 페이즈들
                    : [8, 9, 12, 17, 20]; // 레드팀 픽 페이즈들

                const phaseIndex = pickPhases[i];
                if (phaseIndex && phaseData[phaseIndex]) {
                  championId = phaseData[phaseIndex];
                } else {
                  // phaseData에서 찾지 못했다면 로컬 상태에서 찾기
                  const pickKeys = [
                    `pick1`,
                    `pick2`,
                    `pick3`,
                    `pick4`,
                    `pick5`,
                  ];
                  const isTeam1Blue = gameInfo.status.team1Side === "blue";
                  const picks = isTeam1Blue ? bluePicks : redPicks;
                  championId = picks[pickKeys[i]] || null;
                }
              }

              return (
                <div
                  key={`left-player-${i}`}
                  className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-md overflow-hidden border border-gray-600 flex-shrink-0">
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
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {championId
                          ? champions.find((c) => c.id === championId)?.name ||
                            championId
                          : "Champion Name"}
                      </div>
                      <div className="text-sm text-gray-400">
                        Player {playerNum}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blue Team Bans */}
          <div className="mt-6">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={`blue-ban-${i}`}>
                  {renderBanSlot(
                    gameInfo.status.team1Side === "blue" ? "team1" : "team2",
                    i
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Champion Selection */}
        <div className="flex-1 bg-[#0f1419] p-6 flex flex-col min-h-0">
          {/* Current Phase Info */}
          <div className="text-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold mb-2">{getPhaseDescription()}</h2>
            <div className="text-lg text-gray-300 mb-2">
              Phase {gameInfo.status.phase} - {getCurrentAction()}
            </div>

            {/* Current Turn */}
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              {playersTurn ? (
                <span className="text-green-400 font-semibold text-lg">
                  🎯 당신의 차례입니다 - {getCurrentAction()}
                </span>
              ) : (
                <span className="text-yellow-400">
                  {currentTurnPosition === "team1"
                    ? `${gameInfo.status.team1Name}의 차례`
                    : `${gameInfo.status.team2Name}의 차례`}
                </span>
              )}
            </div>

            {/* Confirm Button */}
            {playersTurn && selectedChampion && (
              <button
                onClick={handleConfirmSelection}
                disabled={selectionSent}
                className={`
                  px-8 py-3 rounded-lg font-bold text-lg transition-all mb-4
                  ${
                    selectionSent
                      ? "bg-gray-600 cursor-not-allowed text-gray-300"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  }
                `}
              >
                {selectionSent ? "확정 중..." : `${getCurrentAction()} 확정`}
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="mb-4 flex gap-4 flex-shrink-0">
            <input
              type="text"
              placeholder="챔피언 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={tagFilter || ""}
              onChange={(e) =>
                setTagFilter((e.target.value as ChampionPosition) || null)
              }
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 포지션</option>
              {championPositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* Champion Grid */}
          <div className="flex-1 min-h-0">
            {isLoadingChampions ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p>챔피언 목록을 불러오는 중...</p>
                </div>
              </div>
            ) : championError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400">
                  <p>챔피언 목록을 불러오는데 실패했습니다</p>
                  <p className="text-sm">{championError}</p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-8 gap-3 p-2">
                  {filteredChampions.map((champion) => {
                    const isDisabled = isChampionDisabled(champion.id);
                    const isSelected = selectedChampion === champion.id;

                    // Disabled 이유 생성
                    let disabledReason = "";
                    if (isDisabled) {
                      const currentBannedChampions = [
                        ...blueBans,
                        ...redBans,
                      ].filter(Boolean);
                      const currentPickedChampions = [
                        ...Object.values(bluePicks),
                        ...Object.values(redPicks),
                      ].filter(Boolean);

                      if (currentBannedChampions.includes(champion.id)) {
                        disabledReason = "밴됨";
                      } else if (currentPickedChampions.includes(champion.id)) {
                        disabledReason = "이미 선택됨";
                      } else if (
                        gameInfo.settings.globalBans &&
                        gameInfo.settings.globalBans.includes(champion.id)
                      ) {
                        disabledReason = "글로벌 밴";
                      } else if (
                        gameInfo.settings.draftType === "hardFearless"
                      ) {
                        const currentSet = gameInfo.status.setNumber || 1;
                        if (currentSet > 1) {
                          const previousSetPicks =
                            gameInfo.status.previousSetPicks || {};
                          for (let set = 1; set < currentSet; set++) {
                            const setPicks =
                              previousSetPicks[`set${set}`] || [];
                            if (setPicks.includes(champion.id)) {
                              disabledReason = `이전 세트에서 선택됨 (하드피어리스)`;
                              break;
                            }
                          }
                        }
                      }
                    }

                    return (
                      <div
                        key={champion.id}
                        className={`
                          relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all
                          ${
                            isDisabled
                              ? "opacity-30 cursor-not-allowed border-gray-600"
                              : isSelected
                              ? "border-yellow-400 shadow-lg shadow-yellow-400/50 transform scale-110"
                              : "border-gray-600 hover:border-blue-400 hover:scale-105"
                          }
                        `}
                        onClick={() =>
                          !isDisabled && handleChampionClick(champion.id)
                        }
                        title={
                          isDisabled
                            ? `${champion.name} - ${disabledReason}`
                            : champion.name
                        }
                      >
                        <Image
                          src={getChampionImageUrl(champion.id)}
                          alt={champion.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-yellow-400/20"></div>
                        )}
                        {/* Disabled 상태일 때 작은 아이콘 표시 */}
                        {isDisabled && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✕</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Team (Red Side) */}
        <div className="w-80 bg-[#1e2328] border-l border-gray-700 p-4 flex-shrink-0 overflow-y-auto">
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => {
              const playerNum = i + 1;

              // 1v1 모드에서 각 플레이어 슬롯에 해당하는 픽 가져오기
              let championId = null;
              if (gameInfo.settings.playerType === "1v1") {
                const phaseData = gameInfo.status.phaseData || [];

                // 각 플레이어 슬롯별 픽 페이즈 매핑 (레드팀이 오른쪽에 표시)
                const pickPhases =
                  gameInfo.status.team2Side === "red"
                    ? [8, 9, 12, 17, 20] // 레드팀 픽 페이즈들
                    : [7, 10, 11, 18, 19]; // 블루팀 픽 페이즈들

                const phaseIndex = pickPhases[i];
                if (phaseIndex && phaseData[phaseIndex]) {
                  championId = phaseData[phaseIndex];
                } else {
                  // phaseData에서 찾지 못했다면 로컬 상태에서 찾기
                  const pickKeys = [
                    `pick1`,
                    `pick2`,
                    `pick3`,
                    `pick4`,
                    `pick5`,
                  ];
                  const isTeam2Red = gameInfo.status.team2Side === "red";
                  const picks = isTeam2Red ? redPicks : bluePicks;
                  championId = picks[pickKeys[i]] || null;
                }
              }

              return (
                <div
                  key={`right-player-${i}`}
                  className="bg-red-900/20 border border-red-500/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-md overflow-hidden border border-gray-600 flex-shrink-0">
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
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {championId
                          ? champions.find((c) => c.id === championId)?.name ||
                            championId
                          : "Champion Name"}
                      </div>
                      <div className="text-sm text-gray-400">
                        Player {playerNum}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Red Team Bans */}
          <div className="mt-6">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={`red-ban-${i}`}>
                  {renderBanSlot(
                    gameInfo.status.team2Side === "red" ? "team2" : "team1",
                    i
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="bg-[#1e2328] border-t border-gray-700 p-4 flex-shrink-0">
        <div className="text-center text-gray-400">
          <div className="bg-gray-800/50 rounded-lg p-3">광고 배너</div>
        </div>
      </div>
    </div>
  );
}

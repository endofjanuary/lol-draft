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
  // 모든 useState, useEffect 등 훅 선언을 최상단에 위치시킴
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [currentPhaseSelectedChampion, setCurrentPhaseSelectedChampion] =
    useState<string | null>(null);
  const [bannedChampions, setBannedChampions] = useState<string[]>([]);
  const [pickedChampions, setPickedChampions] = useState<{
    [key: string]: string;
  }>({});
  const [selectionSent, setSelectionSent] = useState(false);
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [isLoadingChampions, setIsLoadingChampions] = useState(false);
  const [championError, setChampionError] = useState<string | null>(null);
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<{ [key: string]: string }>({});
  const [redPicks, setRedPicks] = useState<{ [key: string]: string }>({});
  const [currentTurnPosition, setCurrentTurnPosition] =
    useState<string>("team1");
  const [availableChampions, setAvailableChampions] = useState<ChampionData[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<ChampionPosition | null>(null);
  const championPositions = getAllPositions();
  const playerTeam = position.startsWith("team1") ? "team1" : "team2";
  const isSpectator = position === "spectator";
  const myTeam = isSpectator ? "team1" : playerTeam;
  const opponentTeam = isSpectator
    ? "team2"
    : playerTeam === "team1"
    ? "team2"
    : "team1";
  const myTeamSide =
    myTeam === "team1" ? gameInfo.status.team1Side : gameInfo.status.team2Side;
  const opponentTeamSide =
    opponentTeam === "team1"
      ? gameInfo.status.team1Side
      : gameInfo.status.team2Side;
  const myTeamName =
    myTeam === "team1" ? gameInfo.status.team1Name : gameInfo.status.team2Name;
  const opponentTeamName =
    opponentTeam === "team1"
      ? gameInfo.status.team1Name
      : gameInfo.status.team2Name;
  // 자동 확정 대기 상태
  const [autoConfirmPending, setAutoConfirmPending] = useState(false);
  useEffect(() => {
    if (autoConfirmPending && selectedChampion) {
      handleConfirmSelection();
      setAutoConfirmPending(false);
    }
  }, [selectedChampion, autoConfirmPending]);

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

      // 내가 선택한 챔피언인 경우
      if (data.nickname === nickname) {
        setSelectedChampion(data.champion);
      }

      // 확정되지 않은 선택인 경우 - 선택 중인 상태로 표시
      if (!data.isConfirmed) {
        setCurrentPhaseSelectedChampion(data.champion);
      } else {
        // 확정된 경우 - 선택 중인 상태 초기화 및 실제 데이터 업데이트
        setCurrentPhaseSelectedChampion(null);
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

        // 내가 확정한 경우 선택 상태 초기화
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
    // 팀 기준으로 밴 데이터 가져오기 (진영이 바뀌어도 올바른 팀 데이터 사용)
    const teamSide = team === myTeam ? myTeamSide : opponentTeamSide;
    const bans = teamSide === "blue" ? blueBans : redBans;
    const championId = bans[index];
    const currentPhase = gameInfo.status.phase;

    // 밴 페이즈 계산 수정 - 진영 기반으로 계산
    let banPhase;
    if (index < 3) {
      // 첫 번째 밴 페이즈 (1-6): blue→red→blue→red→blue→red
      banPhase = teamSide === "blue" ? index * 2 + 1 : index * 2 + 2;
    } else {
      // 두 번째 밴 페이즈 (13-16): red→blue→red→blue
      const secondBanIndex = index - 3;
      banPhase =
        teamSide === "red" ? 13 + secondBanIndex * 2 : 14 + secondBanIndex * 2;
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

  // Show loading state if champion data is still being fetched
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
        <div className="text-red-500 text-xl mb-4">오류 발생</div>
        <p className="text-center max-w-md">{championError}</p>
        <p className="text-center text-sm mt-4">
          페이지를 새로고침하여 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4 flex flex-col items-center justify-center">
      <style jsx global>{`
        @keyframes fadeInOut {
          0% {
            background-color: rgba(0, 0, 0, 0);
          }
          50% {
            background-color: rgba(0, 0, 0, 0.6);
          }
          100% {
            background-color: rgba(0, 0, 0, 0);
          }
        }
        .champion-highlight {
          animation: fadeInOut 1.5s infinite;
        }
      `}</style>
      {/* Use max-w container to limit overall width */}
      <div className="w-full max-w-7xl">
        {/* Phase indicator */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">{getPhaseDescription()}</h2>
          <p className="text-lg">
            {playersTurn
              ? `당신의 차례입니다 - ${getCurrentAction()}`
              : `${
                  currentTurnPosition === myTeam
                    ? myTeamName || "내 팀"
                    : opponentTeamName || "상대팀"
                }의 차례`}
          </p>
          <p className="text-sm mt-1">진행 단계: {gameInfo.status.phase}/20</p>

          {/* Render timer conditionally */}
          {playersTurn && gameInfo.settings.timeLimit && (
            <div className="mt-2">
              <Timer
                duration={30}
                isActive={playersTurn}
                onTimeout={() => {
                  if (!playersTurn) return;
                  if (selectedChampion) {
                    handleConfirmSelection();
                  } else {
                    const pickable = filteredChampions.filter(
                      (champ) => !isChampionDisabled(champ.id)
                    );
                    if (pickable.length > 0) {
                      const randomIdx = Math.floor(
                        Math.random() * pickable.length
                      );
                      const randomChampion = pickable[randomIdx];
                      handleChampionClick(randomChampion.id);
                      setAutoConfirmPending(true); // 확정 대기 상태로 변경
                    }
                  }
                }}
                resetKey={`phase-${gameInfo.status.phase}`}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Team (Player's Team) */}
          <div
            className={`w-full md:w-1/4 ${
              myTeamSide === "blue" ? "bg-blue-900" : "bg-red-900"
            } ${
              currentTurnPosition === myTeam
                ? "bg-opacity-40 ring-2 ring-blue-400"
                : "bg-opacity-20"
            } rounded-lg p-4 relative transition-all duration-300`}
          >
            {currentTurnPosition === myTeam && (
              <div
                className={`absolute -top-2 left-1/2 transform -translate-x-1/2 ${
                  myTeamSide === "blue" ? "bg-blue-500" : "bg-red-500"
                } text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg`}
              >
                {getCurrentAction() === "BAN" ? "밴 선택 중" : "픽 선택 중"}
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-xl font-bold ${
                  myTeamSide === "blue" ? "text-blue-400" : "text-red-400"
                }`}
              >
                {isSpectator
                  ? myTeamName || (myTeamSide === "blue" ? "블루팀" : "레드팀")
                  : myTeamName || "내 팀"}{" "}
                <span className="text-white">
                  {myTeam === "team1"
                    ? gameInfo.team1Score || 0
                    : gameInfo.team2Score || 0}
                </span>
              </h3>
            </div>

            {/* Team Bans */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-400 mb-2">금지 챔피언</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={`my-team-ban-${i}`}>{renderBanSlot(myTeam, i)}</div>
                ))}
              </div>
            </div>

            {/* Team Picks */}
            <div>
              <h4 className="text-sm text-gray-400 mb-2">선택 챔피언</h4>
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => {
                  const playerNum = i + 1;

                  // 1v1 모드에서 각 플레이어 슬롯에 해당하는 픽 가져오기
                  let championId = null;
                  if (gameInfo.settings.playerType === "1v1") {
                    const phaseData = gameInfo.status.phaseData || [];

                    // 내 팀의 픽 페이즈들 가져오기 (팀 기준)
                    const myTeamPickPhases =
                      myTeamSide === "blue"
                        ? [7, 10, 11, 18, 19] // 블루팀 픽 페이즈들
                        : [8, 9, 12, 17, 20]; // 레드팀 픽 페이즈들

                    const phaseIndex = myTeamPickPhases[i];
                    if (phaseIndex && phaseData[phaseIndex]) {
                      championId = phaseData[phaseIndex];
                    } else {
                      // phaseData에서 찾지 못했다면 로컬 상태에서 찾기 (팀 기준으로)
                      const pickKeys = [
                        `pick1`,
                        `pick2`,
                        `pick3`,
                        `pick4`,
                        `pick5`,
                      ];
                      // 내 팀 기준으로 픽 데이터 가져오기
                      const picks =
                        myTeamSide === "blue" ? bluePicks : redPicks;
                      championId = picks[pickKeys[i]] || null;
                    }
                  }

                  return (
                    <div
                      key={`my-team-player-${i}`}
                      className="flex items-center gap-3"
                    >
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
                            ? champions.find((c) => c.id === championId)
                                ?.name || championId
                            : "대기중"}
                        </div>
                        <div className="text-sm text-gray-400">
                          Player {playerNum}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Champion Selection Grid */}
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
                    <p className="text-gray-400">게임 배너 이미지가 없습니다</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">챔피언 선택</h3>

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
                    onChange={(e) =>
                      setTagFilter((e.target.value as ChampionPosition) || null)
                    }
                    className="p-2 rounded-md bg-gray-700 border border-gray-600"
                  >
                    <option value="">전체 포지션</option>
                    {championPositions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Champions grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4 max-h-[400px] overflow-y-auto p-2">
                  {filteredChampions.map((champion) => {
                    const isDisabled = isChampionDisabled(champion.id);
                    const isSelected = selectedChampion === champion.id;

                    return (
                      <div
                        key={champion.id}
                        className={`relative cursor-pointer transition-all ${
                          isDisabled ? "cursor-not-allowed" : "hover:scale-105"
                        } ${isSelected ? "ring-2 ring-yellow-400" : ""}`}
                        onClick={() =>
                          !isDisabled && handleChampionClick(champion.id)
                        }
                        title={champion.name}
                      >
                        <Image
                          src={getChampionImageUrl(champion.id)}
                          alt={champion.name}
                          width={60}
                          height={60}
                          className={`w-full rounded-md ${
                            isDisabled ? "grayscale opacity-40" : ""
                          }`}
                        />
                        <p
                          className={`text-xs text-center mt-1 truncate ${
                            isDisabled ? "text-gray-500" : ""
                          }`}
                        >
                          {champion.name}
                        </p>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredChampions.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      조건에 맞는 챔피언이 없습니다
                    </div>
                  )}
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
                      disabled={!selectedChampion || selectionSent}
                      className={`
                        px-4 py-2 rounded-md font-bold
                        ${
                          selectedChampion && !selectionSent
                            ? myTeamSide === "blue"
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-red-600 hover:bg-red-700"
                            : "bg-gray-600 cursor-not-allowed opacity-50"
                        }
                      `}
                    >
                      {selectionSent
                        ? "확정 중..."
                        : `${
                            getCurrentAction() === "BAN" ? "밴" : "픽"
                          } 확정하기`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Team (Opponent's Team) */}
          <div
            className={`w-full md:w-1/4 ${
              opponentTeamSide === "red" ? "bg-red-900" : "bg-blue-900"
            } ${
              currentTurnPosition === opponentTeam
                ? "bg-opacity-40 ring-2 ring-red-400"
                : "bg-opacity-20"
            } rounded-lg p-4 relative transition-all duration-300`}
          >
            {currentTurnPosition === opponentTeam && (
              <div
                className={`absolute -top-2 left-1/2 transform -translate-x-1/2 ${
                  opponentTeamSide === "red" ? "bg-red-500" : "bg-blue-500"
                } text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg`}
              >
                {getCurrentAction() === "BAN" ? "밴 선택 중" : "픽 선택 중"}
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-xl font-bold ${
                  opponentTeamSide === "red" ? "text-red-400" : "text-blue-400"
                }`}
              >
                {isSpectator
                  ? opponentTeamName ||
                    (opponentTeamSide === "red" ? "레드팀" : "블루팀")
                  : opponentTeamName || "상대팀"}{" "}
                <span className="text-white">
                  {opponentTeam === "team1"
                    ? gameInfo.team1Score || 0
                    : gameInfo.team2Score || 0}
                </span>
              </h3>
            </div>

            {/* Team Bans */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-400 mb-2">금지 챔피언</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={`opponent-team-ban-${i}`}>
                    {renderBanSlot(opponentTeam, i)}
                  </div>
                ))}
              </div>
            </div>

            {/* Team Picks */}
            <div>
              <h4 className="text-sm text-gray-400 mb-2">선택 챔피언</h4>
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => {
                  const playerNum = i + 1;

                  // 1v1 모드에서 각 플레이어 슬롯에 해당하는 픽 가져오기
                  let championId = null;
                  if (gameInfo.settings.playerType === "1v1") {
                    const phaseData = gameInfo.status.phaseData || [];

                    // 상대팀의 픽 페이즈들 가져오기 (팀 기준)
                    const opponentTeamPickPhases =
                      opponentTeamSide === "red"
                        ? [8, 9, 12, 17, 20] // 레드팀 픽 페이즈들
                        : [7, 10, 11, 18, 19]; // 블루팀 픽 페이즈들

                    const phaseIndex = opponentTeamPickPhases[i];
                    if (phaseIndex && phaseData[phaseIndex]) {
                      championId = phaseData[phaseIndex];
                    } else {
                      // phaseData에서 찾지 못했다면 로컬 상태에서 찾기 (팀 기준으로)
                      const pickKeys = [
                        `pick1`,
                        `pick2`,
                        `pick3`,
                        `pick4`,
                        `pick5`,
                      ];
                      // 상대팀 기준으로 픽 데이터 가져오기
                      const picks =
                        opponentTeamSide === "blue" ? bluePicks : redPicks;
                      championId = picks[pickKeys[i]] || null;
                    }
                  }

                  return (
                    <div
                      key={`opponent-team-player-${i}`}
                      className="flex items-center gap-3"
                    >
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
                            ? champions.find((c) => c.id === championId)
                                ?.name || championId
                            : "대기중"}
                        </div>
                        <div className="text-sm text-gray-400">
                          Player {playerNum}
                        </div>
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

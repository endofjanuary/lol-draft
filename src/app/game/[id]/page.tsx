"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import NicknameModal from "@/components/game/NicknameModal";
import LobbyPhase from "@/components/game/LobbyPhase";
import DraftPhase from "@/components/game/DraftPhase";
import ResultPhase from "@/components/game/ResultPhase";
import SideChoicePhase from "@/components/game/SideChoicePhase";
import { GameInfo, Player } from "@/types/game";
import { getApiBaseUrl, getSocketUrl } from "@/utils/apiConfig";
import {
  getStoredSocketId,
  storeSocketId,
  clearSocketSession,
  SESSION_KEYS,
} from "@/utils/sessionStorage";

export default function GamePage() {
  const { id } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nickname, setNickname] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [position, setPosition] = useState<string>("spectator");
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLeftPlayer, setLastLeftPlayer] = useState<{
    nickname: string;
    position: string;
  } | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

  // 진영 선택 관련 상태
  const [showSideChoice, setShowSideChoice] = useState(false);
  const [losingSide, setLosingSide] = useState<"blue" | "red" | null>(null);

  // Initialize client-side data after component mounts (SSR-safe)
  useEffect(() => {
    console.log("Initializing client-side data...");
    if (typeof window !== "undefined") {
      // 개발/테스트용 헬퍼 함수 등록
      (window as any).clearGameSession = () => {
        sessionStorage.removeItem(SESSION_KEYS.NICKNAME);
        sessionStorage.removeItem(SESSION_KEYS.CLIENT_ID);
        sessionStorage.removeItem(SESSION_KEYS.GAME_CODE);
        console.log("Game session cleared. Refresh the page to start fresh.");
        window.location.reload();
      };

      // 현재 게임 코드와 저장된 게임 코드 비교
      const storedGameCode =
        sessionStorage.getItem(SESSION_KEYS.GAME_CODE) || "";
      const storedNickname =
        sessionStorage.getItem(SESSION_KEYS.NICKNAME) || "";
      const storedClientId =
        sessionStorage.getItem(SESSION_KEYS.CLIENT_ID) || "";

      console.log("Stored game code:", storedGameCode);
      console.log("Current game code:", id);
      console.log("Stored nickname:", storedNickname);
      console.log("Stored client ID:", storedClientId);
      console.log("💡 Tip: Run clearGameSession() in console to reset session");

      // 다른 게임에서 왔거나 처음 접속하는 경우
      if (storedGameCode !== id) {
        console.log(
          "Different game or first visit, clearing session and showing nickname modal"
        );
        // 세션 정보 초기화
        sessionStorage.removeItem(SESSION_KEYS.NICKNAME);
        sessionStorage.removeItem(SESSION_KEYS.CLIENT_ID);
        sessionStorage.removeItem(SESSION_KEYS.GAME_CODE);

        // 상태 초기화
        setNickname("");
        setClientId("");
        setShowNicknameModal(true);
        setHasAttemptedJoin(false);
        setGameInfo(null);
        setPosition("spectator");
        setIsHost(false);
      } else if (storedNickname) {
        // 같은 게임에서 재접속한 경우
        console.log("Returning to same game with stored nickname");
        setNickname(storedNickname);
        setClientId(storedClientId);
        // 저장된 닉네임이 있어도 사용자가 다른 닉네임을 선택할 수 있도록 모달 표시
        setShowNicknameModal(true);
        setHasAttemptedJoin(false); // 재접속 시에는 다시 참가 시도 허용
      } else {
        // 같은 게임이지만 닉네임이 없는 경우
        console.log("Same game but no stored nickname, showing modal");
        setShowNicknameModal(true);
        setHasAttemptedJoin(false);
      }
    }
  }, [id]); // id를 의존성으로 추가하여 게임 코드 변경 시 재실행

  // Fetch game info
  const fetchGameInfo = useCallback(async () => {
    console.log("fetchGameInfo called");
    try {
      setIsLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/games/${id}`;
      console.log(`Fetching game info from: ${url}`);

      const response = await fetch(url);
      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Game info loaded successfully:", data);
      console.log("Game version:", data.settings?.version);

      setGameInfo(data);

      // Update host status and position based on clientId
      if (data.clients && clientId) {
        const currentPlayer = data.clients.find(
          (p: Player) => p.clientId === clientId
        );
        if (currentPlayer) {
          setIsHost(currentPlayer.isHost);
          setPosition(currentPlayer.position);
          console.log("Current player info:", {
            nickname: currentPlayer.nickname,
            position: currentPlayer.position,
            isHost: currentPlayer.isHost,
          });
        } else {
          console.log("Current player not found in clients list");
        }
      } else {
        console.log("No clients data or clientId not available");
      }
    } catch (error) {
      console.error("Failed to fetch game info:", error);

      // 네트워크 오류인지 확인
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const apiBaseUrl = getApiBaseUrl();
        console.warn(
          `백엔드 서버에 연결할 수 없습니다. Mock 데이터를 사용합니다. (${apiBaseUrl})`
        );

        // Mock 데이터 사용
        const mockGameInfo = {
          game: {
            gameCode: id as string,
            createdAt: Date.now(),
          },
          settings: {
            version: "15.11.1",
            draftType: "tournament",
            playerType: "1v1",
            matchFormat: "bo1",
            timeLimit: true,
            globalBans: [],
            bannerImage: undefined,
          },
          status: {
            phase: 0,
            phaseData: Array(21).fill(""),
            team1Name: "Team 1",
            team2Name: "Team 2",
            team1Side: "blue" as const,
            team2Side: "red" as const,
            lastUpdatedAt: Date.now(),
            setNumber: 1,
            // 하위 호환성을 위한 필드들
            blueTeamName: "Team 1",
            redTeamName: "Team 2",
          },
          clients: [],
          team1Score: 0,
          team2Score: 0,
          // 하위 호환성을 위한 필드들
          blueScore: 0,
          redScore: 0,
        };

        console.log("Using mock game info:", mockGameInfo);
        setGameInfo(mockGameInfo);

        // Mock 환경에서는 자동으로 호스트로 설정 (단, 아직 설정되지 않은 경우만)
        if (!isHost) {
          setIsHost(true);
        }
        if (position === "spectator") {
          setPosition("team1");
        }
      } else {
        setError(
          `게임 정보를 불러오는데 실패했습니다: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, clientId, isHost, position]);

  // Handle join game - prevent duplicate calls
  const handleJoinGame = useCallback(
    (userNickname: string) => {
      console.log("handleJoinGame called with nickname:", userNickname);

      // Prevent duplicate calls
      if (isLoading || hasAttemptedJoin) {
        console.log(
          "Already loading or already attempted join, skipping duplicate join request"
        );
        return;
      }

      if (!socket || !userNickname.trim()) {
        console.log("Socket not available or nickname empty, fallback to mock");
        // 소켓이 없는 경우 mock 환경으로 처리
        setNickname(userNickname);
        sessionStorage.setItem(SESSION_KEYS.NICKNAME, userNickname);
        sessionStorage.setItem(SESSION_KEYS.GAME_CODE, id as string);
        setShowNicknameModal(false);
        setHasAttemptedJoin(true);

        // Mock 환경에서 게임 정보 직접 로드
        fetchGameInfo();
        return;
      }

      // Check if already joined (has game info and position is not spectator)
      if (gameInfo && position !== "spectator") {
        console.log("Already joined game, fetching latest info instead");
        fetchGameInfo();
        return;
      }

      setNickname(userNickname);
      sessionStorage.setItem(SESSION_KEYS.NICKNAME, userNickname);
      sessionStorage.setItem(SESSION_KEYS.GAME_CODE, id as string);
      setIsLoading(true);
      setHasAttemptedJoin(true);

      console.log("Emitting join_game event...");
      socket.emit(
        "join_game",
        {
          gameCode: id,
          nickname: userNickname,
          position: "spectator",
          socketId: getStoredSocketId(),
        },
        (response: any) => {
          console.log("Join game response:", response);
          if (response.status === "success") {
            setShowNicknameModal(false);

            // 클라이언트 ID 저장
            if (response.data?.clientId) {
              setClientId(response.data.clientId);
              sessionStorage.setItem(
                SESSION_KEYS.CLIENT_ID,
                response.data.clientId
              );
            }

            if (response.data?.position) {
              setPosition(response.data.position);
            }
            if (response.data?.isHost !== undefined) {
              setIsHost(response.data.isHost);
            }
            // 게임 정보를 불러오기 전에 잠시 대기
            console.log("Join successful, fetching game info in 500ms...");
            setTimeout(() => {
              fetchGameInfo();
            }, 500);
          } else {
            console.error("Join game failed:", response.message);
            // 소켓 참가에 실패한 경우 mock 환경으로 fallback
            console.log("Falling back to mock environment");
            setShowNicknameModal(false);
            fetchGameInfo();
          }
          setIsLoading(false);
        }
      );
    },
    [socket, id, isLoading, gameInfo, position, fetchGameInfo, hasAttemptedJoin]
  );

  // Auto-join when socket connects and nickname is available
  useEffect(() => {
    console.log("Checking auto-join conditions:", {
      isConnected,
      nickname: !!nickname,
      gameId: id,
      showNicknameModal,
      gameInfo: !!gameInfo,
      position,
      hasAttemptedJoin,
    });

    // 소켓이 연결되고, 닉네임이 있고, 모달이 숨겨진 상태이며, 아직 게임에 참가하지 않은 경우만 자동 참가
    if (
      isConnected &&
      nickname &&
      !showNicknameModal &&
      id &&
      socket &&
      !gameInfo && // 게임 정보가 없을 때만 자동 참가
      position === "spectator" && // 아직 팀에 참가하지 않은 경우
      !hasAttemptedJoin // 아직 참가를 시도하지 않은 경우
    ) {
      console.log("Auto-joining game with stored credentials...");
      setHasAttemptedJoin(true); // 참가 시도 플래그 설정
      handleJoinGame(nickname);
    }
  }, [
    isConnected,
    nickname,
    showNicknameModal,
    id,
    socket,
    gameInfo,
    position,
    hasAttemptedJoin,
    handleJoinGame,
  ]);

  // Connect to socket.io server
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const storedSocketId = getStoredSocketId();

    const socketInstance = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true,
      auth: storedSocketId ? { socketId: storedSocketId } : undefined,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("connection_success", (data) => {
      console.log("Connection successful, socket ID:", data.sid);
      storeSocketId(data.sid);

      // 자동 재접속 로직은 별도 useEffect에서 처리
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
    });

    // Listen for game events
    socketInstance.on("draft_started", () => {
      fetchGameInfo();
    });

    socketInstance.on("phase_progressed", (data) => {
      console.log("Phase progressed event:", data);
      // data: { gameCode, confirmedBy, fromPhase, toPhase, confirmedChampion, timestamp }

      // gameInfo가 있을 때만 업데이트
      setGameInfo((prevGameInfo) => {
        if (!prevGameInfo) return prevGameInfo;

        // 새로운 phaseData 배열 생성
        const newPhaseData = [...prevGameInfo.status.phaseData];

        // 확정된 챔피언 정보 업데이트
        if (data.confirmedChampion && data.fromPhase < newPhaseData.length) {
          newPhaseData[data.fromPhase] = data.confirmedChampion;
        }

        // 업데이트된 게임 정보 반환
        return {
          ...prevGameInfo,
          status: {
            ...prevGameInfo.status,
            phase: data.toPhase,
            phaseData: newPhaseData,
            lastUpdatedAt: data.timestamp,
          },
        };
      });

      // 새 페이즈로 진행될 때 DraftPhase 컴포넌트에 페이즈 변경 이벤트 발생
      // 이 이벤트는 DraftPhase 컴포넌트에서 수신하여 선택된 챔피언 상태 초기화에 사용
      if (socket) {
        // 소켓 이벤트 발생 대신 커스텀 이벤트 활용
        const phaseChangeEvent = new CustomEvent("phaseChanged", {
          detail: { fromPhase: data.fromPhase, toPhase: data.toPhase },
        });
        window.dispatchEvent(phaseChangeEvent);
      }
    });

    socketInstance.on("game_result_confirmed", () => {
      fetchGameInfo();
    });

    // 진영 선택 관련 이벤트 리스너
    socketInstance.on("side_choice_phase", (data) => {
      console.log("Side choice phase started:", data);
      setLosingSide(data.losingSide);
      setShowSideChoice(true);
    });

    socketInstance.on("next_set_started", (data) => {
      console.log("Next set started:", data);
      setShowSideChoice(false);
      setLosingSide(null);
      // 게임 정보 새로고침
      fetchGameInfo();
    });

    socketInstance.on("match_finished", (data) => {
      console.log("Match finished:", data);
      setShowSideChoice(false);
      setLosingSide(null);
      // 게임 정보 새로고침
      fetchGameInfo();
    });

    socketInstance.on("client_joined", (data) => {
      console.log("Client joined event:", data);

      // gameInfo가 있을 때만 업데이트
      setGameInfo((prevGameInfo) => {
        if (!prevGameInfo) return prevGameInfo;

        // 이미 존재하는 클라이언트인지 확인
        const existingClientIndex = prevGameInfo.clients.findIndex(
          (client) => client.nickname === data.nickname
        );

        let updatedClients;

        if (existingClientIndex >= 0) {
          // 존재하는 클라이언트면 정보 업데이트
          updatedClients = [...prevGameInfo.clients];
          updatedClients[existingClientIndex] = {
            ...updatedClients[existingClientIndex],
            position: data.position,
            isHost: data.isHost,
          };
        } else {
          // 새 클라이언트면 추가
          updatedClients = [
            ...prevGameInfo.clients,
            {
              nickname: data.nickname,
              position: data.position,
              isReady: false, // 초기값 설정
              isHost: data.isHost,
              clientId: data.clientId, // clientId가 있는 경우
            },
          ];
        }

        return {
          ...prevGameInfo,
          clients: updatedClients,
        };
      });
    });

    socketInstance.on("position_changed", (data) => {
      console.log("Position changed event:", data);
      // 현재 사용자의 포지션이 변경된 경우
      if (data.nickname === nickname) {
        setPosition(data.newPosition);
      }

      // gameInfo가 있을 때만 업데이트
      setGameInfo((prevGameInfo) => {
        if (!prevGameInfo) return prevGameInfo;

        // clients 배열 업데이트
        const updatedClients = prevGameInfo.clients.map((client) => {
          if (client.nickname === data.nickname) {
            return { ...client, position: data.newPosition };
          }
          return client;
        });

        // 업데이트된 게임 정보 반환
        return {
          ...prevGameInfo,
          clients: updatedClients,
        };
      });
    });

    socketInstance.on("ready_state_changed", (data) => {
      console.log("Ready state changed event:", data);

      // gameInfo가 있을 때만 업데이트
      setGameInfo((prevGameInfo) => {
        if (!prevGameInfo) return prevGameInfo;

        // clients 배열 업데이트
        const updatedClients = prevGameInfo.clients.map((client) => {
          if (
            client.nickname === data.nickname &&
            client.position === data.position
          ) {
            return { ...client, isReady: data.isReady };
          }
          return client;
        });

        // 업데이트된 게임 정보 반환
        return {
          ...prevGameInfo,
          clients: updatedClients,
        };
      });
    });

    socketInstance.on("client_left", (data) => {
      console.log(
        `${data.nickname} left the game (position: ${data.position})`
      );
      setLastLeftPlayer(data);

      // 클라이언트 이탈 시 gameInfo 업데이트
      setGameInfo((prevGameInfo) => {
        if (!prevGameInfo) return prevGameInfo;

        // clients 배열에서 해당 클라이언트 제거
        const updatedClients = prevGameInfo.clients.filter(
          (client) =>
            !(
              client.nickname === data.nickname &&
              client.position === data.position
            )
        );

        // 업데이트된 게임 정보 반환
        return {
          ...prevGameInfo,
          clients: updatedClients,
        };
      });

      setTimeout(() => setLastLeftPlayer(null), 5000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // 게임 종료 또는 퇴장 시 세션 정보 정리
  const handleLeaveGame = () => {
    clearSocketSession();
    if (socket) {
      socket.disconnect();
    }
  };

  // Handle position change
  const handlePositionChange = (newPosition: string) => {
    if (!socket) return;

    // 기존 포지션 저장
    const oldPosition = position;

    // 즉시 UI 업데이트를 위해 로컬 상태 변경
    setPosition(newPosition);

    // Set loading to prevent multiple clicks
    setIsLoading(true);

    socket.emit(
      "change_position",
      { position: newPosition },
      (response: any) => {
        if (response.status === "success") {
          console.log(`Position changed to ${newPosition}`);

          // 내 로컬 상태 및 gameInfo의 clients 배열 업데이트
          if (gameInfo) {
            setGameInfo((prevGameInfo) => {
              if (!prevGameInfo) return prevGameInfo;

              // clients 배열에서 내 정보 업데이트
              const updatedClients = prevGameInfo.clients.map((client) => {
                // clientId가 있으면 그걸로 비교, 없으면 닉네임으로 비교
                const isCurrentUser =
                  (clientId && client.clientId === clientId) ||
                  (!clientId && client.nickname === nickname);
                if (isCurrentUser) {
                  return { ...client, position: newPosition };
                }
                return client;
              });

              return {
                ...prevGameInfo,
                clients: updatedClients,
              };
            });
          }
        } else {
          // 실패 시 이전 포지션으로 되돌림
          setPosition(oldPosition);
          setError(response.message || "포지션 변경에 실패했습니다.");
        }
        setIsLoading(false);
      }
    );
  };

  // Handle ready state change
  const handleReadyChange = (isReady: boolean) => {
    if (!socket) return;

    // Set loading to prevent multiple clicks
    setIsLoading(true);

    // 로컬 UI 즉시 업데이트
    setGameInfo((prevGameInfo) => {
      if (!prevGameInfo) return prevGameInfo;

      // clients 배열에서 내 정보 업데이트
      const updatedClients = prevGameInfo.clients.map((client) => {
        // clientId가 있으면 그걸로 비교, 없으면 닉네임으로 비교
        const isCurrentUser =
          (clientId && client.clientId === clientId) ||
          (!clientId && client.nickname === nickname);

        // 내 위치가 같은 경우만 업데이트 (위치가 바뀌었을 수 있음)
        if (isCurrentUser && client.position === position) {
          return { ...client, isReady };
        }
        return client;
      });

      return {
        ...prevGameInfo,
        clients: updatedClients,
      };
    });

    socket.emit("change_ready_state", { isReady }, (response: any) => {
      if (response.status !== "success") {
        setError(response.message || "준비 상태 변경에 실패했습니다.");

        // 실패 시 이전 상태로 되돌리기 위해 gameInfo 다시 가져오기
        fetchGameInfo();
      }
      setIsLoading(false);
    });
  };

  // Handle start draft
  const handleStartDraft = () => {
    if (!socket || !isHost) return;

    socket.emit("start_draft", {}, (response: any) => {
      if (response.status !== "success") {
        setError(response.message || "게임 시작에 실패했습니다.");
      }
    });
  };

  // Handle champion selection
  const handleSelectChampion = (champion: string) => {
    if (!socket) return;

    // Validate the champion before sending
    if (!champion || typeof champion !== "string" || champion.trim() === "") {
      setError("유효한 챔피언을 선택해주세요.");
      return;
    }

    console.log(`Sending champion selection: ${champion}`); // Debug log

    socket.emit("select_champion", { champion }, (response: any) => {
      console.log("Selection response:", response); // Debug log
      if (response.status !== "success") {
        setError(response.message || "챔피언 선택에 실패했습니다.");
      }
    });
  };

  // Handle selection confirmation
  const handleConfirmSelection = () => {
    if (!socket || !gameInfo) return;

    console.log("Sending selection confirmation"); // Debug log

    // 현재 phase 정보 저장
    const currentPhase = gameInfo.status.phase;

    // 페이즈가 변경되기 전에 선택 상태가 초기화되도록 미리 커스텀 이벤트 발생시킴
    // 이 이벤트는 DraftPhase 컴포넌트에서 수신하여 선택된 챔피언 상태 초기화에 사용
    const phaseChangeEvent = new CustomEvent("resetSelections", {});
    window.dispatchEvent(phaseChangeEvent);

    // 서버에 확정 요청
    socket.emit("confirm_selection", {}, (response: any) => {
      console.log("Confirmation response:", response); // Debug log
      if (response.status !== "success") {
        setError(response.message || "선택 확정에 실패했습니다.");
        // 실패 시 원래 상태로 복원하기 위해 게임 정보 다시 가져오기
        fetchGameInfo();
      } else {
        console.log("Selection confirmed successfully");
      }
    });
  };

  // Handle game result confirmation
  const handleConfirmResult = (winner: string) => {
    if (!socket || !isHost) return;

    socket.emit("confirm_result", { winner }, (response: any) => {
      if (response.status !== "success") {
        setError(response.message || "게임 결과 확정에 실패했습니다.");
      } else {
        console.log("Game result confirmed successfully");
        // Fetch game info to update scores
        fetchGameInfo();
      }
    });
  };

  // Handle side choice
  const handleSideChoice = (choice: "keep" | "swap") => {
    if (!socket || !isHost) return;

    socket.emit(
      "choose_side",
      {
        gameCode: id,
        choice: choice,
      },
      (response: any) => {
        if (response.status !== "success") {
          setError(response.message || "진영 선택에 실패했습니다.");
        } else {
          console.log("Side choice confirmed successfully");
        }
      }
    );
  };

  // Handle moving to next game (in a series)
  const handleNextGame = () => {
    if (!socket || !isHost || !gameInfo) return;

    // 마지막 세트인지 확인하는 로직
    const isFinalSet = (() => {
      const matchFormat = gameInfo.settings.matchFormat || "bo1";
      const currentSet = gameInfo.status.setNumber || 1;
      const blueScore = gameInfo.blueScore || 0;
      const redScore = gameInfo.redScore || 0;

      // 단판제인 경우
      if (matchFormat === "bo1") return true;

      // 3판 2선승제
      if (matchFormat === "bo3") {
        if (blueScore >= 2 || redScore >= 2 || currentSet >= 3) return true;
      }

      // 5판 3선승제
      if (matchFormat === "bo5") {
        if (blueScore >= 3 || redScore >= 3 || currentSet >= 5) return true;
      }

      return false;
    })();

    // 마지막 세트인 경우 다음 게임으로 이동하지 않음
    if (isFinalSet) {
      console.log(
        "최종 세트가 완료되었습니다. 더 이상 진행할 세트가 없습니다."
      );
      return;
    }

    socket.emit("prepare_next_game", {}, (response: any) => {
      if (response.status !== "success") {
        setError(response.message || "다음 게임 준비에 실패했습니다.");
      } else {
        console.log("Next game preparation successful");
        fetchGameInfo();
      }
    });
  };

  // Show loading state if not connected
  if (!isConnected) {
    console.log("Not connected, showing connection loading state");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030C28] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>서버에 연결 중입니다...</p>
      </div>
    );
  }

  // Render game content based on phase
  const renderGameContent = () => {
    console.log("renderGameContent called", {
      isLoading,
      gameInfo: !!gameInfo,
      showNicknameModal,
    });

    // Show loading while fetching game info
    if (isLoading) {
      console.log("Showing loading state");
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="ml-3">게임 정보를 불러오는 중입니다...</p>
        </div>
      );
    }

    // If game info is not available yet
    if (!gameInfo) {
      console.log("No game info available yet");
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              게임 정보를 불러오는 중입니다...
            </p>
            <button
              onClick={() => {
                console.log("Manual fetch game info button clicked");
                fetchGameInfo();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              게임 정보 다시 불러오기
            </button>
          </div>
        </div>
      );
    }

    // Ensure we have the necessary gameInfo structure
    if (!gameInfo.status) {
      console.log("Game info status not available");
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">
            게임 정보가 올바르지 않습니다. 다시 시도해주세요.
          </p>
        </div>
      );
    }

    // 진영 선택 페이즈 표시
    if (showSideChoice && losingSide) {
      return (
        <SideChoicePhase
          gameInfo={gameInfo}
          losingSide={losingSide}
          onSideChoice={handleSideChoice}
          isHost={isHost}
        />
      );
    }

    // Solo game (to be implemented later)
    if (gameInfo.settings.playerType === "single") {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">솔로 게임 기능은 현재 개발 중입니다.</p>
        </div>
      );
    }

    // For 1v1 or 5v5 games, show different UI based on phase
    const phase = gameInfo.status.phase;

    if (phase === 0) {
      // Lobby phase - 클라이언트 ID 전달
      return (
        <LobbyPhase
          gameInfo={gameInfo}
          gameId={id as string}
          position={position}
          isHost={isHost}
          players={gameInfo.clients || []}
          onPositionChange={handlePositionChange}
          onReadyChange={handleReadyChange}
          onStartDraft={handleStartDraft}
          nickname={nickname}
          clientId={clientId} // 클라이언트 ID 전달
        />
      );
    } else if (phase >= 1 && phase <= 20) {
      // Draft phase
      return (
        <DraftPhase
          gameInfo={gameInfo}
          nickname={nickname}
          position={position}
          onSelectChampion={handleSelectChampion}
          onConfirmSelection={handleConfirmSelection}
          socket={socket}
        />
      );
    } else if (phase === 21) {
      // Result phase
      return (
        <ResultPhase
          gameInfo={gameInfo}
          onConfirmResult={handleConfirmResult}
          onNextGame={handleNextGame}
          isHost={isHost}
        />
      );
    } else if (phase === 22) {
      // Side choice phase (handled above)
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">진영 선택 중입니다...</p>
        </div>
      );
    } else if (phase === 23) {
      // Match finished
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">경기 종료</h2>
            <p className="text-xl mb-8">모든 경기가 완료되었습니다!</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg"
            >
              메인 페이지로
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#030C28] text-white">
      {/* Error message display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md z-50">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Player left notification */}
      {lastLeftPlayer && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded-md z-50 transition-opacity">
          {lastLeftPlayer.nickname}님이 게임에서 나갔습니다. (포지션:{" "}
          {lastLeftPlayer.position === "spectator"
            ? "관전자"
            : lastLeftPlayer.position === "team1"
            ? "Team 1"
            : lastLeftPlayer.position === "team2"
            ? "Team 2"
            : lastLeftPlayer.position}
          )
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && (
        <NicknameModal
          onSubmit={handleJoinGame}
          currentNickname={nickname || undefined}
        />
      )}

      {/* Game Content based on phase */}
      {!showNicknameModal && renderGameContent()}
    </div>
  );
}

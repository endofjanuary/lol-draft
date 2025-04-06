"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import NicknameModal from "@/components/game/NicknameModal";
import LobbyPhase from "@/components/game/LobbyPhase";
import DraftPhase from "@/components/game/DraftPhase";
import ResultPhase from "@/components/game/ResultPhase";
import { GameInfo, Player } from "@/types/game";
import { getApiBaseUrl, getSocketUrl } from "@/utils/apiConfig";

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

  // Connect to socket.io server
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const socketInstance = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("connection_success", (data) => {
      console.log("Connection successful, socket ID:", data.sid);
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

    socketInstance.on("phase_progressed", () => {
      fetchGameInfo();
    });

    socketInstance.on("game_result_confirmed", () => {
      fetchGameInfo();
    });

    socketInstance.on("client_joined", () => {
      fetchGameInfo();
    });

    socketInstance.on("position_changed", () => {
      fetchGameInfo();
    });

    socketInstance.on("ready_state_changed", () => {
      fetchGameInfo();
    });

    // Add handler for client_left event
    socketInstance.on("client_left", (data) => {
      console.log(
        `${data.nickname} left the game (position: ${data.position})`
      );
      setLastLeftPlayer(data);
      // Immediately fetch updated game info
      fetchGameInfo();

      // Clear the left player notification after a delay
      setTimeout(() => setLastLeftPlayer(null), 5000);
    });

    setSocket(socketInstance);

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Fetch game info
  const fetchGameInfo = async () => {
    try {
      setIsLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/games/${id}`);
      if (!response.ok) {
        throw new Error("게임 정보를 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      setGameInfo(data);
      console.log("Game info:", data);

      // Update host status based on game data
      if (data.clients && nickname) {
        const currentPlayer = data.clients.find(
          (p: Player) => p.nickname === nickname
        );
        if (currentPlayer) {
          setIsHost(currentPlayer.isHost);
        }
      }
    } catch (error) {
      console.error("Failed to fetch game info:", error);
      setError("게임 정보를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = (userNickname: string) => {
    if (!socket || !userNickname.trim()) return;

    setNickname(userNickname);

    socket.emit(
      "join_game",
      {
        gameCode: id,
        nickname: userNickname,
        position: "spectator", // Default to spectator
      },
      (response: any) => {
        if (response.status === "success") {
          console.log("Successfully joined game", response);
          setShowNicknameModal(false);

          // Update position and host status if provided in response
          if (response.data?.position) {
            setPosition(response.data.position);
          }

          // Set initial host status from response
          if (response.data?.isHost !== undefined) {
            setIsHost(response.data.isHost);
          }

          // Fetch game info after joining
          fetchGameInfo();
        } else {
          setError(response.message || "게임 참가에 실패했습니다.");
        }
      }
    );
  };

  // Handle position change
  const handlePositionChange = (newPosition: string) => {
    if (!socket) return;

    // Set loading to prevent multiple clicks
    setIsLoading(true);

    socket.emit(
      "change_position",
      { position: newPosition },
      (response: any) => {
        if (response.status === "success") {
          setPosition(newPosition);
          console.log(`Position changed to ${newPosition}`);

          // Immediately fetch game info after position change
          fetchGameInfo();
        } else {
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

    socket.emit("change_ready_state", { isReady }, (response: any) => {
      if (response.status !== "success") {
        setError(response.message || "준비 상태 변경에 실패했습니다.");
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
    if (!socket) return;

    console.log("Sending selection confirmation"); // Debug log

    socket.emit("confirm_selection", {}, (response: any) => {
      console.log("Confirmation response:", response); // Debug log
      if (response.status !== "success") {
        setError(response.message || "선택 확정에 실패했습니다.");
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030C28] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>서버에 연결 중입니다...</p>
      </div>
    );
  }

  // Render game content based on phase
  const renderGameContent = () => {
    // Show loading while fetching game info
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="ml-3">게임 정보를 불러오는 중입니다...</p>
        </div>
      );
    }

    // If game info is not available yet
    if (!gameInfo) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">게임 정보를 불러오는 중입니다...</p>
        </div>
      );
    }

    // Ensure we have the necessary gameInfo structure
    if (!gameInfo.status) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">
            게임 정보가 올바르지 않습니다. 다시 시도해주세요.
          </p>
        </div>
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
      // Lobby phase - pass id directly to component
      return (
        <LobbyPhase
          gameInfo={gameInfo}
          gameId={id as string}
          position={position}
          isHost={isHost}
          players={gameInfo.clients || []} // Pass clients directly from gameInfo
          onPositionChange={handlePositionChange}
          onReadyChange={handleReadyChange}
          onStartDraft={handleStartDraft}
          nickname={nickname}
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
            : lastLeftPlayer.position.startsWith("blue")
            ? "블루팀"
            : "레드팀"}
          )
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && <NicknameModal onSubmit={handleJoinGame} />}

      {/* Game Content based on phase */}
      {!showNicknameModal && renderGameContent()}
    </div>
  );
}

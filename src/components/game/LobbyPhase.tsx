import { useState, useEffect } from "react";
import { GameInfo, Player } from "@/types/game"; // Import shared types

// Local props interface, now using the shared GameInfo type
interface LobbyPhaseProps {
  gameInfo: GameInfo;
  gameId: string;
  position: string;
  isHost: boolean;
  players: Player[];
  onPositionChange: (position: string) => void;
  onReadyChange: (isReady: boolean) => void;
  onStartDraft: () => void;
  nickname?: string; // 현재 사용자의 닉네임
  clientId?: string; // 현재 사용자의 클라이언트 ID 추가
}

export default function LobbyPhase({
  gameInfo,
  gameId,
  position,
  isHost,
  players,
  onPositionChange,
  onReadyChange,
  onStartDraft,
  nickname = "",
  clientId = "", // 기본값 추가
}: LobbyPhaseProps) {
  const [isReady, setIsReady] = useState(false);
  const [prevPosition, setPrevPosition] = useState(position);
  const [copied, setCopied] = useState(false);

  // Function to copy game ID to clipboard
  const copyGameId = () => {
    navigator.clipboard.writeText(gameId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Reset ready status when position changes and update local ready state from players prop
  useEffect(() => {
    if (position !== prevPosition) {
      // Position has changed, reset ready state
      setIsReady(false);
      setPrevPosition(position);
    } else {
      // Update ready status from players data
      const currentPlayer = players.find((p) => p.position === position);
      if (currentPlayer) {
        setIsReady(currentPlayer.isReady);
      }
    }
  }, [players, position, prevPosition]);

  // Handle ready button click
  const handleReadyClick = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    onReadyChange(newReadyState);
  };

  // Improved function to check if a position is available
  const isPositionAvailable = (pos: string) => {
    // A position is available if:
    // 1. No player is currently in that position, or
    // 2. The current user is already in that position
    return !players.some((p) => p.position === pos) || position === pos;
  };

  // Check if all team players are ready
  const areAllTeamPlayersReady = () => {
    const teamPlayers = players.filter((p) => p.position !== "spectator");
    return teamPlayers.length > 0 && teamPlayers.every((p) => p.isReady);
  };

  // 모든 팀 슬롯이 채워져 있는지 확인
  const areAllTeamSlotsFilled = () => {
    const positionsPerTeam = 1; // 항상 1로 설정 (5v5 모드 제거)
    const requiredPositions = [];

    // 필요한 모든 포지션 목록 생성
    for (let i = 1; i <= positionsPerTeam; i++) {
      requiredPositions.push(`blue${i}`);
      requiredPositions.push(`red${i}`);
    }

    // 모든 필요한 포지션에 플레이어가 있는지 확인
    return requiredPositions.every((pos) =>
      players.some((player) => player.position === pos)
    );
  };

  // 게임 시작 가능 여부 확인 (모든 조건 충족)
  const canStartGame = () => {
    return areAllTeamPlayersReady() && areAllTeamSlotsFilled();
  };

  // Check if player is on a team (not spectator)
  const isOnTeam = position !== "spectator";

  // Handle position change with ready state reset
  const handlePositionChange = (newPosition: string) => {
    // 준비완료 상태인 경우 위치 변경 불가
    if (isReady) {
      // 알림 토스트나 메시지를 여기에 추가할 수 있습니다.
      return;
    }

    if (isPositionAvailable(newPosition) || position === newPosition) {
      onPositionChange(newPosition);
      // Ready state will be reset in the useEffect when position changes
    }
  };

  // 현재 사용자인지 체크하는 함수 (닉네임과 clientId 모두 사용)
  const isCurrentUser = (player: Player) => {
    // clientId가 있으면 그것으로 비교, 없으면 닉네임으로 비교
    if (clientId && player.clientId) {
      return player.clientId === clientId;
    }
    // 하위 호환성을 위해 닉네임으로도 비교
    return player.nickname === nickname;
  };

  // Generate team slots based on game type
  const renderTeamSlots = () => {
    const slots = [];
    const positionsPerTeam = 1; // 항상 1로 설정 (5v5 모드 제거)

    // Blue team slots
    for (let i = 1; i <= positionsPerTeam; i++) {
      const pos = `blue${i}`;
      const player = players.find((p) => p.position === pos);
      const isCurrentPlayer = position === pos;
      const isPlayerHost = player?.isHost || false;
      const isCurrentPlayerReady = isCurrentPlayer && isReady;
      const canChangePosition = !isReady;

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 ${
            isCurrentPlayer
              ? "bg-blue-700 border-2 border-yellow-300"
              : player?.isReady
              ? "bg-blue-800 border-2 border-green-400 shadow-md shadow-green-500/30"
              : "bg-blue-900 hover:bg-blue-800"
          } ${
            !isCurrentPlayer && canChangePosition
              ? "cursor-pointer"
              : "cursor-default"
          }`}
          onClick={() => handlePositionChange(pos)}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">
              블루팀 대표
              {isPlayerHost && <span className="text-yellow-400 ml-2">👑</span>}
            </span>
            {(player?.isReady || (isCurrentPlayer && isReady)) && (
              <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                준비완료
              </span>
            )}
          </div>
          <div className="mt-1 text-lg">
            {player ? (
              <span className={isCurrentPlayer ? "font-bold" : ""}>
                {player.nickname} {isCurrentUser(player) && "(나)"}
              </span>
            ) : (
              "빈 자리"
            )}
          </div>
        </div>
      );
    }

    // Red team slots
    for (let i = 1; i <= positionsPerTeam; i++) {
      const pos = `red${i}`;
      const player = players.find((p) => p.position === pos);
      const isCurrentPlayer = position === pos;
      const isPlayerHost = player?.isHost || false;
      const isCurrentPlayerReady = isCurrentPlayer && isReady;
      const canChangePosition = !isReady;

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 ${
            isCurrentPlayer
              ? "bg-red-700 border-2 border-yellow-300"
              : player?.isReady
              ? "bg-red-800 border-2 border-green-400 shadow-md shadow-green-500/30"
              : "bg-red-900 hover:bg-red-800"
          } ${
            !isCurrentPlayer && canChangePosition
              ? "cursor-pointer"
              : "cursor-default"
          }`}
          onClick={() => handlePositionChange(pos)}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">
              레드팀 대표
              {isPlayerHost && <span className="text-yellow-400 ml-2">👑</span>}
            </span>
            {(player?.isReady || (isCurrentPlayer && isReady)) && (
              <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                준비완료
              </span>
            )}
          </div>
          <div className="mt-1 text-lg">
            {player ? (
              <span className={isCurrentPlayer ? "font-bold" : ""}>
                {player.nickname} {isCurrentUser(player) && "(나)"}
              </span>
            ) : (
              "빈 자리"
            )}
          </div>
        </div>
      );
    }

    return slots;
  };

  return (
    <div className="container mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-2">
        {gameInfo.status.blueTeamName || "블루팀"} vs{" "}
        {gameInfo.status.redTeamName || "레드팀"}
      </h1>

      <div className="flex justify-center items-center mb-6 gap-2">
        <div className="bg-gray-800 px-3 py-1 rounded text-gray-300 flex items-center">
          <span className="mr-2">게임 코드:</span>
          <span className="font-mono">{gameId}</span>
        </div>
        <button
          onClick={copyGameId}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center"
        >
          {copied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              복사됨
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              복사하기
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Blue Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-blue-400 mb-4">
            블루팀 <span className="text-white">{gameInfo.blueScore || 0}</span>
          </h2>
          <div>{renderTeamSlots().slice(0, 1)}</div>
        </div>

        {/* Red Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            레드팀 <span className="text-white">{gameInfo.redScore || 0}</span>
          </h2>
          <div>{renderTeamSlots().slice(1)}</div>
        </div>
      </div>

      {/* Spectators */}
      <div className="mt-8 p-4 bg-gray-800 rounded-md">
        <h3 className="text-lg font-semibold mb-2">관전자</h3>
        <div className="flex flex-wrap gap-2">
          {players
            .filter((p) => p.position === "spectator")
            .map((spectator, index) => {
              // 현재 사용자 여부 확인에 isCurrentUser 함수 사용
              const isSpectatorCurrentUser = isCurrentUser(spectator);

              return (
                <div
                  key={index}
                  className={`px-3 py-1 rounded ${
                    isSpectatorCurrentUser
                      ? "bg-purple-700 border border-yellow-300"
                      : "bg-gray-700"
                  } flex items-center gap-1`}
                >
                  <span className={isSpectatorCurrentUser ? "font-bold" : ""}>
                    {spectator.nickname} {isSpectatorCurrentUser && "(나)"}
                  </span>
                  {spectator.isHost && (
                    <span className="text-yellow-400 ml-1">👑</span>
                  )}
                </div>
              );
            })}
          {position !== "spectator" && (
            <div
              className={`px-3 py-1 rounded ${
                isReady
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gray-700 hover:bg-purple-700 cursor-pointer"
              }`}
              onClick={() => !isReady && onPositionChange("spectator")}
            >
              {isReady ? (
                <>
                  <span className="text-gray-400">준비 취소 후 관전 가능</span>
                </>
              ) : (
                "관전하기"
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center mt-8 gap-4">
        {isOnTeam && (
          <button
            onClick={handleReadyClick}
            className={`px-6 py-3 rounded-lg font-bold ${
              isReady
                ? "bg-green-700 hover:bg-green-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isReady ? "준비 완료" : "준비하기"}
          </button>
        )}

        {isHost && (
          <button
            onClick={onStartDraft}
            disabled={!canStartGame()}
            className={`px-6 py-3 rounded-lg font-bold ${
              canStartGame()
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            게임 시작
          </button>
        )}
      </div>
    </div>
  );
}

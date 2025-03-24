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
}: LobbyPhaseProps) {
  const [isReady, setIsReady] = useState(false);
  const [prevPosition, setPrevPosition] = useState(position);

  // Remove the fetchPlayers useEffect since we're now getting players from props

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

  // Check if player is on a team (not spectator)
  const isOnTeam = position !== "spectator";

  // Handle position change with ready state reset
  const handlePositionChange = (newPosition: string) => {
    if (isPositionAvailable(newPosition) || position === newPosition) {
      onPositionChange(newPosition);
      // Ready state will be reset in the useEffect when position changes
    }
  };

  // Generate team slots based on game type
  const renderTeamSlots = () => {
    const slots = [];
    const is5v5 = gameInfo.settings.playerType === "5v5"; // Updated to use settings.playerType
    const positionsPerTeam = is5v5 ? 5 : 1;

    // Blue team slots
    for (let i = 1; i <= positionsPerTeam; i++) {
      const pos = `blue${i}`;
      const player = players.find((p) => p.position === pos);
      const isCurrentPlayer = position === pos;
      const isPlayerHost = player?.isHost || false; // Check if this player is the host

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 cursor-pointer
            ${
              isCurrentPlayer ? "bg-blue-700" : "bg-blue-900 hover:bg-blue-800"
            }`}
          onClick={() => handlePositionChange(pos)}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">
              {is5v5 ? `블루 ${i}` : "블루"}
              {isPlayerHost && <span className="text-yellow-400 ml-2">👑</span>}
            </span>
            {(player?.isReady || (isCurrentPlayer && isReady)) && (
              <span className="text-green-400 text-sm">준비완료</span>
            )}
          </div>
          <div className="mt-1 text-lg">
            {player ? player.nickname : "빈 자리"}
          </div>
        </div>
      );
    }

    // Red team slots
    for (let i = 1; i <= positionsPerTeam; i++) {
      const pos = `red${i}`;
      const player = players.find((p) => p.position === pos);
      const isCurrentPlayer = position === pos;
      const isPlayerHost = player?.isHost || false; // Check if this player is the host

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 cursor-pointer
            ${isCurrentPlayer ? "bg-red-700" : "bg-red-900 hover:bg-red-800"}`}
          onClick={() => handlePositionChange(pos)}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">
              {is5v5 ? `레드 ${i}` : "레드"}
              {isPlayerHost && <span className="text-yellow-400 ml-2">👑</span>}
            </span>
            {(player?.isReady || (isCurrentPlayer && isReady)) && (
              <span className="text-green-400 text-sm">준비완료</span>
            )}
          </div>
          <div className="mt-1 text-lg">
            {player ? player.nickname : "빈 자리"}
          </div>
        </div>
      );
    }

    return slots;
  };

  return (
    <div className="container mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-8">
        {gameInfo.status.blueTeamName || "블루팀"} vs{" "}
        {gameInfo.status.redTeamName || "레드팀"}
      </h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Blue Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-blue-400 mb-4">
            블루팀 <span className="text-white">{gameInfo.blueScore || 0}</span>
          </h2>
          <div>
            {renderTeamSlots().slice(
              0,
              gameInfo.settings.playerType === "5v5" ? 5 : 1
            )}
          </div>
        </div>

        {/* Red Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            레드팀 <span className="text-white">{gameInfo.redScore || 0}</span>
          </h2>
          <div>
            {renderTeamSlots().slice(
              gameInfo.settings.playerType === "5v5" ? 5 : 1
            )}
          </div>
        </div>
      </div>

      {/* Spectators */}
      <div className="mt-8 p-4 bg-gray-800 rounded-md">
        <h3 className="text-lg font-semibold mb-2">관전자</h3>
        <div className="flex flex-wrap gap-2">
          {players
            .filter((p) => p.position === "spectator")
            .map((spectator, index) => (
              <div
                key={index}
                className={`px-3 py-1 rounded ${
                  position === "spectator" &&
                  spectator.nickname ===
                    players.find((p) => p.position === position)?.nickname
                    ? "bg-purple-700"
                    : "bg-gray-700"
                } flex items-center gap-1`}
              >
                {spectator.nickname}
                {spectator.isHost && (
                  <span className="text-yellow-400 ml-1">👑</span>
                )}
              </div>
            ))}
          {position !== "spectator" && (
            <div
              className="px-3 py-1 rounded bg-gray-700 hover:bg-purple-700 cursor-pointer"
              onClick={() => onPositionChange("spectator")}
            >
              관전하기
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
            disabled={!areAllTeamPlayersReady()}
            className={`px-6 py-3 rounded-lg font-bold ${
              areAllTeamPlayersReady()
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

import { useState, useEffect } from "react";

interface GameInfo {
  gameCode: string;
  playerType: string;
  teamNames?: {
    blue?: string;
    red?: string;
  };
  status: {
    blueScore?: number;
    redScore?: number;
  };
}

interface Player {
  nickname: string;
  position: string;
  isReady: boolean;
}

interface LobbyPhaseProps {
  gameInfo: GameInfo;
  gameId: string; // Add direct gameId prop
  position: string;
  isHost: boolean;
  onPositionChange: (position: string) => void;
  onReadyChange: (isReady: boolean) => void;
  onStartDraft: () => void;
}

export default function LobbyPhase({
  gameInfo,
  gameId, // Add gameId to function parameters
  position,
  isHost,
  onPositionChange,
  onReadyChange,
  onStartDraft,
}: LobbyPhaseProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Fetch players on component mount and periodically
  useEffect(() => {
    // Use gameId directly instead of gameInfo.gameCode
    if (!gameId) {
      console.error("Game ID is undefined, can't fetch players");
      return;
    }

    const fetchPlayers = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/games/${gameId}/clients`
        );
        if (response.ok) {
          const data = await response.json();
          setPlayers(data.clients || []);
        }
      } catch (error) {
        console.error("Failed to fetch players:", error);
      }
    };

    fetchPlayers();

    // Poll for players every 2 seconds
    const interval = setInterval(fetchPlayers, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [gameId]); // Use gameId in dependency array

  // Update ready status if current player is in the list
  useEffect(() => {
    const currentPlayer = players.find((p) => p.position === position);
    if (currentPlayer) {
      setIsReady(currentPlayer.isReady);
    }
  }, [players, position]);

  // Handle ready button click
  const handleReadyClick = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    onReadyChange(newReadyState);
  };

  // Check if position is available
  const isPositionAvailable = (pos: string) => {
    return !players.some((p) => p.position === pos);
  };

  // Check if all team players are ready
  const areAllTeamPlayersReady = () => {
    const teamPlayers = players.filter((p) => p.position !== "spectator");
    return teamPlayers.length > 0 && teamPlayers.every((p) => p.isReady);
  };

  // Check if player is on a team (not spectator)
  const isOnTeam = position !== "spectator";

  // Generate team slots based on game type
  const renderTeamSlots = () => {
    const slots = [];
    const is5v5 = gameInfo.playerType === "5v5";
    const positionsPerTeam = is5v5 ? 5 : 1;

    // Blue team slots
    for (let i = 1; i <= positionsPerTeam; i++) {
      const pos = `blue${i}`;
      const player = players.find((p) => p.position === pos);

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 cursor-pointer
            ${
              position === pos ? "bg-blue-700" : "bg-blue-900 hover:bg-blue-800"
            }`}
          onClick={() => {
            if (isPositionAvailable(pos) || position === pos) {
              onPositionChange(pos);
            }
          }}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{is5v5 ? `블루 ${i}` : "블루"}</span>
            {player?.isReady && (
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

      slots.push(
        <div
          key={pos}
          className={`p-4 rounded-md mb-2 cursor-pointer
            ${position === pos ? "bg-red-700" : "bg-red-900 hover:bg-red-800"}`}
          onClick={() => {
            if (isPositionAvailable(pos) || position === pos) {
              onPositionChange(pos);
            }
          }}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{is5v5 ? `레드 ${i}` : "레드"}</span>
            {player?.isReady && (
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
        {gameInfo.teamNames?.blue || "블루팀"} vs{" "}
        {gameInfo.teamNames?.red || "레드팀"}
      </h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Blue Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-blue-400 mb-4">
            블루팀{" "}
            <span className="text-white">
              {gameInfo.status?.blueScore || 0}
            </span>
          </h2>
          <div>
            {renderTeamSlots().slice(0, gameInfo.playerType === "5v5" ? 5 : 1)}
          </div>
        </div>

        {/* Red Team Column */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            레드팀{" "}
            <span className="text-white">{gameInfo.status?.redScore || 0}</span>
          </h2>
          <div>
            {renderTeamSlots().slice(gameInfo.playerType === "5v5" ? 5 : 1)}
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
                }`}
              >
                {spectator.nickname}
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

import { useState } from "react";
import { GameInfo } from "@/types/game";

interface SideChoicePhaseProps {
  gameInfo: GameInfo;
  losingSide: "blue" | "red";
  onSideChoice: (choice: "keep" | "swap") => void;
  isHost: boolean;
}

export default function SideChoicePhase({
  gameInfo,
  losingSide,
  onSideChoice,
  isHost,
}: SideChoicePhaseProps) {
  const [selectedChoice, setSelectedChoice] = useState<"keep" | "swap" | null>(
    null
  );

  const handleConfirmChoice = () => {
    if (selectedChoice && isHost) {
      onSideChoice(selectedChoice);
    }
  };

  const getCurrentTeamName = (side: "blue" | "red") => {
    if (gameInfo.status.team1Side === side) {
      return gameInfo.status.team1Name;
    } else {
      return gameInfo.status.team2Name;
    }
  };

  const losingTeamName = getCurrentTeamName(losingSide);

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full text-center">
        <h2 className="text-3xl font-bold mb-4">진영 선택</h2>
        <p className="text-xl mb-8">
          <span
            className={losingSide === "blue" ? "text-blue-400" : "text-red-400"}
          >
            {losingTeamName}
          </span>
          이 다음 세트의 진영을 선택할 수 있습니다.
        </p>

        <div className="flex gap-8 justify-center mb-8">
          <button
            onClick={() => setSelectedChoice("keep")}
            disabled={!isHost}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors
              ${!isHost ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${
                selectedChoice === "keep"
                  ? "bg-blue-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
          >
            현재 진영 유지
          </button>

          <button
            onClick={() => setSelectedChoice("swap")}
            disabled={!isHost}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors
              ${!isHost ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${
                selectedChoice === "swap"
                  ? "bg-red-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
          >
            진영 교체
          </button>
        </div>

        {isHost && selectedChoice && (
          <button
            onClick={handleConfirmChoice}
            className="px-12 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg"
          >
            선택 확정
          </button>
        )}

        {!isHost && (
          <p className="text-gray-400">
            호스트가 진영을 선택하기를 기다리는 중...
          </p>
        )}
      </div>
    </div>
  );
}

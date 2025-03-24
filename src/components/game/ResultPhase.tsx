import { useState } from "react";
import Image from "next/image";
import { GameInfo } from "@/types/game";

interface ResultPhaseProps {
  gameInfo: GameInfo;
  onConfirmResult: (winner: string) => void;
  onNextGame: () => void;
  isHost: boolean;
}

export default function ResultPhase({
  gameInfo,
  onConfirmResult,
  onNextGame,
  isHost,
}: ResultPhaseProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  // Extract ban and pick data from gameInfo
  const blueBans: string[] = [];
  const redBans: string[] = [];
  const bluePicks: { [key: string]: string } = {};
  const redPicks: { [key: string]: string } = {};

  // Process each phase's data from gameInfo
  const phaseData = gameInfo.status.phaseData || [];

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
          blueBans.push(selection);
        }
        // Phase 2,4,6 are Red bans
        else {
          redBans.push(selection);
        }
      }
      // Phases 7-12 are first pick phase
      else if (phaseNum >= 7 && phaseNum <= 12) {
        if (phaseNum === 7) bluePicks["blue1"] = selection;
        else if (phaseNum === 8) redPicks["red1"] = selection;
        else if (phaseNum === 9) redPicks["red2"] = selection;
        else if (phaseNum === 10) bluePicks["blue2"] = selection;
        else if (phaseNum === 11) bluePicks["blue3"] = selection;
        else if (phaseNum === 12) redPicks["red3"] = selection;
      }
      // Phases 13-16 are second ban phase (alternating red, blue)
      else if (phaseNum >= 13 && phaseNum <= 16) {
        // Phase 13,15 are Red bans
        if (phaseNum % 2 === 1) {
          redBans.push(selection);
        }
        // Phase 14,16 are Blue bans
        else {
          blueBans.push(selection);
        }
      }
      // Phases 17-20 are second pick phase
      else if (phaseNum >= 17 && phaseNum <= 20) {
        if (phaseNum === 17) redPicks["red4"] = selection;
        else if (phaseNum === 18) bluePicks["blue4"] = selection;
        else if (phaseNum === 19) bluePicks["blue5"] = selection;
        else if (phaseNum === 20) redPicks["red5"] = selection;
      }
    }
  }

  // Modified handler for selecting a winner - only updates local state without sending to server
  const handleSelectWinner = (winner: string) => {
    setSelectedWinner(winner);
  };

  // New handler for confirming result and proceeding to next game
  const handleConfirmAndProceed = () => {
    if (!selectedWinner || !isHost) return;

    // First send the result to the server
    onConfirmResult(selectedWinner);

    // Then move to the next game
    onNextGame();
  };

  // Get champion image URL from the champion ID
  const getChampionImageUrl = (championId: string) => {
    const version = gameInfo.settings.version;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
  };

  // Render team slot with champion image
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

  // Render ban slot with champion image and red stripe
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

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4 flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">GAME RESULT</h2>
        <p className="text-lg">Set {gameInfo.status.setNumber}</p>
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
                <div key={`blue-ban-${index}`}>
                  {renderBanSlot("blue", index)}
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
                  {renderTeamSlot("blue", position)}
                  <span className="text-sm">{`BLUE ${position}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Area for future image content */}
        <div className="w-full md:w-2/4 bg-gray-900 bg-opacity-30 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="w-full h-64 bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
            <p className="text-gray-400">
              Game result image will be displayed here
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4 justify-center w-full">
            <button
              onClick={() => handleSelectWinner("blue")}
              disabled={!isHost}
              className={`px-6 py-3 rounded-md font-bold transition-colors
                ${isHost ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                ${selectedWinner === "blue" ? "bg-blue-600" : "bg-blue-900"}
                ${isHost && "hover:bg-blue-700"}`}
            >
              블루팀 승리
            </button>

            <button
              onClick={handleConfirmAndProceed}
              disabled={!isHost || !selectedWinner}
              className={`px-6 py-3 rounded-md font-bold transition-colors
                ${
                  isHost && selectedWinner
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }
                bg-gray-600 hover:bg-gray-700`}
            >
              다음 게임으로
            </button>

            <button
              onClick={() => handleSelectWinner("red")}
              disabled={!isHost}
              className={`px-6 py-3 rounded-md font-bold transition-colors
                ${isHost ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                ${selectedWinner === "red" ? "bg-red-600" : "bg-red-900"}
                ${isHost && "hover:bg-red-700"}`}
            >
              레드팀 승리
            </button>
          </div>
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
                <div key={`red-ban-${index}`}>
                  {renderBanSlot("red", index)}
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

import { useState, useMemo } from "react";
import Image from "next/image";
import { GameInfo } from "@/types/game";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  // 마지막 세트인지 확인하는 로직
  const isFinalSet = useMemo(() => {
    const matchFormat = gameInfo.settings.matchFormat || "bo1"; // 기본값 단판제
    const currentSet = gameInfo.status.setNumber || 1; // 현재 세트 번호
    const blueScore = gameInfo.blueScore || 0; // 블루팀 점수
    const redScore = gameInfo.redScore || 0; // 레드팀 점수

    // 단판제인 경우 항상 마지막 세트
    if (matchFormat === "bo1") {
      return true;
    }

    // 3판 2선승제(bo3)
    if (matchFormat === "bo3") {
      // 어느 한 팀이 2승을 달성한 경우
      if (blueScore >= 2 || redScore >= 2) {
        return true;
      }
      // 현재 3세트인 경우
      if (currentSet >= 3) {
        return true;
      }
    }

    // 5판 3선승제(bo5)
    if (matchFormat === "bo5") {
      // 어느 한 팀이 3승을 달성한 경우
      if (blueScore >= 3 || redScore >= 3) {
        return true;
      }
      // 현재 5세트인 경우
      if (currentSet >= 5) {
        return true;
      }
    }

    return false;
  }, [gameInfo]);

  // 승패가 결정되는지 확인하는 로직
  const isMatchDecided = useMemo(() => {
    if (!selectedWinner) return false;

    const matchFormat = gameInfo.settings.matchFormat || "bo1";
    const blueScore = gameInfo.blueScore || 0;
    const redScore = gameInfo.redScore || 0;

    // bo1에서는 항상 승패가 결정됨
    if (matchFormat === "bo1") {
      return true;
    }

    // bo3에서는 한 팀이 1점이고 현재 세트에서 승리한 경우
    if (matchFormat === "bo3") {
      if (selectedWinner === "blue" && blueScore === 1) return true;
      if (selectedWinner === "red" && redScore === 1) return true;
    }

    // bo5에서는 한 팀이 2점이고 현재 세트에서 승리한 경우
    if (matchFormat === "bo5") {
      if (selectedWinner === "blue" && blueScore === 2) return true;
      if (selectedWinner === "red" && redScore === 2) return true;
    }

    return false;
  }, [selectedWinner, gameInfo]);

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

    // 마지막 세트가 아닐 경우에만 다음 게임으로 이동
    if (!isFinalSet) {
      onNextGame();
    }
  };

  // 메인 페이지로 이동하는 핸들러 추가
  const handleGoToMain = () => {
    router.push("/");
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
        <p className="text-lg">
          Set {gameInfo.status.setNumber}
          {isFinalSet && " (최종 세트)"}
        </p>
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

        {/* Center Area with Banner Image */}
        <div className="w-full md:w-2/4 bg-gray-900 bg-opacity-30 rounded-lg p-4 flex flex-col items-center justify-center">
          {/* Banner Image */}
          {gameInfo.settings.bannerImage || gameInfo.bannerImage ? (
            <div className="w-full h-64 bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              <Image
                src={
                  gameInfo.settings.bannerImage || gameInfo.bannerImage || ""
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
                Game result image will be displayed here
              </p>
            </div>
          )}

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
              onClick={
                isMatchDecided ? handleGoToMain : handleConfirmAndProceed
              }
              disabled={!isHost || !selectedWinner}
              className={`px-6 py-3 rounded-md font-bold transition-colors
                ${
                  isHost && selectedWinner
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }
                ${
                  isMatchDecided
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
            >
              {isMatchDecided ? "메인 페이지로" : "다음 게임으로"}
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
            <span className="text-xl">{gameInfo.redScore || 0}</span>
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

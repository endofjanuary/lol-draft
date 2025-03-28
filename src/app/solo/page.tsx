"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SoloDraftPhase from "@/components/solo/SoloDraftPhase";
import SoloResultView from "@/components/solo/SoloResultView";

interface BanPickRecord {
  phase: number;
  championId: string;
  team: "blue" | "red";
}

export default function SoloGame() {
  const router = useRouter();
  const [gameInfo, setGameInfo] = useState({
    version: "",
    draftType: "",
    status: {
      phase: 1, // Solo mode starts at phase 1
      currentSet: 1,
      blueTeamName: "블루팀",
      redTeamName: "레드팀",
    },
    blueScore: 0,
    redScore: 0,
    globalBans: [] as string[],
    timerSetting: false, // 추가: timerSetting 속성 초기화
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 게임 진행 상태 관리
  const [banPickHistory, setBanPickHistory] = useState<BanPickRecord[]>([]);
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // 현재 턴의 팀 계산
  const getCurrentTeam = (phase: number): "blue" | "red" => {
    // Phase 1-6: 첫 번째 밴 페이즈 (blue→red→blue→red→blue→red)
    if (phase >= 1 && phase <= 6) {
      return phase % 2 === 1 ? "blue" : "red";
    }

    // Phase 7-12: 첫 번째 픽 페이즈
    if (phase === 7) return "blue"; // 블루1픽
    if (phase === 8 || phase === 9) return "red"; // 레드1,2픽
    if (phase === 10 || phase === 11) return "blue"; // 블루2,3픽
    if (phase === 12) return "red"; // 레드3픽

    // Phase 13-16: 두 번째 밴 페이즈 (red→blue→red→blue)
    if (phase >= 13 && phase <= 16) {
      return phase % 2 === 0 ? "blue" : "red";
    }

    // Phase 17-20: 두 번째 픽 페이즈
    if (phase === 17) return "red"; // 레드4픽
    if (phase === 18 || phase === 19) return "blue"; // 블루4,5픽
    if (phase === 20) return "red"; // 레드5픽

    return "blue"; // 기본값
  };

  // localStorage에서 게임 설정 불러오기
  useEffect(() => {
    try {
      const soloGameConfig = localStorage.getItem("soloGameConfig");

      if (!soloGameConfig) {
        router.push("/create");
        return;
      }

      const config = JSON.parse(soloGameConfig);

      setGameInfo({
        version: config.version || "14.10.1",
        draftType: config.draftType || "tournament",
        timerSetting: config.timerSetting || false,
        status: {
          phase: 1, // Solo mode starts directly at phase 1 (first ban phase)
          currentSet: 1,
          blueTeamName: config.blueTeamName || "블루팀",
          redTeamName: config.redTeamName || "레드팀",
        },
        globalBans: config.globalBans || [],
        blueScore: 0,
        redScore: 0,
      });

      setLoading(false);
    } catch (err) {
      setError("게임 설정을 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, [router]);

  // 챔피언 선택 처리
  const handleSelectChampion = (champion: string) => {
    setSelectedChampion(champion);
  };

  // 선택 확정 및 다음 페이즈 진행
  const handleConfirmSelection = (forcedChampionId?: string) => {
    // 타이머에 의한 강제 선택이 있으면 그 챔피언을 사용, 아니면 현재 선택된 챔피언 사용
    const championToUse = forcedChampionId || selectedChampion;

    // 선택된 챔피언이 없으면 중단 (밴 건너뛰기는 예외)
    if (
      !championToUse &&
      !(
        gameInfo.status.phase <= 6 ||
        (gameInfo.status.phase >= 13 && gameInfo.status.phase <= 16)
      )
    ) {
      return;
    }

    const currentPhase = gameInfo.status.phase;
    const currentTeam = getCurrentTeam(currentPhase);

    // 밴픽 기록에 추가 (선택된 챔피언이 있을 때만)
    if (championToUse) {
      const newRecord: BanPickRecord = {
        phase: currentPhase,
        championId: championToUse,
        team: currentTeam,
      };

      setBanPickHistory((prev) => [...prev, newRecord]);
    }

    // 밴픽 완료 (phase 20) 확인
    if (currentPhase === 20) {
      setShowConfirmDialog(true);
      return;
    }

    // 다음 페이즈로 진행
    setGameInfo((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        phase: currentPhase + 1,
      },
    }));

    // 선택 초기화
    setSelectedChampion(null);
  };

  // 게임 결과 - 블루팀 승리
  const handleBlueWin = () => {
    localStorage.setItem(
      "soloDraftResult",
      JSON.stringify({
        winner: "blue",
        banPicks: banPickHistory,
        blueTeamName: gameInfo.status.blueTeamName,
        redTeamName: gameInfo.status.redTeamName,
        version: gameInfo.version,
      })
    );

    setGameInfo((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        phase: 21, // 완료 상태로 설정
      },
      blueScore: (prev.blueScore || 0) + 1,
    }));

    setShowConfirmDialog(false);
    setGameCompleted(true);
  };

  // 게임 결과 - 레드팀 승리
  const handleRedWin = () => {
    localStorage.setItem(
      "soloDraftResult",
      JSON.stringify({
        winner: "red",
        banPicks: banPickHistory,
        blueTeamName: gameInfo.status.blueTeamName,
        redTeamName: gameInfo.status.redTeamName,
        version: gameInfo.version,
      })
    );

    setGameInfo((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        phase: 21, // 완료 상태로 설정
      },
      redScore: (prev.redScore || 0) + 1,
    }));

    setShowConfirmDialog(false);
    setGameCompleted(true);
  };

  // 새 게임 시작
  const handleNewGame = () => {
    setBanPickHistory([]);
    setSelectedChampion(null);
    setGameCompleted(false);

    setGameInfo((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        phase: 1, // 첫 단계로 초기화
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030C28] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="ml-3">게임 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030C28] text-white p-4">
        <div className="bg-red-600 text-white p-4 rounded-md mb-4">
          <p>{error}</p>
        </div>
        <button
          onClick={() => router.push("/create")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          게임 생성 페이지로 돌아가기
        </button>
      </div>
    );
  }

  // 게임 완료 후 결과 화면 표시
  if (gameCompleted || gameInfo.status.phase === 21) {
    return (
      <SoloResultView
        banPickHistory={banPickHistory}
        blueTeamName={gameInfo.status.blueTeamName}
        redTeamName={gameInfo.status.redTeamName}
        blueScore={gameInfo.blueScore}
        redScore={gameInfo.redScore}
        version={gameInfo.version}
        onNewGame={handleNewGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#030C28] text-white">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">솔로 모드 밴픽</h1>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">
              {gameInfo.status.blueTeamName}
            </span>
            <span className="text-2xl font-bold">
              {gameInfo.blueScore || 0}
            </span>
            <span className="mx-2">:</span>
            <span className="text-2xl font-bold">{gameInfo.redScore || 0}</span>
            <span className="text-red-400 font-bold">
              {gameInfo.status.redTeamName}
            </span>
          </div>
        </div>

        {/* 솔로 모드 밴픽 컴포넌트 */}
        <SoloDraftPhase
          gameInfo={gameInfo}
          onSelectChampion={handleSelectChampion}
          onConfirmSelection={handleConfirmSelection}
          banPickHistory={banPickHistory}
          selectedChampion={selectedChampion}
          currentTeam={getCurrentTeam(gameInfo.status.phase)}
        />

        {/* 밴픽 완료 후 승리팀 선택 대화상자 */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">밴픽 완료</h3>
              <p className="mb-6">
                챔피언 밴픽이 완료되었습니다. 승리 팀을 선택해주세요.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleBlueWin}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  {gameInfo.status.blueTeamName} 승리
                </button>
                <button
                  onClick={handleRedWin}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
                >
                  {gameInfo.status.redTeamName} 승리
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

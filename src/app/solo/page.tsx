"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SoloDraftPhase from "@/components/solo/SoloDraftPhase";

export default function SoloGame() {
  const router = useRouter();
  const [gameInfo, setGameInfo] = useState({
    version: "",
    draftType: "",
    status: {
      phase: 1, // Solo mode starts at phase 1
      blueScore: 0,
      redScore: 0,
      currentSet: 1,
      blueTeamName: "블루팀",
      redTeamName: "레드팀",
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get game configuration from localStorage (set during game creation)
  useEffect(() => {
    try {
      const soloGameConfig = localStorage.getItem("soloGameConfig");

      if (!soloGameConfig) {
        // If no configuration exists, redirect to create page
        router.push("/create");
        return;
      }

      const config = JSON.parse(soloGameConfig);

      setGameInfo({
        version: config.version,
        draftType: config.draftType,
        status: {
          phase: 1, // Solo mode starts directly at phase 1 (first ban phase)
          blueScore: 0,
          redScore: 0,
          currentSet: 1,
          blueTeamName: config.blueTeamName || "블루팀",
          redTeamName: config.redTeamName || "레드팀",
        },
      });

      setLoading(false);
    } catch (err) {
      setError("게임 설정을 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, [router]);

  // Handle champion selection
  const handleSelectChampion = (champion: string) => {
    console.log(`Selected champion: ${champion}`);
    // This will be implemented to update local state
  };

  // Handle selection confirmation and phase progression
  const handleConfirmSelection = () => {
    console.log("Selection confirmed");
    // This will be implemented to advance phases locally
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

  return (
    <div className="min-h-screen bg-[#030C28] text-white">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">솔로 모드 밴픽</h1>
        <p className="mb-8">
          서버 연결 없이 직접 밴픽을 진행합니다. 챔피언을 선택하고 확정하세요.
        </p>

        {/* 솔로 모드 밴픽 컴포넌트 */}
        <SoloDraftPhase
          gameInfo={gameInfo}
          onSelectChampion={handleSelectChampion}
          onConfirmSelection={handleConfirmSelection}
        />
      </div>
    </div>
  );
}

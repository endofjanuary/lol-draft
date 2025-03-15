import { useState, useEffect } from "react";
import Image from "next/image";

interface ChampionData {
  id: string;
  key: string;
  name: string;
  image: {
    full: string;
  };
}

interface GameInfo {
  version: string;
  draftType: string;
  status: {
    phase: number;
    blueScore: number;
    redScore: number;
    currentSet: number;
    blueTeamName: string;
    redTeamName: string;
  };
}

interface SoloDraftPhaseProps {
  gameInfo: GameInfo;
  onSelectChampion: (champion: string) => void;
  onConfirmSelection: () => void;
}

export default function SoloDraftPhase({
  gameInfo,
  onSelectChampion,
  onConfirmSelection,
}: SoloDraftPhaseProps) {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [bannedChampions, setBannedChampions] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<{ [key: string]: string }>({});
  const [redPicks, setRedPicks] = useState<{ [key: string]: string }>({});
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [currentTeam, setCurrentTeam] = useState<"blue" | "red">("blue");
  const [error, setError] = useState<string | null>(null);

  // Determine current action based on phase
  const getCurrentAction = () => {
    const phase = gameInfo.status.phase;
    if (phase <= 6 || (phase >= 13 && phase <= 16)) return "BAN";
    return "PICK";
  };

  // Get phase description
  const getPhaseDescription = () => {
    const phase = gameInfo.status.phase;
    if (phase >= 1 && phase <= 6) return "BAN PHASE 1";
    if (phase >= 7 && phase <= 12) return "PICK PHASE 1";
    if (phase >= 13 && phase <= 16) return "BAN PHASE 2";
    if (phase >= 17 && phase <= 20) return "PICK PHASE 2";
    return "DRAFT PHASE";
  };

  // Fetch champions on component mount
  useEffect(() => {
    const fetchChampions = async () => {
      if (!gameInfo.version) return;

      try {
        setLoading(true);
        const response = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${gameInfo.version}/data/ko_KR/champion.json`
        );

        if (!response.ok) {
          throw new Error("챔피언 정보를 불러오는데 실패했습니다");
        }

        const data = await response.json();

        // Convert champion object to array
        const champArray = Object.values(data.data) as ChampionData[];
        setChampions(champArray);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchChampions();
  }, [gameInfo.version]);

  // This will be expanded with more functionality as we develop
  // For now, just a placeholder component that displays the champions

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">{getPhaseDescription()}</h2>
        <p className="text-lg">
          {currentTeam === "blue" ? "블루팀" : "레드팀"}의 {getCurrentAction()}{" "}
          차례
        </p>
        <p className="text-sm mt-2">Phase: {gameInfo.status.phase}/20</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-600 text-white p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xl">솔로 모드 구현 중입니다...</p>
          <p className="mt-2">챔피언 {champions.length}개 로드 완료</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BanPickRecord {
  phase: number;
  championId: string;
  team: "blue" | "red";
}

interface SoloResultViewProps {
  banPickHistory: BanPickRecord[];
  blueTeamName: string;
  redTeamName: string;
  blueScore: number;
  redScore: number;
  version: string;
  onNewGame: () => void;
}

export default function SoloResultView({
  banPickHistory,
  blueTeamName,
  redTeamName,
  blueScore,
  redScore,
  version,
  onNewGame,
}: SoloResultViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // 밴/픽 정보를 팀별로 분리
  const { blueBans, redBans, bluePicks, redPicks } = useMemo(() => {
    const result = {
      blueBans: [] as string[],
      redBans: [] as string[],
      bluePicks: [] as { position: number; championId: string }[],
      redPicks: [] as { position: number; championId: string }[],
    };

    banPickHistory.forEach((record) => {
      const { phase, championId, team } = record;

      if (phase <= 6) {
        // 첫 번째 밴 페이즈
        if (team === "blue") result.blueBans.push(championId);
        else result.redBans.push(championId);
      } else if (phase <= 12) {
        // 첫 번째 픽 페이즈
        const position =
          team === "blue"
            ? phase === 7
              ? 1
              : phase === 10
              ? 2
              : 3
            : phase === 8
            ? 1
            : phase === 9
            ? 2
            : 3;

        if (team === "blue") result.bluePicks.push({ position, championId });
        else result.redPicks.push({ position, championId });
      } else if (phase <= 16) {
        // 두 번째 밴 페이즈
        if (team === "blue") result.blueBans.push(championId);
        else result.redBans.push(championId);
      } else {
        // 두 번째 픽 페이즈
        const position =
          team === "blue" ? (phase === 18 ? 4 : 5) : phase === 17 ? 4 : 5;

        if (team === "blue") result.bluePicks.push({ position, championId });
        else result.redPicks.push({ position, championId });
      }
    });

    // 포지션 번호로 정렬
    result.bluePicks.sort((a, b) => a.position - b.position);
    result.redPicks.sort((a, b) => a.position - b.position);

    return result;
  }, [banPickHistory]);

  // 결과를 복사하는 함수
  const copyResultToClipboard = () => {
    const bluePicksText = bluePicks.map((p) => p.championId).join(", ");
    const redPicksText = redPicks.map((p) => p.championId).join(", ");
    const blueBansText = blueBans.join(", ");
    const redBansText = redBans.join(", ");

    const resultText = `
${blueTeamName} vs ${redTeamName}
Score: ${blueScore} : ${redScore}

${blueTeamName} Picks: ${bluePicksText}
${blueTeamName} Bans: ${blueBansText}

${redTeamName} Picks: ${redPicksText}
${redTeamName} Bans: ${redBansText}
    `.trim();

    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 승자 결정
  const winner = blueScore > redScore ? "blue" : "red";

  return (
    <div className="min-h-screen bg-[#030C28] text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8">밴픽 결과</h1>

        {/* 점수 표시 */}
        <div className="flex justify-center items-center mb-8">
          <div
            className={`text-2xl font-bold px-4 py-2 rounded-lg ${
              winner === "blue" ? "bg-blue-700" : ""
            }`}
          >
            <span className="text-blue-400">{blueTeamName}</span>
          </div>
          <div className="text-4xl font-bold mx-6">
            <span className={winner === "blue" ? "text-blue-400" : ""}>
              {blueScore}
            </span>
            <span className="mx-2">:</span>
            <span className={winner === "red" ? "text-red-400" : ""}>
              {redScore}
            </span>
          </div>
          <div
            className={`text-2xl font-bold px-4 py-2 rounded-lg ${
              winner === "red" ? "bg-red-700" : ""
            }`}
          >
            <span className="text-red-400">{redTeamName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* 블루팀 섹션 */}
          <div className="bg-blue-900 bg-opacity-20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">
              {blueTeamName}
            </h2>

            {/* 블루팀 픽 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Picks</h3>
              <div className="grid grid-cols-5 gap-2">
                {bluePicks.map((pick) => (
                  <div
                    key={`blue-pick-${pick.position}`}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden">
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${pick.championId}.png`}
                        alt={pick.championId}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs mt-1">포지션 {pick.position}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 블루팀 밴 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Bans</h3>
              <div className="flex flex-wrap gap-2">
                {blueBans.map((ban, index) => (
                  <div
                    key={`blue-ban-${index}`}
                    className="relative w-12 h-12 rounded-md overflow-hidden"
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${ban}.png`}
                      alt={ban}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 레드팀 섹션 */}
          <div className="bg-red-900 bg-opacity-20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              {redTeamName}
            </h2>

            {/* 레드팀 픽 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Picks</h3>
              <div className="grid grid-cols-5 gap-2">
                {redPicks.map((pick) => (
                  <div
                    key={`red-pick-${pick.position}`}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden">
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${pick.championId}.png`}
                        alt={pick.championId}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs mt-1">포지션 {pick.position}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 레드팀 밴 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Bans</h3>
              <div className="flex flex-wrap gap-2">
                {redBans.map((ban, index) => (
                  <div
                    key={`red-ban-${index}`}
                    className="relative w-12 h-12 rounded-md overflow-hidden"
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${ban}.png`}
                      alt={ban}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 작업 버튼 */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
          <button
            onClick={copyResultToClipboard}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md min-w-32 transition-colors"
          >
            {copied ? "복사됨!" : "결과 복사하기"}
          </button>

          <button
            onClick={onNewGame}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md min-w-32 transition-colors"
          >
            새 게임 시작하기
          </button>

          <button
            onClick={() => router.push("/create")}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md min-w-32 transition-colors"
          >
            메인 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}

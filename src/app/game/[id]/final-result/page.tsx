"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FinalResultPhase from "@/components/game/FinalResultPhase";
import { GameInfo } from "@/types/game";

export default function FinalResultPage() {
  const params = useParams();
  const gameId = params.id as string;
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameInfo = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}`);
        if (!response.ok) {
          throw new Error("게임을 찾을 수 없습니다.");
        }
        const data = await response.json();
        console.log("Final result page - fetched game data:", data);
        console.log("Results count:", data.results?.length || 0);
        setGameInfo(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGameInfo();
    }
  }, [gameId]);

  // 게임 결과가 없는 경우 주기적으로 재시도
  useEffect(() => {
    if (gameInfo && (!gameInfo.results || gameInfo.results.length === 0)) {
      console.log("No game results found, retrying in 2 seconds...");
      const retryTimeout = setTimeout(() => {
        window.location.reload();
      }, 2000);

      return () => clearTimeout(retryTimeout);
    }
  }, [gameInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030C28] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">게임 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !gameInfo) {
    return (
      <div className="min-h-screen bg-[#030C28] text-white flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">오류 발생</div>
        <p className="text-center max-w-md">
          {error || "게임 정보를 불러올 수 없습니다."}
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          메인 페이지로 돌아가기
        </button>
      </div>
    );
  }

  return <FinalResultPhase gameInfo={gameInfo} />;
}

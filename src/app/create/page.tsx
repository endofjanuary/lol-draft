"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Champion {
  id: string;
  name: string;
  image: {
    full: string;
  };
}

export default function CreateGame() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    patchVersion: "",
    gameName: "",
    blueTeamName: "",
    redTeamName: "",
    draftMode: "",
    tournamentSet: "",
    timerSetting: "",
    globalBans: [] as string[],
    tournamentImage: null,
  });
  const [versions, setVersions] = useState<string[]>([]);
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch patch versions only after component is hydrated on client
  useEffect(() => {
    if (!isClient) return;

    const fetchVersions = async () => {
      try {
        const response = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const data = await response.json();
        // Get the latest 5 versions
        const latestVersions = data.slice(0, 5);
        setVersions(latestVersions);
        // Set default to latest version
        if (latestVersions.length > 0) {
          setFormData((prev) => ({ ...prev, patchVersion: latestVersions[0] }));
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      }
    };

    fetchVersions();
  }, [isClient]);

  // Fetch champions when needed
  const fetchChampions = async () => {
    if (!formData.patchVersion) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${formData.patchVersion}/data/ko_KR/champion.json`
      );
      const data = await response.json();

      // Convert object to array and sort by name
      const championsArray = Object.values(data.data) as Champion[];
      setChampions(championsArray);
    } catch (error) {
      console.error("Failed to fetch champions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleModeSelection = (mode: string) => {
    setFormData({
      ...formData,
      draftMode: mode,
    });
  };

  const handleSetSelection = (set: string) => {
    setFormData({
      ...formData,
      tournamentSet: set,
    });
  };

  const handleTimerSelection = (timer: string) => {
    setFormData({
      ...formData,
      timerSetting: timer,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log("Image uploaded:", e.target.files[0]);
      // Image handling would go here in a real implementation
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);
    // Here you would handle creating the game with the provided options
    // Then potentially navigate to the game room
  };

  const openChampionModal = () => {
    setShowChampionModal(true);
    fetchChampions();
  };

  const closeChampionModal = () => {
    setShowChampionModal(false);
  };

  const toggleChampionBan = (championId: string) => {
    setFormData((prev) => {
      if (prev.globalBans.includes(championId)) {
        return {
          ...prev,
          globalBans: prev.globalBans.filter((id) => id !== championId),
        };
      } else {
        return {
          ...prev,
          globalBans: [...prev.globalBans, championId],
        };
      }
    });
  };

  // Only render the full content after client-side hydration
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030C28] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-[#030C28] text-white">
      <main className="flex flex-col items-center max-w-3xl w-full py-8">
        <h1 className="text-3xl font-bold mb-4 text-center">
          리그 오브 레전드
          <br />
          게임 밴픽 시뮬레이터
        </h1>

        <h2 className="text-xl mb-8 text-center text-blue-300">
          밴픽 시뮬레이션에 오신 것을 환영합니다!
        </h2>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patch Version */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">패치 버전</label>
              <select
                name="patchVersion"
                value={formData.patchVersion}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {versions.length > 0 ? (
                  versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))
                ) : (
                  <option value="">로딩 중...</option>
                )}
              </select>
            </div>

            {/* Game Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">경기 이름</label>
              <input
                type="text"
                name="gameName"
                value={formData.gameName}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="경기 이름을 입력하세요"
              />
            </div>

            {/* Team Names */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">블루팀 이름</label>
              <input
                type="text"
                name="blueTeamName"
                value={formData.blueTeamName}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="블루팀 이름을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">레드팀 이름</label>
              <input
                type="text"
                name="redTeamName"
                value={formData.redTeamName}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="레드팀 이름을 입력하세요"
              />
            </div>
          </div>

          {/* Draft Mode */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">밴픽 모드 선택</label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => handleModeSelection("tournament")}
                className={`px-4 py-2 rounded-md border ${
                  formData.draftMode === "tournament"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                일반 대회 모드
              </button>
              <button
                type="button"
                onClick={() => handleModeSelection("hardFearless")}
                className={`px-4 py-2 rounded-md border ${
                  formData.draftMode === "hardFearless"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                하드 피어리스
              </button>
              <button
                type="button"
                onClick={() => handleModeSelection("softFearless")}
                className={`px-4 py-2 rounded-md border ${
                  formData.draftMode === "softFearless"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                소프트 피어리스
              </button>
            </div>
          </div>

          {/* Tournament Set */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              대회 세트 수 선택
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => handleSetSelection("bo5")}
                className={`px-4 py-2 rounded-md border ${
                  formData.tournamentSet === "bo5"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                5판 3선승
              </button>
              <button
                type="button"
                onClick={() => handleSetSelection("bo3")}
                className={`px-4 py-2 rounded-md border ${
                  formData.tournamentSet === "bo3"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                3판 2선승
              </button>
              <button
                type="button"
                onClick={() => handleSetSelection("bo1")}
                className={`px-4 py-2 rounded-md border ${
                  formData.tournamentSet === "bo1"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                단판제
              </button>
            </div>
          </div>

          {/* Timer Setting */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              밴픽 타이머 설정
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => handleTimerSelection("limited")}
                className={`px-4 py-2 rounded-md border ${
                  formData.timerSetting === "limited"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                대회와 동일하게
              </button>
              <button
                type="button"
                onClick={() => handleTimerSelection("unlimited")}
                className={`px-4 py-2 rounded-md border ${
                  formData.timerSetting === "unlimited"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                시간 무제한
              </button>
            </div>
          </div>

          {/* Optional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Ban Champions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                글로벌 밴 챔피언 추가 (선택사항)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.globalBans.map((championId) => (
                  <div
                    key={championId}
                    className="relative group"
                    onClick={() => toggleChampionBan(championId)}
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${formData.patchVersion}/img/champion/${championId}.png`}
                      alt={championId}
                      width={40}
                      height={40}
                      className="rounded-md cursor-pointer border-2 border-red-500"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-md transition-all">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold">
                        ✖
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={openChampionModal}
                className="w-10 h-10 rounded-md border border-gray-500 flex items-center justify-center text-2xl hover:bg-gray-700"
              >
                +
              </button>
            </div>

            {/* Tournament Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                대회 이미지 업로드 (선택사항)
              </label>
              <label className="cursor-pointer">
                <div className="w-full p-4 rounded-md border border-dashed border-gray-500 hover:bg-gray-800 flex flex-col items-center justify-center">
                  <span className="text-gray-400">
                    이미지 파일을 선택하세요
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              생성
            </button>
          </div>
        </form>
      </main>

      {/* Champion Selection Modal */}
      {showChampionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">글로벌 밴 챔피언 선택</h3>
              <button
                onClick={closeChampionModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✖
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {champions.map((champion) => (
                  <div
                    key={champion.id}
                    className={`relative cursor-pointer transition-all ${
                      formData.globalBans.includes(champion.id)
                        ? "ring-2 ring-red-500"
                        : ""
                    }`}
                    onClick={() => toggleChampionBan(champion.id)}
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${formData.patchVersion}/img/champion/${champion.id}.png`}
                      alt={champion.name}
                      width={60}
                      height={60}
                      className="rounded-md"
                    />
                    {formData.globalBans.includes(champion.id) && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-30 rounded-md flex items-center justify-center">
                        <span className="text-white text-lg font-bold">✖</span>
                      </div>
                    )}
                    <p className="text-xs text-center mt-1 truncate">
                      {champion.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeChampionModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

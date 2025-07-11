"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getApiBaseUrl } from "@/utils/apiConfig";

interface Champion {
  id: string;
  name: string;
  image: {
    full: string;
  };
}

export default function CreateGame() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    patchVersion: "",
    gameName: "",
    blueTeamName: "",
    redTeamName: "",
    draftMode: "tournament",
    playerMode: "1v1",
    tournamentSet: "bo1",
    timerSetting: "limited",
    globalBans: [] as string[],
    bannerImage: null as string | null,
  });
  const [versions, setVersions] = useState<string[]>([]);
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 기존 코드의 모든 함수와 로직 유지
  // ...

  // 기존 코드에서 CreateGameForm의 내용을 그대로 가져옴
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

  useEffect(() => {
    fetchVersions();
  }, []);

  // 나머지 함수들도 모두 동일하게 유지
  // fetchChampions, handleInputChange, handleModeSelection 등...

  const fetchChampions = async () => {
    if (!formData.patchVersion) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${formData.patchVersion}/data/ko_KR/champion.json`
      );
      const data = await response.json();

      // Convert object to array and sort by Korean name
      const championsArray = Object.values(data.data) as Champion[];
      championsArray.sort((a, b) => a.name.localeCompare(b.name, "ko"));
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

  const handlePlayerModeSelection = (mode: string) => {
    setFormData({
      ...formData,
      playerMode: mode,
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
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        // Fix the null check issue by using a type assertion or alternative approach
        const result = event.target?.result;
        if (result && typeof result === "string") {
          setFormData((prev) => ({
            ...prev,
            bannerImage: result,
          }));
        }
      };

      reader.readAsDataURL(file);
    }
  };

  // Preview component for the uploaded image
  const BannerPreview = () => {
    if (!formData.bannerImage) return null;

    return (
      <div className="mt-2 relative">
        <Image
          src={formData.bannerImage}
          alt="Banner preview"
          width={200}
          height={100}
          className="rounded-md object-cover"
        />
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({ ...prev, bannerImage: null }))
          }
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
        >
          ✖
        </button>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    try {
      // For solo mode, store config in localStorage and navigate to solo page
      if (formData.playerMode === "solo") {
        const soloGameConfig = {
          version: formData.patchVersion,
          draftType: formData.draftMode,
          blueTeamName: formData.blueTeamName || "블루팀",
          redTeamName: formData.redTeamName || "레드팀",
          globalBans: formData.globalBans,
          timerSetting: formData.timerSetting === "limited",
          bannerImage: formData.bannerImage,
        };

        // Store config in localStorage
        localStorage.setItem("soloGameConfig", JSON.stringify(soloGameConfig));

        // Navigate to solo game page
        router.push("/solo");
        return;
      }

      // Map playerMode from UI to playerType for API
      let playerType = formData.playerMode;
      if (formData.playerMode === "solo") {
        playerType = "single";
      }

      // For multiplayer modes, continue with server request
      const requestBody = {
        version: formData.patchVersion,
        draftType: formData.draftMode,
        playerType: playerType,
        matchFormat: formData.tournamentSet,
        timeLimit: formData.timerSetting === "limited",
        teamNames: {
          blue: formData.blueTeamName || "블루팀",
          red: formData.redTeamName || "레드팀",
        },
        gameName: formData.gameName || "새로운 게임",
        globalBans: formData.globalBans,
        bannerImage: formData.bannerImage,
      };

      console.log("Creating game with options:", requestBody);

      const apiBaseUrl = getApiBaseUrl();
      console.log("API URL:", apiBaseUrl);

      const response = await fetch(`${apiBaseUrl}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // 상세한 에러 메시지를 추출하려고 시도합니다
        let errorDetail;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || `서버 오류 (${response.status})`;
        } catch (e) {
          errorDetail = `서버 오류 (${response.status})`;
        }

        throw new Error(`게임 생성 실패: ${errorDetail}`);
      }

      const gameData = await response.json();
      console.log("게임 생성 성공:", gameData);
      router.push(`/game/${gameData.gameCode}`);
    } catch (error) {
      console.error("게임 생성 중 오류 발생:", error);
      setApiError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
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

  // 기존 렌더링 로직 그대로 유지
  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-[#030C28] text-white">
      {/* 기존 JSX 코드 유지 */}
      <main className="flex flex-col items-center max-w-3xl w-full py-8">
        <h1 className="text-3xl font-bold mb-4 text-center">
          리그 오브 레전드
          <br />
          게임 밴픽 시뮬레이터
        </h1>

        <h2 className="text-xl mb-8 text-center text-blue-300">
          밴픽 시뮬레이션에 오신 것을 환영합니다!
        </h2>

        {apiError && (
          <div className="w-full bg-red-600 text-white p-3 rounded-md mb-6">
            <p>{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patch Version */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">패치 버전</label>
              <select
                name="patchVersion"
                value={formData.patchVersion}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Ctitle%3Edown-arrow%3C%2Ftitle%3E%3Cg%20fill%3D%22%23ffffff%22%3E%3Cpath%20d%3D%22M10.293%2C3.293%2C6%2C7.586%2C1.707%2C3.293A1%2C1%2C0%2C0%2C0%2C.293%2C4.707l5%2C5a1%2C1%2C0%2C0%2C0%2C1.414%2C0l5-5a1%2C1%2C0%2C1%2C0-1.414-1.414Z%22%20fill%3D%22%23ffffff%22%3E%3C%2Fpath%3E%3C%2Fg%3E%3C%2Fsvg%3E')]"
              >
                {versions.length > 0 ? (
                  versions.map((version) => {
                    const [major, minor] = version.split(".");
                    const displayMajor = (parseInt(major) + 10)
                      .toString()
                      .padStart(2, "0");
                    const displayMinor = minor.padStart(2, "0");
                    const displayVersion = `${displayMajor}.${displayMinor}`;
                    return (
                      <option key={version} value={version}>
                        {displayVersion}
                      </option>
                    );
                  })
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

          {/* Player Mode */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              플레이어 모드 선택
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => handlePlayerModeSelection("solo")}
                className={`px-4 py-2 rounded-md border ${
                  formData.playerMode === "solo"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                솔로
              </button>
              <button
                type="button"
                onClick={() => handlePlayerModeSelection("1v1")}
                className={`px-4 py-2 rounded-md border ${
                  formData.playerMode === "1v1"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                1v1
              </button>
            </div>
            {formData.playerMode === "1v1" && (
              <p className="text-xs text-gray-400 mt-1">
                각 플레이어는 팀의 대표로서 모든 챔피언 선택을 담당합니다.
              </p>
            )}
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
                토너먼트 드래프트
              </button>
              <button
                type="button"
                onClick={() => handleModeSelection("hardFearless")}
                className={`px-4 py-2 rounded-md border flex items-center gap-2 ${
                  formData.draftMode === "hardFearless"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                하드 피어리스
                <div className="bg-white rounded-full p-1">
                  <Image
                    src="/images/lck_logo.svg"
                    alt="LCK Logo"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                </div>
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
                onClick={() => handleSetSelection("bo1")}
                className={`px-4 py-2 rounded-md border ${
                  formData.tournamentSet === "bo1"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                단판제
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
                onClick={() => handleSetSelection("bo5")}
                className={`px-4 py-2 rounded-md border ${
                  formData.tournamentSet === "bo5"
                    ? "bg-blue-600 border-blue-400"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                }`}
              >
                5판 3선승
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
                {formData.globalBans
                  .map((championId) =>
                    champions.find((c) => c.id === championId)
                  )
                  .filter(Boolean)
                  .sort((a, b) => a!.name.localeCompare(b!.name, "ko"))
                  .map((champion) => (
                    <div
                      key={champion!.id}
                      className="bg-gray-700 px-3 py-1 rounded-md flex items-center"
                    >
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${
                          formData.patchVersion
                        }/img/champion/${champion!.id}.png`}
                        alt={champion!.name}
                        width={24}
                        height={24}
                        className="rounded-md mr-2"
                      />
                      <span className="text-sm">{champion!.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChampionBan(champion!.id);
                        }}
                        className="ml-2 text-red-400 hover:text-red-500"
                      >
                        ✖
                      </button>
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
                  {formData.bannerImage ? (
                    <BannerPreview />
                  ) : (
                    <span className="text-gray-400">
                      이미지 파일을 선택하세요
                    </span>
                  )}
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
              disabled={isSubmitting}
              className={`${
                isSubmitting ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
              } text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  생성 중...
                </>
              ) : (
                "생성"
              )}
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
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {champions.map((champion) => (
                  <div
                    key={champion.id}
                    className={`relative cursor-pointer transition-all flex flex-col items-center ${
                      formData.globalBans.includes(champion.id)
                        ? "ring-2 ring-red-500"
                        : ""
                    }`}
                    onClick={() => toggleChampionBan(champion.id)}
                  >
                    <div className="relative">
                      <Image
                        src={`https://ddragon.leagueoflegends.com/cdn/${formData.patchVersion}/img/champion/${champion.id}.png`}
                        alt={champion.name}
                        width={60}
                        height={60}
                        className="rounded-md"
                      />
                      {formData.globalBans.includes(champion.id) && (
                        <div className="absolute top-0 right-0 bg-red-500 rounded-bl-md rounded-tr-md w-6 h-6 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            ✖
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center mt-1 break-keep whitespace-normal">
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const [nickname, setNickname] = useState("");

  const handleCreateNew = () => {
    router.push("/create");
  };

  const handleJoinToggle = () => {
    setShowJoinForm(!showJoinForm);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would handle joining the game with the code and nickname
    console.log("Joining game:", gameCode, "as", nickname);
    // You can add navigation to the game room or other logic here
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#030C28] text-white">
      <main className="flex flex-col items-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-10 text-center">
          리그 오브 레전드
          <br /> 밴픽 시뮬레이터
        </h1>

        <div className="flex gap-4 w-full">
          <button
            onClick={handleCreateNew}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            신규 생성
          </button>

          <button
            onClick={handleJoinToggle}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            밴픽 참가
          </button>
        </div>

        {showJoinForm && (
          <form
            onSubmit={handleJoinSubmit}
            className="mt-6 w-full space-y-4 bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <div>
              <label
                htmlFor="gameCode"
                className="block text-sm font-medium mb-1"
              >
                게임 코드
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium mb-1"
              >
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              참가하기
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";

interface NicknameModalProps {
  onSubmit: (nickname: string) => void;
  currentNickname?: string; // 현재 저장된 닉네임
}

export default function NicknameModal({
  onSubmit,
  currentNickname,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [showNewNicknameInput, setShowNewNicknameInput] = useState(
    !currentNickname
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    onSubmit(nickname);
  };

  const handleUseSavedNickname = () => {
    if (currentNickname) {
      onSubmit(currentNickname);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">게임 참가하기</h2>

        {/* 저장된 닉네임이 있는 경우 */}
        {currentNickname && !showNewNicknameInput && (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">
                이전에 사용한 닉네임:
              </p>
              <p className="text-lg font-semibold text-white">
                {currentNickname}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleUseSavedNickname}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                이 닉네임으로 계속하기
              </button>
              <button
                onClick={() => setShowNewNicknameInput(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                다른 닉네임 사용하기
              </button>
            </div>
          </div>
        )}

        {/* 새 닉네임 입력 */}
        {showNewNicknameInput && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="nickname"
                className="block text-sm font-medium mb-1"
              >
                닉네임
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="게임에서 사용할 닉네임을 입력하세요"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <div className="flex justify-between">
              {currentNickname && (
                <button
                  type="button"
                  onClick={() => setShowNewNicknameInput(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  뒤로
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors ml-auto"
              >
                확인
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

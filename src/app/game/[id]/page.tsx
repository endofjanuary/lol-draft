"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import NicknameModal from "@/components/game/NicknameModal";

export default function GamePage() {
  const { id } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nickname, setNickname] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to socket.io server
  useEffect(() => {
    const socketInstance = io("http://localhost:8000", {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("connection_success", (data) => {
      console.log("Connection successful, socket ID:", data.sid);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
    });

    setSocket(socketInstance);

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleJoinGame = (userNickname: string) => {
    if (!socket || !userNickname.trim()) return;

    setNickname(userNickname);

    socket.emit(
      "join_game",
      {
        gameCode: id,
        nickname: userNickname,
        position: "spectator", // Default to spectator
      },
      (response: any) => {
        if (response.status === "success") {
          console.log("Successfully joined game");
          setShowNicknameModal(false);
        } else {
          setError(response.message || "게임 참가에 실패했습니다.");
        }
      }
    );
  };

  // Show loading state if not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030C28] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>서버에 연결 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030C28] text-white">
      {/* Error message display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md z-50">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && <NicknameModal onSubmit={handleJoinGame} />}

      {/* Empty screen after joining, for future implementation */}
      {!showNicknameModal && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">
            게임에 참가했습니다. 추가 기능은 곧 구현될 예정입니다.
          </p>
        </div>
      )}
    </div>
  );
}

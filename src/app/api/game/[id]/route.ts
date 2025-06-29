import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/utils/apiConfig";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    if (!gameId) {
      return NextResponse.json(
        { error: "게임 ID가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // 백엔드 서버에서 게임 정보 가져오기
    const apiBaseUrl = getApiBaseUrl();
    const backendUrl = `${apiBaseUrl}/games/${gameId}`;

    console.log(`Fetching game info from backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 캐시 비활성화로 최신 데이터 보장
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);

      if (response.status === 404) {
        return NextResponse.json(
          { error: "게임을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "서버에서 게임 정보를 가져올 수 없습니다." },
        { status: 500 }
      );
    }

    const gameData = await response.json();
    console.log(`Game data fetched successfully:`, gameData);

    return NextResponse.json(gameData);
  } catch (error) {
    console.error("Error fetching game info:", error);

    // 네트워크 오류 등의 경우 Mock 데이터 반환
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(
        "백엔드 서버에 연결할 수 없습니다. Mock 데이터를 사용합니다."
      );

      const { id: gameId } = await params;

      const mockGameInfo = {
        code: gameId,
        game: {
          gameCode: gameId,
          createdAt: Date.now(),
        },
        settings: {
          version: "15.11.1",
          draftType: "tournament",
          playerType: "1v1",
          matchFormat: "bo1",
          timeLimit: true,
          globalBans: [],
          bannerImage: undefined,
        },
        status: {
          phase: 0,
          phaseData: Array(22).fill(""),
          team1Name: "Team 1",
          team2Name: "Team 2",
          team1Side: "blue" as const,
          team2Side: "red" as const,
          lastUpdatedAt: Date.now(),
          setNumber: 1,
          blueTeamName: "Team 1",
          redTeamName: "Team 2",
        },
        clients: [],
        team1Score: 0,
        team2Score: 0,
        results: [], // 빈 결과 배열
        blueScore: 0,
        redScore: 0,
      };

      console.log("Using mock game info:", mockGameInfo);
      return NextResponse.json(mockGameInfo);
    }

    return NextResponse.json(
      { error: "내부 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

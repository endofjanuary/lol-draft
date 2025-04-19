/**
 * Determines the base API URL from environment variables.
 * This approach handles different environments including Netlify deployments.
 */
export function getApiBaseUrl(): string {
  // 환경 변수에서 API URL을 가져옵니다
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 환경 변수가 설정되지 않은 경우 기본값을 사용합니다
  if (!apiUrl) {
    console.warn(
      "NEXT_PUBLIC_API_URL이 설정되지 않았습니다. 기본 URL을 사용합니다."
    );
    return "http://localhost:8000";
  }

  return apiUrl;
}

/**
 * Determines the Socket.io connection URL based on the API base URL.
 * Socket.io와 REST API는 동일한 서버를 사용합니다.
 */
export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};

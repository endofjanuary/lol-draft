/**
 * Determines the base API URL from environment variables.
 * This approach prevents exposing the actual server URL in the source code.
 */
export const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (!apiUrl) {
    console.warn("API URL is empty. Please check your environment variables.");
  }
  return apiUrl;
};

/**
 * Determines the Socket.io connection URL based on the API base URL.
 * Socket.io와 REST API는 동일한 서버를 사용합니다.
 */
export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};

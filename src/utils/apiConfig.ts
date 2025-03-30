/**
 * Determines the base API URL from environment variables.
 * This approach prevents exposing the actual server URL in the source code.
 */
export const getApiBaseUrl = (): string => {
  // Use only the environment variable without any fallback URL in the code
  return process.env.NEXT_PUBLIC_API_URL || "";
};

/**
 * Determines the Socket.io connection URL based on the API base URL.
 * Socket.io와 REST API는 동일한 서버를 사용합니다.
 */
export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};

/**
 * Determines the base API URL from environment variables.
 * This approach handles different environments including Netlify deployments.
 */
export const getApiBaseUrl = (): string => {
  // Check if we're running on Netlify
  const isNetlify =
    typeof window !== "undefined" &&
    window.location.hostname.includes("netlify.app");

  // If we're on Netlify and the env var is missing, use an empty string
  if (isNetlify && !process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      "Running on Netlify with missing env variable. API URL is empty."
    );
    return "";
  }

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

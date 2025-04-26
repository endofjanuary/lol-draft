export const SESSION_KEYS = {
  SOCKET_ID: "lol_draft_socket_id",
  NICKNAME: "lol_draft_nickname",
  GAME_CODE: "lol_draft_game_code",
  CLIENT_ID: "lol_draft_client_id",
} as const;

export const getStoredSocketId = () => {
  return sessionStorage.getItem(SESSION_KEYS.SOCKET_ID);
};

export const storeSocketId = (socketId: string) => {
  sessionStorage.setItem(SESSION_KEYS.SOCKET_ID, socketId);
};

export const clearSocketSession = () => {
  sessionStorage.removeItem(SESSION_KEYS.SOCKET_ID);
  sessionStorage.removeItem(SESSION_KEYS.NICKNAME);
  sessionStorage.removeItem(SESSION_KEYS.GAME_CODE);
};

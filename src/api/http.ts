import axios from "axios";
import { expireSession } from "@/lib/sessionAction";
import { openAuthModal } from "@/lib/authModal";
import { getGuestId, getToken } from "@/lib/session";

export const http = axios.create({
  baseURL: "/api",
  timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT ?? 8000),
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Cart-Id"] = getGuestId(); // carrinho do visitante (mesclado no login)
  return config;
});

http.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const code = (error.response.data as { code?: string } | undefined)?.code;
    if (code === "SESSION_EXPIRED") {
      expireSession();
      openAuthModal({
        mode: "login",
        reason: "Sua sessão expirou. Entre novamente para continuar.",
      });
    }
  }
  return Promise.reject(error);
});

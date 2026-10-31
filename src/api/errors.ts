import { isAxiosError } from "axios";

export function apiErrorMessage(
  err: unknown,
  fallback = "Algo deu errado. Tente novamente.",
) {
  if (isAxiosError(err)) {
    const m = err.response?.data?.message;
    if (typeof m === "string") return m;
    if (!err.response)
      return "Sem conexão. Verifique sua rede e tente de novo.";
  }
  return fallback;
}

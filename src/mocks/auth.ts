import { HttpResponse } from "msw";
import type { User } from "@/types/auth";
import * as db from "./authDb";

type Authed = { token: string | null; user: User | null; owner: string };

// Retorna a identidade da requisição ou uma Response 401
export async function authenticate(
  request: Request,
  required: boolean,
): Promise<Authed | Response> {
  await db.ready;
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    const r = db.resolve(token);
    if (r.state !== "ok") {
      return HttpResponse.json(
        { code: "SESSION_EXPIRED", message: "Sua sessão expirou." },
        { status: 401 },
      );
    }
    return { token, user: r.user, owner: `user:${r.user.id}` };
  }
  if (required) {
    return HttpResponse.json(
      { code: "UNAUTHENTICATED", message: "Entre para continuar." },
      { status: 401 },
    );
  }
  return {
    token: null,
    user: null,
    owner: `guest:${request.headers.get("X-Cart-Id") ?? "default"}`,
  };
}

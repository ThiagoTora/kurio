import type { User } from "@/types/auth";
import type { WalletInput, Wallets } from "@/types/wallet";
import { CartError } from "./cartDb";
import { fakeHex } from "./utils";

const KEY = "kurio.mock.auth.v1";
const SESSION_TTL = 30 * 60 * 1000;

const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL = /^\S+@\S+\.\S+$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const ENS = /^[a-z0-9-]{3,}$/;

interface UserRecord extends User {
  salt: string;
  hash: string;
}
interface State {
  users: UserRecord[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallets>;
  nextId: number;
}

async function hash(pw: string, salt: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${pw}`),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// usuários de teste: senha "Kurio@123" (armazenada apenas como hash com salt)
async function seed(): Promise<State> {
  const mk = async (
    id: string,
    username: string,
    displayName: string,
    email: string,
  ): Promise<UserRecord> => {
    const salt = fakeHex(email, 16);
    return {
      id,
      username,
      displayName,
      email,
      ensName: username,
      walletNickname: `${username} principal`,
      avatar: null,
      salt,
      hash: await hash("Kurio@123", salt),
    };
  };
  return {
    users: [
      await mk("u1", "ana", "Ana Souza", "ana@kurio.dev"),
      await mk("u2", "bruno", "Bruno Lima", "bruno@kurio.dev"),
    ],
    sessions: {},
    favorites: {},
    wallets: {},
    nextId: 3,
  };
}

let state: State;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const ready: Promise<void> = (async () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw) as State;
      return;
    }
  } catch {
    /* ignore */
  }
  state = await seed();
  persist();
})();

export async function resetAuth() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  state = await seed();
  persist();
}

const pub = (u: UserRecord): User => {
  const { salt, hash, ...rest } = u;

  void salt;
  void hash;

  return rest;
};

const validation = (
  fields: Record<string, string>,
  status = 422,
  code = "VALIDATION",
) => new CartError(status, code, "Corrija os campos destacados.", fields);

function newSession(userId: string) {
  const token = `tok_${crypto.randomUUID()}`;
  state.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL };
  persist();
  return token;
}

export function resolve(
  token: string,
): { state: "ok"; user: User } | { state: "expired" } {
  const s = state.sessions[token];
  const u =
    s && s.expiresAt > Date.now()
      ? state.users.find((x) => x.id === s.userId)
      : undefined;
  return u ? { state: "ok", user: pub(u) } : { state: "expired" };
}

export function logout(token: string) {
  delete state.sessions[token];
  persist();
}

export function expire(token: string) {
  if (state.sessions[token]) {
    state.sessions[token].expiresAt = 0;
    persist();
  }
}

export async function signup(b: {
  username: string;
  email: string;
  password: string;
}) {
  const f: Record<string, string> = {};
  if (!USERNAME.test(b.username ?? ""))
    f.username = "Use 3 a 20 letras, números ou _.";
  if (!EMAIL.test(b.email ?? "")) f.email = "E-mail inválido.";
  if (!PW_RULE.test(b.password ?? ""))
    f.password = "Mínimo de 8 caracteres, com letras e números.";
  if (Object.keys(f).length) throw validation(f);

  const email = b.email.trim().toLowerCase();
  if (state.users.some((u) => u.email === email))
    f.email = "Este e-mail já está cadastrado.";
  if (
    state.users.some(
      (u) => u.username.toLowerCase() === b.username.toLowerCase(),
    )
  )
    f.username = "Nome de usuário indisponível.";
  if (Object.keys(f).length) throw validation(f, 409, "CONFLICT");

  const salt = crypto.randomUUID();
  const user: UserRecord = {
    id: `u${state.nextId++}`,
    username: b.username,
    displayName: b.username,
    email,
    ensName: "",
    walletNickname: "",
    avatar: null,
    salt,
    hash: await hash(b.password, salt),
  };
  state.users.push(user);
  const token = newSession(user.id);
  return { token, user: pub(user) };
}

export async function login(emailRaw: string, password: string) {
  const email = (emailRaw ?? "").trim().toLowerCase();
  const u = state.users.find((x) => x.email === email);
  if (!u || (await hash(password ?? "", u.salt)) !== u.hash) {
    throw new CartError(
      401,
      "INVALID_CREDENTIALS",
      "E-mail ou senha incorretos.",
    );
  }
  return { token: newSession(u.id), user: pub(u) };
}

const find = (id: string) => state.users.find((u) => u.id === id)!;

export function updateProfile(
  userId: string,
  b: {
    displayName: string;
    username: string;
    email: string;
    ensName: string;
    walletNickname: string;
  },
) {
  const f: Record<string, string> = {};
  if ((b.displayName ?? "").trim().length < 2)
    f.displayName = "Informe o nome de exibição.";
  if (!USERNAME.test(b.username ?? ""))
    f.username = "Use 3 a 20 letras, números ou _.";
  if (!EMAIL.test(b.email ?? "")) f.email = "E-mail inválido.";
  if (!ENS.test(b.ensName ?? ""))
    f.ensName = "Nome ENS inválido (mín. 3, minúsculas).";
  if ((b.walletNickname ?? "").trim().length < 2)
    f.walletNickname = "Informe o apelido da carteira.";
  if (Object.keys(f).length) throw validation(f);

  const email = b.email.trim().toLowerCase();
  const others = state.users.filter((u) => u.id !== userId);
  if (others.some((u) => u.email === email))
    f.email = "Este e-mail já está em uso.";
  if (others.some((u) => u.username.toLowerCase() === b.username.toLowerCase()))
    f.username = "Nome de usuário indisponível.";
  if (Object.keys(f).length) throw validation(f, 409, "CONFLICT");

  const u = find(userId);
  Object.assign(u, {
    displayName: b.displayName.trim(),
    username: b.username,
    email,
    ensName: b.ensName,
    walletNickname: b.walletNickname.trim(),
  });
  persist();
  return pub(u);
}

export function setAvatar(userId: string, dataUrl: string | null) {
  if (dataUrl !== null) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl))
      throw validation({ avatar: "Formato inválido (use PNG, JPG ou WebP)." });
    if (dataUrl.length > 300_000)
      throw validation({ avatar: "Imagem muito grande (máx. 200 KB)." });
  }
  const u = find(userId);
  u.avatar = dataUrl;
  persist();
  return pub(u);
}

export async function changePassword(
  userId: string,
  b: { currentPassword: string; newPassword: string },
) {
  const u = find(userId);
  if ((await hash(b.currentPassword ?? "", u.salt)) !== u.hash)
    throw validation({ currentPassword: "Senha atual incorreta." });
  if (!PW_RULE.test(b.newPassword ?? ""))
    throw validation({
      newPassword: "Mínimo de 8 caracteres, com letras e números.",
    });
  u.salt = crypto.randomUUID();
  u.hash = await hash(b.newPassword, u.salt);
  persist();
}

// favoritos
export const getFavorites = (userId: string) => state.favorites[userId] ?? [];
export function setFavorite(userId: string, nftId: string, on: boolean) {
  const set = new Set(state.favorites[userId] ?? []);
  if (on) set.add(nftId);
  else set.delete(nftId);
  state.favorites[userId] = [...set];
  persist();
  return state.favorites[userId];
}

// carteiras
export const getWallets = (userId: string): Wallets =>
  state.wallets[userId] ?? { primary: null, secondary: null };

function validateWallet(b: WalletInput) {
  const f: Record<string, string> = {};
  if ((b.displayName ?? "").trim().length < 2)
    f.displayName = "Informe o nome de exibição.";
  if ((b.nickname ?? "").trim().length < 2)
    f.nickname = "Informe o apelido da carteira.";
  if (!["ethereum", "polygon", "solana"].includes(b.network))
    f.network = "Selecione uma rede.";
  if ((b.profileName ?? "").trim().length < 2)
    f.profileName = "Informe o nome do perfil.";
  if (!ADDRESS.test(b.address ?? ""))
    f.address = "Endereço 0x inválido (42 caracteres).";
  if (
    b.secondaryRef &&
    !(ADDRESS.test(b.secondaryRef) || /^[a-z0-9-]+\.eth$/i.test(b.secondaryRef))
  )
    f.secondaryRef = "Use um endereço 0x ou um nome .eth.";
  if (!["primary", "secondary"].includes(b.walletType))
    f.walletType = "Selecione uma carteira.";
  if (!/^[A-Za-z0-9]{4,12}$/.test(b.referralCode ?? ""))
    f.referralCode = "Use 4 a 12 letras ou números.";
  else if (b.referralCode.toUpperCase() === "INVALID")
    f.referralCode = "Código de indicação inexistente.";
  if (!EMAIL.test(b.email ?? "")) f.email = "E-mail inválido.";
  if (!/^[a-z0-9-]{3,}\.eth$/.test(b.ensName ?? ""))
    f.ensName = "Nome ENS inválido (mín. 3, minúsculas).";
  if (Object.keys(f).length) throw validation(f);
}

export function saveWallet(
  userId: string,
  kind: "primary" | "secondary",
  b: (WalletInput & { sameAsPrimary?: boolean }) | { sameAsPrimary: true },
) {
  const w = (state.wallets[userId] ??= { primary: null, secondary: null });

  if ("sameAsPrimary" in b && b.sameAsPrimary) {
    if (kind !== "secondary")
      throw new CartError(422, "VALIDATION", "Operação inválida.");
    if (!w.primary)
      throw new CartError(
        409,
        "NO_PRIMARY",
        "Cadastre a carteira principal primeiro.",
      );
    w.secondary = { ...w.primary, kind: "secondary", sameAsPrimary: true };
  } else {
    validateWallet(b as WalletInput);
    w[kind] = { ...(b as WalletInput), kind, sameAsPrimary: false };
    if (kind === "primary" && w.secondary?.sameAsPrimary)
      w.secondary = { ...w.primary!, kind: "secondary", sameAsPrimary: true };
  }
  persist();
  return w;
}

export function removeSecondary(userId: string) {
  const w = (state.wallets[userId] ??= { primary: null, secondary: null });
  w.secondary = null;
  persist();
  return w;
}

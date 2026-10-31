import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { http } from "./http";
import { SESSION_KEY, clearToken, getToken } from "@/lib/session";
import { endSession, startSession } from "@/lib/sessionAction";
import type { AuthResponse, User } from "@/types/auth";

export const sessionQuery = () =>
  queryOptions({
    queryKey: SESSION_KEY,
    queryFn: async ({ signal }): Promise<User | null> => {
      if (!getToken()) return null;
      try {
        return (await http.get<{ user: User }>("/auth/session", { signal }))
          .data.user;
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 401) {
          clearToken();
          return null;
        }
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

export function useSession() {
  const q = useQuery(sessionQuery());
  return { user: q.data ?? null, isLoading: q.isPending };
}

export function useLogin() {
  return useMutation({
    mutationFn: async (b: { email: string; password: string }) =>
      (await http.post<AuthResponse>("/auth/login", b)).data,
    onSuccess: ({ token, user }) => startSession(token, user),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: async (b: {
      username: string;
      email: string;
      password: string;
    }) => (await http.post<AuthResponse>("/auth/signup", b)).data,
    onSuccess: ({ token, user }) => startSession(token, user),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await http.post("/auth/logout");
    },
    onSettled: () => endSession(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      b: Pick<
        User,
        "displayName" | "username" | "email" | "ensName" | "walletNickname"
      >,
    ) => (await http.patch<User>("/profile", b)).data,
    onSuccess: (user) => qc.setQueryData(SESSION_KEY, user),
  });
}

export function useSetAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dataUrl: string | null) =>
      dataUrl
        ? (await http.put<User>("/profile/avatar", { dataUrl })).data
        : (await http.delete<User>("/profile/avatar")).data,
    onSuccess: (user) => qc.setQueryData(SESSION_KEY, user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (b: { currentPassword: string; newPassword: string }) => {
      await http.post("/profile/password", b);
    },
  });
}

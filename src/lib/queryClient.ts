import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, err) =>
        !(isAxiosError(err) && err.response && err.response.status < 500) &&
        count < 2,
    },
  },
});

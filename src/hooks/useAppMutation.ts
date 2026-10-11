import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { showToast } from "@/lib/toast";

/**
 * Shared scaffold for the mutation hooks: runs `mutationFn`, then on success
 * invalidates `invalidateKeys`, calls `onSuccess` and shows `successToast`;
 * on error calls `onError` and shows `errorToast`. Toasts live here (not in
 * the screens) by convention -- see docs/style-guide.md.
 *
 * Callers keep the "throw on Supabase `{ error }`" step inside their own
 * `mutationFn`, since the `src/lib` writes resolve a raw `{ data, error }`.
 */
export interface UseAppMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, "onSuccess" | "onError"> {
  /** Query keys (prefix match) to invalidate on success, or a function deriving them. */
  invalidateKeys?: QueryKey[] | ((variables: TVariables, data: TData) => QueryKey[]);
  successToast?: string | ((data: TData, variables: TVariables) => string);
  errorToast?: string | ((error: Error, variables: TVariables) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useAppMutation<TData = unknown, TVariables = void>(
  options: UseAppMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const { invalidateKeys, successToast, errorToast, onSuccess, onError, ...rest } = options;

  return useMutation<TData, Error, TVariables>({
    ...rest,
    onSuccess: (data, variables) => {
      const keys =
        typeof invalidateKeys === "function" ? invalidateKeys(variables, data) : invalidateKeys;
      for (const queryKey of keys ?? []) {
        queryClient.invalidateQueries({ queryKey });
      }
      onSuccess?.(data, variables);
      if (successToast !== undefined) {
        const message =
          typeof successToast === "function" ? successToast(data, variables) : successToast;
        showToast(message, { variant: "success" });
      }
    },
    onError: (error, variables) => {
      onError?.(error, variables);
      if (errorToast !== undefined) {
        const message =
          typeof errorToast === "function" ? errorToast(error, variables) : errorToast;
        showToast(message, { variant: "error" });
      }
    },
  });
}

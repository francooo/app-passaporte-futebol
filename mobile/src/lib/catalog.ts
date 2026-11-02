import { useCallback, useEffect, useState } from "react";
import type { CatalogCountry, StadiumDetail, StadiumPage } from "@shared/api-types";
import { api, ApiRequestError } from "./api";

/** Catálogo de estádios (API pública do web: src/app/api/catalog/*). */
export const catalogApi = {
  countries: () => api<CatalogCountry[]>("/api/catalog/countries"),
  stadiums: (country: string, { q, page = 0 }: { q?: string; page?: number } = {}) =>
    api<StadiumPage>(
      `/api/catalog/stadiums?${new URLSearchParams({ country, page: String(page), ...(q ? { q } : {}) })}`,
    ),
  stadium: (id: string) => api<StadiumDetail>(`/api/catalog/stadiums/${encodeURIComponent(id)}`),
};

type State<T> = { data: T | null; error: string | null; loading: boolean };

/** Carrega dados ao montar e quando as dependências mudam; `reload` tenta de novo após erro. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then(
      (data) => active && setState({ data, error: null, loading: false }),
      (error) =>
        active &&
        setState({
          data: null,
          error: error instanceof ApiRequestError ? error.message : "Não foi possível carregar.",
          loading: false,
        }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, reload: useCallback(() => setAttempt((n) => n + 1), []) };
}

import { useEffect, useMemo, useState } from "react";
import type { PaginatedResponse, PublicRecipeDTO } from "@/types";
import { buildQueryString } from "@/lib/queryString";
import { fetchJson } from "@/lib/http";
import { useSession } from "@/components/auth/useSession";
import LogoutButton from "@/components/auth/LogoutButton";
import { formatDateDMY } from "@/lib/date";

type FeedState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      data: PublicRecipeDTO[];
      pagination: PaginatedResponse<PublicRecipeDTO>["pagination"];
    };

export default function PublicFeed() {
  const { accessToken, loading: authLoading } = useSession();
  const [page, setPage] = useState(1);
  const limit = 10;

  const [state, setState] = useState<FeedState>({ kind: "loading" });

  const url = useMemo(() => {
    return `/api/recipes/public${buildQueryString({ page, limit })}`;
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    fetchJson<PaginatedResponse<PublicRecipeDTO>>(url)
      .then((result) => {
        if (cancelled) return;
        setState({
          kind: "ready",
          data: result.data,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load feed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Public recipes</h2>
        <div className="flex items-center gap-3">
          <a
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
            href="/dashboard"
          >
            Dashboard
          </a>
          {!authLoading && accessToken ? <LogoutButton /> : null}
          {!authLoading && !accessToken ? (
            <>
              <a
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
                href="/login"
              >
                Login
              </a>
              <a
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white"
                href="/signup"
              >
                Sign up
              </a>
            </>
          ) : null}
        </div>
      </div>

      {state.kind === "loading" ? (
        <p className="text-gray-700">Loading…</p>
      ) : null}

      {state.kind === "error" ? (
        <p className="text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <>
          {state.data.length === 0 ? (
            <p className="text-gray-700">No public recipes yet.</p>
          ) : null}

          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="public-feed-list"
          >
            {state.data.map((recipe) => (
              <li
                key={recipe.id}
                className="overflow-hidden bg-white rounded-lg shadow-lg h-[420px] flex flex-col"
                data-testid={`public-recipe-card-${recipe.id}`}
              >
                <a
                  href={`/recipes/${recipe.id}`}
                  className="block h-44 bg-gray-100"
                >
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </a>

                <div className="p-5 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <a
                      className="text-lg font-semibold text-gray-900 hover:underline"
                      href={`/recipes/${recipe.id}`}
                    >
                      {recipe.title}
                    </a>
                    <span className="text-xs text-gray-500">
                      {formatDateDMY(recipe.published_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    By{" "}
                    <span className="font-medium">
                      {recipe.author.display_name ?? recipe.author.username}
                    </span>
                  </p>

                  <p className="text-sm text-gray-700">
                    Servings: {recipe.servings}
                  </p>
                  {recipe.prep_time !== null ? (
                    <p className="text-sm text-gray-700">
                      Preparation time: {recipe.prep_time} min
                    </p>
                  ) : null}

                  {recipe.description ? (
                    <p className="text-sm text-gray-700 overflow-hidden">
                      {recipe.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
              disabled={state.pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <p className="text-sm text-gray-700">
              Page {state.pagination.page} of {state.pagination.total_pages}
            </p>

            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
              disabled={state.pagination.page >= state.pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  published_at: string | null;
  user_id: string;
  is_public: boolean;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

interface SupabaseStubConfig {
  recipes?: RecipeRow[];
  profiles?: ProfileRow[];
  errors?: {
    recipes?: Error;
    profileList?: Error;
  };
}

type Filter<T> =
  | { type: 'eq'; column: keyof T & string; value: unknown }
  | { type: 'ilike'; column: keyof T & string; value: string }
  | { type: 'in'; column: keyof T & string; value: unknown[] };

interface SelectOptions {
  count?: 'exact';
  head?: boolean;
}

type SupabaseResponse<T> = { data: T[] | null; error: any; count: number | null };

class QueryBuilder<T extends Record<string, any>> {
  private filters: Filter<T>[] = [];
  private orderField?: keyof T & string;
  private ascending = false;
  private rangeArgs?: { from: number; to: number };
  private selectOptions: SelectOptions = {};

  constructor(private readonly rows: T[], private readonly error?: Error) {}

  select(_columns: string, options?: SelectOptions) {
    this.selectOptions = options ?? {};
    return this;
  }

  eq(column: keyof T & string, value: unknown) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  ilike(column: keyof T & string, pattern: string) {
    this.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  in(column: keyof T & string, values: unknown[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: keyof T & string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.ascending = options?.ascending ?? false;
    return this;
  }

  range(from: number, to: number) {
    this.rangeArgs = { from, to };
    return this;
  }

  async single() {
    try {
      const { data } = this.execute();
      const first = Array.isArray(data) ? data[0] ?? null : null;
      if (!first) {
        return { data: null, error: { message: 'No rows' } };
      }
      return { data: first, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ) {
    try {
      const result = this.execute();
      return Promise.resolve(result).then(onfulfilled, onrejected);
    } catch (error) {
      return Promise.reject(error).then(onfulfilled, onrejected);
    }
  }

  private execute() {
    if (this.error) {
      throw this.error;
    }

    let filtered = [...this.rows];

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        filtered = filtered.filter((row) => row[filter.column] === filter.value);
      } else if (filter.type === 'ilike') {
        const term = filter.value.replace(/%/g, '').toLowerCase();
        filtered = filtered.filter((row) =>
          String(row[filter.column] ?? '').toLowerCase().includes(term),
        );
      } else if (filter.type === 'in') {
        const values = filter.value;
        if (!values.length) {
          filtered = [];
        } else {
          filtered = filtered.filter((row) => values.includes(row[filter.column]));
        }
      }
    }

    if (this.orderField) {
      filtered.sort((a, b) => {
        const left = a[this.orderField!];
        const right = b[this.orderField!];
        if (left === right) return 0;
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        if (left > right) {
          return this.ascending ? 1 : -1;
        }
        return this.ascending ? -1 : 1;
      });
    }

    const total = this.selectOptions.count === 'exact' ? filtered.length : null;

    if (this.rangeArgs) {
      const { from, to } = this.rangeArgs;
      const start = Math.max(0, from);
      const end = Math.min(filtered.length, to + 1);
      filtered = filtered.slice(start, end);
    }

    return {
      data: this.selectOptions.head ? null : filtered,
      error: null,
      count: total,
    } satisfies SupabaseResponse<T>;
  }
}

class ProfilesQueryBuilder extends QueryBuilder<ProfileRow> {
  constructor(rows: ProfileRow[], error?: Error, private readonly listError?: Error) {
    super(rows, error);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<ProfileRow>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ) {
    if (this.listError) {
      const result: SupabaseResponse<ProfileRow> = {
        data: null,
        error: this.listError,
        count: null,
      };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
    return super.then(onfulfilled, onrejected);
  }
}

export interface SupabaseClientStub {
  from: (table: 'recipes' | 'profiles') => QueryBuilder<RecipeRow> | ProfilesQueryBuilder;
}

export const createSupabaseStub = (config: SupabaseStubConfig = {}): SupabaseClientStub => {
  const recipes = config.recipes ?? [];
  const profiles = config.profiles ?? [];

  return {
    from(table: 'recipes' | 'profiles') {
      if (table === 'recipes') {
        return new QueryBuilder(recipes, config.errors?.recipes);
      }

      return new ProfilesQueryBuilder(profiles, undefined, config.errors?.profileList);
    },
  };
};

export type { RecipeRow, ProfileRow };

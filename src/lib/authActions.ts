export interface SupabaseAuthClient {
  auth: {
    signInWithPassword: (args: { email: string; password: string }) => Promise<unknown>;
    signUp: (args: { email: string; password: string }) => Promise<unknown>;
    signOut: () => Promise<unknown>;
  };
}

export async function loginWithEmailPassword(
  client: SupabaseAuthClient,
  email: string,
  password: string
): Promise<unknown> {
  return client.auth.signInWithPassword({ email, password });
}

export async function signupWithEmailPassword(
  client: SupabaseAuthClient,
  email: string,
  password: string
): Promise<unknown> {
  return client.auth.signUp({ email, password });
}

export async function logout(client: SupabaseAuthClient): Promise<unknown> {
  return client.auth.signOut();
}

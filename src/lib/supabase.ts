import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const supabaseUrl = env?.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env?.PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
	if (client) return client;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Supabase env is missing. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.'
		);
	}

	client = createClient(supabaseUrl, supabaseAnonKey);
	return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		// Forward property access to the real client, created lazily.
		return (getClient() as unknown as Record<PropertyKey, unknown>)[prop];
	},
}) as SupabaseClient;

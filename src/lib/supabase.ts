import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;

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

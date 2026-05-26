import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

// Track if we're in demo mode (no Supabase configured)
let isDemoMode = false;

// Server-only version with full functionality
// This file should only be imported in API routes (server-side)

function loadEnv(): void {
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    return;
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

// Server-side client using public schema
async function createServerClient(token?: string): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: {
    headers: Record<string, string>;
  } = {
    headers: {},
  };
  if (token) {
    globalOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  return createClient(url, key, {
    global: globalOptions,
  });
}

// Client-safe version without server-only imports
function getClientCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

// Client-safe Supabase client for frontend use
export function getSupabaseClient(): SupabaseClient | null {
  const credentials = getClientCredentials();
  
  if (!credentials) {
    isDemoMode = true;
    return null;
  }

  return createClient(credentials.url, credentials.anonKey);
}

// Check if running in demo mode
export function isInDemoMode(): boolean {
  return isDemoMode;
}

// Alias for backwards compatibility
export { getSupabaseClient as createClient };

// Export server client creator for API routes
export { createServerClient };

// Type exports
export type { SupabaseCredentials };

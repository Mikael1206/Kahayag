import dns from "dns";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Client } from "pg";

dns.setDefaultResultOrder("ipv4first");

export const PORTAL_COOKIE = "kahayag_portal";

export type Official = {
  id: string;
  barangayId: string;
  barangayName: string;
  municipality: string;
  role: string;
};

function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("SUPABASE_AUTH_MISSING");
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function dbClient(): Client {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL_MISSING");
  }
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

export async function signInOfficial(email: string, password: string): Promise<string> {
  const { data, error } = await supabasePublic().auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session?.access_token) {
    throw new Error("AUTH_FAILED");
  }
  return data.session.access_token;
}

export async function officialFromToken(token: string): Promise<Official> {
  const { data, error } = await supabasePublic().auth.getUser(token);
  if (error || !data.user) {
    throw new Error("AUTH_FAILED");
  }
  const client = dbClient();
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      barangay_id: string;
      barangay_name: string;
      municipality: string;
      role: string;
    }>(
      `select id, barangay_id, barangay_name, municipality, role::text as role
         from public.barangay_users
        where id = $1`,
      [data.user.id]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("NOT_AN_OFFICIAL");
    }
    return {
      id: row.id,
      barangayId: row.barangay_id,
      barangayName: row.barangay_name,
      municipality: row.municipality,
      role: row.role,
    };
  } finally {
    await client.end();
  }
}

export async function officialFromRequest(): Promise<Official> {
  const token = cookies().get(PORTAL_COOKIE)?.value;
  if (!token) {
    throw new Error("AUTH_FAILED");
  }
  return officialFromToken(token);
}

export { dbClient };

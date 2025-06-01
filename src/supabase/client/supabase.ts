import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class SupabaseDb {
  private static instance: SupabaseDb
  private client: SupabaseClient

  private constructor() {
    this.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  }

  public static getInstance(): SupabaseClient {
    if (!SupabaseDb.instance) {
      SupabaseDb.instance = new SupabaseDb()
    }
    return SupabaseDb.instance.client
  }

  // Database methods
  public from(table: string) {
    return this.client.from(table)
  }

  // RPC methods
  public rpc(fn: string, params?: object) {
    return this.client.rpc(fn, params)
  }
}

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class SupabaseDb {
  private static instance: SupabaseClient

  public static getInstance(): SupabaseClient {
    if (!this.instance) {
      this.instance = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '')
    }

    return this.instance
  }
}

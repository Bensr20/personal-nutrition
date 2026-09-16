import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './appMode'

// נוצר רק כשקיימת תצורה תקינה. בשימוש רק כאשר isSupabaseConfigured === true.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function looksConfigured(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0 && !v.includes('your-project')
}

export const isSupabaseConfigured = looksConfigured(url) && looksConfigured(anonKey)

export const supabaseUrl = url
export const supabaseAnonKey = anonKey

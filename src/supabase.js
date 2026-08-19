import { createClient } from '@supabase/supabase-js'

// Strip any accidental trailing path (e.g. /rest/v1) that would cause doubled URLs
const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

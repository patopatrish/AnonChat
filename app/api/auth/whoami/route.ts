import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ user: data.user })
  } catch (err) {
    console.error('/api/auth/whoami error', err)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

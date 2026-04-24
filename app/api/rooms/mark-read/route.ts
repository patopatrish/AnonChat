import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { roomId } = body as { roomId?: string }
    if (!roomId) return NextResponse.json({ error: "roomId is required" }, { status: 400 })

    const { error } = await supabase
      .from("room_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("room_id", roomId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/rooms/mark-read error:", err)
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 })
  }
}

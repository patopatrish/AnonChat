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
    let { inviteCode, groupId } = body as { inviteCode?: string; groupId?: string }

    let roomId: string | undefined = groupId

    if (!inviteCode && !groupId) {
      return NextResponse.json({ error: "inviteCode or groupId is required" }, { status: 400 })
    }

    if (inviteCode) {
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .select("room_id, expires_at")
        .eq("code", inviteCode)
        .maybeSingle()

      if (inviteError) throw inviteError
      if (!invite) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })

      // optional expiration check
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: "Invite code has expired" }, { status: 410 })
      }

      roomId = invite.room_id
    }

    // verify room exists
    const { data: room } = await supabase.from("rooms").select("id").eq("id", roomId).maybeSingle()
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

    // insert membership
    const { data: membership, error: membershipError } = await supabase
      .from("room_members")
      .insert({ user_id: user.id, room_id: roomId })
      .select()

    if (membershipError) {
      // unique violation -> already a member
      if (membershipError.code === "23505") {
        return NextResponse.json({ message: "Already a member", success: true })
      }
      throw membershipError
    }

    return NextResponse.json({ success: true, membership: membership?.[0] })
  } catch (error) {
    console.error("POST /api/rooms/join error:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}

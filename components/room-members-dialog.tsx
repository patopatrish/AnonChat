"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Users, UserMinus, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

type Member = {
  user_id: string
  joined_at: string
  is_current_user: boolean
}

type VotesByTarget = Record<
  string,
  { count: number; voters: string[] }
>

type RoomMembersDialogProps = {
  roomId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}

export function RoomMembersDialog({
  roomId,
  open,
  onOpenChange,
  trigger,
}: RoomMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [votes, setVotes] = useState<VotesByTarget>({})
  const [loading, setLoading] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)

  const fetchData = async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const [membersRes, votesRes] = await Promise.all([
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/members`),
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/vote-remove`),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members ?? [])
      } else {
        setMembers([])
      }
      if (votesRes.ok) {
        const data = await votesRes.json()
        setVotes(data.votes ?? {})
      } else {
        setVotes({})
      }
    } catch {
      toast.error("Failed to load room members")
      setMembers([])
      setVotes({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && roomId) fetchData()
  }, [open, roomId])

  const handleVoteRemove = async (targetUserId: string) => {
    setVotingId(targetUserId)
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/vote-remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit vote")
        return
      }
      toast.success(data.removed ? "User removed from room" : "Vote recorded")
      fetchData()
    } catch {
      toast.error("Failed to submit vote")
    } finally {
      setVotingId(null)
    }
  }

  const displayId = (id: string) =>
    id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border/60 bg-[#0f0f16] p-5 shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <Dialog.Title className="text-sm font-semibold">
              Room members & voting
            </Dialog.Title>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Wallet-based votes to remove a member. Majority of active members removes them.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No members yet, or you need to sign in.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((m) => {
                const voteCount = votes[m.user_id]?.count ?? 0
                const isVoting = votingId === m.user_id
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#181822] border border-border/60 px-3 py-2"
                  >
                    <span className="text-sm font-mono truncate" title={m.user_id}>
                      {displayId(m.user_id)}
                      {m.is_current_user && (
                        <span className="ml-2 text-[10px] text-primary">(you)</span>
                      )}
                    </span>
                    {!m.is_current_user && (
                      <button
                        type="button"
                        disabled={isVoting}
                        onClick={() => handleVoteRemove(m.user_id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                          "bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/40",
                          "disabled:opacity-50"
                        )}
                      >
                        {isVoting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserMinus className="h-3 w-3" />
                        )}
                        Vote to remove {voteCount > 0 && `(${voteCount})`}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-border/60 bg-[#181822] px-3 py-1.5 text-xs font-medium hover:bg-[#232330] transition"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

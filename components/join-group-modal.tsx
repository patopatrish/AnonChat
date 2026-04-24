"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Link as LinkIcon, Key, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export function JoinGroupModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [method, setMethod] = useState<"invite" | "id">("invite")
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!value.trim()) {
      toast.error("Please provide an invite code or group ID")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: any = {}
      if (method === "invite") payload.inviteCode = value.trim()
      else payload.groupId = value.trim()

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || "Failed to join group")
        return
      }

      toast.success("Joined group successfully")
      setValue("")
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to join group")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-transparent border border-border/50 text-sm rounded-lg hover:bg-muted transition">
          Join Group
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/50 bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">Join Group</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Use an invite code or the group's ID to join.</Dialog.Description>
            </div>
            <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <form onSubmit={(e) => void handleJoin(e)} className="space-y-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMethod("invite")} className={`px-3 py-1 rounded ${method === "invite" ? "bg-primary text-primary-foreground" : "bg-transparent border border-border/40"}`}>
                <Key className="w-4 h-4 inline mr-2" />Invite Code
              </button>
              <button type="button" onClick={() => setMethod("id")} className={`px-3 py-1 rounded ${method === "id" ? "bg-primary text-primary-foreground" : "bg-transparent border border-border/40"}`}>
                <LinkIcon className="w-4 h-4 inline mr-2" />Group ID
              </button>
            </div>

            <div>
              <label className="text-sm">{method === "invite" ? "Invite Code" : "Group ID"}</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={method === "invite" ? "e.g. X7b-tnk-..." : "e.g. room_1612345678_xk3"} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={isSubmitting} />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Group"
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { LogOut, Settings } from 'lucide-react'
import { getUserInitials } from '@/lib/userAvatar'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const displayName = user.displayName || user.username

  return (
    <div className="relative z-[60]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-zinc-900 rounded-lg p-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-semibold text-white">
          {getUserInitials(user)}
        </div>
        <span className="text-sm text-zinc-300 hidden md:block">{displayName}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-[70]">
            <div className="p-3 border-b border-zinc-800">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-zinc-500">@{user.username}</p>
            </div>
            <div className="p-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                onClick={() => {
                  setIsOpen(false)
                  logout()
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

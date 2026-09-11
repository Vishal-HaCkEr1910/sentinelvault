import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  username: string
  full_name: string
  role: string
}

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, role: string, full_name: string, username: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, role, full_name, username) =>
        set({ token, user: { username, full_name, role } }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'sentinel-auth' }
  )
)

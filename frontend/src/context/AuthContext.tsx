import React, { createContext, useContext, useState, useEffect } from 'react'
import type { AuthUser, Role } from '../types'
import { DEMO_PERSONAS } from '../types'
import { api, getStoredToken, setStoredToken } from '../api/client'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  quickLogin: (demoUsername: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_INFO_KEY = 'sentinelvault_user_info'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_INFO_KEY)
    const token = getStoredToken()
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved)
        return { ...parsed, token }
      } catch {
        return null
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check health or token validation on mount
    const verifySession = async () => {
      const token = getStoredToken()
      if (token && user) {
        try {
          await api.checkHealth()
        } catch {
          // backend offline or invalid
        }
      }
      setIsLoading(false)
    }
    verifySession()
  }, [])

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true)
    try {
      const res = await api.login(username, password)
      // Look up persona metadata if available
      const persona = DEMO_PERSONAS.find((p) => p.username.toLowerCase() === username.toLowerCase())

      const authUser: AuthUser = {
        username,
        fullName: res.full_name,
        role: res.role,
        department: persona?.department || 'Judicial / Investigation Department',
        token: res.access_token,
      }

      setUser(authUser)
      localStorage.setItem(
        USER_INFO_KEY,
        JSON.stringify({
          username: authUser.username,
          fullName: authUser.fullName,
          role: authUser.role,
          department: authUser.department,
        })
      )
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = async (demoUsername: string): Promise<void> => {
    await login(demoUsername, 'password123')
  }

  const logout = (): void => {
    api.logout()
    setUser(null)
    localStorage.removeItem(USER_INFO_KEY)
    setStoredToken(null)
  }

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        quickLogin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

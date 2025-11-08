import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        try {
          // Check if storedUser is actually valid JSON
          if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
            setUser(JSON.parse(storedUser))
          } else {
            localStorage.removeItem('user')
            localStorage.removeItem('token')
          }
        } catch (e) {
          console.error('Error parsing stored user:', e)
          localStorage.removeItem('user')
          localStorage.removeItem('token')
        }
        
        // Verify token is still valid
        try {
          const response = await authService.getUser()
          setUser(response.user)
          localStorage.setItem('user', JSON.stringify(response.user))
        } catch (error) {
          console.error('Token verification failed:', error)
          console.error('Error details:', error.response?.data || error.message)
          // Token invalid, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      }
      // Always set loading to false, even if no token/user
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      
      // Check if MFA is required
      if (response.mfa_required) {
        return {
          mfaRequired: true,
          mfaMethod: response.mfa_method,
          tempToken: response.temp_token,
        }
      }

      // Normal login
      setToken(response.token)
      setUser(response.user)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      return { success: true }
    } catch (error) {
      throw error
    }
  }

  const register = async (data) => {
    try {
      const response = await authService.register(data)
      setToken(response.token)
      setUser(response.user)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


import { useMemo } from 'react'

export function useAuth() {
  return useMemo(() => ({
    signedIn: false,
    user: null,
  }), [])
}

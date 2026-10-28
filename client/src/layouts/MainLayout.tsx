import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return <div className="max-w-6xl mx-auto">{children}</div>
}

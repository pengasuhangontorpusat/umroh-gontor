import { RegistrationProvider } from '@/contexts/RegistrationContext'
import { ReactNode } from 'react'

export default function DaftarLayout({ children }: { children: ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>
}

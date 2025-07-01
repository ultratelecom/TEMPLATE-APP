import React from 'react'
import { redirect } from 'next/navigation'
import { verifyAuth } from '@/lib/auth'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  // Verify authentication server-side
  const user = await verifyAuth()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClient user={user} />
    </div>
  )
}
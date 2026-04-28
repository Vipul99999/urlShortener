'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { TextField } from '@/components/ui/text-field'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-message'
import { z } from 'zod'
import { useToast } from '@/lib/hooks/use-toast'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

export default function ChangePasswordPage() {
  const { accessToken } = useAuthStore()
  const toast = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})
    setLoading(true)

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword
    })

    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setFieldErrors(nextErrors)
      setError(parsed.error.issues[0]?.message || 'Invalid input')
      setLoading(false)
      return
    }

    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        token: accessToken || undefined,
        body: JSON.stringify(parsed.data)
      })

      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Password changed successfully.')
      toast.success('Password changed successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Change password</h1>
      <p className="mt-2 text-white/60">Update your password securely.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          type="password"
          error={fieldErrors.currentPassword}
        />

        <TextField
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          type="password"
          error={fieldErrors.newPassword}
        />

        <FormMessage error={error} success={success} />

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Change password'}
        </Button>
      </form>
    </Card>
  )
}
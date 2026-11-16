import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/logo'
import { NotFoundState } from '@/components/ui/states'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <Logo showTagline className="mb-6" />
      <NotFoundState />
      <Link
        to="/"
        className="mt-2 text-sm font-medium text-jade-700 underline-offset-4 hover:underline"
      >
        Về trang làm việc
      </Link>
    </div>
  )
}

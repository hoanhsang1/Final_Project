import { moduleLabel } from '@/lib/modules'

export function ModuleLabelList({ codes }: { codes?: string[] }) {
  if (!codes?.length) {
    return <p className="text-xs text-ink-500">Không phụ thuộc module cụ thể.</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <li
          key={code}
          className="rounded-full border border-line bg-ink-50 px-2 py-0.5 text-2xs font-medium text-ink-600"
        >
          {moduleLabel(code)}
        </li>
      ))}
    </ul>
  )
}

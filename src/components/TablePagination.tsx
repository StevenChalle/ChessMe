import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** "21–40 of 142" with previous / next buttons. Hidden when everything fits on one page. */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground tabular-nums">
        {m.pagination_range({
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(total),
        })}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label={m.pagination_previous()}
        title={m.pagination_previous()}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= pages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label={m.pagination_next()}
        title={m.pagination_next()}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

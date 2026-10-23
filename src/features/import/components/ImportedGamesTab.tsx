import { useMemo, useState } from 'react'
import { TablePagination } from '@/components/TablePagination'
import { GamesTable } from '@/features/games/components/GamesTable'
import { AnalyzeLink } from '@/features/history/components/HistoryTab'
import { gameRef } from '@/features/review/gameRef'
import { latestGames } from '@/features/review/games'
import { useAnalysedRefs } from '@/features/review/useAnalysedRefs'
import { pageSlice } from '@/lib/pagination'
import { m } from '@/paraglide/messages'
import { useImportedGames } from '../store'

const PAGE_SIZE = 30

/** The imported games, newest first (undated ones last, in the file's order), 30 per page. */
export function ImportedGamesTab() {
  const imported = useImportedGames()
  const [page, setPage] = useState(0)
  const games = useMemo(
    () => (imported ? latestGames(imported.games, imported.games.length) : []),
    [imported],
  )
  const shown = pageSlice(games, page, PAGE_SIZE)
  const analysed = useAnalysedRefs(shown)
  if (games.length === 0) return <p className="text-muted-foreground">{m.history_no_games()}</p>
  return (
    <div className="space-y-4">
      <div className="panel-etabli px-2">
        <GamesTable
          games={shown}
          action={(game) => (
            <AnalyzeLink
              game={game}
              usernames={{ import: true }}
              analysed={analysed.has(gameRef(game))}
            />
          )}
        />
      </div>
      <TablePagination
        page={page}
        pageSize={PAGE_SIZE}
        total={games.length}
        onPageChange={setPage}
      />
    </div>
  )
}

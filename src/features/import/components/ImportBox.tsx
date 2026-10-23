import { useNavigate } from '@tanstack/react-router'
import { FileUp, Upload } from 'lucide-react'
import { useId, useMemo, useRef, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { readPgn, type PgnBatch } from '../pgn'
import { setImportedGames } from '../store'
import { ImportDialog } from './ImportDialog'

/** Several thousand games: beyond, reading the file would freeze the page. */
const MAX_BYTES = 20 * 1024 * 1024

/** A mouse: files can be dropped or picked. A touch screen only gets the paste box. */
const hasFinePointer = () => window.matchMedia?.('(pointer: fine)').matches ?? true

/**
 * Importing games instead of searching an account: a PGN file dropped or picked (on a computer),
 * or pasted. Once read, the dialog asks which side the player had; the games then open on the
 * profile page, Games tab, on their own (never mixed with an account's).
 */
export function ImportBox({ className }: { className?: string }) {
  const ids = { paste: useId(), file: useId() }
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const files = useMemo(() => hasFinePointer(), [])
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [batch, setBatch] = useState<PgnBatch | undefined>(undefined)

  const read = (pgn: string) => {
    const read = readPgn(pgn)
    if (read.games.length === 0) {
      setError(m.import_none())
      return
    }
    setError(undefined)
    setBatch(read)
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError(m.import_too_big())
      return
    }
    read(await file.text())
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void readFile(event.dataTransfer.files[0])
  }

  return (
    <div className={cn('space-y-3', className)}>
      {files && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            // As high as the account search's two fields: they end on the same line.
            'flex flex-col items-center gap-2.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border-strong',
          )}
        >
          <Upload aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{m.import_drop()}</p>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <FileUp data-icon="inline-start" />
            {m.import_choose()}
          </Button>
          <input
            id={ids.file}
            ref={fileRef}
            type="file"
            accept=".pgn,application/x-chess-pgn,text/plain"
            className="hidden"
            onChange={(event) => {
              void readFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={ids.paste} className="text-sm">
          {m.import_paste()}
        </Label>
        {/* One line high: pasted, never edited. The button sits next to it. */}
        <div className="flex items-start gap-2">
          <textarea
            id={ids.paste}
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={m.import_paste_placeholder()}
            spellCheck={false}
            className="num h-control min-w-0 flex-1 resize-none overflow-hidden rounded-sm border border-input bg-field px-3 py-2.5 text-xs leading-4 whitespace-nowrap text-text-strong outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
          />
          <Button variant="secondary" disabled={!text.trim()} onClick={() => read(text)}>
            {m.import_paste_submit()}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-loss">{error}</p>}
      {batch && (
        <ImportDialog
          batch={batch}
          onCancel={() => setBatch(undefined)}
          onImport={(games) => {
            // A new import replaces the previous one.
            setImportedGames(games)
            setBatch(undefined)
            setText('')
            void navigate({ to: '/player/history', search: { import: true } })
          }}
        />
      )}
    </div>
  )
}

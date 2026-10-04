import { Link } from '@tanstack/react-router'
import { SOURCE_CODE_URL } from '@/lib/project'
import { m } from '@/paraglide/messages'

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground">
      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p>{m.footer_independent()}</p>
        <nav className="flex gap-4">
          <a
            href={SOURCE_CODE_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-font-clear"
          >
            {m.footer_source()}
          </a>
          <Link to="/legal" className="hover:text-font-clear">
            {m.footer_legal()}
          </Link>
        </nav>
      </div>
    </footer>
  )
}

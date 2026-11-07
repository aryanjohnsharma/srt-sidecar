type Theme = 'light' | 'dark'

const URL = 'https://chatgpt.com/?q=If%20not%20added%2C%20add%20mcp.cal.com%2Fmcp%2C%20then%20book%20aryan-sharma-amw1me%2Fsrt-sidecar-chat'

const COLORS = {
  light: { border: '#d4d4d8', bg: '#fff', fg: '#18181b' },
  dark: { border: '#3f3f46', bg: '#18181b', fg: '#fafafa' },
}

export function BookUsingAssistantButton({ theme }: { theme: Theme }) {
  const colors = COLORS[theme]

  return (
    <a
      className="footer-assistant-button"
      href={URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Book a 15 minute SRT Sidecar chat with ChatGPT"
      style={{ display: 'inline-flex', alignItems: 'stretch', height: 36, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.bg, color: colors.fg, font: '500 14px/1 system-ui, sans-serif', textDecoration: 'none' }}
    >
      <span className="footer-assistant-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16 }}><path d="M15 3h6v6" /><path d="m10 14 11-11" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
        <span>Book with ChatGPT</span>
      </span>
      <span className="footer-assistant-logo" aria-hidden="true" style={{ borderLeft: `1px solid ${colors.border}` }}>
        <img src="https://app.cal.com/ai-assistants/chatgpt.svg" alt="" style={{ width: 16, height: 16, filter: theme === 'dark' ? 'invert(1)' : undefined }} />
      </span>
    </a>
  )
}

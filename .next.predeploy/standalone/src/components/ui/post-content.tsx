"use client"

export function PostContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-1 last:mb-0">
          {p.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {renderInline(line)}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="text-[12px] bg-[--bg-elevated] px-1 py-0.5 rounded">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

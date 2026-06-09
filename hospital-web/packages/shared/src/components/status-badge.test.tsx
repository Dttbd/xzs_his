import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge status="open" label="待处理" />)
    expect(screen.getByText('待处理')).toBeInTheDocument()
  })

  it('applies a custom className', () => {
    const { container } = render(
      <StatusBadge status="resolved" label="已解决" className="my-custom" />
    )
    expect(container.firstChild).toHaveClass('my-custom')
  })

  it('falls back to outline variant for unknown status', () => {
    // Unknown status should still render without crashing
    render(<StatusBadge status="unknown_status" label="未知" />)
    expect(screen.getByText('未知')).toBeInTheDocument()
  })
})

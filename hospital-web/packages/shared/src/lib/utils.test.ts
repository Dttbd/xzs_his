import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn()', () => {
  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignores falsy conditionals', () => {
    const result = cn('base', false && 'hidden', null, undefined, 'visible')
    expect(result).toBe('base visible')
  })

  it('merges conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge resolves p-2 vs p-4 — last declaration wins
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles object syntax from clsx', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })
})

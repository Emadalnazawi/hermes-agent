import { describe, expect, it } from 'vitest'

import { arrowMove } from './use-clarify-keys-handlers'

describe('clarify grid arrow moves', () => {
  it('maps left/right onto grid columns in a left-to-right layout', () => {
    expect(arrowMove('ArrowLeft', 3)).toEqual({ delta: -1, wrap: true })
    expect(arrowMove('ArrowRight', 3)).toEqual({ delta: 1, wrap: true })
  })

  it('mirrors left/right when the card is laid out right-to-left', () => {
    // The second column is visually to the LEFT of the first in RTL, so the
    // visual key has to walk the row-major index the other way.
    expect(arrowMove('ArrowLeft', 3, true)).toEqual({ delta: 1, wrap: true })
    expect(arrowMove('ArrowRight', 3, true)).toEqual({ delta: -1, wrap: true })
  })

  it('keeps vertical moves and the single-column card unchanged in RTL', () => {
    expect(arrowMove('ArrowDown', 3, true)).toEqual({ delta: 3, wrap: false })
    expect(arrowMove('ArrowUp', 3, true)).toEqual({ delta: -3, wrap: false })
    expect(arrowMove('ArrowLeft', undefined, true)).toBeNull()
  })
})

import { afterEach, expect, it } from 'vitest'

import { inlineDirectionSign, writingDirection } from './writing-direction'

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('dir')
})

function mount(dir: 'ltr' | 'rtl', style?: string) {
  const outer = document.createElement('div')
  outer.setAttribute('dir', dir)
  const inner = document.createElement('div')

  if (style) {
    inner.setAttribute('style', style)
  }

  outer.append(inner)
  document.body.append(outer)

  return inner
}

it('reads the computed direction and the inline-axis sign from an ancestor dir', () => {
  expect(writingDirection(mount('rtl'))).toBe('rtl')
  expect(inlineDirectionSign(mount('rtl'))).toBe(-1)
  expect(writingDirection(mount('ltr'))).toBe('ltr')
  expect(inlineDirectionSign(mount('ltr'))).toBe(1)
})

it('lets an explicit CSS direction win over the surrounding attribute', () => {
  // A code pane or terminal forces LTR inside an RTL app; its pointer maths
  // must stay physical even though every ancestor is `dir="rtl"`.
  const forced = mount('rtl', 'direction: ltr')
  expect(writingDirection(forced)).toBe('ltr')
  expect(inlineDirectionSign(forced)).toBe(1)
})

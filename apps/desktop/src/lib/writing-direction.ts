/** Writing direction in force for an element.
 *
 * Read from the computed style so CSS (not just the `dir` attribute) decides:
 * a pane can force `direction: ltr` inside an RTL app, and code blocks do.
 * Some DOM implementations do not resolve inherited `direction`, so an empty
 * value falls back to the nearest explicit `dir="rtl"` ancestor. */
export function writingDirection(element: Element): 'ltr' | 'rtl' {
  const computed = globalThis.getComputedStyle(element).direction

  if (computed === 'rtl' || computed === 'ltr') {
    return computed
  }

  return element.closest('[dir="rtl"]') ? 'rtl' : 'ltr'
}

/** -1 in RTL, +1 in LTR: multiply an inline-axis delta by this to get the
 * direction-neutral step (pointer moves, arrow-key steps, tab order). */
export function inlineDirectionSign(element: Element): 1 | -1 {
  return writingDirection(element) === 'rtl' ? -1 : 1
}

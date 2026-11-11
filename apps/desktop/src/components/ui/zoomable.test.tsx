import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { Zoomable } from './zoomable'

afterEach(cleanup)

describe('Zoomable', () => {
  it('localizes the default trigger and shared viewer controls in Arabic', () => {
    render(<I18nProvider configClient={null} initialLocale="ar"><Zoomable><div>رسم</div></Zoomable></I18nProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'توسيع' }))
    expect(screen.getByRole('button', { name: 'تكبير' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'تصغير' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'إعادة تعيين التكبير' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the full-view overlay when the trigger is clicked', () => {
    render(
      <Zoomable label="Open diagram" overlay={<div data-testid="overlay">Expanded diagram</div>}>
        <div>Inline diagram</div>
      </Zoomable>
    )

    expect(screen.queryByTestId('overlay')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open diagram' }))
    expect(screen.getByTestId('overlay')).toBeTruthy()
  })
})

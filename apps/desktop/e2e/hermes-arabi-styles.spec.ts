import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'

import { createServer } from 'vite'

import { resolveElectronBinary } from './electron-binary'
import { _electron, expect, test } from './test'

// Synthetic CSS fixture: production data-slot contracts and utilities, no gateway,
// user sessions or credentials. Its Electron process has its own disposable data.
const fixture = `
<main style="max-width:760px;margin:40px auto;padding:24px">
  <div data-slot="aui_thread-content" class="flex flex-col gap-4">
    <div data-slot="aui_user-message-root" class="flex flex-col items-stretch">
      <div class="composer-human-message standalone-glass relative flex w-full min-w-0 max-w-full flex-col gap-1.5 rounded-xl border bg-(--dt-user-bubble) px-3 py-2 text-left">
        <div data-slot="aui_user-inline-text" id="user-text">هذه رسالة عربية تجريبية لقياس وضوح الخط ووزنه العادي.</div>
      </div>
    </div>
    <div data-slot="aui_assistant-message-root" class="flex w-full min-w-0 flex-col self-start">
      <div data-slot="aui_assistant-message-content" class="min-w-0 max-w-full text-foreground">
        <div class="aui-md prose"><p id="arabic-prose">هذا رد تجريبي بالعربية. النص العادي واضح وخفيف، مع <strong>تأكيد مقصود</strong> يبقى بارزًا.</p><p>نص مختلط Hermes 123 مع العربية.</p></div>
      </div>
    </div>
  </div>
  <div data-slot="composer-dock" style="margin-block-start:48px">
    <div data-slot="composer-root">
      <div data-slot="composer-surface" class="relative rounded-2xl border bg-(--composer-fill) p-3">
        <div data-slot="composer-rich-input" id="editor" contenteditable="true" role="textbox" aria-label="Synthetic prompt" style="min-height:64px;outline:none">اكتب رسالتك هنا لاختبار التحديد ومؤشر الكتابة.</div>
        <button type="button">إرسال</button>
      </div>
    </div>
  </div>
</main>`

async function openFixture() {
  const temporary = mkdtempSync(path.join(tmpdir(), 'hermes-arabi-styles-'))
  const main = path.join(temporary, 'main.cjs')
  writeFileSync(
    main,
    `const { app, BrowserWindow } = require('electron');
app.setPath('userData', ${JSON.stringify(path.join(temporary, 'user-data'))});
app.whenReady().then(() => {
  const window = new BrowserWindow({ width: 900, height: 650,
    webPreferences: { sandbox: true, contextIsolation: true } });
  window.loadURL('about:blank');
});`
  )
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
  await server.listen()

  const app = await _electron.launch({
    executablePath: resolveElectronBinary([path.resolve('.'), path.resolve('../..')]),
    args: [main]
  })

  const page = await app.firstWindow()
  await page.setContent(fixture)
  await page.addStyleTag({ url: `${server.resolvedUrls!.local[0]}src/styles.css?direct` })
  await page.evaluate(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
  })

  return { app, page, server }
}

test('Arabic chat and editor use native regular typography without flattening emphasis', async ({
  browserName: _browserName
}, testInfo) => {
  const { app, page, server } = await openFixture()

  try {
    for (const mode of ['light', 'dark'] as const) {
      await page.evaluate(mode => {
        const root = document.documentElement
        root.classList.toggle('dark', mode === 'dark')
        root.dataset.hermesTheme = mode === 'dark' ? 'hermes-arabi' : 'hermes-arabi-light'
        root.dataset.hermesMode = mode
      }, mode)

      const styles = await page.locator('#arabic-prose').evaluate(el => {
        const s = getComputedStyle(el)

        return { family: s.fontFamily, weight: s.fontWeight }
      })

      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable')
      await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#arabic-prose' })
      const fonts = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      const fontEvidence = JSON.stringify({ styles, fonts }, null, 2)
      writeFileSync(testInfo.outputPath(`font-${mode}.json`), fontEvidence)
      await testInfo.attach(`font-${mode}.json`, { body: fontEvidence, contentType: 'application/json' })
      await cdp.detach()
      await page.screenshot({
        path: testInfo.outputPath(`font-${process.env.HERMES_STYLE_CAPTURE_LABEL ?? 'after'}-${mode}.png`)
      })
      expect.soft(styles.family).toMatch(/^system-ui|^"SF Arabic"/)
      expect.soft(styles.weight).toBe('400')
      expect(fonts.fonts.some(font => font.familyName.includes('Segoe'))).toBe(false)
      await expect(page.locator('#arabic-prose')).toHaveCSS('font-size', '14px')
      await expect(page.locator('#arabic-prose')).toHaveCSS('line-height', '22px')
      await expect(page.locator('#user-text')).toHaveCSS('font-weight', '400')
      await expect(page.locator('#editor')).toHaveCSS('font-weight', '400')
      expect(
        Number(await page.locator('#arabic-prose strong').evaluate(el => getComputedStyle(el).fontWeight))
      ).toBeGreaterThan(400)
    }

    // Language scoping must leave English and the existing CJK editor rules alone.
    await page.locator('#editor').evaluate(el => {
      el.lang = 'ja'
    })
    await expect(page.locator('#editor')).toHaveCSS('font-family', /Hiragino Sans/)
  } finally {
    await app.close()
    await server.close()
  }
})

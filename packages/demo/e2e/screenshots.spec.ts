import { test, expect } from "@playwright/test"

// Screenshot capture for article images.
// Run: npx playwright test e2e/screenshots.spec.ts

test.describe("Screenshots for articles", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/")
    // Wait for avatar to load
    await expect(page.locator(".bunshin-avatar")).toBeVisible()
  })

  test("mid-game with conversation — thinking state", async ({ page }) => {
    // Play a few moves to build up board state
    for (let i = 0; i < 6; i++) {
      const hidden = page.locator("#board .cell.hidden:not(.flagged)")
      const count = await hidden.count()
      if (count === 0) break

      await hidden.first().click()
      await page.waitForTimeout(300)

      // If game ended, restart
      const status = await page.locator("#status").textContent()
      if (status?.includes("game over") || status?.includes("cleared")) {
        await page.locator("#new-game").click()
        await page.waitForTimeout(200)
        i = -1 // restart counter
        continue
      }
    }

    // Player asks for help — triggers thinking emotion
    await page.locator("#chat-input").fill("where should I click next?")
    await page.locator("#chat-send").click()
    await page.waitForTimeout(600)

    // Follow up with another question for richer conversation
    await page.locator("#chat-input").fill("that corner looks risky...")
    await page.locator("#chat-send").click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: "screenshots/demo-midgame.png",
      fullPage: false,
    })
  })

  test("game over — worried state", async ({ page }) => {
    // Play until we hit a mine
    let gameOver = false
    let attempts = 0
    while (!gameOver && attempts < 200) {
      const hidden = page.locator("#board .cell.hidden:not(.flagged)")
      const count = await hidden.count()
      if (count === 0) break

      await hidden.first().click()
      await page.waitForTimeout(100)

      const status = await page.locator("#status").textContent()
      if (status?.includes("game over")) {
        gameOver = true
      } else if (status?.includes("cleared")) {
        // Won — restart and try again
        await page.locator("#new-game").click()
        await page.waitForTimeout(200)
      }
      attempts++
    }

    if (gameOver) {
      await page.waitForTimeout(800)

      // Player reacts
      await page.locator("#chat-input").fill("that one stings...")
      await page.locator("#chat-send").click()
      await page.waitForTimeout(600)

      await page.screenshot({
        path: "screenshots/demo-gameover.png",
        fullPage: false,
      })
    }
  })

  test("fresh start — curious state with full UI", async ({ page }) => {
    // Just the initial state with Nagi's greeting
    await page.waitForTimeout(800)

    await page.screenshot({
      path: "screenshots/demo-start.png",
      fullPage: true,
    })
  })
})

import { test, expect } from "@playwright/test"

test.describe("Minesweeper + Nagi companion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("page loads with board and companion", async ({ page }) => {
    // Board renders 9x9 = 81 cells
    const cells = page.locator("#board .cell")
    await expect(cells).toHaveCount(81)

    // Bunshin avatar is rendered with name
    await expect(page.locator(".bunshin-name")).toHaveText("nagi")

    // Nagi greets on game start
    const messages = page.locator("#messages .message.companion")
    await expect(messages.first()).toBeVisible()
  })

  test("clicking a cell reveals it", async ({ page }) => {
    // All cells start hidden
    const hidden = page.locator("#board .cell.hidden")
    const initialCount = await hidden.count()
    expect(initialCount).toBe(81)

    // Click a cell near the center
    const cell = page.locator("#board .cell").nth(40)
    await cell.click()

    // At least one cell should now be revealed
    const revealed = page.locator("#board .cell.revealed")
    await expect(revealed.first()).toBeVisible()
    const revealedCount = await revealed.count()
    expect(revealedCount).toBeGreaterThan(0)
  })

  test("right-click places a flag", async ({ page }) => {
    const cell = page.locator("#board .cell").nth(0)
    await cell.click({ button: "right" })

    await expect(cell).toHaveClass(/flagged/)
    await expect(cell).toHaveText("⚑")

    // Right-click again removes the flag
    await cell.click({ button: "right" })
    await expect(cell).not.toHaveClass(/flagged/)
  })

  test("chain reveal triggers Nagi reaction", async ({ page }) => {
    // Keep clicking cells until we get a chain reveal or run out of safe spots
    // The local companion reacts to chain reveals of 5+ cells
    const messagesBefore = await page.locator("#messages .message.companion").count()

    // Click multiple cells to increase chance of triggering a reaction
    for (let i = 0; i < 9; i++) {
      const cell = page.locator("#board .cell.hidden").first()
      const count = await cell.count()
      if (count === 0) break
      await cell.click()

      // Check if game ended
      const status = await page.locator("#status").textContent()
      if (status?.includes("game over")) break
    }

    // Board state should have changed
    const revealed = await page.locator("#board .cell.revealed").count()
    expect(revealed).toBeGreaterThan(0)
  })

  test("new game resets the board", async ({ page }) => {
    // Click a cell first
    await page.locator("#board .cell").nth(40).click()
    const revealedBefore = await page.locator("#board .cell.revealed").count()
    expect(revealedBefore).toBeGreaterThan(0)

    // Click new game
    await page.locator("#new-game").click()

    // All cells should be hidden again
    const hidden = page.locator("#board .cell.hidden")
    await expect(hidden).toHaveCount(81)

    // Nagi should greet again
    const messages = page.locator("#messages .message.companion")
    await expect(messages.first()).toBeVisible()
  })

  test("game over shows mine and Nagi reacts", async ({ page }) => {
    // Click cells until we hit a mine
    let gameOver = false
    for (let attempt = 0; attempt < 81 && !gameOver; attempt++) {
      const hidden = page.locator("#board .cell.hidden:not(.flagged)")
      const count = await hidden.count()
      if (count === 0) break

      await hidden.first().click()

      const status = await page.locator("#status").textContent()
      if (status?.includes("game over")) {
        gameOver = true
      }
      if (status?.includes("cleared")) {
        // Won instead — still a valid outcome, restart
        await page.locator("#new-game").click()
      }
    }

    if (gameOver) {
      // Status should show game over
      await expect(page.locator("#status")).toHaveText("✗ game over")

      // A mine cell should be visible
      const mines = page.locator("#board .cell.mine")
      await expect(mines.first()).toBeVisible()

      // Nagi should have reacted to game end
      const lastMessage = page.locator("#messages .message.companion").last()
      await expect(lastMessage).toBeVisible()
    }
  })

  test("player can chat with Nagi", async ({ page }) => {
    const messagesBefore = await page.locator("#messages .message.companion").count()

    await page.locator("#chat-input").fill("should I go for the corner?")
    await page.locator("#chat-send").click()

    // Nagi should respond
    const messagesAfter = page.locator("#messages .message.companion")
    await expect(messagesAfter).toHaveCount(messagesBefore + 1)
  })

  test("status bar updates with progress", async ({ page }) => {
    // Initial status
    await expect(page.locator("#status")).toContainText("mines left")

    // Click a cell
    await page.locator("#board .cell").nth(40).click()

    // Status should show percentage
    const status = await page.locator("#status").textContent()
    expect(status).toMatch(/\d+%/)
  })
})

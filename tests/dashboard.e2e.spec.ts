import { test, expect } from '@playwright/test'

const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD)

test.describe('dashboard flows', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run dashboard browser tests.')

    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard shows operations and top links', async ({ page }) => {
    await expect(page.getByText(/Operations pulse/i)).toBeVisible()
    await expect(page.getByText(/Trust and delivery/i)).toBeVisible()
    await expect(page.getByText(/Top links/i)).toBeVisible()
  })

  test('links page loads creation controls', async ({ page }) => {
    await page.goto('/dashboard/links')
    await expect(page.getByText(/Create short link/i)).toBeVisible()
    await expect(page.getByText(/Create tag/i)).toBeVisible()
    await expect(page.getByText(/Your links/i)).toBeVisible()
  })

  test('settings page shows custom domain guidance and security review', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText(/Custom domains/i)).toBeVisible()
    await expect(page.getByText(/DNS setup guide/i)).toBeVisible()
    await expect(page.getByText(/Security review/i)).toBeVisible()
    await expect(page.getByText(/Delivery and operations/i)).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

const fakeUser = {
  id: '1',
  username: 'admin',
  real_name: 'Admin',
  phone: '',
  email: '',
  avatar_url: '',
  region_id: null,
  province_id: null,
  status: 1,
  roles: [{ id: '1', name: '超级管理员', code: 'super_admin' }],
}

const fakeLoginResponse = {
  code: 0,
  message: 'ok',
  data: {
    token: 'test-token-playwright',
    expires_in: 86400,
    user: fakeUser,
  },
}

const emptyOverviewResponse = {
  code: 0,
  message: 'ok',
  data: { hospital_count: 0, ticket_count: 0, open_ticket_count: 0, user_count: 0 },
}

const emptyOkResponse = { code: 0, message: 'ok', data: null }

test.describe('Login smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Only intercept actual backend API calls (not Vite dev server assets)
    await page.route(/\/api\/auth\/login$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeLoginResponse),
      })
    })

    // Dashboard report calls
    await page.route(/\/api\/admin\/v1\/reports\/overview/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyOverviewResponse),
      })
    })

    // Catch any other admin API calls
    await page.route(/\/api\/admin\/v1\//, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyOkResponse),
      })
    })

    // Catch remaining api calls (notifications, etc.)
    await page.route(/\/api\/common\/v1\//, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyOkResponse),
      })
    })
  })

  test('fills credentials and navigates away from /login on success', async ({ page }) => {
    await page.goto('/login')

    // Wait for the login form heading to appear
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible({ timeout: 10000 })

    // Fill in credentials using placeholder selectors (matches login page inputs)
    await page.getByPlaceholder('请输入用户名').fill('admin')
    await page.getByPlaceholder('请输入密码').fill('admin123')

    // Click the submit button — use type="submit" to disambiguate from WeChat button
    await page.locator('button[type="submit"]').click()

    // After login the auth guard should redirect to '/'
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('shows error message on failed login (code !== 0)', async ({ page }) => {
    // Override login to return an error for this test
    await page.route(/\/api\/auth\/login$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 1001, message: '用户名或密码错误', data: null }),
      })
    })

    await page.goto('/login')

    // Wait for form
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible({ timeout: 10000 })

    await page.getByPlaceholder('请输入用户名').fill('admin')
    await page.getByPlaceholder('请输入密码').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()

    // Error message should appear
    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 5000 })
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })
})

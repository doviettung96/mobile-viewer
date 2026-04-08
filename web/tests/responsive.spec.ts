import { expect, test, type Page } from "@playwright/test";

type Viewport = {
  width: number;
  height: number;
  label: string;
};

const DEVICE = {
  serial: "ABC123456",
  model: "Pixel 8 Pro",
  state: "offline" as const,
  transportId: 42,
  displayName: "Pixel 8 Pro",
  isEmulator: false,
  product: "cheetah",
  deviceName: "pixel-8-pro"
};

const VIEWPORTS: Viewport[] = [
  { label: "phone", width: 390, height: 844 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "small laptop", width: 1365, height: 768 }
];

async function installDashboardMocks(page: Page) {
  await page.route("**/api/session", async (route) => {
    const method = route.request().method();

    if (method === "GET" || method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          userName: "operator",
          expiresAt: "2026-05-01T00:00:00.000Z"
        })
      });
      return;
    }

    if (method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fulfill({ status: 405, body: "Method not allowed" });
  });

  await page.route("**/api/devices", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        devices: [DEVICE]
      })
    });
  });

  await page.addInitScript(() => {
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      binaryType = "arraybuffer";
      readyState = MockWebSocket.CONNECTING;
      url: string;
      #listeners = new Map<string, Set<(event: Event | MessageEvent<string>) => void>>();

      constructor(url: string | URL) {
        this.url = String(url);
        queueMicrotask(() => {
          this.readyState = MockWebSocket.OPEN;
          this.#dispatch("open", new Event("open"));
        });
      }

      addEventListener(type: string, listener: (event: Event | MessageEvent<string>) => void) {
        const listeners = this.#listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.#listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: (event: Event | MessageEvent<string>) => void) {
        this.#listeners.get(type)?.delete(listener);
      }

      send() {}

      close() {
        if (this.readyState === MockWebSocket.CLOSED) {
          return;
        }

        this.readyState = MockWebSocket.CLOSED;
        this.#dispatch("close", new Event("close"));
      }

      #dispatch(type: string, event: Event | MessageEvent<string>) {
        for (const listener of this.#listeners.get(type) ?? []) {
          listener(event);
        }
      }
    }

    Object.defineProperty(window, "WebSocket", {
      configurable: true,
      value: MockWebSocket
    });
  });
}

async function openExpandedView(page: Page) {
  const previewSurface = page.getByRole("button", { name: `Open expanded view for ${DEVICE.displayName}` });
  await expect(previewSurface).toBeVisible();
  await previewSurface.click();

  await expect(page.getByText("Expanded device shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to grid" })).toBeVisible();
  await expect(page).toHaveURL(/#\/device\/ABC123456$/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(Math.abs(overflow)).toBeLessThanOrEqual(1);
}

for (const viewport of VIEWPORTS) {
  test(`${viewport.label} layout opens the expanded viewer from a single tap`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installDashboardMocks(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Device dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pixel 8 Pro" })).toBeVisible();

    const dashboardLayout = page.locator(".dashboard-layout");
    await expect(dashboardLayout).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await openExpandedView(page);
    await assertNoHorizontalOverflow(page);

    const columnCount = await dashboardLayout.evaluate((node) => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length);
    if (viewport.width >= 1100) {
      expect(columnCount).toBeGreaterThan(1);
    } else {
      expect(columnCount).toBe(1);
    }

    await page.getByRole("button", { name: "Back to grid" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "Device dashboard" })).toBeVisible();
  });
}

// Runs once when the server process boots. We use it to start the background
// F1 data parser so standings/calendar/live data refresh on a timer without
// waiting for a visitor to hit the page.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("@/db")
    await initDb()
    const { startF1Scheduler } = await import("@/lib/f1/scheduler")
    startF1Scheduler()
  }
}

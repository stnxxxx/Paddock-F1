module.exports = [
"[project]/src/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Runs once when the server process boots. We use it to start the background
// F1 data parser so standings/calendar/live data refresh on a timer without
// waiting for a visitor to hit the page.
__turbopack_context__.s([
    "register",
    ()=>register
]);
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        const { initDb } = await __turbopack_context__.A("[project]/src/db/index.ts [instrumentation] (ecmascript, async loader)");
        await initDb();
        const { startF1Scheduler } = await __turbopack_context__.A("[project]/src/lib/f1/scheduler.ts [instrumentation] (ecmascript, async loader)");
        startF1Scheduler();
    }
}
}),
];

//# sourceMappingURL=src_instrumentation_ts_07j_8w1._.js.map
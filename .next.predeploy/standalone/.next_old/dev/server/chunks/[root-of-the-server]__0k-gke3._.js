module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/f1-data.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "F1_CACHE_TAG",
    ()=>F1_CACHE_TAG,
    "fetchAllStandings",
    ()=>fetchAllStandings,
    "fetchAllTimeConstructorChampions",
    ()=>fetchAllTimeConstructorChampions,
    "fetchAllTimeDriverChampions",
    ()=>fetchAllTimeDriverChampions,
    "fetchConstructorResults",
    ()=>fetchConstructorResults,
    "fetchConstructorSeasons",
    ()=>fetchConstructorSeasons,
    "fetchConstructorStandings",
    ()=>fetchConstructorStandings,
    "fetchConstructorStandingsByYear",
    ()=>fetchConstructorStandingsByYear,
    "fetchDriverResults",
    ()=>fetchDriverResults,
    "fetchDriverSeasons",
    ()=>fetchDriverSeasons,
    "fetchDriverStandings",
    ()=>fetchDriverStandings,
    "fetchDriverStandingsByYear",
    ()=>fetchDriverStandingsByYear,
    "fetchLastRaceResults",
    ()=>fetchLastRaceResults,
    "fetchNextRace",
    ()=>fetchNextRace,
    "fetchQualifyingResults",
    ()=>fetchQualifyingResults,
    "fetchRaceResults",
    ()=>fetchRaceResults,
    "fetchRaceSchedule",
    ()=>fetchRaceSchedule,
    "fetchSeasonRaces",
    ()=>fetchSeasonRaces,
    "getF1TeamColor",
    ()=>getF1TeamColor,
    "isRaceWeekend",
    ()=>isRaceWeekend,
    "normalizeTeam",
    ()=>normalizeTeam
]);
const API = "https://api.jolpi.ca/ergast/f1";
const F1_CACHE_TAG = "f1-data";
const CONSTRUCTOR_MAP = {
    mercedes: "Mercedes",
    ferrari: "Ferrari",
    mclaren: "McLaren",
    red_bull: "Red Bull",
    alpine: "Alpine F1 Team",
    rb: "Racing Bulls",
    haas: "Haas F1 Team",
    williams: "Williams",
    audi: "Audi",
    aston_martin: "Aston Martin",
    cadillac: "Cadillac F1 Team"
};
const NORMALIZE_TEAM = {
    "Alpine F1 Team": "Alpine",
    "Haas F1 Team": "Haas",
    "Cadillac F1 Team": "Cadillac",
    "RB F1 Team": "Racing Bulls",
    "Aston Martin": "Aston Martin"
};
function normalizeTeam(name) {
    return NORMALIZE_TEAM[name] || name;
}
const TEAM_COLORS = {
    Mercedes: "#00d2be",
    Ferrari: "#dc0000",
    McLaren: "#ff8000",
    "Red Bull": "#1e41ff",
    Alpine: "#0093cc",
    "Racing Bulls": "#6692ff",
    Haas: "#b6babd",
    Williams: "#005aff",
    Audi: "#e10600",
    "Aston Martin": "#006f62",
    Cadillac: "#003d7c"
};
function getF1TeamColor(team) {
    return TEAM_COLORS[team] || "#888";
}
function getClassifiedRaceTime(status, time) {
    if (!time) return undefined;
    return status === "Finished" ? time : undefined;
}
async function fetchDriverStandings() {
    const url = `${API}/current/driverStandings.json`;
    const res = await fetch(url, {
        next: {
            revalidate: 300,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    const j = await res.json();
    const list = j?.MRData?.StandingsTable?.StandingsLists?.[0];
    return {
        season: list?.season,
        round: parseInt(list?.round || "0"),
        standings: list?.DriverStandings || []
    };
}
async function fetchConstructorStandings() {
    const url = `${API}/current/constructorStandings.json`;
    const res = await fetch(url, {
        next: {
            revalidate: 300,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    const j = await res.json();
    const list = j?.MRData?.StandingsTable?.StandingsLists?.[0];
    return {
        season: list?.season,
        round: parseInt(list?.round || "0"),
        standings: list?.ConstructorStandings || []
    };
}
async function fetchRaceSchedule() {
    const url = `${API}/current.json`;
    const res = await fetch(url, {
        next: {
            revalidate: 3600,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    const j = await res.json();
    const races = j?.MRData?.RaceTable?.Races || [];
    return {
        season: j?.MRData?.RaceTable?.season,
        races
    };
}
async function fetchNextRace() {
    const url = `${API}/current/next.json`;
    const res = await fetch(url, {
        next: {
            revalidate: 600,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    const j = await res.json();
    const races = j?.MRData?.RaceTable?.Races || [];
    return races[0];
}
async function fetchLastRaceResults() {
    const url = `${API}/current/last/results.json`;
    const res = await fetch(url, {
        next: {
            revalidate: 300,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    const j = await res.json();
    const race = j?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
        raceName: race.raceName,
        round: race.round,
        date: race.date,
        results: (race.Results || []).map((r)=>({
                position: r.position,
                driverCode: r.Driver?.code,
                driverName: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
                constructorId: r.Constructor?.constructorId,
                constructorName: normalizeTeam(CONSTRUCTOR_MAP[r.Constructor?.constructorId] || r.Constructor?.name || ""),
                laps: r.laps,
                status: r.status,
                time: getClassifiedRaceTime(r.status, r.Time?.time)
            }))
    };
}
async function fetchAllStandings() {
    const [drivers, constructors, schedule] = await Promise.all([
        fetchDriverStandings(),
        fetchConstructorStandings(),
        fetchRaceSchedule()
    ]);
    const mappedDrivers = drivers.standings.map((d)=>({
            pos: parseInt(d.position),
            driver: d.Driver.code,
            surname: d.Driver.familyName,
            team: normalizeTeam(d.Constructors[0].name),
            color: getF1TeamColor(normalizeTeam(d.Constructors[0].name)),
            pts: parseInt(d.points)
        }));
    const mappedConstructors = constructors.standings.map((c)=>({
            pos: parseInt(c.position),
            team: normalizeTeam(c.Constructor.name),
            color: getF1TeamColor(normalizeTeam(c.Constructor.name)),
            pts: parseInt(c.points)
        }));
    return {
        drivers: mappedDrivers,
        constructors: mappedConstructors,
        season: drivers.season,
        round: drivers.round,
        totalRaces: schedule.races.length,
        races: schedule.races.map((r)=>({
                round: r.round,
                name: r.raceName,
                circuit: r.Circuit?.circuitName,
                country: r.Circuit?.Location?.country,
                date: r.date
            }))
    };
}
function isRaceWeekend(races) {
    const now = new Date();
    for (const r of races){
        const raceDate = new Date(r.date + "T12:00:00Z");
        const friDate = new Date(raceDate.getTime() - 2 * 86400000);
        const sunDate = new Date(raceDate.getTime());
        friDate.setHours(0, 0, 0, 0);
        sunDate.setHours(23, 59, 59, 999);
        if (now >= friDate && now <= sunDate) return true;
    }
    return false;
}
async function fetchJolpica(path, cacheSecs = 3600) {
    const url = `${API}/${path}`;
    const res = await fetch(url, {
        next: {
            revalidate: cacheSecs,
            tags: [
                F1_CACHE_TAG
            ]
        }
    });
    if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
    const j = await res.json();
    return j?.MRData;
}
async function fetchSeasonRaces(year) {
    const data = await fetchJolpica(`${year}.json`);
    const races = data.RaceTable?.Races || [];
    return {
        season: year,
        races: races.map((r)=>({
                round: parseInt(r.round),
                name: r.raceName,
                circuit: r.Circuit?.circuitName,
                country: r.Circuit?.Location?.country,
                date: r.date
            }))
    };
}
async function fetchRaceResults(year, round) {
    const data = await fetchJolpica(`${year}/${round}/results.json`, 300);
    const race = data.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        circuit: race.Circuit?.circuitName,
        country: race.Circuit?.Location?.country,
        date: race.date,
        results: (race.Results || []).map((r)=>({
                position: r.position,
                grid: r.grid,
                driverCode: r.Driver?.code || r.Driver?.driverId,
                driverName: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
                constructorName: normalizeTeam(CONSTRUCTOR_MAP[r.Constructor?.constructorId] || r.Constructor?.name || ""),
                constructorId: r.Constructor?.constructorId,
                laps: r.laps,
                status: r.status,
                time: getClassifiedRaceTime(r.status, r.Time?.time),
                points: r.points,
                fastestLap: r.FastestLap ? {
                    rank: r.FastestLap.rank,
                    time: r.FastestLap.Time.time
                } : null
            }))
    };
}
async function fetchQualifyingResults(year, round) {
    const data = await fetchJolpica(`${year}/${round}/qualifying.json`, 300);
    const race = data.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        results: (race.QualifyingResults || []).map((q)=>({
                position: q.position,
                driverCode: q.Driver?.code || q.Driver?.driverId,
                driverName: `${q.Driver?.givenName} ${q.Driver?.familyName}`,
                constructorName: normalizeTeam(CONSTRUCTOR_MAP[q.Constructor?.constructorId] || q.Constructor?.name),
                q1: q.Q1,
                q2: q.Q2,
                q3: q.Q3
            }))
    };
}
async function fetchDriverSeasons(driverId) {
    const data = await fetchJolpica(`drivers/${driverId}/seasons.json`);
    const seasons = data.SeasonTable?.Seasons || [];
    return seasons.map((s)=>parseInt(s.season)).filter((y)=>y >= 2000).sort((a, b)=>b - a);
}
async function fetchDriverResults(driverId, year) {
    const data = await fetchJolpica(`${year}/drivers/${driverId}/results.json`, 300);
    const races = data.RaceTable?.Races || [];
    return {
        season: year,
        driverId,
        races: races.map((r)=>{
            const res = r.Results?.[0];
            return {
                round: parseInt(r.round),
                raceName: r.raceName,
                circuit: r.Circuit?.circuitName,
                date: r.date,
                position: res?.positionText || "R",
                grid: res?.grid,
                points: res?.points,
                status: res?.status,
                constructorName: normalizeTeam(CONSTRUCTOR_MAP[res?.Constructor?.constructorId] || res?.Constructor?.name || "")
            };
        })
    };
}
async function fetchDriverStandingsByYear(year) {
    const data = await fetchJolpica(`${year}/driverStandings.json`, 300);
    const list = data.StandingsTable?.StandingsLists?.[0];
    return {
        season: list?.season,
        round: list?.round,
        standings: (list?.DriverStandings || []).map((d)=>({
                pos: parseInt(d.position),
                driverCode: d.Driver?.code || d.Driver?.driverId,
                driverName: `${d.Driver?.givenName} ${d.Driver?.familyName}`,
                team: normalizeTeam(d.Constructors?.[0]?.name || ""),
                color: getF1TeamColor(normalizeTeam(d.Constructors?.[0]?.name || "")),
                pts: parseInt(d.points),
                wins: parseInt(d.wins)
            }))
    };
}
async function fetchConstructorStandingsByYear(year) {
    const data = await fetchJolpica(`${year}/constructorStandings.json`, 300);
    const list = data.StandingsTable?.StandingsLists?.[0];
    return {
        season: list?.season,
        round: list?.round,
        standings: (list?.ConstructorStandings || []).map((c)=>({
                pos: parseInt(c.position),
                team: normalizeTeam(c.Constructor?.name || ""),
                color: getF1TeamColor(normalizeTeam(c.Constructor?.name || "")),
                pts: parseInt(c.points),
                wins: parseInt(c.wins)
            }))
    };
}
async function fetchConstructorSeasons(constructorId) {
    const data = await fetchJolpica(`constructors/${constructorId}/seasons.json`);
    const seasons = data.SeasonTable?.Seasons || [];
    return seasons.map((s)=>parseInt(s.season)).filter((y)=>y >= 2000).sort((a, b)=>b - a);
}
async function fetchConstructorResults(constructorId, year) {
    const data = await fetchJolpica(`${year}/constructors/${constructorId}/results.json`, 300);
    const races = data.RaceTable?.Races || [];
    return {
        season: year,
        constructorId,
        races: races.map((r)=>{
            const res = r.Results || [];
            return {
                round: parseInt(r.round),
                raceName: r.raceName,
                circuit: r.Circuit?.circuitName,
                date: r.date,
                results: res.map((rr)=>({
                        position: rr.position,
                        driverCode: rr.Driver?.code || rr.Driver?.driverId,
                        driverName: `${rr.Driver?.givenName} ${rr.Driver?.familyName}`,
                        points: rr.points,
                        status: rr.status
                    }))
            };
        })
    };
}
async function fetchAllTimeDriverChampions() {
    const data = await fetchJolpica("seasons.json?limit=100");
    const seasons = (data.SeasonTable?.Seasons || []).map((s)=>parseInt(s.season)).filter((y)=>y >= 2000);
    const results = await Promise.all(seasons.map(async (year)=>{
        try {
            const d = await fetchJolpica(`${year}/driverStandings/1.json`);
            const list = d.StandingsTable?.StandingsLists?.[0];
            const dr = list?.DriverStandings?.[0];
            return {
                season: year,
                driverCode: dr?.Driver?.code || dr?.Driver?.driverId || "",
                driverName: `${dr?.Driver?.givenName || ""} ${dr?.Driver?.familyName || ""}`.trim(),
                team: normalizeTeam(dr?.Constructors?.[0]?.name || ""),
                pts: parseInt(dr?.points || "0"),
                wins: parseInt(dr?.wins || "0")
            };
        } catch  {
            return null;
        }
    }));
    return results.filter(Boolean).reverse();
}
async function fetchAllTimeConstructorChampions() {
    const data = await fetchJolpica("seasons.json?limit=100");
    const seasons = (data.SeasonTable?.Seasons || []).map((s)=>parseInt(s.season)).filter((y)=>y >= 2000);
    const results = await Promise.all(seasons.map(async (year)=>{
        try {
            const d = await fetchJolpica(`${year}/constructorStandings/1.json`);
            const list = d.StandingsTable?.StandingsLists?.[0];
            const cr = list?.ConstructorStandings?.[0];
            return {
                season: year,
                team: normalizeTeam(cr?.Constructor?.name || ""),
                pts: parseInt(cr?.points || "0"),
                wins: parseInt(cr?.wins || "0")
            };
        } catch  {
            return null;
        }
    }));
    return results.filter(Boolean).reverse();
}
}),
"[project]/src/lib/f1/scheduler.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "startF1Scheduler",
    ()=>startF1Scheduler
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/f1-data.ts [instrumentation] (ecmascript)");
;
;
// During a race weekend results move fast, so we refresh tightly; otherwise a
// relaxed cadence is enough to keep standings and the calendar current.
const NORMAL_MS = 15 * 60_000;
const WEEKEND_MS = 2 * 60_000;
const FIRST_RUN_MS = 30_000;
async function refresh() {
    // Invalidate the tagged fetch cache, then re-warm the hot endpoints so the
    // data is fresh before any visitor requests it.
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["revalidateTag"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["F1_CACHE_TAG"], "max");
    } catch  {
    // revalidateTag can be a no-op outside a request — the time-based revalidate
    // windows still keep data fresh, so this is non-fatal.
    }
    await Promise.allSettled([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fetchAllStandings"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fetchLastRaceResults"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fetchNextRace"])()
    ]);
    globalThis.__f1Scheduler.lastRun = new Date().toISOString();
}
async function nextDelay() {
    try {
        const { races } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fetchRaceSchedule"])();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$f1$2d$data$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isRaceWeekend"])(races) ? WEEKEND_MS : NORMAL_MS;
    } catch  {
        return NORMAL_MS;
    }
}
function startF1Scheduler() {
    if (globalThis.__f1Scheduler?.running) return;
    globalThis.__f1Scheduler = {
        running: true
    };
    const loop = async ()=>{
        try {
            await refresh();
        } catch  {
        // Never let a transient failure kill the loop.
        }
        const delay = await nextDelay();
        globalThis.__f1Scheduler.timer = setTimeout(loop, delay);
    };
    globalThis.__f1Scheduler.timer = setTimeout(loop, FIRST_RUN_MS);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0k-gke3._.js.map
import { v4 as uuid } from "uuid"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { getDb, getPool, type DbQuery } from "./pg"
import { migratePgSchema } from "./schema"

// ── Initialization ──────────────────────────────────────────────────────────

let _ready = false

export async function initDb(): Promise<void> {
  if (_ready) return
  await migratePgSchema()
  const db = getDb()
  await seedIfEmpty(db)
  await backfillAchievements(db)
  await migrateDataImageProfiles(db)
  _ready = true
}

// ── Re-export getDb ─────────────────────────────────────────────────────────

export { getDb, getPool, type DbQuery }

// ── Backfill achievements ───────────────────────────────────────────────────

async function backfillAchievements(db: DbQuery) {
  const done = await db.get<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", ["ach_backfill_v1"])
  if (done) return
  const userIds = await db.all<{ id: string }>("SELECT id FROM users")
  for (const u of userIds) {
    try {
      const { checkAndGrantAchievements } = await import("@/lib/achievements")
      await checkAndGrantAchievements(db, u.id)
    } catch {}
  }
  await db.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ["ach_backfill_v1", "1"])
}

// ── Data image migration ────────────────────────────────────────────────────

async function migrateDataImageProfiles(db: DbQuery) {
  const rows = await db.all<{ id: string; avatar: string | null; cover: string | null }>(
    "SELECT id, avatar, cover FROM users WHERE avatar LIKE ? OR cover LIKE ?",
    ["data:image/%", "data:image/%"]
  )
  if (!rows.length) return

  const uploadDir = path.join(process.cwd(), "public", "uploads")
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const saveDataImage = (userId: string, field: "avatar" | "cover", value: string | null) => {
    if (!value?.startsWith("data:image/")) return null
    const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([\w+/=\s]+)$/i)
    if (!match) return null
    const ext = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1]
    const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64")
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) return null
    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16)
    const filename = `profile-${userId}-${field}-${hash}.${ext}`
    const filepath = path.join(uploadDir, filename)
    if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, buffer)
    return `/uploads/${filename}`
  }

  for (const row of rows) {
    const av = saveDataImage(row.id, "avatar", row.avatar)
    const cov = saveDataImage(row.id, "cover", row.cover)
    if (av || cov) {
      await db.run("UPDATE users SET avatar = COALESCE(?, avatar), cover = COALESCE(?, cover) WHERE id = ?", [av, cov, row.id])
    }
  }
}

// ── Seeding ──────────────────────────────────────────────────────────────────

const REAL_2026_DRIVERS = [
  { pos: 1, driver: "NOR", team: "McLaren", color: "#ff8000", pts: 131 },
  { pos: 2, driver: "VER", team: "Red Bull", color: "#1e41ff", pts: 119 },
  { pos: 3, driver: "PIA", team: "McLaren", color: "#ff8000", pts: 108 },
  { pos: 4, driver: "RUS", team: "Mercedes", color: "#00d2be", pts: 90 },
  { pos: 5, driver: "LEC", team: "Ferrari", color: "#dc0000", pts: 78 },
  { pos: 6, driver: "ANT", team: "Mercedes", color: "#00d2be", pts: 62 },
  { pos: 7, driver: "HAM", team: "Ferrari", color: "#dc0000", pts: 55 },
  { pos: 8, driver: "GAS", team: "Alpine", color: "#0093cc", pts: 34 },
  { pos: 9, driver: "HAD", team: "Racing Bulls", color: "#6692ff", pts: 30 },
  { pos: 10, driver: "ALB", team: "Williams", color: "#005aff", pts: 28 },
]

const REAL_2026_CONSTRUCTORS = [
  { pos: 1, team: "McLaren", color: "#ff8000", pts: 239 },
  { pos: 2, team: "Mercedes", color: "#00d2be", pts: 152 },
  { pos: 3, team: "Red Bull", color: "#1e41ff", pts: 139 },
  { pos: 4, team: "Ferrari", color: "#dc0000", pts: 133 },
  { pos: 5, team: "Alpine", color: "#0093cc", pts: 56 },
  { pos: 6, team: "Williams", color: "#005aff", pts: 44 },
  { pos: 7, team: "Racing Bulls", color: "#6692ff", pts: 38 },
  { pos: 8, team: "Haas", color: "#b6babd", pts: 30 },
  { pos: 9, team: "Aston Martin", color: "#006f62", pts: 24 },
  { pos: 10, team: "Audi", color: "#e10600", pts: 12 },
  { pos: 11, team: "Cadillac", color: "#003d7c", pts: 4 },
]

async function seedIfEmpty(db: DbQuery) {
  const adminId = await getOrCreateAdmin(db)
  await ensureReferenceData(db, adminId)
  await seedStandings(db)

  const seedDemo = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "1"
  if (seedDemo) await seedDemoUsers(db)
}

async function getOrCreateAdmin(db: DbQuery): Promise<string> {
  const existing = await db.get<{ id: string; role?: string }>("SELECT id, role FROM users WHERE email = ?", ["news@paddock.local"])
  if (existing) {
    if (existing.role !== "admin") {
      await db.run("UPDATE users SET role = ? WHERE id = ?", ["admin", existing.id])
    }
    return existing.id
  }

  const isProd = process.env.NODE_ENV === "production"
  const password = process.env.SEED_ADMIN_PASSWORD || (isProd ? crypto.randomBytes(24).toString("hex") : "devadmin")
  if (isProd && !process.env.SEED_ADMIN_PASSWORD) {
    console.warn("[seed] Created admin 'news@paddock.local' with a random password.")
  }

  const id = uuid()
  const now = new Date().toISOString()
  await db.run(
    "INSERT INTO users (id, username, email, password_hash, karma, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, "NewsBot", "news@paddock.local", bcrypt.hashSync(password, 10), 5000, "admin", now]
  )
  return id
}

async function seedDemoUsers(db: DbQuery) {
  const exists = await db.get("SELECT 1 FROM users WHERE email = ?", ["tifosi@paddock.local"])
  if (exists) return

  const now = new Date().toISOString()
  const pass = bcrypt.hashSync(process.env.SEED_DEMO_PASSWORD || "demo1234", 10)

  const KARMA_ACHS = [
    { min: 100, id: "ach-100-karma" },
    { min: 500, id: "ach-500-karma" },
    { min: 1000, id: "ach-1000-karma" },
  ]

  const users = [
    { id: uuid(), user: "TifosiForever", name: "Тифози навсегда", email: "tifosi@paddock.local", team: "Ferrari", driver: "LEC", karma: 1200, flairs: ["flair-veteran", "flair-analyst"], achs: ["ach-first-post", "ach-first-comment", "ach-10-posts"] },
    { id: uuid(), user: "MemeLord44", name: "Король мемов", email: "meme@paddock.local", team: "McLaren", driver: "NOR", karma: 3400, flairs: ["flair-memer"], achs: ["ach-first-post", "ach-10-posts", "ach-50-upvotes"] },
    { id: uuid(), user: "StatsGuru", name: "Гуру статистики", email: "stats@paddock.local", team: "Mercedes", driver: "RUS", karma: 2100, flairs: ["flair-analyst"], achs: ["ach-first-post", "ach-first-comment", "ach-veteran"] },
    { id: uuid(), user: "FantasyKing", name: "Фэнтези-король", email: "fantasy@paddock.local", team: "Red Bull", driver: "VER", karma: 850, flairs: ["flair-insider"], achs: ["ach-first-post", "ach-fantasy-win"] },
    { id: uuid(), user: "HistoryBuff", name: "Знаток истории", email: "history@paddock.local", team: null, driver: "SEN", karma: 1600, flairs: ["flair-veteran", "flair-collector"], achs: ["ach-first-post", "ach-veteran", "ach-bookmark-5"] },
  ]

  for (const u of users) {
    await db.run(
      "INSERT INTO users (id, username, email, password_hash, team, driver, karma, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING",
      [u.id, u.user, u.email, pass, u.team, u.driver, u.karma, "user", now]
    )
    await db.run("UPDATE users SET display_name = ? WHERE id = ?", [u.name, u.id])
    for (const fid of u.flairs) {
      await db.run("INSERT INTO user_flairs (user_id, flair_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [u.id, fid])
    }
    const earned = new Set([...u.achs, ...KARMA_ACHS.filter((k) => u.karma >= k.min).map((k) => k.id)])
    for (const aid of earned) {
      await db.run("INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [u.id, aid])
    }
  }
}

async function ensureReferenceData(db: DbQuery, authorId: string) {
  const now = new Date().toISOString()
  if (!authorId) return

  const flairs = [
    { id: "flair-veteran", name: "Ветеран", icon: "VET", color: "#c9a92c" },
    { id: "flair-analyst", name: "Аналитик", icon: "DATA", color: "#4da6ff" },
    { id: "flair-memer", name: "Мемолог", icon: "MEME", color: "#ff8000" },
    { id: "flair-insider", name: "Инсайдер", icon: "IN", color: "#9b8af0" },
    { id: "flair-artist", name: "Дизайнер", icon: "ART", color: "#e10600" },
    { id: "flair-collector", name: "Коллекционер", icon: "CARD", color: "#00d2be" },
  ]
  for (const f of flairs) {
    await db.run("INSERT INTO flairs (id, name, icon, color) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color", [f.id, f.name, f.icon, f.color])
  }

  const achievements = [
    { id: "ach-first-post", name: "Первый пост", description: "Опубликовать первый пост", icon: "P1" },
    { id: "ach-10-posts", name: "Пит-уолл", description: "Опубликовать 10 постов", icon: "10" },
    { id: "ach-50-upvotes", name: "Голос паддока", description: "Получить 50 плюсов", icon: "+50" },
    { id: "ach-100-karma", name: "Сотня кармы", description: "Набрать 100 кармы", icon: "100" },
    { id: "ach-500-karma", name: "Лидер мнений", description: "Набрать 500 кармы", icon: "500" },
    { id: "ach-1000-karma", name: "Легенда паддока", description: "Набрать 1000 кармы", icon: "1K" },
    { id: "ach-first-comment", name: "Комментатор", description: "Оставить первый комментарий", icon: "C1" },
    { id: "ach-bookmark-5", name: "Архивариус", description: "Сохранить 5 постов", icon: "SAVE" },
    { id: "ach-fantasy-win", name: "Стратег", description: "Выиграть этап фэнтези", icon: "FP" },
    { id: "ach-veteran", name: "Старожил", description: "Первый сезон на PADDOCK", icon: "S1" },
  ]
  for (const a of achievements) {
    await db.run("INSERT INTO achievements (id, name, description, icon) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon", [a.id, a.name, a.description, a.icon])
  }

  const alreadySeeded = await db.get("SELECT value FROM app_meta WHERE key = ?", ["communities_seeded"])
  if (alreadySeeded) return

  const hasCommunities = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM communities"))?.c || 0
  if (hasCommunities > 0) {
    await db.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ["communities_seeded", "1"])
    return
  }

  const communities = [
    { id: "hub-news", name: "Новости", slug: "novosti", description: "Подтвержденные новости F1, FIA, команд и пилотов.", icon: "N", color: "#e10600" },
    { id: "hub-tech", name: "Техника", slug: "tehnika", description: "Аэродинамика, моторы, шины, обновления и регламент.", icon: "T", color: "#00a99d" },
    { id: "hub-races", name: "Гонки", slug: "gonki", description: "Гран-при, стратегии, live-обсуждения и разборы сессий.", icon: "R", color: "#4da6ff" },
    { id: "hub-memes", name: "Мемы", slug: "memy", description: "Легкая сторона паддока без токсичности.", icon: "M", color: "#ff8000" },
    { id: "hub-fantasy", name: "Фэнтези", slug: "fentezi", description: "Прогнозы, ставки сообщества и weekend challenges.", icon: "F", color: "#9b8af0" },
    { id: "hub-teams", name: "Команды", slug: "komandy", description: "Обсуждение Ferrari, McLaren, Red Bull, Mercedes и остальных.", icon: "C", color: "#c9a92c" },
    { id: "hub-drivers", name: "Пилоты", slug: "piloty", description: "Форма, контракты, стиль пилотажа и сравнения.", icon: "D", color: "#6692ff" },
  ]
  for (const c of communities) {
    await db.run("INSERT INTO communities (id, name, slug, description, icon, color, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING", [c.id, c.name, c.slug, c.description, c.icon, c.color, authorId, now])
    await db.run("INSERT INTO community_subscriptions (community_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [c.id, authorId])
  }

  const posts = [
    { id: "seed-post-live-center", community: "hub-races", title: "Live Race Center: что должно быть на экране во время гонки", content: "Идеальный race thread: позиции, интервалы, круги, шины, пит-стопы, race control и быстрые реакции сообщества.", tag: "Гонка" },
    { id: "seed-post-openf1", community: "hub-tech", title: "OpenF1 и Jolpica: как делим источники данных", content: "Jolpica используем для календаря, standings и результатов.", tag: "Техника" },
    { id: "seed-post-rules", community: "hub-news", title: "Правила запуска: спойлеры, источники и уважение к участникам", content: "Помечаем спойлеры, отделяем слухи от фактов, спорим без атак.", tag: "Новость" },
    { id: "seed-post-fantasy", community: "hub-fantasy", title: "Прогноз уикенда: кто заберет поул и кто удивит в гонке?", content: "Формат для фэнтези: поул, подиум, прогресс, пит-стоп, safety car.", tag: "Фэнтези" },
    { id: "seed-post-memes", community: "hub-memes", title: "Когда инженер говорит box opposite, а ты уже проехал въезд на пит-лейн", content: "Классика командного радио.", tag: "Мем" },
  ]
  for (const p of posts) {
    await db.run("INSERT INTO posts (id, user_id, title, content, tag, community_author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING", [p.id, authorId, p.title, p.content, p.tag, p.community, now])
    await db.run("INSERT INTO community_posts (community_id, post_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [p.community, p.id])
  }

  await db.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ["communities_seeded", "1"])
}

export async function seedStandings(db?: DbQuery) {
  const d = db || getDb()
  const count = await d.get<{ c: number }>("SELECT COUNT(*) as c FROM standings_drivers")
  if (count && count.c > 0) return

  await d.run("DELETE FROM standings_drivers")
  await d.run("DELETE FROM standings_constructors")
  for (const r of REAL_2026_DRIVERS) {
    await d.run("INSERT INTO standings_drivers (pos, driver, team, color, pts) VALUES (?, ?, ?, ?, ?)", [r.pos, r.driver, r.team, r.color, r.pts])
  }
  for (const r of REAL_2026_CONSTRUCTORS) {
    await d.run("INSERT INTO standings_constructors (pos, team, color, pts) VALUES (?, ?, ?, ?)", [r.pos, r.team, r.color, r.pts])
  }
}
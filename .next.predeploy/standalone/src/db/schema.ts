import { getPool } from "./pg"

export async function migratePgSchema(): Promise<void> {
  const pool = getPool()
  const c = await pool.connect()
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        team TEXT,
        driver TEXT,
        karma INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        cover TEXT,
        bio TEXT,
        display_name TEXT,
        avatar_color TEXT,
        onboarded INTEGER DEFAULT 0,
        banned INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 0,
        last_seen_at TIMESTAMPTZ,
        email_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        reset_token TEXT,
        reset_expires TIMESTAMPTZ,
        hide_team INTEGER DEFAULT 0,
        hide_driver INTEGER DEFAULT 0,
        hide_leaderboard INTEGER DEFAULT 0,
        notif_comments INTEGER DEFAULT 1,
        notif_upvotes INTEGER DEFAULT 1,
        notif_mentions INTEGER DEFAULT 1,
        notif_fantasy INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        tag TEXT,
        image TEXT,
        community_author_id TEXT,
        owner_pinned_at TIMESTAMPTZ,
        feed_pinned_at TIMESTAMPTZ,
        anonymous INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        direction INTEGER NOT NULL CHECK (direction IN (1, -1)),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comment_votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        direction INTEGER NOT NULL CHECK (direction IN (1, -1)),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, comment_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        pool TEXT DEFAULT '0',
        ends_at TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        deleted INTEGER DEFAULT 0,
        options TEXT,
        correct_answer TEXT,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_bets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        event_id TEXT NOT NULL REFERENCES fantasy_events(id) ON DELETE CASCADE,
        prediction TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_rounds (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        round INTEGER NOT NULL,
        name TEXT NOT NULL,
        circuit TEXT,
        country TEXT,
        deadline TEXT NOT NULL,
        questions TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        UNIQUE(season, round)
      );

      CREATE TABLE IF NOT EXISTS fantasy_entries (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        breakdown TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(round_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS standings_drivers (
        pos INTEGER PRIMARY KEY,
        driver TEXT NOT NULL,
        team TEXT NOT NULL,
        color TEXT NOT NULL,
        pts INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS standings_constructors (
        pos INTEGER PRIMARY KEY,
        team TEXT NOT NULL,
        color TEXT NOT NULL,
        pts INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS flairs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_flairs (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flair_id TEXT NOT NULL REFERENCES flairs(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, flair_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        comment_id TEXT,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, achievement_id)
      );

      CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        race_name TEXT NOT NULL,
        url TEXT NOT NULL,
        embed_url TEXT,
        active INTEGER DEFAULT 0,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_key INTEGER,
        content TEXT NOT NULL,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        avatar TEXT,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS community_posts (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        PRIMARY KEY (community_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS community_subscriptions (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (community_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS community_moderators (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'editor',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (community_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS community_submissions (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        image TEXT,
        tags TEXT,
        as_community INTEGER DEFAULT 1,
        anonymous INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS post_media (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        type TEXT DEFAULT 'image',
        position INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS post_tags (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        PRIMARY KEY (post_id, tag)
      );

      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_id, followed_id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
        target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'open',
        resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        resolution TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS email_codes (
        email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (email, purpose)
      );

      CREATE TABLE IF NOT EXISTS feed_signals (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, type, value)
      );

      CREATE TABLE IF NOT EXISTS feed_seen (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        seen_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        session_id TEXT,
        user_id TEXT,
        type TEXT NOT NULL,
        path TEXT,
        referrer TEXT,
        device TEXT,
        data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dm_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT DEFAULT '',
        image TEXT,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_assets (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        kind TEXT NOT NULL,
        ref TEXT NOT NULL,
        name TEXT NOT NULL,
        team TEXT,
        color TEXT,
        price REAL NOT NULL DEFAULT 0,
        price_delta REAL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        form REAL NOT NULL DEFAULT 0,
        image TEXT,
        image_credit TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(season, kind, ref)
      );

      CREATE TABLE IF NOT EXISTS fantasy_squads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        season INTEGER NOT NULL,
        name TEXT,
        budget REAL NOT NULL DEFAULT 100,
        total_points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, season)
      );

      CREATE TABLE IF NOT EXISTS fantasy_lineups (
        id TEXT PRIMARY KEY,
        squad_id TEXT NOT NULL REFERENCES fantasy_squads(id) ON DELETE CASCADE,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        picks TEXT NOT NULL,
        captain TEXT,
        chip TEXT,
        transfers INTEGER NOT NULL DEFAULT 0,
        penalty INTEGER NOT NULL DEFAULT 0,
        points INTEGER DEFAULT 0,
        breakdown TEXT,
        locked INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(squad_id, round_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_asset_scores (
        asset_id TEXT NOT NULL REFERENCES fantasy_assets(id) ON DELETE CASCADE,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0,
        breakdown TEXT,
        PRIMARY KEY (asset_id, round_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_leagues (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_league_members (
        league_id TEXT NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (league_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS f1_meetings (
        meeting_key INTEGER PRIMARY KEY,
        jolpica_season INTEGER,
        jolpica_round INTEGER,
        name TEXT,
        circuit TEXT,
        country TEXT,
        starts_at TEXT,
        source_payload TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_sessions (
        session_key INTEGER PRIMARY KEY,
        meeting_key INTEGER,
        name TEXT,
        type TEXT,
        starts_at TEXT,
        ends_at TEXT,
        status TEXT,
        source_payload TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_driver_map (
        id TEXT PRIMARY KEY,
        jolpica_driver_id TEXT,
        jolpica_code TEXT,
        openf1_driver_number INTEGER,
        full_name TEXT,
        team TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_constructor_map (
        id TEXT PRIMARY KEY,
        jolpica_constructor_id TEXT,
        openf1_team_name TEXT,
        display_name TEXT,
        color TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_live_snapshots (
        id TEXT PRIMARY KEY,
        session_key INTEGER,
        mode TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_laps (
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        lap_number INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (session_key, driver_number, lap_number)
      );

      CREATE TABLE IF NOT EXISTS f1_pit_stops (
        id TEXT PRIMARY KEY,
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        lap_number INTEGER,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_race_control (
        id TEXT PRIMARY KEY,
        session_key INTEGER NOT NULL,
        driver_number INTEGER,
        lap_number INTEGER,
        message TEXT,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_weather_samples (
        session_key INTEGER NOT NULL,
        sampled_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (session_key, sampled_at)
      );

      CREATE TABLE IF NOT EXISTS f1_telemetry_samples (
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        sampled_at TEXT NOT NULL,
        speed REAL,
        throttle REAL,
        brake REAL,
        gear INTEGER,
        rpm INTEGER,
        drs INTEGER,
        payload TEXT,
        PRIMARY KEY (session_key, driver_number, sampled_at)
      );
    `)

    // Indexes
    await c.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
      CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_active ON fantasy_events(active);
      CREATE INDEX IF NOT EXISTS idx_fantasy_rounds_season ON fantasy_rounds(season, round);
      CREATE INDEX IF NOT EXISTS idx_fantasy_entries_user ON fantasy_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_entries_round ON fantasy_entries(round_id);
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_community_subscriptions_user ON community_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_moderators_user ON community_moderators(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id);
      CREATE INDEX IF NOT EXISTS idx_community_submissions_status ON community_submissions(community_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_live_chat_session ON live_chat_messages(session_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);
      CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);
      CREATE INDEX IF NOT EXISTS idx_f1_sessions_meeting ON f1_sessions(meeting_key);
      CREATE INDEX IF NOT EXISTS idx_f1_live_session ON f1_live_snapshots(session_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_f1_telemetry_driver ON f1_telemetry_samples(session_key, driver_number, sampled_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feed_signals_user ON feed_signals(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_feed_seen_user ON feed_seen(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_dm_recipient ON dm_messages(recipient_id, read);
      CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(sender_id, recipient_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_dm_created ON dm_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_fantasy_assets_season ON fantasy_assets(season, kind);
      CREATE INDEX IF NOT EXISTS idx_fantasy_squads_season ON fantasy_squads(season, total_points DESC);
      CREATE INDEX IF NOT EXISTS idx_fantasy_lineups_round ON fantasy_lineups(round_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_asset_scores_round ON fantasy_asset_scores(round_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_league_members_user ON fantasy_league_members(user_id);
    `)

    // Full-text search via tsvector (replaces SQLite FTS5)
    await c.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS fts TSVECTOR;
      CREATE INDEX IF NOT EXISTS idx_posts_fts ON posts USING GIN(fts);
    `)

    // PostgreSQL version of posts FTS trigger
    await c.query(`
      CREATE OR REPLACE FUNCTION posts_fts_update() RETURNS TRIGGER AS $$
      BEGIN
        NEW.fts := to_tsvector('russian', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS posts_fts_trigger ON posts;
      CREATE TRIGGER posts_fts_trigger
        BEFORE INSERT OR UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION posts_fts_update();
    `)

    console.log("[pg] Schema migration complete")
  } finally {
    c.release()
  }
}
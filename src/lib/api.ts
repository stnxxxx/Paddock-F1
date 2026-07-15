const BASE = "/api"

export interface ApiUser {
  id: string
  username: string
  display_name: string | null
  email: string
  team: string | null
  driver: string | null
  karma: number
  role: string
  avatar: string | null
  cover: string | null
  bio: string | null
  onboarded?: number
  flairs: ApiFlair[]
}

export interface ApiFlair {
  id: string
  name: string
  icon: string
  color: string
}

export interface ApiUserProfile {
  id: string
  username: string
  display_name: string | null
  team: string | null
  driver: string | null
  avatar: string | null
  cover: string | null
  bio: string | null
  karma: number
  flairs: ApiFlair[]
  achievements: { id: string; name: string; description: string; icon: string; target: number; current: number; earned: boolean }[]
  created_at: string
  post_count: number
  comment_count: number
  upvotes_received: number
  downvotes_received?: number
  post_upvotes_received?: number
  post_downvotes_received?: number
  comment_upvotes_received?: number
  comment_downvotes_received?: number
  fantasy_points?: number
  fantasy_bets?: number
  fantasy_hits?: number
  followers_count: number
  following_count: number
  is_following?: number
  is_followed_by?: number
  is_muted?: number
}

export interface ApiPostSource {
  publisher: string
  url: string
  published_at: string | null
  kind: string
}

export interface ApiPost {
  id: string
  user_id: string
  title: string
  content: string
  tag: string | null
  tags?: string[]
  image?: string | null
  sources?: ApiPostSource[]
  created_at: string
  updated_at: string
  username: string
  display_name?: string | null
  team: string | null
  driver: string | null
  avatar: string | null
  author_type?: "user" | "public"
  anonymous?: number
  public_slug?: string | null
  public_icon?: string | null
  public_color?: string | null
  public_avatar?: string | null
  operator_username?: string | null
  upvotes: number
  downvotes: number
  comment_count: number
  user_vote?: number | null
  bookmarked?: number
  owner_pinned_at?: string | null
  feed_pinned_at?: string | null
}

export interface ApiSuggestedUser {
  id: string
  username: string
  display_name: string | null
  team: string | null
  avatar: string | null
  karma: number
  followers_count: number
}

export interface ApiComment {
  id: string
  user_id: string
  post_id: string
  parent_id: string | null
  content: string
  created_at: string
  username: string
  display_name?: string | null
  team: string | null
  driver: string | null
  avatar: string | null
  upvotes: number
  downvotes: number
  user_vote?: number | null
}

export interface ApiStandingEntry {
  pos: number; driver?: string; surname?: string; team: string; color: string; pts: number
}

export interface ApiLastRace {
  raceName: string; round: string; date: string
  results: { position: string; driverCode: string; driverName: string; constructorName: string; status: string; time?: string }[]
}

export interface ApiNextRace {
  name: string; circuit: string; country: string; date: string; round: string
}

export interface ApiStandings {
  drivers: ApiStandingEntry[]
  constructors: ApiStandingEntry[]
  season: string
  round: number
  totalRaces: number
  races: { round: string; name: string; circuit: string; country: string; date: string }[]
  lastRace: ApiLastRace | null
  nextRace: ApiNextRace | null
}

export interface ApiStatsSeason {
  season: { season: number; races: { round: number; name: string; circuit: string; country: string; date: string }[] }
  drivers: { season: string; round: string; standings: { pos: number; driverCode: string; driverName: string; team: string; color: string; pts: number; wins: number }[] }
  constructors: { season: string; round: string; standings: { pos: number; team: string; color: string; pts: number; wins: number }[] }
}

export interface ApiDriverStats {
  driverId: string
  seasons: number[]
  results: {
    season: number; driverId: string
    races: { round: number; raceName: string; circuit: string; date: string; position: string; grid: string; points: string; status: string; constructorName: string }[]
  } | null
}

export interface ApiTeamStats {
  constructorId: string
  seasons: number[]
  results: {
    season: number; constructorId: string
    races: { round: number; raceName: string; circuit: string; date: string; results: { position: string; driverCode: string; driverName: string; points: string; status: string }[] }[]
  } | null
}

export type FantasyQKey = "winner" | "podium" | "pole" | "fastest_lap" | "dnf"

export interface ApiFantasyDriver { code: string; surname?: string; name: string; team: string; color: string; image: string | null }

export interface ApiFantasyCurrent {
  id: string; season: number; round: number; name: string; circuit: string | null; country: string | null
  deadline: string; questions: FantasyQKey[]; locked: boolean
  myAnswers: Record<string, string | string[]> | null; entryCount: number
}

export interface ApiFantasyRecent {
  id: string; round: number; name: string; circuit: string | null; questions: FantasyQKey[]
  myPoints: number | null
  myBreakdown: Record<string, { points: number; answer: unknown; correct: unknown }> | null
  entryCount: number; topScore: number
}

export interface ApiFantasy {
  current: ApiFantasyCurrent | null
  recent: ApiFantasyRecent[]
  drivers: ApiFantasyDriver[]
}

// ── team mode (salary-cap) ──
export interface ApiFantasyAsset {
  id: string
  kind: "driver" | "constructor"
  ref: string
  name: string
  team: string | null
  color: string | null
  price: number
  price_delta: number
  points: number
  form: number
  image: string | null
  image_credit?: string | null
}
export interface ApiFantasyRules {
  budget: number; drivers: number; constructors: number
  captainMultiplier: number; freeTransfers: number; transferPenalty: number
}
export interface ApiFantasySquad { id: string; name: string | null; budget: number; totalPoints: number }
export interface ApiFantasyLineup {
  drivers: string[]; constructors: string[]; captain: string | null
  transfers: number; penalty: number; points: number | null
  breakdown: Record<string, number> | null; locked: boolean
}
export interface ApiFantasyLeaderRow {
  id: string; name: string | null; points: number
  username: string; display_name: string | null; team: string | null
}
export interface ApiFantasyTeamRound {
  id: string; round: number; name: string; circuit: string | null; country: string | null; deadline: string; locked: boolean
}
export interface ApiFantasyTeam {
  season: number
  round: ApiFantasyTeamRound | null
  rules: ApiFantasyRules
  assets: ApiFantasyAsset[]
  squad: ApiFantasySquad | null
  lineup: ApiFantasyLineup | null
  carryPicks: { drivers: string[]; constructors: string[]; captain: string | null } | null
  leaderboard: ApiFantasyLeaderRow[]
}
export interface ApiFantasyLeagueStanding { username: string; display_name: string | null; team: string | null; points: number; squad_name: string | null }
export interface ApiFantasyLeague { id: string; name: string; code: string; members: number; isOwner: boolean; standings?: ApiFantasyLeagueStanding[] }

export interface ApiLeaderRow { id: string; username: string; team: string | null; points: number; meta?: number | string }
export interface ApiLeaderboard {
  users: ApiLeaderRow[]
  total: number
  me: { rank: number; points: number } | null
  meta: { scope: string; season?: number; round?: number; roundName?: string }
}

export interface ApiCommunity {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  avatar?: string | null
  created_by?: string
  creator_username?: string
  post_count: number
  subscriber_count?: number
  is_subscribed?: number
  my_role?: "owner" | "editor" | null
}

export interface ApiCommunityEditor {
  id: string
  username: string
  team: string | null
  driver: string | null
  avatar: string | null
  public_role: "owner" | "editor"
  created_at?: string
}

export interface ApiSubmission {
  id: string
  title: string
  content: string
  image: string | null
  tags: string | null
  as_community: number
  created_at: string
  author_id: string
  author_username: string
  author_team: string | null
  author_driver: string | null
  author_avatar: string | null
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Ошибка запроса")
  return data
}

export interface ApiDmMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  image: string | null
  read: number
  created_at: string
}

export interface ApiConversation {
  id: string
  username: string
  display_name: string | null
  team: string | null
  avatar: string | null
  last_content: string
  last_image: string | null
  last_at: string
  last_sender: string
  unread: number
}

export interface ApiDmPeer {
  id: string
  username: string
  display_name: string | null
  team: string | null
  driver: string | null
  avatar: string | null
}

export const api = {
  login: (email: string, password: string) =>
    fetchApi<{ user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string, code: string) =>
    fetchApi<{ user: ApiUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, code }),
    }),

  requestCode: (email: string, purpose: "register" | "login" | "reset") =>
    fetchApi<{ ok: boolean; dev_code?: string }>("/auth/code", {
      method: "POST",
      body: JSON.stringify({ email, purpose }),
    }),

  loginWithCode: (email: string, code: string) =>
    fetchApi<{ user: ApiUser }>("/auth/login/code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  resetPassword: (email: string, code: string, password: string) =>
    fetchApi<{ ok: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    }),

  logout: () => fetchApi<{ ok: boolean }>("/auth/me", { method: "POST" }),

  me: () => fetchApi<{ user: ApiUser }>("/auth/me"),

  updateTeam: (team: string | null) =>
    fetchApi<{ user: ApiUser }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ team }),
    }),

  updateDriver: (driver: string | null) =>
    fetchApi<{ user: ApiUser }>("/auth/me/driver", {
      method: "PATCH",
      body: JSON.stringify({ driver }),
    }),

  getFlairs: () =>
    fetchApi<{ flairs: ApiFlair[] }>("/flairs"),

  updateFlairs: (flairIds: string[]) =>
    fetchApi<{ user: ApiUser }>("/auth/me/flairs", {
      method: "PATCH",
      body: JSON.stringify({ flairIds }),
    }),

  getUserProfile: (username: string) =>
    fetchApi<{ profile: ApiUserProfile; posts: ApiPost[] }>(`/user/${username}`),

  getPosts: (page = 1, sort?: string, tag?: string, q?: string, community?: string, feed?: string, team?: string, since?: string) => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    if (sort) params.set("sort", sort)
    if (tag) params.set("tag", tag)
    if (q) params.set("q", q)
    if (community) params.set("community", community)
    if (feed) params.set("feed", feed)
    if (team) params.set("team", team)
    if (since) params.set("since", since)
    return fetchApi<{ posts: ApiPost[]; total: number; page: number; limit: number; new_since?: number }>(`/posts?${params}`)
  },

  getNewCount: (since: string) =>
    fetchApi<{ new_since?: number }>(`/posts?limit=1&since=${encodeURIComponent(since)}`),

  feedSignal: (type: "mute_author" | "mute_tag" | "boost_tag", value: string, remove = false) =>
    fetchApi<{ ok: boolean }>("/feed/signal", { method: "POST", body: JSON.stringify({ type, value, remove }) }),

  markSeen: (ids: string[]) =>
    fetchApi<{ ok: boolean }>("/feed/seen", { method: "POST", body: JSON.stringify({ ids }) }),

  getRecommendedUsers: () =>
    fetchApi<{ users: ApiSuggestedUser[] }>("/recommendations/users"),

  getRecommendedCommunities: () =>
    fetchApi<{ communities: ApiCommunity[] }>("/recommendations/communities"),

  toggleFollow: (userId: string) =>
    fetchApi<{ following: boolean }>("/follow", { method: "POST", body: JSON.stringify({ userId }) }),

  getConversations: () =>
    fetchApi<{ conversations: ApiConversation[]; unread: number }>("/messages"),

  getDmUnread: () =>
    fetchApi<{ unread: number }>("/messages?count=1"),

  getThread: (peerId: string) =>
    fetchApi<{ peer: ApiDmPeer; messages: ApiDmMessage[]; canMessage: boolean }>(`/messages/${peerId}`),

  sendDm: (recipientId: string, data: { content?: string; image?: string }) =>
    fetchApi<{ message: ApiDmMessage }>("/messages", { method: "POST", body: JSON.stringify({ recipientId, ...data }) }),

  completeOnboarding: (data: { team?: string | null; driver?: string | null; tags?: string[] }) =>
    fetchApi<{ user: ApiUser }>("/onboarding", { method: "POST", body: JSON.stringify(data) }),

  getFeedWeights: () =>
    fetchApi<{ weights: Record<string, number> }>("/admin/feed-weights"),

  saveFeedWeights: (weights: Record<string, number>) =>
    fetchApi<{ weights: Record<string, number> }>("/admin/feed-weights", { method: "POST", body: JSON.stringify({ weights }) }),

  getPost: (id: string) =>
    fetchApi<{ post: ApiPost; comments: ApiComment[] }>(`/posts/${id}`),

  createPost: (data: { title: string; content?: string; tag?: string; tags?: string[]; image?: string }) =>
    fetchApi<{ post: ApiPost }>("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  pinPost: (id: string, scope: "profile" | "feed") =>
    fetchApi<{ owner_pinned?: boolean; feed_pinned?: boolean }>(`/posts/${id}/pin`, {
      method: "POST",
      body: JSON.stringify({ scope }),
    }),

  getCommunities: () =>
    fetchApi<{ communities: ApiCommunity[] }>("/communities"),

  getCommunity: (slug: string) =>
    fetchApi<{ community: ApiCommunity; editors: ApiCommunityEditor[]; pendingCount: number }>(`/communities/${slug}`),

  createCommunity: (data: { name: string; description?: string; icon?: string; color?: string; avatar?: string }) =>
    fetchApi<{ community: ApiCommunity }>("/communities", { method: "POST", body: JSON.stringify(data) }),

  updateCommunity: (slug: string, data: { avatar?: string | null; description?: string; icon?: string; color?: string }) =>
    fetchApi<{ community: ApiCommunity }>(`/communities/${slug}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteCommunity: (slug: string) =>
    fetchApi<{ ok: boolean }>(`/communities/${slug}`, { method: "DELETE" }),

  toggleCommunitySubscription: (slug: string) =>
    fetchApi<{ subscribed: boolean; subscriber_count: number }>(`/communities/${slug}/subscribe`, { method: "POST" }),

  getCommunityEditors: (slug: string) =>
    fetchApi<{ owner: ApiCommunityEditor; editors: ApiCommunityEditor[] }>(`/communities/${slug}/moderators`),

  addCommunityEditor: (slug: string, username: string) =>
    fetchApi<{ editor: ApiCommunityEditor }>(`/communities/${slug}/moderators`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  removeCommunityEditor: (slug: string, userId: string) =>
    fetchApi<{ ok: boolean }>(`/communities/${slug}/moderators`, {
      method: "DELETE",
      body: JSON.stringify({ userId }),
    }),

  getSubmissions: (slug: string) =>
    fetchApi<{ submissions: ApiSubmission[] }>(`/communities/${slug}/submissions`),

  submitToCommunity: (slug: string, data: { title: string; content?: string; image?: string; tags?: string[]; asCommunity?: boolean; anonymous?: boolean }) =>
    fetchApi<{ status: "published" | "queued"; postId?: string }>(`/communities/${slug}/submissions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  moderateSubmission: (slug: string, id: string, action: "approve" | "reject") =>
    fetchApi<{ ok: boolean; status: string; postId?: string }>(`/communities/${slug}/submissions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  vote: (postId: string, direction: 1 | -1) =>
    fetchApi<{ upvotes: number; downvotes: number; user_vote: number | null }>(
      `/posts/${postId}/vote`,
      { method: "POST", body: JSON.stringify({ direction }) }
    ),

  addComment: (postId: string, content: string, parentId?: string) =>
    fetchApi<{ comment: ApiComment }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parent_id: parentId || null }),
    }),

  voteComment: (commentId: string, direction: 1 | -1) =>
    fetchApi<{ upvotes: number; downvotes: number; user_vote: number | null }>(
      `/comments/${commentId}/vote`,
      { method: "POST", body: JSON.stringify({ direction }) }
    ),

  getStandings: () =>
    fetchApi<ApiStandings>("/standings"),

  getSeasonStats: (year: number) =>
    fetchApi<ApiStatsSeason>(`/stats/season/${year}`),

  getDriverStats: (driverId: string, year?: number) => {
    const params = year ? `?year=${year}` : ""
    return fetchApi<ApiDriverStats>(`/stats/driver/${driverId}${params}`)
  },

  getTeamStats: (constructorId: string, year?: number) => {
    const params = year ? `?year=${year}` : ""
    return fetchApi<ApiTeamStats>(`/stats/team/${constructorId}${params}`)
  },

  getChampions: () =>
    fetchApi<{ driverChampions: any[]; constructorChampions: any[] }>("/stats/champions"),

  getNotifications: () =>
    fetchApi<{ notifications: any[]; unread: number }>("/notifications"),

  markNotificationsRead: () =>
    fetchApi<{ ok: boolean }>("/notifications", { method: "POST" }),

  markNotificationRead: (id: string) =>
    fetchApi<{ ok: boolean }>("/notifications", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    }),

  toggleBookmark: (postId: string) =>
    fetchApi<{ bookmarked: boolean }>("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ postId }),
    }),

  getBookmarks: () =>
    fetchApi<{ posts: ApiPost[] }>("/bookmarks"),

  getFantasy: () =>
    fetchApi<ApiFantasy>("/fantasy"),

  submitFantasy: (roundId: string, answers: Record<string, string | string[]>) =>
    fetchApi<{ ok: boolean; answers: Record<string, string | string[]> }>("/fantasy", {
      method: "POST",
      body: JSON.stringify({ roundId, answers }),
    }),

  getFantasyTeam: () =>
    fetchApi<ApiFantasyTeam>("/fantasy/team"),

  saveFantasyTeam: (payload: { drivers: string[]; constructors: string[]; captain: string; name?: string }) =>
    fetchApi<{ ok: boolean; squad: ApiFantasySquad; lineup: { drivers: string[]; constructors: string[]; captain: string; transfers: number; penalty: number; cost: number } }>("/fantasy/team", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFantasyLeagues: () =>
    fetchApi<{ leagues: ApiFantasyLeague[] }>("/fantasy/leagues"),

  createFantasyLeague: (name: string) =>
    fetchApi<{ ok: boolean; league: ApiFantasyLeague }>("/fantasy/leagues", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  joinFantasyLeague: (code: string) =>
    fetchApi<{ ok: boolean; league: ApiFantasyLeague }>("/fantasy/leagues/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  deleteFantasyLeague: (id: string) =>
    fetchApi<{ ok: boolean }>(`/fantasy/leagues?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  getLeaderboard: (scope: "season" | "round" | "karma") =>
    fetchApi<ApiLeaderboard>(`/leaderboard?scope=${scope}`),
}

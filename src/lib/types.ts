export interface UserRow {
  id: string
  username: string
  email: string
  password_hash: string
  team: string | null
  driver: string | null
  karma: number
  created_at: string
}

export interface PostRow {
  id: string
  user_id: string
  title: string
  content: string
  tag: string | null
  created_at: string
  updated_at: string
  username?: string
  team?: string | null
  driver?: string | null
  upvotes?: number
  downvotes?: number
  comment_count?: number
  user_vote?: number | null
}

export interface CommentRow {
  id: string
  user_id: string
  post_id: string
  parent_id: string | null
  content: string
  created_at: string
  username?: string
  team?: string | null
  driver?: string | null
}

export interface FlairRow {
  id: string
  name: string
  icon: string
  color: string
}

export interface FantasyEventRow {
  id: string
  title: string
  pool: string
  ends_at: string
  active: number
  created_by: string
  created_at: string
  bet_count?: number
}

export interface FantasyBetRow {
  id: string
  user_id: string
  event_id: string
  prediction: string
  created_at: string
  username?: string
}

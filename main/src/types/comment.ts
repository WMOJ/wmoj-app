export interface Comment {
  id: string;
  problem_id: string;
  user_id: string;
  body: string;
  score: number;
  created_at: string;
  updated_at: string;
  username: string;
  avatar_url: string;
}

export interface CommentVote {
  id: string;
  comment_id: string;
  user_id: string;
  value: -1 | 1;
}

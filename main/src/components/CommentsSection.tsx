'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Comment } from '@/types/comment';

interface CommentsSectionProps {
  problemId: string;
  initialComments: Comment[];
}

function formatCommentDate(isoString: string): string {
  const d = new Date(isoString);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
}

export default function CommentsSection({ problemId, initialComments }: CommentsSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [newCommentBody, setNewCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || comments.length === 0) return;
    const commentIds = comments.map(c => c.id);
    supabase
      .from('comment_votes')
      .select('comment_id, value')
      .eq('user_id', user.id)
      .in('comment_id', commentIds)
      .then(({ data }) => {
        if (data) {
          const votes = new Map<string, number>();
          data.forEach(v => votes.set(v.comment_id, v.value));
          setUserVotes(votes);
        }
      });
  }, [user, comments.length]);

  async function handleVote(commentId: string, direction: 1 | -1) {
    if (!user) { setShowAuthPrompt(true); return; }
    if (pendingVotes.has(commentId)) return;
    setPendingVotes(prev => new Set(prev).add(commentId));

    const currentVote = userVotes.get(commentId);

    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      let scoreDelta = 0;
      if (currentVote === direction) {
        scoreDelta = -direction;
      } else if (currentVote) {
        scoreDelta = direction * 2;
      } else {
        scoreDelta = direction;
      }
      return { ...c, score: c.score + scoreDelta };
    }));

    setUserVotes(prev => {
      const next = new Map(prev);
      if (currentVote === direction) {
        next.delete(commentId);
      } else {
        next.set(commentId, direction);
      }
      return next;
    });

    try {
      let dbError = null;
      if (currentVote === direction) {
        const { error } = await supabase.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', user.id);
        dbError = error;
      } else if (currentVote) {
        const { error } = await supabase.from('comment_votes').update({ value: direction }).eq('comment_id', commentId).eq('user_id', user.id);
        dbError = error;
      } else {
        const { error } = await supabase.from('comment_votes').insert({ comment_id: commentId, user_id: user.id, value: direction });
        dbError = error;
      }

      if (dbError) {
        // Revert score
        setComments(prev => prev.map(c => {
          if (c.id !== commentId) return c;
          let scoreDelta = 0;
          if (currentVote === direction) {
            scoreDelta = direction;
          } else if (currentVote) {
            scoreDelta = -(direction * 2);
          } else {
            scoreDelta = -direction;
          }
          return { ...c, score: c.score + scoreDelta };
        }));
        // Revert vote state
        setUserVotes(prev => {
          const next = new Map(prev);
          if (currentVote) {
            next.set(commentId, currentVote);
          } else {
            next.delete(commentId);
          }
          return next;
        });
      }
    } finally {
      setPendingVotes(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setShowAuthPrompt(true); return; }
    if (!newCommentBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({ problem_id: problemId, user_id: user.id, body: newCommentBody.trim() })
      .select('id, problem_id, user_id, body, score, created_at, updated_at')
      .single();

    if (data && !error) {
      const newComment: Comment = {
        ...data,
        username: profile?.username || 'Unknown',
        avatar_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar`,
      };
      setComments(prev => [...prev, newComment]);
      setNewCommentBody('');
    }
    setIsSubmitting(false);
  }

  return (
    <>
      <div className="glass-panel overflow-hidden mt-6">
        {/* Header */}
        <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center gap-2">
          <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-foreground">Comments</h2>
        </div>

        <div className="p-4">
          {/* Comment form */}
          <form onSubmit={handleSubmitComment} className="mb-4">
            <textarea
              value={newCommentBody}
              onChange={e => setNewCommentBody(e.target.value)}
              onFocus={() => { if (!user) setShowAuthPrompt(true); }}
              placeholder="Leave a comment..."
              className="w-full bg-surface-2 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-text-muted resize-y min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={() => { if (!user) setShowAuthPrompt(true); }}
                className="bg-brand-primary text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-secondary transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Comment'}
              </button>
            </div>
          </form>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div>
              {comments.map(comment => {
                const voteValue = userVotes.get(comment.id);
                return (
                  <div key={comment.id} className="flex gap-3 py-4 border-b border-border last:border-b-0">
                    {/* Vote buttons */}
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <button
                        onClick={() => handleVote(comment.id, 1)}
                        className={`transition-colors ${voteValue === 1 ? 'text-brand-primary' : 'text-text-muted hover:text-brand-primary'}`}
                        aria-label="Upvote"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4l-8 8h16z" />
                        </svg>
                      </button>
                      <span className="text-xs font-mono font-medium text-foreground">{comment.score}</span>
                      <button
                        onClick={() => handleVote(comment.id, -1)}
                        className={`transition-colors ${voteValue === -1 ? 'text-error' : 'text-text-muted hover:text-error'}`}
                        aria-label="Downvote"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 20l-8-8h16z" />
                        </svg>
                      </button>
                    </div>

                    {/* Avatar */}
                    <Link href={`/users/${comment.username}`} className="flex-shrink-0">
                      {avatarErrors.has(comment.id) ? (
                        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.username.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <img
                          src={comment.avatar_url}
                          alt={comment.username}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          onError={() => setAvatarErrors(prev => new Set(prev).add(comment.id))}
                        />
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Link href={`/users/${comment.username}`} className="font-semibold text-brand-primary hover:underline">
                          {comment.username}
                        </Link>
                        <span className="text-text-muted">commented on {formatCommentDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAuthPrompt && (
        <AuthPromptModal
          message="You must be logged in to interact with comments."
          onClose={() => setShowAuthPrompt(false)}
        />
      )}
    </>
  );
}

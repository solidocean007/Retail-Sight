# Comment Replies Rollout

## Feature

- Branch: `feature/comment-replies`
- Base: latest fetched `origin/main` at `d6c988b`
- Replies use the existing top-level `comments` collection.
- Existing comments need no migration and continue to render as top-level comments.

## Comment schema extension

Reply documents add optional fields:

- `parentCommentId`: the comment directly selected with Reply
- `rootCommentId`: the top-level thread id
- `replyToUserId`
- `replyToUserName`

The modal intentionally renders one visual nesting level. A reply to a reply
stays in the root thread and shows who it addresses, avoiding deeply indented
mobile threads.

## Notifications

- New activity event: `post.commentReply`
- The direct parent author receives “replied to your comment.”
- When another participant replies, the post owner also receives the existing
  “commented on your post” event unless that would duplicate the reply event.
- Reply notifications use the existing comment email preference.
- Deploy Functions before Hosting so `post.commentReply` is recognized before
  the UI can emit it.

## Firestore integrity

No rules change is required for this compatible schema extension. The write is
now a batch that creates the comment with its id and increments
`posts.commentCount` atomically.

Important existing rule debt: the authenticated catch-all at the bottom of
`firestore.rules` still overrides the narrower `comments`,
`activityEvents`, and `posts` rules. Removing that catch-all requires a
separate compatibility audit because:

- legacy clients create a comment and then update `commentId`;
- cross-company commenters increment a post they do not own;
- admin comment deletion references `comment.companyId`, which legacy
  comments do not contain.

Do not exclude `comments` or `posts` from the catch-all as part of this
same-day feature release without resolving and testing those paths.

## Review and release checklist

- Open `http://127.0.0.1:5174/__dev/comment-replies` in development.
- Review desktop and mobile widths, light/dark themes, reply-to-reply, delete,
  like, close, and reopen behavior.
- Test one real comment reply with two test users after UI approval.
- Confirm in-app deep link focuses the new reply.
- Confirm reply email respects `emailComments: false`.
- Deploy Functions, then Hosting.
- Smoke test production and watch function logs for unhandled activity types.

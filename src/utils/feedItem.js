import { proseMirrorToText } from "./proseMirror.js";

function summarizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    photo_url: user.photo_url ?? null,
  };
}

export function summarizeComment(comment) {
  if (!comment) return null;
  return {
    id: comment.id,
    user_id: comment.user_id,
    author_name: comment.name ?? null,
    body: comment.body ?? proseMirrorToText(comment.body_json),
    date: comment.date ?? null,
    type: comment.type ?? null,
    post_id: comment.post_id ?? null,
    publication_id: comment.publication_id ?? null,
    ancestor_path: comment.ancestor_path ?? "",
    reply_count: comment.children_count ?? comment.reply_count ?? null,
    reaction_count: comment.reaction_count ?? null,
    restack_count: comment.restack_count ?? null,
    url: comment.id ? `https://substack.com/@me/note/c-${comment.id}` : null,
  };
}

function summarizePost(post, publication) {
  if (!post) return null;
  const subdomain = publication?.subdomain;
  return {
    id: post.id,
    title: post.title ?? null,
    subtitle: post.subtitle ?? null,
    slug: post.slug ?? null,
    published_at: post.post_date ?? post.published_at ?? null,
    publication: publication ? { id: publication.id, name: publication.name, subdomain } : null,
    url: subdomain && post.slug ? `https://${subdomain}.substack.com/p/${post.slug}` : post.canonical_url ?? null,
    reaction_count: post.reaction_count ?? null,
    comment_count: post.comment_count ?? null,
    restack_count: post.restack_count ?? null,
  };
}

export function summarizeFeedItem(item) {
  if (!item) return null;

  const context = item.context ?? {};
  const users = (context.users ?? []).map(summarizeUser).filter(Boolean);

  return {
    entity_key: item.entity_key,
    type: item.type,
    context_type: context.type ?? null,
    context_bucket: context.typeBucket ?? null,
    timestamp: context.timestamp ?? null,
    authors: users,
    comment: summarizeComment(item.comment),
    post: summarizePost(item.post, item.publication),
    publication: item.publication
      ? { id: item.publication.id, name: item.publication.name, subdomain: item.publication.subdomain }
      : null,
    parent_comments: (item.parentComments ?? []).map(summarizeComment).filter(Boolean),
    can_reply: item.canReply ?? null,
  };
}

export function summarizeFeedResponse(data, { limit } = {}) {
  const items = (data.items ?? []).map(summarizeFeedItem).filter(Boolean);
  const page = limit ? items.slice(0, limit) : items;
  return {
    items: page,
    next_cursor: data.nextCursor ?? null,
    count: page.length,
  };
}

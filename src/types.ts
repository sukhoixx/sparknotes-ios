export interface Post {
  id: number;
  title: string;
  snippet: string;
  body: string;
  funFact: string;
  tags: string[];
  category: string;
  emoji: string;
  gradient: string;
  badge: string;
  authorEmoji: string;
  authorBg: string;
  sourceUrl: string | null;
  imageUrl?: string | null;
  likes: number;
  createdAt: string;
  categoryEmojis?: string;
  _count: { comments: number };
  zhTitle?: string | null;
  zhSnippet?: string | null;
  zhBody?: string | null;
  zhFunFact?: string | null;
}

export interface UserProfile {
  screenName: string;
  categories: string[];
  lang?: string | null;
}

export interface Comment {
  id: number;
  text: string;
  screenName: string;
  createdAt: string;
}

export interface PageData {
  posts: Post[];
  nextCursor: string | null;
}

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
  likes: number;
  createdAt: string;
  _count: { comments: number };
}

export interface UserProfile {
  screenName: string;
  categories: string[];
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

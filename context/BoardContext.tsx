import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";

/** 旧バージョン（全件がタイムライン扱いだった） */
const STORAGE_LEGACY_POSTS = "aibou.board.posts.v1";
const STORAGE_TIMELINE = "aibou.board.timeline.v1";
const STORAGE_INBOX = "aibou.board.inbox.v1";
const STORAGE_TAG = "aibou.board.userTag.v1";
const STORAGE_LIKES = "aibou.board.timelineLikes.v1";

/** postId -> いいねしたユーザーの識別子（userTag など・1人1回） */
export type TimelineLikesMap = Record<string, string[]>;

export type BoardPostKind = "good" | "improve";

export type BoardPost = {
  id: string;
  authorLabel: string;
  body: string;
  kind: BoardPostKind;
  createdAt: string;
  isDeveloper?: boolean;
  /** 受信箱から運営がピックアップして載せた投稿 */
  curatedFromInboxId?: string;
};

export type InboxMessage = {
  id: string;
  authorLabel: string;
  body: string;
  kind: BoardPostKind;
  createdAt: string;
  /** タイムラインに掲載済み */
  timelinePostId?: string;
};

type BoardContextValue = {
  timelinePosts: BoardPost[];
  inboxMessages: InboxMessage[];
  userTag: string | null;
  timelineLikes: TimelineLikesMap;
  submitToInbox: (body: string, kind: BoardPostKind, authorLabel: string) => void;
  promoteInboxToTimeline: (inboxId: string) => void;
  toggleTimelineLike: (postId: string, likerId: string) => void;
  getTimelineLikeCount: (postId: string) => number;
  hasTimelineLiked: (postId: string, likerId: string) => boolean;
  ready: boolean;
};

const BoardContext = createContext<BoardContextValue | undefined>(undefined);

function normalizeKind(k: string | undefined): BoardPostKind {
  if (k === "good") return "good";
  return "improve";
}

function normalizePost<T extends { kind?: string }>(p: T): T & { kind: BoardPostKind } {
  return { ...p, kind: normalizeKind(p.kind) };
}

function randomTag(): string {
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [timelinePosts, setTimelinePosts] = useState<BoardPost[]>([]);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [userTag, setUserTag] = useState<string | null>(null);
  const [timelineLikes, setTimelineLikes] = useState<TimelineLikesMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawTimeline, rawInbox, rawLegacy, rawTag, rawLikes] = await Promise.all([
        simpleStorageGet(STORAGE_TIMELINE),
        simpleStorageGet(STORAGE_INBOX),
        simpleStorageGet(STORAGE_LEGACY_POSTS),
        simpleStorageGet(STORAGE_TAG),
        simpleStorageGet(STORAGE_LIKES),
      ]);
      if (cancelled) return;

      let timeline: BoardPost[] = [];
      if (rawTimeline) {
        try {
          const parsed = JSON.parse(rawTimeline) as BoardPost[];
          if (Array.isArray(parsed)) timeline = parsed.map((p) => normalizePost(p));
        } catch {
          timeline = [];
        }
      } else if (rawLegacy) {
        try {
          const parsed = JSON.parse(rawLegacy) as BoardPost[];
          if (Array.isArray(parsed)) {
            timeline = parsed.map((p) =>
              normalizePost({
                ...p,
                curatedFromInboxId: p.curatedFromInboxId,
              })
            );
            await simpleStorageSet(STORAGE_TIMELINE, JSON.stringify(timeline));
          }
        } catch {
          timeline = [];
        }
      }

      let inbox: InboxMessage[] = [];
      if (rawInbox) {
        try {
          const parsed = JSON.parse(rawInbox) as InboxMessage[];
          if (Array.isArray(parsed)) inbox = parsed.map((m) => normalizePost(m));
        } catch {
          inbox = [];
        }
      }

      let tag = rawTag;
      if (!tag) {
        tag = randomTag();
        await simpleStorageSet(STORAGE_TAG, tag);
      }

      let likes: TimelineLikesMap = {};
      if (rawLikes) {
        try {
          const parsed = JSON.parse(rawLikes) as TimelineLikesMap;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) likes = parsed;
        } catch {
          likes = {};
        }
      }

      setTimelinePosts(timeline);
      setInboxMessages(inbox);
      setUserTag(tag);
      setTimelineLikes(likes);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitToInbox = useCallback(
    (body: string, kind: BoardPostKind, authorLabel: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      setInboxMessages((prev) => {
        const id = `in-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const msg: InboxMessage = {
          id,
          authorLabel,
          body: trimmed,
          kind,
          createdAt: new Date().toISOString(),
        };
        const merged = [msg, ...prev];
        void simpleStorageSet(STORAGE_INBOX, JSON.stringify(merged));
        return merged;
      });
    },
    []
  );

  const promoteInboxToTimeline = useCallback((inboxId: string) => {
    setInboxMessages((prevInbox) => {
      const msg = prevInbox.find((m) => m.id === inboxId);
      if (!msg || msg.timelinePostId) return prevInbox;

      const postId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const post: BoardPost = {
        id: postId,
        authorLabel: msg.authorLabel,
        body: msg.body,
        kind: msg.kind,
        createdAt: new Date().toISOString(),
        curatedFromInboxId: msg.id,
      };

      setTimelinePosts((prevTl) => {
        const merged = [post, ...prevTl];
        void simpleStorageSet(STORAGE_TIMELINE, JSON.stringify(merged));
        return merged;
      });

      const mergedInbox = prevInbox.map((m) =>
        m.id === inboxId ? { ...m, timelinePostId: postId } : m
      );
      void simpleStorageSet(STORAGE_INBOX, JSON.stringify(mergedInbox));
      return mergedInbox;
    });
  }, []);

  const toggleTimelineLike = useCallback((postId: string, likerId: string) => {
    if (!likerId.trim()) return;
    setTimelineLikes((prev) => {
      const cur = [...(prev[postId] ?? [])];
      const idx = cur.indexOf(likerId);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(likerId);
      const next = { ...prev, [postId]: cur };
      void simpleStorageSet(STORAGE_LIKES, JSON.stringify(next));
      return next;
    });
  }, []);

  const getTimelineLikeCount = useCallback(
    (postId: string) => timelineLikes[postId]?.length ?? 0,
    [timelineLikes]
  );

  const hasTimelineLiked = useCallback(
    (postId: string, likerId: string) =>
      likerId ? (timelineLikes[postId] ?? []).includes(likerId) : false,
    [timelineLikes]
  );

  const value = useMemo(
    () => ({
      timelinePosts,
      inboxMessages,
      userTag,
      timelineLikes,
      submitToInbox,
      promoteInboxToTimeline,
      toggleTimelineLike,
      getTimelineLikeCount,
      hasTimelineLiked,
      ready,
    }),
    [
      timelinePosts,
      inboxMessages,
      userTag,
      timelineLikes,
      submitToInbox,
      promoteInboxToTimeline,
      toggleTimelineLike,
      getTimelineLikeCount,
      hasTimelineLiked,
      ready,
    ]
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}

import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Heart } from "lucide-react-native";
import { BACKGROUND } from "@/constants/theme";
import { useProfile } from "@/context/ProfileContext";
import { useBoard, BoardPostKind, type BoardPost, type InboxMessage } from "@/context/BoardContext";
import { AibouMascot } from "@/components/AibouMascot";

const KIND_LABEL: Record<BoardPostKind, string> = {
  good: "満足している点",
  improve: "改善してほしい点",
};

const KIND_COLOR: Record<BoardPostKind, string> = {
  good: "#059669",
  improve: "#d97706",
};

export default function BoardScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const {
    timelinePosts,
    inboxMessages,
    userTag,
    submitToInbox,
    promoteInboxToTimeline,
    ready,
  } = useBoard();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<BoardPostKind>("good");

  const sortedTimeline = useMemo(
    () =>
      [...timelinePosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [timelinePosts]
  );

  const displayName = useMemo(() => {
    const username = profile.username?.trim() || "ゲスト";
    const tag = userTag ?? "----";
    return `${username}・${tag}`;
  }, [profile.username, userTag]);

  const submit = () => {
    submitToInbox(body, kind, displayName);
    setBody("");
  };

  const pendingInbox = inboxMessages.filter((m) => !m.timelinePostId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#ffffff",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingRight: 12,
          }}
        >
          <ChevronLeft size={22} color="#0f172a" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>戻る</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          掲示板
        </Text>
        <View style={{ width: 72 }} />
      </View>

      {!ready ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18, marginBottom: 12 }}>
            みなさんからいただいた意見のうち、特に参考になったものをタイムラインに掲載しています。返信機能はありませんが、ハートで反応できます。実名は表示しません。新しい順に並びます。
          </Text>

          <View
            style={{
              borderRadius: 12,
              backgroundColor: "#eff6ff",
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#bfdbfe",
              flexDirection: "row",
              alignItems: "center",
              columnGap: 10,
            }}
          >
            <AibouMascot size={34} compact />
            <View>
              <Text style={{ fontSize: 11, color: "#1d4ed8", fontWeight: "600" }}>あなたの表示名</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", marginTop: 4 }}>
                {displayName}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 8 }}>
            タイムライン
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 16 }}>
            掲載分にだけハートを付けられます（やり取り・返信はできません）。
          </Text>

          {sortedTimeline.length === 0 ? (
            <Text style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>まだ掲載はありません。</Text>
          ) : (
            sortedTimeline.map((p) => <BoardPostCard key={p.id} post={p} likerId={userTag ?? "anon"} />)
          )}

          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 8, marginBottom: 8 }}>
            運営あてに送る（非公開）
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 16 }}>
            次の2つから選んで、よければメッセージをどうぞ。タイムラインには自動では載りません。
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            {(["good", "improve"] as BoardPostKind[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: kind === k ? KIND_COLOR[k] : "#e5e7eb",
                  backgroundColor: kind === k ? `${KIND_COLOR[k]}18` : "#ffffff",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: kind === k ? KIND_COLOR[k] : "#64748b",
                  }}
                >
                  {KIND_LABEL[k]}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="よかったら、書いてみてください"
            multiline
            style={{
              minHeight: 100,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: "#0f172a",
              backgroundColor: "#ffffff",
              textAlignVertical: "top",
            }}
          />

          <Pressable
            onPress={submit}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: "#2563eb",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>送信する</Text>
          </Pressable>

          <View
            style={{
              marginTop: 28,
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#fffbeb",
              borderWidth: 1,
              borderColor: "#fde68a",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 6 }}>
              運営確認（ベータ・同一端末）
            </Text>
            <Text style={{ fontSize: 11, color: "#78350f", lineHeight: 17, marginBottom: 12 }}>
              参考になった送信にハートを押すと、タイムラインに掲載されます。本番では運営アカウント側の画面で行う想定です。
            </Text>
            {pendingInbox.length === 0 ? (
              <Text style={{ fontSize: 12, color: "#a16207" }}>未処理の送信はありません。</Text>
            ) : (
              pendingInbox.map((m) => (
                <InboxRow key={m.id} message={m} onPromote={() => promoteInboxToTimeline(m.id)} />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BoardPostCard({ post, likerId }: { post: BoardPost; likerId: string }) {
  const { toggleTimelineLike, getTimelineLikeCount, hasTimelineLiked } = useBoard();
  const n = getTimelineLikeCount(post.id);
  const liked = hasTimelineLiked(post.id, likerId);

  return (
    <View
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}>{post.authorLabel}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
          {post.curatedFromInboxId ? (
            <Text style={{ fontSize: 10, color: "#db2777", fontWeight: "600" }}>ピックアップ</Text>
          ) : null}
          <Text style={{ fontSize: 10, color: KIND_COLOR[post.kind], fontWeight: "600" }}>
            {KIND_LABEL[post.kind]}
          </Text>
        </View>
      </View>
      {post.isDeveloper && (
        <Text style={{ fontSize: 10, color: "#7c3aed", marginTop: 2 }}>運営</Text>
      )}
      <Text style={{ fontSize: 13, color: "#334155", marginTop: 8, lineHeight: 20 }}>{post.body}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8" }}>
          {new Date(post.createdAt).toLocaleString("ja-JP")}
        </Text>
        <Pressable
          onPress={() => toggleTimelineLike(post.id, likerId)}
          style={{ flexDirection: "row", alignItems: "center", columnGap: 4, paddingVertical: 4, paddingHorizontal: 8 }}
        >
          <Heart size={18} color={liked ? "#db2777" : "#94a3b8"} fill={liked ? "#fecdd3" : "transparent"} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: liked ? "#be123c" : "#64748b" }}>{n}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InboxRow({ message, onPromote }: { message: InboxMessage; onPromote: () => void }) {
  return (
    <View
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#fcd34d",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }}>{message.authorLabel}</Text>
        <Text style={{ fontSize: 10, color: KIND_COLOR[message.kind], fontWeight: "600" }}>
          {KIND_LABEL[message.kind]}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: "#334155", marginTop: 6, lineHeight: 18 }}>{message.body}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 10 }}>
        <Pressable
          onPress={onPromote}
          style={{
            flexDirection: "row",
            alignItems: "center",
            columnGap: 6,
            backgroundColor: "#fce7f3",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#fbcfe8",
          }}
        >
          <Heart size={16} color="#db2777" fill="#fbcfe8" />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9d174d" }}>タイムラインに掲載</Text>
        </Pressable>
      </View>
    </View>
  );
}

import { BoardTabs, type BoardTab } from "./board-tabs";
import { useInfiniteFeed } from "@/lib/infinite-feed";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MessageSquare, Eye, Search, Pin } from "lucide-react-native";
import {
  getApiBoardsBoardid,
  postApiBoardsBoardidPostsPostidViews,
  postApiAdminBoardsBoardidPostsPostidDelete,
  putApiAdminBoardsBoardidPostsPostidPostType,
  getApiBoardsBoardidPosts,
  getApiBoardsBoardidAnnouncements,
  getApiBoardsBoardidAnnouncementsAnnouncementid,
  getApiBoardsBoardidPostsPostid,
  getApiBoardsBoardidPostsPostidComments,
  postApiBoardsBoardidPosts,
  putApiBoardsBoardidPostsPostid,
  deleteApiBoardsBoardidPostsPostid,
  postApiBoardsBoardidPostsPostidComments,
  putApiBoardsBoardidPostsPostidCommentsCommentid,
  deleteApiBoardsBoardidPostsPostidCommentsCommentid,
  getApiUsersMe,
  type PostResponse,
  type CommentResponse,
} from "@/apis/generated/api";
import {
  Action,
  Field,
  FilterChip,
  SurfaceLink,
  colors,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  RequireAuth,
  Screen,
  Sheet,
  confirmAction,
  date,
  styles,
  useTask,
} from "@/components/native/ui";
import { RichContent } from "@/components/native/rich-content";
import { Editor } from "@/components/native/editor";
import { useSession } from "@/lib/providers";
import { plainText } from "@/lib/content";

export function BoardScreen({ board: initialBoard }: { board: BoardTab }) {
  const [board, setBoard] = useState<BoardTab>(initialBoard);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [postTypeCode, setPostTypeCode] = useState<string>();
  const [resource, setResource] = useState<"posts" | "announcements">("posts");
  const info = useQuery({
    queryKey: ["board", board],
    queryFn: () => getApiBoardsBoardid(board),
  });
  const query = useInfiniteFeed({
    queryKey: ["board-list", board, search, postTypeCode, resource],
    queryFn: async (page) =>
      resource === "announcements"
        ? (
            await getApiBoardsBoardidAnnouncements(board, {
              page,
              size: 20,
              postTypeCode,
            })
          ).data
        : (
            await getApiBoardsBoardidPosts(board, {
              page,
              size: 20,
              keyword: search,
              postTypeCode,
              searchType: "TITLE",
              sort: ["createdAt,desc"],
            })
          ).data,
  });
  const announcements = useQuery({
    queryKey: ["pinned", board],
    queryFn: () =>
      getApiBoardsBoardidAnnouncements(board, { page: 0, size: 100 }),
  });
  const submitSearch = () => setSearch(keyword.trim());
  return (
    <InfiniteList
      compact
      title={board === "community" ? "커뮤니티" : "위스키 소식"}
      {...query.feed}
      error={query.feed.error ?? info.error}
      header={
        <View style={{ gap: 12 }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <BoardTabs
              value={board}
              onChange={(next) => {
                if (next === board) return;
                setBoard(next);
                setResource("posts");
                setPostTypeCode(undefined);
                setKeyword("");
                setSearch("");
              }}
            />
            <NavLink href={`/board/${board}/posts/new`}>글쓰기</NavLink>
          </View>
          <Field
            label="게시글 검색"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="검색"
                onPress={submitSearch}
                style={boardStyles.iconButton}
              >
                <Search size={20} color={colors.muted} />
              </Pressable>
            }
          />
          {info.isLoading ? (
            <Loading variant="inline" label="게시판 분류 불러오는 중" />
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <FilterChip
              label="전체"
              selected={resource === "posts" && !postTypeCode}
              onPress={() => {
                setPostTypeCode(undefined);
                setResource("posts");
              }}
            />
            <FilterChip
              label="공지사항"
              selected={resource === "announcements"}
              onPress={() => {
                setPostTypeCode(undefined);
                setResource("announcements");
              }}
            />
            {info.data?.data.postTypes?.map((type) => (
              <FilterChip
                key={type.code}
                label={type.name ?? type.code ?? "분류"}
                selected={resource === "posts" && postTypeCode === type.code}
                onPress={() => {
                  setPostTypeCode(type.code);
                  setResource("posts");
                }}
              />
            ))}
          </ScrollView>
          {resource === "posts"
            ? announcements.data?.data.content
                ?.filter((item) => item.pinned)
                .slice(0, 3)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/board/${board}/announcements/${item.id}` as Href}
                    asChild
                  >
                    <Pressable
                      style={boardStyles.pinned}
                      accessibilityRole="link"
                    >
                      <Pin size={14} color={colors.muted} />
                      <Text style={boardStyles.rowTitle}>
                        공지 · {item.title}
                      </Text>
                    </Pressable>
                  </Link>
                ))
            : null}
        </View>
      }
      renderItem={(item) => (
        <SurfaceLink
          href={`/board/${board}/${resource}/${item.id}`}
          testID={`board-row-${item.id}`}
          style={boardStyles.listRow}
        >
          <View
            style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
          >
            <View
              style={[
                boardStyles.categoryBadge,
                resource === "announcements"
                  ? { backgroundColor: "#2563eb20", borderColor: "#60a5fa44" }
                  : null,
              ]}
            >
              <Text
                style={[
                  boardStyles.category,
                  resource === "announcements" ? { color: "#bfdbfe" } : null,
                ]}
              >
                {resource === "announcements"
                  ? "공지사항"
                  : "postType" in item
                    ? (item.postType?.name ?? "이야기")
                    : "이야기"}
              </Text>
            </View>
            <Text style={[boardStyles.rowTitle, { flex: 1 }]}>
              {item.title}
            </Text>
          </View>
          <View style={boardStyles.metadata}>
            <Text style={boardStyles.metaText}>
              {"authorNickname" in item ? item.authorNickname : "위스키내비"} ·{" "}
              {shortDate(item.createdAt)}
            </Text>
            <View style={boardStyles.counters}>
              {"commentCount" in item ? (
                <>
                  <MessageSquare size={12} color={colors.muted} />
                  <Text style={boardStyles.metaText}>
                    {item.commentCount ?? 0}
                  </Text>
                </>
              ) : null}
              {"viewCount" in item ? (
                <>
                  <Eye size={12} color={colors.muted} />
                  <Text style={boardStyles.metaText}>
                    {item.viewCount ?? 0}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </SurfaceLink>
      )}
    />
  );
}
function shortDate(value?: string) {
  return value ? value.slice(0, 10).replaceAll("-", ".") : "-";
}
const boardStyles = StyleSheet.create({
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  listRow: {
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    minHeight: 76,
  },
  pinned: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    maxWidth: "40%",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#ffffff08",
    borderWidth: 1,
    borderColor: colors.line,
  },
  category: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  rowTitle: {
    fontFamily: "NaviSansMedium",
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    flexShrink: 1,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  counters: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    fontFamily: "NaviSans",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  comment: {
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  original: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
  },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 28,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.line,
  },
  composer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginTop: 8,
  },
});

function Comment({
  comment,
  board,
  postId,
  userId,
  refresh,
}: {
  comment: CommentResponse;
  board: string;
  postId: number;
  userId?: number;
  refresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content ?? "");
  const [reply, setReply] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const task = useTask();
  return (
    <View style={boardStyles.comment}>
      <Text style={boardStyles.metaText}>
        {comment.authorNickname} · {shortDate(comment.createdAt)}
      </Text>
      {editing ? (
        <>
          <Field
            label="댓글 수정"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Action
            title="수정 저장"
            disabled={task.pending || !text.trim()}
            onPress={() =>
              void task.run(async () => {
                await putApiBoardsBoardidPostsPostidCommentsCommentid(
                  board,
                  postId,
                  comment.id!,
                  { content: text },
                );
                setEditing(false);
                refresh();
              })
            }
          />
        </>
      ) : (
        <Label>{comment.content}</Label>
      )}
      {userId === comment.authorId ? (
        <View style={styles.row}>
          <Action
            secondary
            title={editing ? "수정 닫기" : "댓글 수정"}
            onPress={() => setEditing(!editing)}
          />
          <Action
            secondary
            title="댓글 삭제"
            disabled={task.pending}
            onPress={() =>
              confirmAction(
                "댓글 삭제",
                "댓글을 삭제하시겠습니까?",
                () =>
                  void task.run(async () => {
                    await deleteApiBoardsBoardidPostsPostidCommentsCommentid(
                      board,
                      postId,
                      comment.id!,
                    );
                    refresh();
                  }),
              )
            }
          />
        </View>
      ) : null}
      {comment.replies?.map((item) => (
        <View
          key={item.id}
          style={{
            paddingLeft: 16,
            borderLeftWidth: 2,
            borderLeftColor: colors.line,
          }}
        >
          <Comment
            comment={item}
            board={board}
            postId={postId}
            userId={userId}
            refresh={refresh}
          />
        </View>
      ))}
      {userId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={replyOpen ? "답글 닫기" : "답글 쓰기"}
          onPress={() => setReplyOpen(!replyOpen)}
          style={{
            minHeight: 48,
            justifyContent: "center",
            alignSelf: "flex-start",
            minWidth: 48,
          }}
        >
          <Text style={boardStyles.metaText}>
            {replyOpen ? "답글 닫기" : "답글 쓰기"}
          </Text>
        </Pressable>
      ) : null}
      {userId && replyOpen ? (
        <>
          <Field label="답글" value={reply} onChangeText={setReply} />
          <Action
            secondary
            title="답글 등록"
            disabled={task.pending || !reply.trim()}
            onPress={() =>
              void task.run(async () => {
                await postApiBoardsBoardidPostsPostidComments(board, postId, {
                  content: reply,
                  parentCommentId: comment.id,
                });
                setReply("");
                refresh();
              })
            }
          />
        </>
      ) : null}
      <Message error={task.error} />
    </View>
  );
}
export function PostScreen({
  board,
  announcement = false,
}: {
  board: string;
  announcement?: boolean;
}) {
  const params = useLocalSearchParams<{
    postId?: string;
    announcementId?: string;
  }>();
  const id = Number(params.postId ?? params.announcementId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const { signedIn } = useSession();
  const [comment, setComment] = useState("");
  const task = useTask();
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => getApiUsersMe(),
    enabled: signedIn,
  });
  const query = useQuery({
    queryKey: [announcement ? "announcement" : "post", board, id],
    queryFn: async () =>
      announcement
        ? (await getApiBoardsBoardidAnnouncementsAnnouncementid(board, id)).data
        : (await getApiBoardsBoardidPostsPostid(board, id)).data,
    enabled: valid,
  });
  const comments = useQuery({
    queryKey: ["comments", board, id],
    queryFn: () => getApiBoardsBoardidPostsPostidComments(board, id),
    enabled: valid && !announcement,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["comments", board, id] });
  };
  const viewed = useRef("");
  useEffect(() => {
    const key = `${board}/${id}`;
    if (announcement || !valid || viewed.current === key) return;
    viewed.current = key;
    void postApiBoardsBoardidPostsPostidViews(board, id).catch(() => {});
  }, [board, id, announcement, valid]);
  const post = query.data;
  return (
    <InfiniteList
      compact
      title={announcement ? "공지사항" : "게시글"}
      intro={<View />}
      items={!announcement ? (comments.data?.data ?? []) : []}
      hasNext={false}
      loadMore={() => {}}
      loading={Boolean(post) && !announcement && comments.isLoading}
      error={!valid ? "게시글 번호가 올바르지 않습니다." : query.error}
      refresh={() => {
        void query.refetch();
        refresh();
      }}
      refreshing={query.isRefetching}
      endText=""
      emptyText={post && !announcement ? "첫 댓글을 남겨보세요." : ""}
      header={
        <View style={{ gap: 16 }}>
          <NavLink href={`/board/${board}`}>목록으로</NavLink>
          {query.isLoading ? <Loading variant="article" /> : null}
          {post ? (
            <View testID="post-original" style={boardStyles.original}>
              <Text accessibilityRole="header" style={styles.title}>
                {post.title}
              </Text>
              <Label muted>
                {"authorNickname" in post ? post.authorNickname : "위스키내비"}{" "}
                · {date(post.createdAt)}
              </Label>
              <RichContent html={post.content} />
              {!announcement &&
              me.data?.data.roles?.some((role) =>
                ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"].includes(role),
              ) ? (
                <AdminActions board={board} post={post as PostResponse} />
              ) : null}
              {!announcement &&
              me.data?.data.id &&
              "authorId" in post &&
              me.data.data.id === post.authorId ? (
                <>
                  <NavLink href={`/board/${board}/posts/${id}/edit`}>
                    게시글 수정
                  </NavLink>
                  <Action
                    secondary
                    title="게시글 삭제"
                    disabled={task.pending}
                    onPress={() =>
                      confirmAction(
                        "게시글 삭제",
                        "게시글을 삭제하시겠습니까?",
                        () =>
                          void task.run(async () => {
                            await deleteApiBoardsBoardidPostsPostid(board, id);
                            await client.invalidateQueries({
                              queryKey: ["board-list", board],
                            });
                            router.replace(`/board/${board}` as never);
                          }),
                      )
                    }
                  />
                </>
              ) : null}
            </View>
          ) : null}
          {!announcement && post ? (
            <View testID="comments-section" style={boardStyles.commentsHeader}>
              <MessageSquare size={18} color={colors.text} />
              <Heading>댓글 {comments.data?.data.length ?? 0}</Heading>
            </View>
          ) : null}
          <Message error={comments.error} />
        </View>
      }
      renderItem={(item) => (
        <Comment
          comment={item}
          board={board}
          postId={id}
          userId={me.data?.data.id}
          refresh={refresh}
        />
      )}
      footer={
        <>
          {!announcement && post ? (
            <View style={boardStyles.composer}>
              {signedIn ? (
                <>
                  <Field
                    label="댓글 내용"
                    multiline
                    value={comment}
                    onChangeText={setComment}
                  />
                  <Action
                    title="댓글 등록"
                    disabled={task.pending || !comment.trim()}
                    onPress={() =>
                      void task.run(async () => {
                        await postApiBoardsBoardidPostsPostidComments(
                          board,
                          id,
                          {
                            content: comment,
                          },
                        );
                        setComment("");
                        refresh();
                      })
                    }
                  />
                </>
              ) : (
                <NavLink href="/sign-in">로그인하고 댓글 쓰기</NavLink>
              )}
            </View>
          ) : null}
          <Message error={task.error} />
        </>
      }
    />
  );
}

function PostForm({ board, post }: { board: string; post?: PostResponse }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [type, setType] = useState(post?.postType?.code);
  const task = useTask();
  const client = useQueryClient();
  const info = useQuery({
    queryKey: ["board", board],
    queryFn: () => getApiBoardsBoardid(board),
  });
  const me = useQuery({ queryKey: ["me"], queryFn: () => getApiUsersMe() });
  const restricted = me.data?.data.isPostCreationRestricted;
  const owner = !post || me.data?.data.id === post.authorId;
  if (info.isLoading || me.isLoading)
    return (
      <Screen title={post ? "게시글 수정" : "글쓰기"}>
        <Loading variant="form" />
      </Screen>
    );
  return (
    <Screen title={post ? "게시글 수정" : "글쓰기"}>
      <Message error={me.error ?? info.error ?? task.error} />
      {restricted ? (
        <Label>
          현재 글 작성이 제한되었습니다.{" "}
          {me.data?.data.postCreationRestrictionReason}
        </Label>
      ) : null}
      {!owner && me.data ? (
        <Label>본인의 게시글만 수정할 수 있습니다.</Label>
      ) : null}
      <Field
        label="제목"
        value={title}
        maxLength={200}
        onChangeText={setTitle}
      />
      <View style={styles.row}>
        {info.data?.data.postTypes?.map((item) => (
          <Action
            key={item.code}
            secondary={item.code !== type}
            title={item.name ?? item.code ?? "분류"}
            onPress={() => setType(item.code)}
          />
        ))}
      </View>
      <Editor initial={post?.content} onChange={setContent} />
      <Action
        title="저장"
        disabled={
          task.pending ||
          me.isPending ||
          !owner ||
          Boolean(restricted) ||
          !title.trim() ||
          (!plainText(content) && !/<img\b/i.test(content))
        }
        onPress={() =>
          void task.run(async () => {
            const body = {
              title: title.trim(),
              content,
              postTypeCode: type,
              hasImage: /<img\b/i.test(content),
            };
            const { data } = post
              ? await putApiBoardsBoardidPostsPostid(board, post.id!, body)
              : await postApiBoardsBoardidPosts(board, body);
            await client.invalidateQueries({ queryKey: ["board-list", board] });
            await client.invalidateQueries({
              queryKey: ["post", board, data.id],
            });
            router.replace(`/board/${board}/posts/${data.id}` as never);
          })
        }
      />
    </Screen>
  );
}
export function PostEditorScreen({
  board,
  edit = false,
}: {
  board: string;
  edit?: boolean;
}) {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { signedIn } = useSession();
  const id = Number(postId);
  const query = useQuery({
    queryKey: ["post", board, id],
    queryFn: () =>
      getApiBoardsBoardidPostsPostid(board, id).then((r) => r.data),
    enabled: edit && signedIn && Number.isSafeInteger(id) && id > 0,
  });
  return (
    <RequireAuth>
      {edit ? (
        query.data ? (
          <PostForm key={query.data.id} board={board} post={query.data} />
        ) : (
          <Screen title="게시글 수정">
            <Message error={query.error} />
            {query.isLoading ? <Loading variant="form" /> : null}
          </Screen>
        )
      ) : (
        <PostForm board={board} />
      )}
    </RequireAuth>
  );
}

function AdminActions({ board, post }: { board: string; post: PostResponse }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const task = useTask();
  const client = useQueryClient();
  const info = useQuery({
    queryKey: ["board", board],
    queryFn: () => getApiBoardsBoardid(board),
  });
  const boardId = post.boardId ?? info.data?.data.id;
  return (
    <>
      <Action secondary title="게시글 관리" onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        title="게시글 관리"
        onDismiss={() => setOpen(false)}
      >
        <Heading>분류 변경</Heading>
        {info.data?.data.postTypes
          ?.filter((type) => type.usages?.includes("POST"))
          .map((type) => (
            <Action
              key={type.id}
              secondary
              title={type.name ?? "분류"}
              disabled={task.pending || !boardId || !type.id}
              onPress={() =>
                void task.run(async () => {
                  await putApiAdminBoardsBoardidPostsPostidPostType(
                    boardId!,
                    post.id!,
                    { postTypeId: type.id! },
                  );
                  await client.invalidateQueries({
                    queryKey: ["post", board, post.id],
                  });
                  setOpen(false);
                })
              }
            />
          ))}
        <Field
          label="관리자 삭제 사유"
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={500}
        />
        <Action
          secondary
          title="관리자 권한으로 삭제"
          disabled={task.pending || !reason.trim() || !boardId}
          onPress={() =>
            confirmAction(
              "게시글 삭제",
              "사유를 기록하고 게시글을 삭제하시겠습니까?",
              () =>
                void task.run(async () => {
                  await postApiAdminBoardsBoardidPostsPostidDelete(
                    boardId!,
                    post.id!,
                    { deleteReason: reason.trim() },
                  );
                  await client.invalidateQueries({
                    queryKey: ["board-list", board],
                  });
                  setOpen(false);
                  router.replace(`/board/${board}` as never);
                }),
            )
          }
        />
        <Message error={task.error ?? info.error} />
      </Sheet>
    </>
  );
}

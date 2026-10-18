import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
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
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  PagedList,
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

export function BoardScreen({ board }: { board: "community" | "news" }) {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [postTypeCode, setPostTypeCode] = useState<string>();
  const [resource, setResource] = useState<"posts" | "announcements">("posts");
  const info = useQuery({
    queryKey: ["board", board],
    queryFn: () => getApiBoardsBoardid(board),
  });
  const query = useQuery({
    queryKey: ["board-list", board, page, search, postTypeCode, resource],
    queryFn: async () =>
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
  return (
    <PagedList
      title={board === "community" ? "커뮤니티" : "위스키 소식"}
      items={query.data?.content ?? []}
      page={page}
      onPage={setPage}
      hasNext={page + 1 < (query.data?.page?.totalPages ?? 0)}
      loading={query.isFetching}
      error={query.error ?? info.error}
      refresh={() => void query.refetch()}
      header={
        <View style={{ gap: 16 }}>
          <View style={styles.row}>
            <NavLink href="/board/community">커뮤니티</NavLink>
            <NavLink href="/board/news">소식</NavLink>
          </View>
          <Field
            label="게시글 검색"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => {
              setSearch(keyword.trim());
              setPage(0);
            }}
          />
          <Action
            title="검색"
            onPress={() => {
              setSearch(keyword.trim());
              setPage(0);
            }}
          />
          <View style={styles.row}>
            <Action
              secondary
              title="전체"
              onPress={() => {
                setPostTypeCode(undefined);
                setResource("posts");
                setPage(0);
              }}
            />
            <Action
              secondary
              title="공지"
              onPress={() => {
                setPostTypeCode(undefined);
                setResource("announcements");
                setPage(0);
              }}
            />
            {info.data?.data.postTypes?.map((type) => (
              <Action
                secondary
                key={type.code}
                title={type.name ?? type.code ?? "분류"}
                onPress={() => {
                  setPostTypeCode(type.code);
                  setResource("posts");
                  setPage(0);
                }}
              />
            ))}
          </View>
          {resource === "posts"
            ? announcements.data?.data.content
                ?.filter((item) => item.pinned)
                .slice(0, 3)
                .map((item) => (
                  <NavLink
                    key={item.id}
                    href={`/board/${board}/announcements/${item.id}`}
                  >
                    공지 · {item.title}
                  </NavLink>
                ))
            : null}
          <NavLink href={`/board/${board}/posts/new`}>글쓰기</NavLink>
        </View>
      }
      renderItem={(item) => (
        <>
          <NavLink href={`/board/${board}/${resource}/${item.id}`}>
            {item.title}
          </NavLink>
          <Label muted>
            {"authorNickname" in item ? item.authorNickname : "공지"} ·{" "}
            {date(item.createdAt)}
          </Label>
        </>
      )}
    />
  );
}
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
  const task = useTask();
  return (
    <View style={styles.section}>
      <Label muted>
        {comment.authorNickname} · {date(comment.createdAt)}
      </Label>
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
        <View key={item.id} style={{ paddingLeft: 16 }}>
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
    <Screen
      title={post?.title ?? (announcement ? "공지사항" : "게시글")}
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      <Message
        error={!valid ? "게시글 번호가 올바르지 않습니다." : query.error}
      />
      {query.isLoading ? <Loading /> : null}
      {post ? (
        <>
          <Label muted>
            {"authorNickname" in post ? post.authorNickname : "위스키내비"} ·{" "}
            {date(post.createdAt)}
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
        </>
      ) : null}
      {!announcement ? (
        <>
          <Heading>댓글</Heading>
          <Message error={comments.error} />
          {comments.data?.data.map((item) => (
            <Comment
              key={item.id}
              comment={item}
              board={board}
              postId={id}
              userId={me.data?.data.id}
              refresh={refresh}
            />
          ))}
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
                    await postApiBoardsBoardidPostsPostidComments(board, id, {
                      content: comment,
                    });
                    setComment("");
                    refresh();
                  })
                }
              />
            </>
          ) : (
            <NavLink href="/sign-in">로그인하고 댓글 쓰기</NavLink>
          )}
        </>
      ) : null}
      <Message error={task.error} />
      <NavLink href={`/board/${board}`}>목록으로</NavLink>
    </Screen>
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
            {query.isLoading ? <Loading /> : null}
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

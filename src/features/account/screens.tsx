import { statusLabel } from "@/lib/status-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import {
  getApiUsersMe,
  putApiUsersMeNickname,
  putApiUsersMeEmail,
  postApiUsersMeEmailVerificationSend,
  postApiUsersMeEmailVerificationVerify,
  putApiUsersMeAgreements,
  putApiAuthChangePassword,
  getApiUsersBusinessesApplicationsMeOverview,
  postApiUsersBusinessesApplicationsApplicationidCancel,
  getPostApiUsersBusinessesApplicationsUrl,
  getApiInquiries,
  getApiInquiriesInquiryid,
  postApiInquiries,
  postApiInquiriesInquiryidMessages,
  deleteApiInquiriesInquiryid,
  getApiBottlesReservationsApplicationsMe,
  type AuthResponse,
  type UserSelfResponse,
} from "@/apis/generated/api";
import { customFetch } from "@/apis/mutator";
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
  Toggle,
  confirmAction,
  date,
  styles,
  useTask,
} from "@/components/native/ui";
import { Editor } from "@/components/native/editor";
import { RichContent } from "@/components/native/rich-content";
import { useSession } from "@/lib/providers";
import { session } from "@/lib/session";
import { storage } from "@/lib/storage";
import { OrdersList } from "@/features/orders/screens";
import { FAQ_DATA, MEMBERSHIP_INFO, MEMBERSHIP_ROLE } from "./constants";

export function MyPageScreen() {
  return (
    <RequireAuth>
      <MyPage />
    </RequireAuth>
  );
}
function MyPage() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [selected, setSelected] = useState(tab ?? "profile");
  const query = useQuery({ queryKey: ["me"], queryFn: () => getApiUsersMe() });
  if (selected === "orders")
    return (
      <View style={{ flex: 1 }}>
        <AccountTabs value={selected} onChange={setSelected} />
        <OrdersList />
      </View>
    );
  return (
    <Screen
      title="마이페이지"
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      <AccountTabs value={selected} onChange={setSelected} />
      <Message error={query.error} />
      {query.isLoading ? <Loading /> : null}
      {query.data ? (
        <>
          <Heading>
            {query.data.data.username ?? query.data.data.name}님
          </Heading>
          <Label muted>{query.data.data.email}</Label>
          {selected === "profile" ? (
            <ProfileForm key={query.data.data.id} user={query.data.data} />
          ) : selected === "membership" ? (
            <>
              {(["navi", "tales"] as const).map((key) => (
                <View key={key} style={styles.section}>
                  <Heading>{MEMBERSHIP_INFO[key].name}</Heading>
                  <Label>
                    {query.data.data.roles?.includes(
                      key === "navi"
                        ? MEMBERSHIP_ROLE.NAVI
                        : MEMBERSHIP_ROLE.TALES,
                    )
                      ? "가입됨"
                      : "미가입"}
                  </Label>
                  {MEMBERSHIP_INFO[key].benefits.map((benefit) => (
                    <Label key={benefit} muted>
                      {benefit}
                    </Label>
                  ))}
                </View>
              ))}
            </>
          ) : selected === "business" ? (
            <BusinessSection />
          ) : selected === "reservations" ? (
            <MyReservations />
          ) : (
            <>
              {FAQ_DATA.map((faq) => (
                <View key={faq.question} style={styles.section}>
                  <Heading>{faq.question}</Heading>
                  <Label muted>{faq.answer}</Label>
                </View>
              ))}
              <NavLink href="/my-page/inquiries">1:1 문의</NavLink>
            </>
          )}
        </>
      ) : null}
      <NavLink href="/my-page/ticket-orders">내 이용권 주문</NavLink>
      <Action
        secondary
        title="로그아웃"
        onPress={() =>
          confirmAction("로그아웃", "이 기기에서 로그아웃하시겠습니까?", () => {
            void storage
              .remove("wn.cart")
              .then(() => session.set(null))
              .then(() => router.replace("/"));
          })
        }
      />
    </Screen>
  );
}
function AccountTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={[styles.row, { padding: 12 }]}>
      {Object.entries({
        profile: "내 정보",
        orders: "주문",
        reservations: "예약",
        membership: "멤버십",
        business: "사업자",
        faq: "도움말",
      }).map(([key, label]) => (
        <Action
          key={key}
          secondary={value !== key}
          title={label}
          onPress={() => onChange(key)}
        />
      ))}
    </View>
  );
}
function ProfileForm({ user }: { user: UserSelfResponse }) {
  const [nickname, setNickname] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState("");
  const [verified, setVerified] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [agreements, setAgreements] = useState({
    marketingAgree: Boolean(user.marketingAgree),
    emailAgree: Boolean(user.emailAgree),
    smsAgree: Boolean(user.smsAgree),
    snsAgree: Boolean(user.snsAgree),
  });
  const task = useTask();
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["me"] });
    setNotice("변경사항을 저장했습니다.");
  };
  const updateTokens = async (data: AuthResponse) => {
    if (data.accessToken && data.refreshToken)
      await session.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
  };
  return (
    <View style={{ gap: 20 }}>
      <Field label="닉네임" value={nickname} onChangeText={setNickname} />
      <Action
        secondary
        title="닉네임 저장"
        disabled={task.pending || !/^[가-힣A-Za-z0-9]{2,16}$/.test(nickname)}
        onPress={() =>
          void task.run(async () => {
            await updateTokens(
              (await putApiUsersMeNickname({ nickname })).data,
            );
            await refresh();
          })
        }
      />
      <Field
        label="변경할 이메일"
        keyboardType="email-address"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setSent("");
          setVerified("");
        }}
      />
      <Action
        secondary
        title="이메일 인증코드 발송"
        disabled={task.pending || !email || email === user.email}
        onPress={() =>
          void task.run(async () => {
            await postApiUsersMeEmailVerificationSend({ email });
            setSent(email);
          })
        }
      />
      {sent === email && sent ? (
        <>
          <Field label="인증코드" value={code} onChangeText={setCode} />
          <Action
            secondary
            title="인증코드 확인"
            disabled={task.pending || !code}
            onPress={() =>
              void task.run(async () => {
                await postApiUsersMeEmailVerificationVerify({ email, code });
                setVerified(email);
              })
            }
          />
        </>
      ) : null}
      <Action
        secondary
        title="이메일 변경 저장"
        disabled={task.pending || !verified || verified !== email}
        onPress={() =>
          void task.run(async () => {
            await updateTokens(
              (await putApiUsersMeEmail({ newEmail: email })).data,
            );
            await refresh();
          })
        }
      />
      <Heading>비밀번호 변경</Heading>
      <Field
        label="현재 비밀번호"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
      />
      <Field
        label="새 비밀번호"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Field
        label="새 비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />
      <Action
        secondary
        title="비밀번호 변경"
        disabled={
          task.pending ||
          !currentPassword ||
          newPassword.length < 6 ||
          newPassword !== confirm
        }
        onPress={() =>
          void task.run(async () => {
            await putApiAuthChangePassword({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirm("");
            setNotice("비밀번호를 변경했습니다.");
          })
        }
      />
      <Heading>수신 동의 설정</Heading>
      {Object.entries({
        marketingAgree: "마케팅 정보",
        emailAgree: "이메일",
        smsAgree: "SMS",
        snsAgree: "SNS",
      }).map(([key, label]) => (
        <Toggle
          key={key}
          label={label}
          value={agreements[key as keyof typeof agreements]}
          onChange={(value) => setAgreements({ ...agreements, [key]: value })}
        />
      ))}
      <Action
        secondary
        title="수신 동의 저장"
        disabled={task.pending}
        onPress={() =>
          void task.run(async () => {
            await putApiUsersMeAgreements(agreements);
            await refresh();
          })
        }
      />
      <Message error={task.error} />
      {notice ? <Label>{notice}</Label> : null}
    </View>
  );
}
function MyReservations() {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["my-reservations", "history", page],
    queryFn: () => getApiBottlesReservationsApplicationsMe({ page, size: 20 }),
  });
  return (
    <View style={{ gap: 16 }}>
      <Heading>내 예약 신청</Heading>
      <Message error={query.error} />
      {query.isLoading ? <Loading /> : null}
      {query.data?.data.content?.map((item) => (
        <View key={item.id} style={styles.section}>
          <NavLink href={`/my-page/reservations/${item.id}`}>
            {item.noticeName ?? item.bottleName}
          </NavLink>
          <Label>
            {item.quantity}병 · {statusLabel(item.status)}
          </Label>
          <Label muted>
            {item.pickupBusinessName} · {item.pickupAddress}
          </Label>
        </View>
      ))}
      <View style={styles.row}>
        <Action
          secondary
          title="이전"
          disabled={page === 0}
          onPress={() => setPage(page - 1)}
        />
        <Action
          secondary
          title="다음"
          disabled={page + 1 >= (query.data?.data.page?.totalPages ?? 0)}
          onPress={() => setPage(page + 1)}
        />
      </View>
    </View>
  );
}
function BusinessSection() {
  const query = useQuery({
    queryKey: ["business-applications"],
    queryFn: () => getApiUsersBusinessesApplicationsMeOverview(),
  });
  const task = useTask();
  const [form, setForm] = useState({
    businessName: "",
    pickupAddress: "",
    contact: "",
    taxInvoiceEmail: "",
    businessRegistrationNumber: "",
    openingDate: "",
    representativeName: "",
  });
  const [document, setDocument] =
    useState<DocumentPicker.DocumentPickerAsset>();
  return (
    <View style={{ gap: 20 }}>
      <Heading>사업자 등록 신청</Heading>
      <Message error={query.error ?? task.error} />
      {query.data?.data.recentApplications?.map((item) => (
        <View key={item.id} style={styles.section}>
          <Label>
            {item.businessName} · {statusLabel(item.status)}
          </Label>
          {item.rejectReason ? <Label>{item.rejectReason}</Label> : null}
          {item.status === "PENDING" ? (
            <Action
              secondary
              title="신청 취소"
              disabled={task.pending}
              onPress={() =>
                confirmAction(
                  "신청 취소",
                  "사업자 등록 신청을 취소하시겠습니까?",
                  () =>
                    void task.run(async () => {
                      await postApiUsersBusinessesApplicationsApplicationidCancel(
                        item.id!,
                        { cancelReason: "사용자 신청 취소" },
                      );
                      await query.refetch();
                    }),
                )
              }
            />
          ) : null}
        </View>
      ))}
      {Object.entries({
        businessName: "사업장명",
        pickupAddress: "사업장 주소",
        contact: "연락처",
        taxInvoiceEmail: "세금계산서 이메일 (선택)",
        businessRegistrationNumber: "사업자등록번호 (숫자 10자리)",
        openingDate: "개업일자 (YYYYMMDD)",
        representativeName: "대표자명",
      }).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={form[key as keyof typeof form]}
          onChangeText={(value) => setForm({ ...form, [key]: value })}
        />
      ))}
      <Action
        secondary
        title={document?.name ?? "사업자등록증 선택 (PDF·이미지)"}
        onPress={() =>
          void task.run(async () => {
            const picked = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "image/jpeg", "image/png"],
              copyToCacheDirectory: true,
            });
            if (!picked.canceled) setDocument(picked.assets[0]);
          })
        }
      />
      <Action
        title="사업자 등록 신청"
        disabled={
          task.pending ||
          !document ||
          !form.businessName ||
          !form.pickupAddress ||
          !form.contact ||
          !/^\d{10}$/.test(form.businessRegistrationNumber) ||
          !/^\d{8}$/.test(form.openingDate) ||
          !form.representativeName
        }
        onPress={() =>
          void task.run(async () => {
            if (!document || (document.size ?? 0) > 10 * 1024 * 1024)
              throw new Error("10MB 이하의 증빙서류를 선택해 주세요.");
            const body = new FormData();
            const file =
              Platform.OS === "web"
                ? await (await fetch(document.uri)).blob()
                : {
                    uri: document.uri,
                    type: document.mimeType ?? "application/pdf",
                    name: document.name,
                  };
            body.append("document", file as Blob);
            await customFetch(
              getPostApiUsersBusinessesApplicationsUrl({
                ...form,
                taxInvoiceEmail: form.taxInvoiceEmail || undefined,
              }),
              { method: "POST", body },
            );
            await query.refetch();
            setDocument(undefined);
          })
        }
      />
    </View>
  );
}
export function InquiriesScreen() {
  const [page, setPage] = useState(0);
  const { signedIn } = useSession();
  const query = useQuery({
    queryKey: ["inquiries", page],
    queryFn: () => getApiInquiries({ page, size: 20 }),
    enabled: signedIn,
  });
  return (
    <RequireAuth>
      <PagedList
        title="1:1 문의"
        items={query.data?.data.content ?? []}
        page={page}
        onPage={setPage}
        hasNext={page + 1 < (query.data?.data.page?.totalPages ?? 0)}
        loading={query.isFetching}
        error={query.error}
        refresh={() => void query.refetch()}
        header={<NavLink href="/my-page/inquiries/new">문의 작성</NavLink>}
        renderItem={(item) => (
          <>
            <NavLink href={`/my-page/inquiries/${item.id}`}>
              {item.title}
            </NavLink>
            <Label muted>
              {statusLabel(item.status)} · {date(item.createdAt)}
            </Label>
          </>
        )}
      />
    </RequireAuth>
  );
}
export function InquiryCreateScreen() {
  return (
    <RequireAuth>
      <InquiryForm />
    </RequireAuth>
  );
}
function InquiryForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const task = useTask();
  const client = useQueryClient();
  return (
    <Screen title="문의 작성">
      <Field
        label="제목"
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />
      <Editor onChange={setContent} />
      <Message error={task.error} />
      <Action
        title="문의 등록"
        disabled={task.pending || !title.trim() || !content.trim()}
        onPress={() =>
          void task.run(async () => {
            const { data } = await postApiInquiries({
              title,
              content,
              hasImage: /<img\b/i.test(content),
            });
            await client.invalidateQueries({ queryKey: ["inquiries"] });
            router.replace(`/my-page/inquiries/${data.inquiry?.id}` as never);
          })
        }
      />
    </Screen>
  );
}
export function InquiryDetailScreen() {
  return (
    <RequireAuth>
      <InquiryDetail />
    </RequireAuth>
  );
}
function InquiryDetail() {
  const { inquiryId } = useLocalSearchParams<{ inquiryId: string }>();
  const id = Number(inquiryId);
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const task = useTask();
  const query = useQuery({
    queryKey: ["inquiry", id],
    queryFn: () => getApiInquiriesInquiryid(id),
    enabled: Number.isSafeInteger(id) && id > 0,
  });
  return (
    <Screen title={query.data?.data.inquiry?.title ?? "문의 상세"}>
      <Message error={query.error ?? task.error} />
      {query.isLoading ? <Loading /> : null}
      {query.data?.data.messages?.map((message) => (
        <View key={message.id} style={styles.section}>
          <Label muted>
            {message.authorNickname} · {date(message.createdAt)}
          </Label>
          <RichContent html={message.content} />
        </View>
      ))}
      {query.data?.data.inquiry?.status !== "CLOSED" ? (
        <>
          <Editor key={editorKey} onChange={setContent} />
          <Action
            title="추가 메시지 보내기"
            disabled={task.pending || !content.trim() || !query.data}
            onPress={() =>
              void task.run(async () => {
                await postApiInquiriesInquiryidMessages(id, {
                  content,
                  hasImage: /<img\b/i.test(content),
                });
                setContent("");
                setEditorKey(editorKey + 1);
                await query.refetch();
              })
            }
          />
        </>
      ) : (
        <Label>종료된 문의입니다.</Label>
      )}
      <Action
        secondary
        title="문의 삭제"
        disabled={task.pending || !query.data}
        onPress={() =>
          confirmAction(
            "문의 삭제",
            "문의 내용을 삭제하시겠습니까?",
            () =>
              void task.run(async () => {
                await deleteApiInquiriesInquiryid(id);
                router.replace("/my-page/inquiries");
              }),
          )
        }
      />
      <NavLink href="/my-page/inquiries">문의 목록</NavLink>
    </Screen>
  );
}

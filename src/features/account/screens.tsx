import { useInfiniteFeed } from "@/lib/infinite-feed";
import { statusLabel } from "@/lib/status-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
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
  FilterChip,
  SurfaceLink,
  colors,
  Field,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  RequireAuth,
  Screen,
  Toggle,
  confirmAction,
  date,
  styles,
  useTask,
} from "@/components/native/ui";
import {
  UserRound,
  Package,
  CalendarDays,
  Crown,
  Building2,
  CircleHelp,
  ChevronRight,
  MessageCircle,
  Ticket,
  Pencil,
  LogOut,
} from "lucide-react-native";
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
  const [selected, setSelected] = useState(tab ?? "overview");
  const query = useQuery({ queryKey: ["me"], queryFn: () => getApiUsersMe() });
  if (selected === "orders" || selected === "reservations")
    return (
      <View style={{ flex: 1 }}>
        <AccountTabs value={selected} onChange={setSelected} />
        {selected === "orders" ? <OrdersList /> : <MyReservations />}
      </View>
    );
  return (
    <Screen
      title="마이페이지"
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      {selected !== "overview" ? (
        <AccountTabs value={selected} onChange={setSelected} />
      ) : null}
      <Message error={query.error} />
      {query.isLoading ? <Loading /> : null}
      {query.data ? (
        <>
          <View style={accountStyles.identity}>
            <View
              style={accountStyles.avatar}
              accessibilityElementsHidden
              aria-hidden
            >
              <UserRound size={24} color={colors.text} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Heading>
                {query.data.data.username ?? query.data.data.name}님
              </Heading>
              <Text style={accountStyles.meta}>{query.data.data.email}</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {(["navi", "tales"] as const)
                  .filter((key) =>
                    query.data!.data.roles?.includes(
                      key === "navi"
                        ? MEMBERSHIP_ROLE.NAVI
                        : MEMBERSHIP_ROLE.TALES,
                    ),
                  )
                  .map((key) => (
                    <Text key={key} style={accountStyles.membership}>
                      {MEMBERSHIP_INFO[key].name}
                    </Text>
                  ))}
              </View>
            </View>
          </View>
          {selected === "overview" ? (
            <AccountOverview onChange={setSelected} />
          ) : null}
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
          ) : selected === "faq" ? (
            <>
              {FAQ_DATA.map((faq) => (
                <View key={faq.question} style={styles.section}>
                  <Heading>{faq.question}</Heading>
                  <Label muted>{faq.answer}</Label>
                </View>
              ))}
              <NavLink href="/my-page/inquiries">1:1 문의</NavLink>
            </>
          ) : null}
        </>
      ) : null}
      {selected !== "overview" ? (
        <NavLink href="/my-page/ticket-orders">내 이용권 주문</NavLink>
      ) : null}
      <Action
        secondary
        size="compact"
        leading={<LogOut size={17} color={colors.text} />}
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ padding: 4, gap: 8 }}
    >
      {Object.entries({
        overview: "전체",
        profile: "내 정보",
        orders: "주문",
        reservations: "예약",
        membership: "멤버십",
        business: "사업자",
        faq: "도움말",
      }).map(([key, label]) => (
        <FilterChip
          key={key}
          selected={value === key}
          label={label}
          onPress={() => onChange(key)}
        />
      ))}
    </ScrollView>
  );
}
function AccountOverview({ onChange }: { onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 12 }}>
        <Heading>나의 이용 내역</Heading>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <AccountShortcut
            label="주문 내역"
            icon={<Package size={23} color={colors.text} />}
            onPress={() => onChange("orders")}
          />
          <AccountShortcut
            label="예약 내역"
            icon={<CalendarDays size={23} color={colors.text} />}
            onPress={() => onChange("reservations")}
          />
          <SurfaceLink
            href="/my-page/ticket-orders"
            style={accountStyles.shortcut}
            accessibilityLabel="내 이용권 주문"
          >
            <Ticket
              size={23}
              color={colors.text}
              aria-hidden
              accessibilityElementsHidden
            />
            <Text style={accountStyles.rowLabel}>이용권 주문</Text>
          </SurfaceLink>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Heading>계정 관리</Heading>
        <View style={accountStyles.group}>
          <AccountRow
            label="내 정보 수정"
            detail="닉네임 · 이메일 · 비밀번호"
            icon={<Pencil size={19} color={colors.muted} />}
            onPress={() => onChange("profile")}
          />
          <AccountRow
            label="나의 멤버십"
            detail="NAVI · TALES"
            icon={<Crown size={19} color={colors.muted} />}
            onPress={() => onChange("membership")}
          />
          <AccountRow
            label="사업자 등록"
            detail="신청 및 진행 현황"
            icon={<Building2 size={19} color={colors.muted} />}
            onPress={() => onChange("business")}
          />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Heading>고객 지원</Heading>
        <View style={accountStyles.group}>
          <AccountRow
            label="자주 묻는 질문"
            icon={<CircleHelp size={19} color={colors.muted} />}
            onPress={() => onChange("faq")}
          />
          <SurfaceLink
            href="/my-page/inquiries"
            style={accountStyles.row}
            accessibilityLabel="1:1 문의"
          >
            <MessageCircle
              size={19}
              color={colors.muted}
              aria-hidden
              accessibilityElementsHidden
            />
            <Text style={[accountStyles.rowLabel, { flex: 1 }]}>1:1 문의</Text>
            <ChevronRight
              size={17}
              color={colors.muted}
              aria-hidden
              accessibilityElementsHidden
            />
          </SurfaceLink>
        </View>
      </View>
    </View>
  );
}
function AccountShortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        accountStyles.shortcut,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </View>
      <Text style={accountStyles.rowLabel}>{label}</Text>
    </Pressable>
  );
}
function AccountRow({
  label,
  detail,
  icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        accountStyles.row,
        { backgroundColor: pressed ? colors.line : "transparent" },
      ]}
    >
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={accountStyles.rowLabel}>{label}</Text>
        {detail ? <Text style={accountStyles.meta}>{detail}</Text> : null}
      </View>
      <ChevronRight
        size={17}
        color={colors.muted}
        aria-hidden
        accessibilityElementsHidden
      />
    </Pressable>
  );
}
const accountStyles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  membership: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
    backgroundColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meta: {
    fontFamily: "NaviSans",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  rowLabel: {
    fontFamily: "NaviSansMedium",
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  shortcut: {
    flex: 1,
    minHeight: 92,
    padding: 12,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});

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
  const query = useInfiniteFeed({
    queryKey: ["my-reservations", "history"],
    queryFn: async (page) =>
      (await getApiBottlesReservationsApplicationsMe({ page, size: 20 })).data,
  });
  return (
    <InfiniteList
      title="내 예약 신청"
      {...query.feed}
      renderItem={(item) => (
        <>
          <NavLink href={`/my-page/reservations/${item.id}`}>
            {item.noticeName ?? item.bottleName}
          </NavLink>
          <Label>
            {item.quantity}병 · {statusLabel(item.status)}
          </Label>
          <Label muted>
            {item.pickupBusinessName} · {item.pickupAddress}
          </Label>
        </>
      )}
    />
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
  const { signedIn } = useSession();
  const query = useInfiniteFeed({
    queryKey: ["inquiries"],
    queryFn: async (page) => (await getApiInquiries({ page, size: 20 })).data,
    enabled: signedIn,
  });
  return (
    <RequireAuth>
      <InfiniteList
        title="1:1 문의"
        {...query.feed}
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

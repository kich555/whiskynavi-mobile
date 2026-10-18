import { Image } from "expo-image";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import {
  postApiAuthLogin,
  postApiAuthCheckEmail,
  postApiAuthCheckUsername,
  postApiAuthEmailVerificationSend,
  postApiAuthEmailVerificationVerify,
  postApiAuthEmailVerificationResetSend,
  postApiAuthEmailVerificationResetVerify,
  postApiAuthResetPassword,
  postApiAuthSignup,
  postApiUserNiceidSession,
} from "@/apis/generated/api";
import {
  Action,
  Field,
  Label,
  Message,
  NavLink,
  Screen,
  Sheet,
  Toggle,
  useTask,
} from "@/components/native/ui";
import { safeReturnPath } from "@/lib/callback-policy";
import { session } from "@/lib/session";
import { PRIVACY_TEXT } from "@/lib/privacy";
import { providerFlow } from "@/lib/provider-flow";

export function SignInScreen() {
  const { callbackUrl, registered } = useLocalSearchParams<{
    callbackUrl?: string;
    registered?: string;
  }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const task = useTask();
  return (
    <Screen
      contentStyle={{
        flexGrow: 1,
        justifyContent: "center",
        gap: 24,
        paddingBottom: 80,
      }}
    >
      <Image
        source={require("../../../assets/brand/whiskynavi-logo.png")}
        contentFit="contain"
        accessibilityLabel="WHISKYNAVI"
        style={{ width: 80, height: 101, alignSelf: "center" }}
      />
      {registered ? (
        <Label>회원가입이 완료되었습니다. 로그인해 주세요.</Label>
      ) : null}
      <Field
        label="이메일 주소"
        placeholder="ex) whiskynavi@whiskynavi.com"
        style={{
          backgroundColor: "transparent",
          borderWidth: 0,
          borderBottomWidth: 1,
          borderColor: "#ffffff80",
          borderRadius: 0,
          paddingHorizontal: 0,
        }}
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label="비밀번호"
        style={{
          backgroundColor: "transparent",
          borderWidth: 0,
          borderBottomWidth: 1,
          borderColor: "#ffffff80",
          borderRadius: 0,
          paddingHorizontal: 0,
        }}
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      <Message error={task.error} />
      <Action
        title={task.pending ? "로그인 중…" : "로그인"}
        disabled={task.pending || !email.trim() || !password}
        onPress={() =>
          void task.run(async () => {
            const { data } = await postApiAuthLogin({
              email: email.trim(),
              password,
            });
            if (!data.accessToken || !data.refreshToken)
              throw new Error("로그인 응답에 인증 정보가 없습니다.");
            await session.set({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
            router.replace(safeReturnPath(callbackUrl) as never);
          })
        }
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <NavLink href="/sign-up">회원가입</NavLink>
        <Label>|</Label>
        <NavLink href="/find-password">비밀번호 초기화</NavLink>
      </View>
    </Screen>
  );
}
export function FindPasswordScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [done, setDone] = useState(false);
  const task = useTask();
  return (
    <Screen title="비밀번호 초기화">
      {done ? (
        <>
          <Label>임시 비밀번호를 이메일로 발송했습니다.</Label>
          <NavLink href="/sign-in">로그인으로 돌아가기</NavLink>
        </>
      ) : (
        <>
          <Field
            label="이메일 주소"
            keyboardType="email-address"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setSentEmail("");
              setCode("");
            }}
          />
          <Action
            title="인증코드 발송"
            disabled={task.pending || !email || sentEmail === email}
            onPress={() =>
              void task.run(async () => {
                const target = email.trim();
                await postApiAuthEmailVerificationResetSend({ email: target });
                setSentEmail(target);
              })
            }
          />
          {sentEmail && sentEmail === email ? (
            <>
              <Field
                label="인증코드"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
              <Action
                title="확인 및 비밀번호 초기화"
                disabled={task.pending || !code}
                onPress={() =>
                  void task.run(async () => {
                    await postApiAuthEmailVerificationResetVerify({
                      email: sentEmail,
                      code,
                    });
                    await postApiAuthResetPassword({ email: sentEmail });
                    setDone(true);
                  })
                }
              />
            </>
          ) : null}
          <Message error={task.error} />
        </>
      )}
    </Screen>
  );
}
export function SignUpScreen() {
  const profile = useSyncExternalStore(
    providerFlow.subscribe,
    providerFlow.niceResult,
    () => null,
  );
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [availableEmail, setAvailableEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedUsername, setVerifiedUsername] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [emailAgree, setEmailAgree] = useState(false);
  const [smsAgree, setSmsAgree] = useState(false);
  const [snsAgree, setSnsAgree] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const current = useRef({ email: "", username: "" });
  const task = useTask();
  const start = () =>
    void task.run(async () => {
      providerFlow.completeNice(null);
      const sessionId = randomUUID();
      const origin =
        process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://whiskynavi.com";
      const returnUrl = new URL(
        `/nice/callback?niceSessionId=${sessionId}`,
        origin,
      ).href;
      const { data } = await postApiUserNiceidSession({ returnUrl });
      if (
        !data.authUrl ||
        !data.requestNo ||
        new URL(data.authUrl).protocol !== "https:"
      )
        throw new Error("본인인증 세션을 시작하지 못했습니다.");
      providerFlow.set({
        kind: "nice",
        url: data.authUrl,
        returnUrl,
        sessionId,
        requestNo: data.requestNo,
      });
      router.push("/provider");
    });
  return (
    <Screen title="회원가입">
      <Label>본인인증 후 이메일과 닉네임을 등록해 주세요.</Label>
      <Action
        title={profile ? "본인인증 다시 하기" : "본인인증 시작"}
        onPress={start}
        disabled={task.pending}
      />
      <Message error={task.error} />
      {profile ? (
        <View style={{ gap: 20 }}>
          <Label>
            {profile.name} · {profile.phone} · {profile.birthDate}
          </Label>
          <Field
            label="이메일 주소"
            value={email}
            keyboardType="email-address"
            onChangeText={(v) => {
              current.current.email = v;
              setEmail(v);
              setAvailableEmail("");
              setVerifiedEmail("");
            }}
          />
          <Action
            secondary
            title="이메일 중복 확인 및 인증코드 발송"
            disabled={task.pending || !email}
            onPress={() =>
              void task.run(async () => {
                const target = email;
                const { data } = await postApiAuthCheckEmail({ email: target });
                if (!data.available)
                  throw new Error("이미 사용 중인 이메일입니다.");
                await postApiAuthEmailVerificationSend({ email: target });
                if (current.current.email === target) setAvailableEmail(target);
              })
            }
          />
          {availableEmail === email && email ? (
            <>
              <Field
                label="이메일 인증코드"
                value={code}
                onChangeText={setCode}
              />
              <Action
                secondary
                title={
                  verifiedEmail === email ? "이메일 인증 완료" : "인증코드 확인"
                }
                disabled={task.pending || !code || verifiedEmail === email}
                onPress={() =>
                  void task.run(async () => {
                    const target = email;
                    await postApiAuthEmailVerificationVerify({
                      email: target,
                      code,
                    });
                    if (current.current.email === target)
                      setVerifiedEmail(target);
                  })
                }
              />
            </>
          ) : null}
          <Field
            label="닉네임 (한글·영문·숫자 2~16자)"
            value={username}
            onChangeText={(v) => {
              current.current.username = v;
              setUsername(v);
              setVerifiedUsername("");
            }}
          />
          <Action
            secondary
            title={
              verifiedUsername === username && username
                ? "닉네임 확인 완료"
                : "닉네임 중복 확인"
            }
            disabled={
              task.pending || !/^[가-힣A-Za-z0-9]{2,16}$/.test(username)
            }
            onPress={() =>
              void task.run(async () => {
                const target = username;
                const { data } = await postApiAuthCheckUsername({
                  username: target,
                });
                if (!data.available)
                  throw new Error("이미 사용 중인 닉네임입니다.");
                if (current.current.username === target)
                  setVerifiedUsername(target);
              })
            }
          />
          <Field
            label="비밀번호 (6~100자)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Field
            label="비밀번호 확인"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <NavLink href="/terms">이용약관 보기</NavLink>
          <Toggle
            label="[필수] 이용약관 동의"
            value={terms}
            onChange={setTerms}
          />
          <Action
            secondary
            title="개인정보 수집·이용 내용 보기"
            onPress={() => setPrivacyOpen(true)}
          />
          <Sheet
            visible={privacyOpen}
            title="개인정보 수집·이용"
            onDismiss={() => setPrivacyOpen(false)}
          >
            <Label>{PRIVACY_TEXT}</Label>
          </Sheet>
          <Toggle
            label="[필수] 개인정보 수집 및 이용 동의"
            value={privacy}
            onChange={setPrivacy}
          />
          <Toggle
            label="[선택] 이메일·SMS·SNS 광고성 정보 수신 동의"
            value={marketing}
            onChange={(value) => {
              setMarketing(value);
              setEmailAgree(value);
              setSmsAgree(value);
              setSnsAgree(value);
            }}
          />
          <Toggle
            label="이메일 수신 동의"
            value={emailAgree}
            onChange={(value) => {
              setEmailAgree(value);
              setMarketing(value && smsAgree && snsAgree);
            }}
          />
          <Toggle
            label="SMS 수신 동의"
            value={smsAgree}
            onChange={(value) => {
              setSmsAgree(value);
              setMarketing(value && emailAgree && snsAgree);
            }}
          />
          <Toggle
            label="SNS 수신 동의"
            value={snsAgree}
            onChange={(value) => {
              setSnsAgree(value);
              setMarketing(value && emailAgree && smsAgree);
            }}
          />
          <Action
            title="가입하기"
            disabled={
              task.pending ||
              !terms ||
              !privacy ||
              verifiedEmail !== email ||
              !email ||
              verifiedUsername !== username ||
              !username ||
              password.length < 6 ||
              password.length > 100 ||
              password !== confirmPassword
            }
            onPress={() =>
              void task.run(async () => {
                if (
                  !profile.niceRequestNo ||
                  !profile.niceWebTransactionId ||
                  !profile.name ||
                  !profile.phone
                )
                  throw new Error("본인인증을 다시 진행해 주세요.");
                await postApiAuthSignup({
                  ...profile,
                  name: profile.name,
                  phone: profile.phone,
                  niceRequestNo: profile.niceRequestNo,
                  niceWebTransactionId: profile.niceWebTransactionId,
                  email,
                  username,
                  password,
                  privacyAgree: privacy,
                  marketingAgree: marketing,
                  emailAgree,
                  smsAgree,
                  snsAgree,
                });
                providerFlow.completeNice(null);
                router.replace("/sign-in?registered=true");
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}
export function NiceCallbackScreen() {
  return (
    <Screen title="본인인증 결과">
      <Label>
        진행 중인 인증 화면으로 돌아가 주세요. 외부 링크만으로 본인인증을 완료할
        수 없습니다.
      </Label>
      <NavLink href="/sign-up">회원가입으로 돌아가기</NavLink>
    </Screen>
  );
}

import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Button, Linking, View } from "react-native";
import { WebView } from "react-native-webview";
import { postApiUserNiceidResult } from "@/apis/generated/api";
import { Action, Label, Message, Screen, styles } from "@/components/native/ui";
import { matchesCallback, validatePaymentReturn } from "@/lib/callback-policy";
import { externalAppUrl } from "@/lib/external-app-url";
import { paymentHtml, providerFlow } from "@/lib/provider-flow";

export default function ProviderScreen() {
  const [flow] = useState(providerFlow.get);
  const [error, setError] = useState<unknown>(null);
  const [popupUrl, setPopupUrl] = useState<string>();
  const handled = useRef(false);
  const canceled = useRef(false);
  useEffect(() => {
    canceled.current = false;
    return () => {
      canceled.current = true;
    };
  }, []);
  if (!flow)
    return (
      <Screen title="요청이 만료되었습니다">
        <Label>이전 화면에서 본인인증 또는 결제를 다시 시작해 주세요.</Label>
        <Action title="홈으로" onPress={() => router.replace("/")} />
      </Screen>
    );
  const acceptUrl = (url: string) => {
    if (flow.kind === "nice" && matchesCallback(url, flow.returnUrl)) {
      if (handled.current) return false;
      handled.current = true;
      const params = new URL(url).searchParams;
      if (
        params.get("niceSessionId") !== flow.sessionId ||
        !params.get("web_transaction_id")
      ) {
        setError(
          new Error("인증 결과가 일치하지 않습니다. 다시 인증해 주세요."),
        );
        return false;
      }
      void postApiUserNiceidResult({
        requestNo: flow.requestNo,
        webTransactionId: params.get("web_transaction_id")!,
      })
        .then(({ data }) => {
          if (canceled.current) return;
          if (!data.name || !data.phone || !data.birthDate)
            throw new Error("본인인증 결과 정보가 부족합니다.");
          providerFlow.completeNice({
            ...data,
            niceRequestNo: flow.requestNo,
            niceWebTransactionId: params.get("web_transaction_id")!,
          });
          providerFlow.set(null);
          router.back();
        })
        .catch((error) => {
          if (!canceled.current) setError(error);
        });
      return false;
    }
    if (
      flow.kind === "payment" &&
      flow.ticket.successUrl &&
      matchesCallback(url, flow.ticket.successUrl)
    ) {
      if (handled.current) return false;
      handled.current = true;
      try {
        const result = validatePaymentReturn(url, {
          successUrl: flow.ticket.successUrl,
          pgOrderId: flow.ticket.pgOrderId!,
          amount: flow.ticket.amount!,
        });
        const paths = {
          cart: "/general-items/cart/order/toss/success",
          direct: "/general-items/cart/order/toss/success",
          ticket: "/ticket-products/order/toss/success",
          smart: "/smart-order/toss/success",
        };
        router.replace(
          `${paths[flow.channel]}?${new URLSearchParams({ orderId: result.pgOrderId, amount: String(result.amount), paymentKey: result.paymentKey })}` as never,
        );
      } catch (err) {
        setError(err);
      }
      return false;
    }
    if (
      flow.kind === "payment" &&
      flow.ticket.failUrl &&
      matchesCallback(url, flow.ticket.failUrl)
    ) {
      if (handled.current) return false;
      handled.current = true;
      const paths = {
        cart: "/general-items/cart/order/toss/fail",
        direct: "/general-items/cart/order/toss/fail",
        ticket: "/ticket-products/order/toss/fail",
        smart: "/smart-order/toss/fail",
      };
      router.replace(
        `${paths[flow.channel]}?${new URL(url).searchParams}` as never,
      );
      providerFlow.set(null);
      return false;
    }
    if (/^(https?:|about:)/.test(url)) return true;
    if (/^(javascript|data|file):/i.test(url)) return false;
    let appUrl: string;
    try {
      appUrl = externalAppUrl(url);
    } catch (error) {
      setError(error);
      return false;
    }
    void Linking.openURL(appUrl).catch(() =>
      setError(
        new Error(
          "인증·결제 앱을 열지 못했습니다. 해당 앱 설치 여부를 확인해 주세요.",
        ),
      ),
    );
    return false;
  };
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              title="닫기"
              color="#e9ae62"
              onPress={() => {
                canceled.current = true;
                providerFlow.set(null);
                router.back();
              }}
            />
          ),
        }}
      />
      {error ? (
        <Screen title="처리하지 못했습니다">
          <Message error={error} />
          <Action
            title="돌아가기"
            onPress={() => {
              providerFlow.set(null);
              router.back();
            }}
          />
        </Screen>
      ) : (
        <WebView
          source={
            popupUrl
              ? { uri: popupUrl }
              : flow.kind === "nice"
                ? { uri: flow.url }
                : {
                    html: paymentHtml(flow),
                    baseUrl: new URL(flow.ticket.successUrl!).origin,
                  }
          }
          onOpenWindow={({ nativeEvent }) => {
            if (acceptUrl(nativeEvent.targetUrl))
              setPopupUrl(nativeEvent.targetUrl);
          }}
          originWhitelist={["*"]}
          onShouldStartLoadWithRequest={(request) => acceptUrl(request.url)}
          onNavigationStateChange={(state) => {
            acceptUrl(state.url);
          }}
          onError={() =>
            setError(
              new Error(
                "인증·결제 화면을 불러오지 못했습니다. 다시 시도해 주세요.",
              ),
            )
          }
          javaScriptEnabled
          setSupportMultipleWindows={false}
          mixedContentMode="never"
        />
      )}
    </View>
  );
}

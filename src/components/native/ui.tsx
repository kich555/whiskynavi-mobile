import { Check, ImageIcon } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { GlassBackdrop, material } from "./material";
import { Link, router, type Href, usePathname } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/providers";

export const colors = {
  background: "#1d2429",
  surface: "#252d32",
  text: "#ffffff",
  muted: "#9ca3af",
  accent: "#ffffff",
  line: "#ffffff1a",
  danger: "#ffb4ac",
  commerce: "#92400e",
  available: "#166534",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontFamily: "NaviSansBold",
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 36,
  },
  heading: {
    fontFamily: "NaviSansBold",
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 28,
  },
  text: {
    fontFamily: "NaviSans",
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  muted: {
    fontFamily: "NaviSans",
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    fontFamily: "NaviSans",
    color: colors.danger,
    fontSize: 15,
    lineHeight: 23,
  },
  section: {
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 14,
    fontFamily: "NaviSansMedium",
    color: colors.text,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: material.pearl,
    borderWidth: 1,
    borderColor: material.highlight,
    overflow: "hidden",
    boxShadow: material.shadow,
  },
  buttonText: {
    fontFamily: "NaviSansMedium",
    color: colors.background,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 24,
  },
  link: {
    fontFamily: "NaviSansMedium",
    color: colors.text,
    fontSize: 14,
    lineHeight: 24,
    paddingVertical: 12,
    fontWeight: "500",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: 0,
    borderCurve: "continuous",
  },
});
export function Label({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <Text selectable style={muted ? styles.muted : styles.text}>
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Action({
  title,
  onPress,
  disabled,
  accessibilityLabel,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  secondary?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={title === "로그인" ? "action-sign-in" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? {
              backgroundColor: pressed ? "#ffffff16" : material.fill,
              borderColor: material.edge,
            }
          : null,
        { opacity: disabled ? 0.42 : pressed ? 0.78 : 1 },
        focused
          ? { borderColor: material.focus, boxShadow: "0 0 0 2px #bdd2df55" }
          : null,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          secondary ? ["#ffffff0c", "#ffffff00"] : ["#ffffff80", "#ffffff00"]
        }
        style={StyleSheet.absoluteFill}
      />
      <Text
        style={[styles.buttonText, secondary ? { color: colors.text } : null]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function NavLink({
  href,
  children,
  onPress,
}: {
  href: string;
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Link href={href as Href} style={styles.link} onPress={onPress}>
      {children}
    </Link>
  );
}
export function Field({
  label,
  error,
  inputRef,
  trailing,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  inputRef?: import("react").Ref<TextInput>;
  trailing?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{ ...styles.muted, fontSize: 13, fontFamily: "NaviSansMedium" }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 54,
          borderWidth: 1,
          borderRadius: 16,
          borderCurve: "continuous",
          paddingRight: trailing ? 6 : 0,
          backgroundColor: focused ? "#ffffff0c" : material.fill,
          borderColor: error
            ? colors.danger
            : focused
              ? material.focus
              : material.edge,
          boxShadow: focused ? "0 0 0 2px #bdd2df18" : "none",
        }}
      >
        <TextInput
          ref={inputRef}
          aria-invalid={Boolean(error)}
          accessibilityHint={error}
          aria-describedby={error ? `${props.nativeID}-error` : undefined}
          testID={
            label === "이메일 주소"
              ? "field-email"
              : label === "비밀번호"
                ? "field-password"
                : label === "제목"
                  ? "field-title"
                  : label === "내용"
                    ? "field-content"
                    : undefined
          }
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            Platform.OS === "web" ? { outlineWidth: 0 } : null,
            { flex: 1 },
            props.multiline
              ? { minHeight: 140, textAlignVertical: "top" }
              : null,
            props.style,
            error ? { borderColor: colors.danger } : null,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text
          nativeID={`${props.nativeID}-error`}
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function ChoiceRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const [focused, setFocused] = useState(false);
  // RN Web 0.21 handles Enter for checkbox roles, but reserves Space for buttons.
  const keyboardProps =
    Platform.OS === "web"
      ? {
          onKeyDown: (event: {
            key: string;
            repeat: boolean;
            altKey: boolean;
            ctrlKey: boolean;
            metaKey: boolean;
            preventDefault: () => void;
          }) => {
            if (
              event.key === " " &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault();
              if (!event.repeat) onChange(!checked);
            }
          },
        }
      : {};
  return (
    <Pressable
      {...keyboardProps}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={checked}
      accessibilityState={{ checked }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: focused
          ? material.focus
          : checked
            ? "#b8cedd66"
            : "#ffffff14",
        backgroundColor: checked
          ? material.selected
          : pressed
            ? "#ffffff10"
            : "#ffffff04",
        opacity: pressed ? 0.75 : 1,
        overflow: "hidden",
      })}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[checked ? "#ffffff0d" : "#ffffff06", "#ffffff00"]}
        style={StyleSheet.absoluteFill}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 26,
          height: 26,
          borderRadius: 9,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: checked ? "#eef5f9" : "#9eafba",
          backgroundColor: checked ? material.pearl : "#ffffff05",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <Check size={17} strokeWidth={2.5} color={colors.background} />
        ) : null}
      </View>
      <Text
        style={[
          styles.text,
          {
            flex: 1,
            fontFamily: checked ? "NaviSansMedium" : "NaviSans",
            fontSize: 15,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={selected}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 24,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: focused
          ? material.focus
          : selected
            ? "#ffffff80"
            : material.edge,
        boxShadow: focused ? "0 0 0 2px #bdd2df44" : "none",
        backgroundColor: selected ? material.pearl : material.fill,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[selected ? "#ffffff55" : "#ffffff0d", "#ffffff00"]}
        style={StyleSheet.absoluteFill}
      />
      <Text
        style={{
          ...styles.text,
          fontFamily: "NaviSansMedium",
          color: selected ? colors.background : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return <ChoiceRow label={label} checked={value} onChange={onChange} />;
}

export function Message({ error }: { error: unknown }) {
  return error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error instanceof Error ? error.message : String(error)}
    </Text>
  ) : null;
}
export function Photo({ uri, label }: { uri?: string; label: string }) {
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <View style={styles.image}>
      {!uri || failedUri === uri ? (
        <View
          accessibilityLabel={`${label} 이미지 없음`}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#e5e5e5",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <ImageIcon size={48} color="#a3a3a3" strokeWidth={1.5} />
        </View>
      ) : (
        <Image
          source={{ uri }}
          accessibilityLabel={label}
          contentFit="contain"
          onError={() => setFailedUri(uri)}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
export function Gallery({
  images,
  label,
}: {
  images: (string | undefined)[];
  label: string;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const unique = [
    ...new Set(images.filter((uri): uri is string => Boolean(uri))),
  ];
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ gap: 12 }}
    >
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(
            Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)),
          )
        }
      >
        {unique.map((uri) => (
          <View
            key={uri}
            style={{
              width: width || 300,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.background,
            }}
          >
            <Photo uri={uri} label={label} />
          </View>
        ))}
      </ScrollView>
      {unique.length === 0 ? <Photo label={label} /> : null}
      {unique.length > 1 ? (
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Action
            secondary
            title="이전 이미지"
            disabled={index === 0}
            onPress={() => {
              const next = Math.max(0, index - 1);
              setIndex(next);
              scroll.current?.scrollTo({ x: next * width, animated: false });
            }}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {index + 1} / {unique.length}
          </Text>
          <Action
            secondary
            title="다음 이미지"
            disabled={index >= unique.length - 1}
            onPress={() => {
              const next = Math.min(unique.length - 1, index + 1);
              setIndex(next);
              scroll.current?.scrollTo({ x: next * width, animated: false });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
export function Screen({
  title,
  children,
  refresh,
  refreshing = false,
  contentStyle,
  scrollRef,
}: {
  scrollRef?: import("react").Ref<ScrollView>;
  title?: string;
  children: ReactNode;
  contentStyle?: import("react-native").StyleProp<
    import("react-native").ViewStyle
  >;
  refresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.accent}
              />
            ) : undefined
          }
          contentContainerStyle={[styles.content, contentStyle]}
        >
          {title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 24 }}>
      <ActivityIndicator
        accessibilityLabel="불러오는 중"
        color={colors.accent}
      />
    </View>
  );
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, signedIn } = useSession();
  const pathname = usePathname();
  if (!ready) return <Loading />;
  if (!signedIn)
    return (
      <Screen title="로그인이 필요합니다">
        <NavLink href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}>
          로그인하고 계속하기
        </NavLink>
      </Screen>
    );
  return children;
}
export function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <View style={styles.row}>
      <Action
        title="−"
        accessibilityLabel="수량 줄이기"
        secondary
        disabled={value <= 1}
        onPress={() => onChange(value - 1)}
      />
      <Label>{value}개</Label>
      <Action
        title="+"
        accessibilityLabel="수량 늘리기"
        secondary
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}
export function confirmAction(
  title: string,
  message: string,
  action: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: "돌아가기", style: "cancel" },
    { text: "확인", style: "destructive", onPress: action },
  ]);
}
export function PagedList<T>({
  title,
  items,
  renderItem,
  page,
  onPage,
  hasNext,
  header,
  loading,
  error,
  refresh,
  columns = 1,
  columnGap = 12,
  intro,
}: {
  intro?: ReactNode;
  columnGap?: number;
  columns?: number;
  title: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  page: number;
  onPage: (page: number) => void;
  hasNext: boolean;
  header?: ReactNode;
  loading: boolean;
  error: unknown;
  refresh: () => void;
}) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.screen}>
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: columnGap } : undefined}
        data={items}
        keyExtractor={(_, i) => `${page}-${i}`}
        contentContainerStyle={[
          styles.content,
          intro ? { paddingTop: 0 } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {intro ?? (
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            )}
            {header}
            <Message error={error} />
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.section,
              columns > 1
                ? {
                    flex: 1,
                    maxWidth: "48.4%",
                    borderBottomWidth: 0,
                    paddingVertical: 0,
                    marginBottom: 12,
                    gap: 0,
                  }
                : null,
            ]}
          >
            {renderItem(item)}
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <Action title="다시 불러오기" onPress={refresh} />
          ) : (
            <Label muted>표시할 항목이 없습니다.</Label>
          )
        }
        ListFooterComponent={
          page > 0 || hasNext ? (
            <View style={styles.row}>
              <Action
                title="이전 페이지"
                secondary
                disabled={page <= 0 || loading}
                onPress={() => onPage(page - 1)}
              />
              <Label>{page + 1} 페이지</Label>
              <Action
                title="다음 페이지"
                secondary
                disabled={!hasNext || loading}
                onPress={() => onPage(page + 1)}
              />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
export function useTask() {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return { pending, error, run, clearError: () => setError(null) };
}
export const money = (value?: number) =>
  value == null ? "-" : `${value.toLocaleString("ko-KR")}원`;
export const date = (value?: string) =>
  value ? new Date(value).toLocaleString("ko-KR") : "-";
export function go(path: string) {
  router.push(path as Href);
}

export function Sheet({
  returnFocusRef,
  footer,
  visible,
  title,
  onDismiss,
  children,
}: {
  returnFocusRef?: import("react").RefObject<View | null>;
  footer?: ReactNode;
  visible: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const heading = useRef<Text>(null);
  const wasVisible = useRef(false);
  useEffect(() => {
    if (!visible && wasVisible.current && Platform.OS !== "web") {
      const timer = setTimeout(() => {
        if (returnFocusRef?.current)
          AccessibilityInfo.sendAccessibilityEvent(
            returnFocusRef.current,
            "focus",
          );
      }, 350);
      wasVisible.current = visible;
      return () => clearTimeout(timer);
    }
    wasVisible.current = visible;
  }, [visible, returnFocusRef]);
  return (
    <Modal
      visible={visible}
      onShow={() => {
        if (Platform.OS !== "web" && heading.current)
          AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
      }}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000088",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onDismiss}
          style={{ flex: 1 }}
        />
        <SafeAreaView
          accessibilityViewIsModal
          onAccessibilityEscape={onDismiss}
          edges={["bottom"]}
          style={{
            backgroundColor: "transparent",
            borderRadius: 28,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: material.edge,
            overflow: "hidden",
            marginHorizontal: 8,
            marginBottom: 8,
            maxHeight: "88%",
            boxShadow: "0 18px 48px rgba(0,0,0,0.4)",
          }}
        >
          <GlassBackdrop />
          <View style={{ padding: 20, gap: 16 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#d7e3eb66",
                alignSelf: "center",
              }}
            />
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text
                ref={heading}
                accessible
                accessibilityRole="header"
                style={[styles.heading, { flex: 1 }]}
              >
                {title}
              </Text>
              <Action secondary title="완료" onPress={onDismiss} />
            </View>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16 }}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={{
                padding: 20,
                borderTopWidth: 1,
                borderColor: colors.line,
              }}
            >
              {footer}
            </View>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { Image, useImage } from "expo-image";
import { X } from "lucide-react-native";
import { useRef, useState, type ComponentRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ImageLightbox({
  uri,
  label,
  onClose,
}: {
  uri: string;
  label: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const closeRef = useRef<ComponentRef<typeof View>>(null);
  const [failed, setFailed] = useState(false);
  const availableWidth = Math.max(1, width - 32);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom - 96);
  const image = useImage(uri, {
    maxWidth: Math.ceil(availableWidth * PixelRatio.get()),
    maxHeight: Math.ceil(availableHeight * PixelRatio.get()),
    onError: () => setFailed(true),
  });
  const ratio = image ? image.width / image.height : 1;
  const imageWidth = Math.min(availableWidth, availableHeight * ratio);
  const imageHeight = imageWidth / ratio;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        if (Platform.OS === "web") closeRef.current?.focus();
        else if (closeRef.current)
          AccessibilityInfo.sendAccessibilityEvent(closeRef.current, "focus");
      }}
    >
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="확대 이미지 배경 닫기"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000000ef" }]}
        />
        {image ? (
          <View
            pointerEvents="box-only"
            style={{ width: imageWidth, height: imageHeight }}
          >
            <Image
              source={image}
              contentFit="contain"
              accessibilityLabel={`${label} 확대 이미지`}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        ) : failed ? (
          <Text
            accessibilityRole="alert"
            style={{ fontFamily: "NaviSans", fontSize: 14, color: "white" }}
          >
            이미지를 불러오지 못했어요.
          </Text>
        ) : (
          <ActivityIndicator
            color="white"
            accessibilityLabel="확대 이미지 불러오는 중"
          />
        )}
        <Pressable
          ref={closeRef}
          accessibilityRole="button"
          accessibilityLabel="확대 이미지 닫기"
          onPress={onClose}
          style={({ pressed }) => ({
            position: "absolute",
            top: insets.top + 8,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#ffffff1a",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <X size={24} color="white" />
        </Pressable>
      </View>
    </Modal>
  );
}

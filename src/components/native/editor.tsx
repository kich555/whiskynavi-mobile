import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Platform, View } from "react-native";
import { customFetch } from "@/apis/mutator";
import { type BoardUploadResponse } from "@/apis/generated/api";
import { plainText, escapeHtml, textHtml } from "@/lib/content";
import { Action, Field, Message, Photo, useTask } from "./ui";

export function Editor({
  initial = "",
  onChange,
}: {
  initial?: string;
  onChange: (html: string) => void;
}) {
  const [text, setText] = useState(() => plainText(initial));
  const [images, setImages] = useState<string[]>(() =>
    [...initial.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
      (match) => match[1],
    ),
  );
  const task = useTask();
  const update = (value: string, urls: string[]) =>
    onChange(
      textHtml(value) +
        urls
          .map((url) => `<img src="${escapeHtml(url)}" alt="첨부 이미지" />`)
          .join(""),
    );
  return (
    <View style={{ gap: 14 }}>
      <Field
        label="내용"
        multiline
        value={text}
        onChangeText={(value) => {
          setText(value);
          update(value, images);
        }}
      />
      {images.map((url) => (
        <View key={url} style={{ gap: 8 }}>
          <Photo uri={url} label="첨부 이미지" />
          <Action
            secondary
            title="이미지 삭제"
            onPress={() => {
              const next = images.filter((v) => v !== url);
              setImages(next);
              update(text, next);
            }}
          />
        </View>
      ))}
      <Action
        secondary
        title="사진 첨부"
        disabled={task.pending || images.length >= 5}
        onPress={() =>
          void task.run(async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.9,
            });
            if (result.canceled) return;
            const image = result.assets[0];
            if ((image.fileSize ?? 0) > 5 * 1024 * 1024)
              throw new Error("사진은 5MB 이하로 선택해 주세요.");
            const type = image.mimeType ?? "image/jpeg";
            if (!["image/jpeg", "image/png", "image/webp"].includes(type))
              throw new Error("JPEG, PNG, WebP 사진을 선택해 주세요.");
            const form = new FormData();
            const file =
              Platform.OS === "web"
                ? await (await fetch(image.uri)).blob()
                : { uri: image.uri, name: image.fileName ?? "photo.jpg", type };
            form.append("file", file as Blob);
            const { data } = await customFetch<{ data: BoardUploadResponse }>(
              "/api/boards/uploads",
              { method: "POST", body: form },
            );
            if (!data.url) throw new Error("사진 업로드에 실패했습니다.");
            const next = [...images, data.url];
            setImages(next);
            update(text, next);
          })
        }
      />
      <Message error={task.error} />
    </View>
  );
}

import { Image } from "expo-image";
import { Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Heading,
  Label,
  Message,
  NavLink,
  Screen,
  styles,
} from "@/components/native/ui";
import {
  TERMS_SECTIONS,
  TERMS_EFFECTIVE_DATE,
  TERMS_NOTICE_DATE,
  TERMS_CHANGE_REASON,
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONE,
  TERMS_REPRESENTATIVE,
  TERMS_APPLICATION_NOTICE,
} from "@/lib/terms";
import { TERMS_HISTORY } from "@/lib/terms-history";
import about from "./about.json";
export function AboutScreen() {
  const { height } = useWindowDimensions();
  const philosophy = [
    {
      title: "DISCOVER",
      body: about[4],
      image: require("../../../assets/brand/about/bg-barrel.png"),
    },
    {
      title: "TASTE",
      body: about[6],
      image: require("../../../assets/brand/about/bg-glass.png"),
    },
    {
      title: "NAVIGATE",
      body: about[8],
      image: require("../../../assets/brand/about/bg-compass.png"),
    },
  ];
  const services = [
    {
      title: "SPIRIT SOURCING",
      body: about[11],
      image: require("../../../assets/brand/about/spirit-sourcing.png"),
    },
    {
      title: "CASK CURATION",
      body: about[13],
      image: require("../../../assets/brand/about/cask-curation.png"),
    },
    {
      title: "IMPORT",
      body: about[15],
      image: require("../../../assets/brand/about/cask-import.png"),
    },
    {
      title: "OEM",
      body: about[17],
      image: require("../../../assets/brand/about/cask-oem.png"),
    },
  ];
  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      <View
        style={{
          minHeight: height - 128,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 48,
          gap: 24,
          backgroundColor: "#11181e",
        }}
      >
        <Image
          source={require("../../../assets/brand/about/mobile-logo.png")}
          contentFit="contain"
          style={{ width: 180, height: 228, marginBottom: 8 }}
        />
        <Text
          style={{
            ...styles.text,
            fontFamily: "NaviSansBold",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {about[0]}
        </Text>
        {about.slice(1, 3).map((text) => (
          <Text key={text} style={[styles.muted, { textAlign: "center" }]}>
            {text}
          </Text>
        ))}
      </View>
      {philosophy.map((item) => (
        <View
          key={item.title}
          style={{
            minHeight: 460,
            justifyContent: "center",
            padding: 32,
            gap: 24,
          }}
        >
          <Image
            source={item.image}
            contentFit="cover"
            style={{ position: "absolute", inset: 0, opacity: 0.25 }}
          />
          <Text style={{ ...styles.title, fontSize: 36, lineHeight: 44 }}>
            {item.title}
          </Text>
          <Text style={styles.text}>{item.body}</Text>
        </View>
      ))}
      <View style={{ padding: 24, paddingTop: 48, gap: 32 }}>
        <Heading>WHAT WE DO</Heading>
        {services.map((item) => (
          <View key={item.title} style={{ gap: 16 }}>
            <Image
              source={item.image}
              contentFit="cover"
              style={{ width: "100%", aspectRatio: 1.5 }}
            />
            <Heading>{item.title}</Heading>
            <Label muted>{item.body}</Label>
          </View>
        ))}
        <NavLink href="/brand">브랜드 알아보기</NavLink>
        <NavLink href="/archive">발매 위스키 둘러보기</NavLink>
      </View>
    </Screen>
  );
}
export function TermsScreen() {
  const { version } = useLocalSearchParams<{ version?: string }>();
  const archived = TERMS_HISTORY.find((item) => item.version === version);
  const terms = archived ?? {
    sections: TERMS_SECTIONS,
    effectiveDate: TERMS_EFFECTIVE_DATE,
    noticeDate: TERMS_NOTICE_DATE,
    changeReason: TERMS_CHANGE_REASON,
    representative: TERMS_REPRESENTATIVE,
    contactPhone: TERMS_CONTACT_PHONE,
    contactEmail: TERMS_CONTACT_EMAIL,
  };
  if (version && !archived)
    return (
      <Screen title="이용약관">
        <Message error="해당 약관 이력을 찾을 수 없습니다." />
        <NavLink href="/terms">최신 약관 보기</NavLink>
      </Screen>
    );
  return (
    <Screen title="이용약관">
      <Label muted>
        개정 공지 {terms.noticeDate} · 시행 {terms.effectiveDate}
      </Label>
      <Label>{terms.changeReason}</Label>
      {!archived ? <Label>{TERMS_APPLICATION_NOTICE}</Label> : null}
      <NavLink href="/terms">최신 약관</NavLink>
      {TERMS_HISTORY.map((item) => (
        <NavLink key={item.version} href={`/terms?version=${item.version}`}>
          {item.effectiveDate} 시행 약관
        </NavLink>
      ))}
      {terms.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Heading>{section.title}</Heading>
          {section.paragraphs.map((paragraph) => (
            <Label key={paragraph}>{paragraph}</Label>
          ))}
        </View>
      ))}
      <Heading>약관 및 주문 관련 문의</Heading>
      <Label>주식회사 캐스크야드 · 대표 {terms.representative}</Label>
      <Label>
        {terms.contactPhone} · {terms.contactEmail}
      </Label>
    </Screen>
  );
}

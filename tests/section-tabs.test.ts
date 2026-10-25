import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createElement, cloneElement, type ReactElement } from "react";
const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as {
  renderToStaticMarkup(element: ReactElement): string;
};
import { describe, expect, it, vi } from "vitest";

// Exercise Expo's installed TabList style injection against the native ScrollView
// invariant. The web renderer does not enforce this native-only restriction.
vi.mock("react-native", () => {
  const flatten = (style: unknown): Record<string, unknown> =>
    Array.isArray(style)
      ? Object.assign({}, ...style.map(flatten))
      : ((style ?? {}) as Record<string, unknown>);
  return {
    Platform: { OS: "ios" },
    View: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children }: { children: React.ReactNode }) => children,
    Pressable: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: ({
      style,
      children,
    }: {
      style: unknown;
      children: React.ReactNode;
    }) => {
      const resolved = flatten(style);
      for (const key of ["justifyContent", "alignItems"])
        if (resolved[key] !== undefined)
          throw new Error(
            `ScrollView child layout (["${key}"]) must be applied through the contentContainerStyle prop.`,
          );
      return children;
    },
  };
});
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../src/components/native/brand", () => ({ BrandHeader: () => null }));
vi.mock("../src/components/native/ui", () => ({ colors: {} }));
vi.mock("expo-router/ui", async () => {
  const source = readFileSync(
    createRequire(import.meta.url).resolve("expo-router/build/ui/TabList.js"),
    "utf8",
  );
  const exports = {};
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === "react/jsx-runtime") return { jsx: createElementForRuntime };
      if (name === "react-native")
        return { StyleSheet: { create: (styles: unknown) => styles } };
      if (name === "react-native-safe-area-context")
        return {
          SafeAreaView: ({ children }: { children: React.ReactNode }) =>
            children,
        };
      if (name === "./common")
        return {
          ViewSlot: ({
            children,
            style,
            ...props
          }: {
            children: ReactElement<{ style?: unknown }>;
            style: unknown;
          }) =>
            cloneElement(children, {
              ...props,
              style: [style, children.props.style],
            }),
        };
      throw new Error(`Unexpected TabList dependency: ${name}`);
    },
  });
  function createElementForRuntime(
    type: React.ElementType,
    props: Record<string, unknown>,
  ) {
    return createElement(type, props);
  }
  return {
    ...exports,
    Tabs: ({ children }: { children: React.ReactNode }) => children,
    TabTrigger: ({ children }: { children: React.ReactNode }) => children,
    TabSlot: () => null,
  };
});
import { SectionTabs } from "../src/components/native/section-tabs";

describe("native section tabs", () => {
  it("keeps Expo TabList child layout props off the native ScrollView viewport", () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(SectionTabs, {
          title: "커뮤니티",
          items: [{ name: "stories", label: "스토리", href: "/stories" }],
        }),
      ),
    ).not.toThrow();
  });
});

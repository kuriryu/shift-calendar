"use client";

import { IntlProvider } from "react-intl";
import { createTheme, ThemeProvider } from "smarthr-ui";

/** アプリの indigo-600 (#4f46e5) に合わせる */
const theme = createTheme({
  color: {
    MAIN: "#4f46e5",
    TEXT_LINK: "#4f46e5",
    BRAND: "#4f46e5",
  },
});

export default function SmartHRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IntlProvider
      locale="ja"
      onError={(e) => {
        // smarthr-ui の日本語メッセージ欠落はデフォルト表示に任せる
        if (e.code === "MISSING_TRANSLATION") return;
        console.error(e);
      }}
    >
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </IntlProvider>
  );
}

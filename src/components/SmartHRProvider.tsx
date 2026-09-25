"use client";

import { IntlProvider } from "react-intl";
import { createTheme, ThemeProvider } from "smarthr-ui";

/** アプリのプライマリー blue-600 (#2563eb) に合わせる */
const theme = createTheme({
  color: {
    MAIN: "#2563eb",
    TEXT_LINK: "#2563eb",
    BRAND: "#2563eb",
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

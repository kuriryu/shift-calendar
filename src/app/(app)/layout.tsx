import AppShell from "@/components/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証は一旦無効化（ログイン画面なしで誰でもアクセス可能）
  // 復活させる場合は Supabase のユーザーを取得して email を渡す
  return <AppShell email={null}>{children}</AppShell>;
}

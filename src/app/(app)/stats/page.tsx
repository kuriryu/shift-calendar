import { redirect } from "next/navigation";

// 集計ページは一旦非公開（StatsView コンポーネントは復元用に残している）
export default function StatsPage() {
  redirect("/");
}

import { redirect } from "next/navigation";

// シフト表はダッシュボードに統合したためリダイレクト
export default function ShiftsPage() {
  redirect("/");
}

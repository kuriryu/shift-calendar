import RedirectToStep from "@/components/RedirectToStep";

// スタッフ管理はトップのステップ3に統合したためリダイレクト
export default function StaffPage() {
  return <RedirectToStep step={3} />;
}

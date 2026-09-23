import RedirectToStep from "@/components/RedirectToStep";

// スタッフ管理はトップのステップ2に統合したためリダイレクト
export default function StaffPage() {
  return <RedirectToStep step={2} />;
}

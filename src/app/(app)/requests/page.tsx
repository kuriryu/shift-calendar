import RedirectToStep from "@/components/RedirectToStep";

// 希望入力はトップのステップ3に統合したためリダイレクト
export default function RequestsPage() {
  return <RedirectToStep step={3} />;
}

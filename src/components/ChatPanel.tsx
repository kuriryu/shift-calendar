"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";

type Message = { role: "user" | "assistant"; text: string };

const GREETING: Message = {
  role: "assistant",
  text: "シフトの調整をお手伝いします。例:「10日のAさんとBさんを交代して」「15日のAさんを9:00-13:00に変更して」",
};

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const applyAiCommand = useAppStore((s) => s.applyAiCommand);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const reply = applyAiCommand(text);
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: reply },
    ]);
    setInput("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl text-white shadow-lg hover:bg-blue-700"
        aria-label="AIアシスタントを開く"
      >
        ✦
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 bg-blue-600 px-3 py-2">
        <span className="text-sm font-semibold text-white">AIアシスタント</span>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-1.5 text-blue-100 hover:bg-blue-500"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-slate-100 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="例: 10日のAさんを休みにして"
          className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
        />
        <button
          onClick={send}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          送信
        </button>
      </div>
    </div>
  );
}

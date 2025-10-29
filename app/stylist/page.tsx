"use client";

import * as React from "react";
import { usePrefs } from "@/lib/hooks/usePrefs";

export default function StylistPage() {
  const { prefs, update } = usePrefs();
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const newMsg = { role: "user" as const, text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, prefs }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I couldn’t style this right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[90vh] grid-cols-1 gap-6 bg-[#FAF9F6] p-4 md:grid-cols-[280px_1fr] md:p-10">
      {/* Sidebar — Preferences */}
      <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Preferences</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-gray-600">Gender</span>
            <select
              value={prefs.gender ?? ""}
              onChange={(e) => update({ gender: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1"
            >
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>

          <label className="block">
            <span className="text-gray-600">Body Type</span>
            <select
              value={prefs.bodyType ?? ""}
              onChange={(e) => update({ bodyType: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1"
            >
              <option value="">Select</option>
              <option value="pear">Pear</option>
              <option value="hourglass">Hourglass</option>
              <option value="apple">Apple</option>
              <option value="rectangle">Rectangle</option>
            </select>
          </label>

          <label className="block">
            <span className="text-gray-600">Budget</span>
            <select
              value={prefs.budget ?? ""}
              onChange={(e) => update({ budget: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1"
            >
              <option value="">Select</option>
              <option value="high-street">High-street</option>
              <option value="mid">Mid</option>
              <option value="luxury">Luxury</option>
            </select>
          </label>

          <label className="block">
            <span className="text-gray-600">Region</span>
            <select
              value={prefs.region ?? ""}
              onChange={(e) => update({ region: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1"
            >
              <option value="">Auto</option>
              <option value="EU">EU</option>
              <option value="US">US</option>
            </select>
          </label>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Muse + occasion → I’ll assemble a shoppable outfit with capsule-friendly picks.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-black" : "text-neutral-700"}>
                <b>{m.role === "user" ? "You:" : "Stylist:"}</b> {m.text}
              </div>
            ))
          )}
          {loading && <p className="text-sm text-gray-400">Styling your look… ✨</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="e.g. Zendaya, Paris gala, 18°C drizzle, smart-casual"
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-black"
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

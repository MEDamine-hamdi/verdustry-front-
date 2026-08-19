"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  sendAssistantMessage,
  fetchAssistantHistory,
  type AssistantChatMessage,
  type ChatSource,
} from "@/lib/api";
type DisplayMessage = AssistantChatMessage & { sources?: ChatSource[] };

export default function AssistantPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const companyId = session?.user?.companyId;

    const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !companyId) return;
    setLoadingHistory(true);
    fetchAssistantHistory(token, companyId)
      .then((history) => {
        setMessages(
          history.map((h) => ({ role: h.role, content: h.content, sources: h.sources })),
        );
      })
      .catch(() => {
        // Historique indisponible — on démarre simplement une conversation vide.
      })
      .finally(() => setLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !token || !companyId || loading) return;

    const userMsg: DisplayMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const history = nextMessages.map(({ role, content }) => ({ role, content }));
      const res = await sendAssistantMessage(token, {
        companyId,
        message: text,
        history,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="mb-4">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[var(--ink)]">
          Assistant IA
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Posez une question sur votre performance ESG ou la réglementation CSRD/CBAM/GRI.
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                    {loadingHistory ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-neutral-400">
              Chargement de l&apos;historique…
            </div>
          ) : (
            messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-center text-sm text-neutral-400">
                Aucune question pour l&apos;instant. Essayez : &laquo;&nbsp;Quel est mon écart par
                rapport au seuil CBAM ?&nbsp;&raquo;
              </div>
            )
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--moss)] text-white"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/10 pt-2">
                    {m.sources.map((s, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-white/60 px-2 py-0.5 text-[10.5px] text-neutral-600"
                      >
                        {s.sourceType === "regulatory" ? "Réglementation" : "Données entreprise"}
                        {" · "}
                        {s.sourceRef}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-neutral-100 px-4 py-2.5 text-[13.5px] text-neutral-400">
                L&apos;assistant rédige une réponse…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2.5 border-t border-neutral-200 px-4 py-3.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre question…"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-[13.5px] outline-none focus:border-[var(--moss)]"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-[var(--moss)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
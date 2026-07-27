"use client";

import {
  CalendarDays,
  CheckCircle2,
  Heart,
  LoaderCircle,
  MapPin,
  Send,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

type Invitation = {
  code: string;
  guestName: string;
  relation: string;
  invitedCount: number;
  coupleNames: string;
  weddingDate: string;
  city: string;
  rsvp: "待确认" | "会到场" | "不参加";
  attendingCount: number;
  companion: boolean;
  dietary: string;
  message: string;
  respondedAt: string | null;
};

export function RsvpClient({ code }: { code: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [rsvp, setRsvp] = useState<"会到场" | "不参加">("会到场");
  const [attendingCount, setAttendingCount] = useState(1);
  const [companion, setCompanion] = useState(false);
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadInvitation() {
      try {
        const response = await fetch(`/api/rsvp?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          invitation?: Invitation;
          error?: string;
        };
        if (!response.ok || !result.invitation) {
          throw new Error(result.error || "邀请读取失败。");
        }
        const next = result.invitation;
        setInvitation(next);
        setRsvp(next.rsvp === "不参加" ? "不参加" : "会到场");
        setAttendingCount(Math.max(1, next.attendingCount || next.invitedCount));
        setCompanion(next.companion);
        setDietary(next.dietary);
        setMessage(next.message);
        setStatus(next.respondedAt ? "saved" : "ready");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "邀请读取失败。");
        setStatus("error");
      }
    }
    void loadInvitation();
    return () => controller.abort();
  }, [code]);

  async function submitResponse() {
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/rsvp", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          rsvp,
          attendingCount,
          companion,
          dietary,
          message,
        }),
      });
      const result = (await response.json()) as {
        invitation?: Invitation;
        error?: string;
      };
      if (!response.ok || !result.invitation) {
        throw new Error(result.error || "回执提交失败。");
      }
      setInvitation(result.invitation);
      setStatus("saved");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "回执提交失败。");
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return (
      <main className="rsvp-page rsvp-centered">
        <LoaderCircle className="rsvp-spinner" size={30} aria-hidden="true" />
        <strong>正在打开婚礼邀请</strong>
      </main>
    );
  }

  if (status === "error" || !invitation) {
    return (
      <main className="rsvp-page rsvp-centered">
        <span className="rsvp-seal">喜</span>
        <h1>这份邀请暂时无法打开</h1>
        <p>{error || "请向新人确认最新邀请地址。"}</p>
      </main>
    );
  }

  return (
    <main className="rsvp-page">
      <section className="rsvp-invitation">
        <header>
          <span className="rsvp-seal">喜</span>
          <div>
            <small>喜缘 · 婚礼邀请</small>
            <strong>{invitation.coupleNames}</strong>
          </div>
        </header>
        <div className="rsvp-title">
          <Heart size={24} fill="currentColor" aria-hidden="true" />
          <span>诚邀</span>
          <h1>{invitation.guestName}</h1>
          <p>见证我们人生中重要而温柔的一天</p>
        </div>
        <div className="rsvp-event-meta">
          <div>
            <CalendarDays size={19} aria-hidden="true" />
            <span>婚礼日期</span>
            <strong>{invitation.weddingDate}</strong>
          </div>
          <div>
            <MapPin size={19} aria-hidden="true" />
            <span>婚礼城市</span>
            <strong>{invitation.city}</strong>
          </div>
          <div>
            <UsersRound size={19} aria-hidden="true" />
            <span>邀请人数</span>
            <strong>{invitation.invitedCount} 人</strong>
          </div>
        </div>
      </section>

      <section className="rsvp-form" aria-label="婚礼出席回执">
        <div className="rsvp-form-heading">
          <div>
            <small>{invitation.relation}</small>
            <h2>请告诉我们是否到场</h2>
          </div>
          {invitation.respondedAt && (
            <span>
              <CheckCircle2 size={16} aria-hidden="true" />
              已回复
            </span>
          )}
        </div>

        <div className="rsvp-choice" role="group" aria-label="是否参加">
          <button
            type="button"
            className={rsvp === "会到场" ? "selected" : ""}
            onClick={() => setRsvp("会到场")}
          >
            欣然赴约
          </button>
          <button
            type="button"
            className={rsvp === "不参加" ? "selected" : ""}
            onClick={() => setRsvp("不参加")}
          >
            遗憾缺席
          </button>
        </div>

        {rsvp === "会到场" && (
          <div className="rsvp-fields">
            <label>
              实际到场人数
              <input
                type="number"
                min={1}
                max={Math.max(1, invitation.invitedCount + 1)}
                value={attendingCount}
                onChange={(event) =>
                  setAttendingCount(
                    Math.max(1, Math.round(Number(event.target.value) || 1)),
                  )
                }
              />
            </label>
            <label className="rsvp-check">
              <input
                type="checkbox"
                checked={companion}
                onChange={(event) => setCompanion(event.target.checked)}
              />
              需要携伴
            </label>
            <label className="rsvp-wide">
              饮食需求
              <input
                value={dietary}
                onChange={(event) => setDietary(event.target.value)}
                placeholder="例如：素食、海鲜过敏、需要儿童餐"
                maxLength={160}
              />
            </label>
          </div>
        )}

        <label className="rsvp-message">
          给新人的留言
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="写下一句祝福或需要提前说明的事情"
            maxLength={300}
          />
        </label>
        {error && <p className="rsvp-error">{error}</p>}
        {status === "saved" && (
          <p className="rsvp-success">回执已经送达，新人会在备婚清单中看到。</p>
        )}
        <button
          type="button"
          className="rsvp-submit"
          onClick={() => void submitResponse()}
          disabled={status === "saving"}
        >
          {status === "saving" ? (
            <LoaderCircle className="rsvp-spinner" size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          {invitation.respondedAt ? "更新回执" : "提交回执"}
        </button>
      </section>
    </main>
  );
}

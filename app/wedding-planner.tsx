"use client";

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Heart,
  Image,
  MessageSquareText,
  Play,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type TaskStatus = "已完成" | "进行中" | "待确认";

type Task = {
  id: number;
  title: string;
  stage: string;
  status: TaskStatus;
};

const tasks: Task[] = [
  { id: 1, title: "确定婚期与预算上限", stage: "第 1 天", status: "已完成" },
  { id: 2, title: "整理双方宾客名单", stage: "第 2 天", status: "进行中" },
  { id: 3, title: "收集喜欢的婚礼风格图", stage: "第 3 天", status: "待确认" },
  { id: 4, title: "筛选场地与四大金刚", stage: "本周", status: "待确认" },
];

const budgetItems = [
  { name: "场地餐饮", total: 138000, paid: 60000 },
  { name: "婚礼策划", total: 42000, paid: 18000 },
  { name: "摄影摄像", total: 26000, paid: 8000 },
];

const aiSuggestions = [
  "今天只需要完成宾客名单初稿，不用一次做到完美。",
  "先确认预算上限，再反推场地和布置投入，减少后续纠结。",
  "请柬、誓词、父母致辞可以进入素材池，由 AI 分批生成。",
];

const extraTasks = [
  "确认双方父母重点需求",
  "整理婚礼当天时间表",
  "给供应商发送确认清单",
  "补充宾客座位偏好",
];

const capabilityCards = [
  {
    title: "每天一张备婚清单",
    text: "把大而乱的婚礼筹备拆成可执行的小事，完成感每天都看得见。",
    icon: ClipboardCheck,
  },
  {
    title: "AI 文案与图片灵感",
    text: "请柬、誓词、父母致辞、风格参考，都可以从一个想法开始生成。",
    icon: Sparkles,
  },
  {
    title: "预算与进度提醒",
    text: "关键节点、花费比例、待确认事项集中显示，减少遗漏和焦虑。",
    icon: ShieldCheck,
  },
];

function currency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(status: TaskStatus) {
  if (status === "已完成") return "status done";
  if (status === "进行中") return "status active";
  return "status pending";
}

export function WeddingPlanner() {
  const [prompt, setPrompt] = useState("帮我把备婚拆成每天能完成的小事");
  const [mode, setMode] = useState("文本");
  const [draft, setDraft] = useState(aiSuggestions);
  const [taskList, setTaskList] = useState(tasks);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [notice, setNotice] = useState("AI 服务已就绪，输入需求即可生成今日计划。");
  const promptRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const total = budgetItems.reduce((sum, item) => sum + item.total, 0);
    const paid = budgetItems.reduce((sum, item) => sum + item.paid, 0);
    return { total, paid, rate: Math.round((paid / total) * 100) };
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startExperience() {
    scrollToSection("service");
    promptRef.current?.focus();
    setNotice("已进入 AI 服务区，说出你们现在最想解决的备婚问题。");
  }

  function continuePlan() {
    scrollToSection("plan");
    setNotice("已定位到备婚计划，继续推进今日任务即可。");
  }

  function configureService() {
    setAiConfigured((current) => !current);
    setDraft([
      "AI 服务已按红金婚礼风格、预算提醒、协作清单三个模块完成配置。",
      "后续生成内容会优先保持喜庆、正式、好执行的语气。",
      "你可以继续输入需求，喜缘会自动拆成清单、文案或视频脚本。",
    ]);
    setNotice("AI 服务配置已更新：文案、图片、视频入口已联动。");
  }

  function selectMode(nextMode: string) {
    setMode(nextMode);
    const modePrompts: Record<string, string> = {
      文本: "帮我写一份婚礼当天流程清单",
      图片: "帮我生成红金婚礼布置灵感关键词",
      视频: "帮我生成一条备婚短视频脚本",
    };
    setPrompt(modePrompts[nextMode]);
    setNotice(`已切换到${nextMode}模式，可以直接生成对应内容。`);
  }

  function generatePlan() {
    const subject = prompt.trim() || "备婚计划";
    setDraft([
      `以${mode}模式处理「${subject}」，先拆成 3 个最小动作，今天只做第一个。`,
      "每个任务都设置负责人、截止时间和确认标准，避免反复沟通。",
      "把需要写的内容交给 AI 起草，你只保留真实故事和个人语气。",
    ]);
    setNotice("AI 已生成新的备婚建议，下面的陪伴建议已更新。");
  }

  function addTodayTask() {
    const nextTask = extraTasks[taskList.length % extraTasks.length];
    setTaskList((current) => [
      ...current,
      {
        id: current.length + 1,
        title: nextTask,
        stage: "新增",
        status: "待确认",
      },
    ]);
    setNotice(`已新增今日小事：${nextTask}`);
  }

  return (
    <main className="xiyuan-page">
      <nav className="top-nav" aria-label="喜缘导航">
        <div className="brand">
          <span className="brand-mark">
            <img src="/xiyuan-wedding-badge.svg" alt="" aria-hidden="true" />
          </span>
          <div>
            <strong>喜缘</strong>
            <small>你的 AI 备婚搭子</small>
          </div>
        </div>
        <div className="nav-actions">
          <div className="nav-links">
          <a href="#plan">备婚计划</a>
          <a href="#service">AI 服务</a>
          <a href="#details">安心清单</a>
          <a href="#collaboration">协助清单</a>
          </div>
          <button type="button" onClick={startExperience}>开始体验</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">你的 AI 备婚搭子</p>
          <h1>
            <span>喜缘 · 让备婚</span>
            <span>像恋爱一样轻松</span>
          </h1>
          <p className="hero-subtitle">
            把繁琐的婚礼筹备，拆成每天能完成的小事。
            <br />
            AI 全程陪伴，不再焦虑，不再遗漏。
          </p>

          <div className="mode-pills" aria-label="生成模式">
            {["文本", "图片", "视频"].map((item) => (
              <button
                type="button"
                className={mode === item ? "selected" : ""}
                onClick={() => selectMode(item)}
                key={item}
              >
                {item === "文本" && <CheckCircle2 size={15} aria-hidden="true" />}
                {item === "图片" && <Image size={15} aria-hidden="true" />}
                {item === "视频" && <Video size={15} aria-hidden="true" />}
                {item}
              </button>
            ))}
          </div>

          <p className="notice-bar" aria-live="polite">{notice}</p>

          <div className="prompt-row" id="service">
            <label className="prompt-box">
              <input
                ref={promptRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                aria-label="输入备婚需求"
              />
              <button type="button" onClick={generatePlan} aria-label="生成备婚计划">
                <Send size={18} aria-hidden="true" />
              </button>
            </label>
            <button type="button" className="config-button" onClick={configureService}>
              <Settings size={18} aria-hidden="true" />
              {aiConfigured ? "重新配置 AI 服务" : "配置 AI 服务"}
            </button>
          </div>
        </div>

        <aside className="ai-console" aria-label="AI 备婚控制台">
          <div className="console-top">
            <div className="heart-badge">
              <Heart size={24} fill="currentColor" aria-hidden="true" />
            </div>
            <span>{aiConfigured ? "AI 服务已配置" : "AI 服务已就绪"}</span>
          </div>
          <h2>准备好开始你们的备婚旅程了吗？</h2>
          <p>从今天起，每天只推进一小步，所有关键事项都由喜缘帮你盯住。</p>
          <button type="button" onClick={continuePlan}>
            继续备婚计划
            <ChevronRight size={19} aria-hidden="true" />
          </button>
          <div className="console-metrics">
            <div>
              <strong>{taskList.length}</strong>
              <span>今日任务</span>
            </div>
            <div>
              <strong>{totals.rate}%</strong>
              <span>预算执行</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="capability-grid" aria-label="喜缘能力">
        {capabilityCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="capability-card" key={card.title}>
              <Icon size={22} aria-hidden="true" />
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </article>
          );
        })}
      </section>

      <section className="planner-grid" id="plan">
        <article className="panel task-panel">
          <div className="section-title">
            <ClipboardCheck size={19} aria-hidden="true" />
            <h2>每天能完成的小事</h2>
          </div>
          <div className="task-list">
            {taskList.map((task) => (
              <div className="task-row" key={task.id}>
                <span className="task-icon">
                  <CheckCircle2 size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.stage}</small>
                </div>
                <span className={statusClass(task.status)}>{task.status}</span>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={addTodayTask}>
            <Plus size={17} aria-hidden="true" />
            新增今日小事
          </button>
        </article>

        <article className="panel ai-panel">
          <div className="section-title">
            <Bot size={19} aria-hidden="true" />
            <h2>AI 陪伴建议</h2>
          </div>
          <ol className="ai-result">
            {draft.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <div className="section-title">
            <CircleDollarSign size={19} aria-hidden="true" />
            <h2>预算安心感</h2>
          </div>
          <strong className="big-number">{currency(totals.total)}</strong>
          <p className="muted">
            已支付 {currency(totals.paid)} · 当前执行 {totals.rate}%
          </p>
          <div className="budget-bars">
            {budgetItems.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <meter min={0} max={item.total} value={item.paid} />
              </div>
            ))}
          </div>
        </article>

        <article className="panel timeline-panel" id="details">
          <div className="section-title">
            <CalendarDays size={19} aria-hidden="true" />
            <h2>关键节点</h2>
          </div>
          {["定预算", "选场地", "定风格", "排流程"].map((item, index) => (
            <div className="timeline-row" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </article>

        <article className="panel wide-panel" id="collaboration">
          <div className="section-title">
            <UsersRound size={19} aria-hidden="true" />
            <h2>不再遗漏的协作清单</h2>
          </div>
          <div className="feature-strip">
            <span>宾客回执</span>
            <span>供应商沟通</span>
            <span>誓词文案</span>
            <span>当天流程</span>
            <span>预算提醒</span>
          </div>
        </article>

        <article className="panel video-panel">
          <Play size={22} fill="currentColor" aria-hidden="true" />
          <div>
            <strong>生成备婚短视频脚本</strong>
            <small>把你们的故事变成可拍、可发、可纪念的内容</small>
          </div>
        </article>
      </section>

      <footer className="footer-note">
        <Sparkles size={16} aria-hidden="true" />
        喜缘会把复杂流程藏在系统里，把轻松感留给你们。
      </footer>
    </main>
  );
}

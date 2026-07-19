"use client";

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Heart,
  Image as ImageIcon,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  Video,
} from "lucide-react";
import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskStatus = "已完成" | "进行中" | "待确认";
type Mode = "文本" | "图片" | "视频";

type Task = {
  id: number;
  title: string;
  stage: string;
  status: TaskStatus;
};

type BudgetItem = {
  id: number;
  name: string;
  total: number;
  paid: number;
};

type CollaborationItem = {
  id: number;
  title: string;
  done: boolean;
};

type SavedWorkspace = {
  taskList: Task[];
  budgetList: BudgetItem[];
  collaborationList: CollaborationItem[];
  draft: string[];
  mode: Mode;
  prompt: string;
  aiConfigured: boolean;
};

const STORAGE_KEY = "xiyuan-wedding-workspace-v1";
const taskStatuses: TaskStatus[] = ["待确认", "进行中", "已完成"];

const tasks: Task[] = [
  { id: 1, title: "确定婚期与预算上限", stage: "第 1 天", status: "已完成" },
  { id: 2, title: "整理双方宾客名单", stage: "第 2 天", status: "进行中" },
  { id: 3, title: "收集喜欢的婚礼风格图", stage: "第 3 天", status: "待确认" },
  { id: 4, title: "筛选场地与四大金刚", stage: "本周", status: "待确认" },
];

const budgetItems: BudgetItem[] = [
  { id: 1, name: "场地餐饮", total: 138000, paid: 60000 },
  { id: 2, name: "婚礼策划", total: 42000, paid: 18000 },
  { id: 3, name: "摄影摄像", total: 26000, paid: 8000 },
];

const collaborationItems: CollaborationItem[] = [
  { id: 1, title: "宾客回执", done: false },
  { id: 2, title: "供应商沟通", done: true },
  { id: 3, title: "誓词文案", done: false },
  { id: 4, title: "当天流程", done: false },
  { id: 5, title: "预算提醒", done: true },
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

function nextId<T extends { id: number }>(items: T[]) {
  return Math.max(0, ...items.map((item) => item.id)) + 1;
}

function parseMoney(value: string) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function normalizeBudget(item: BudgetItem) {
  const total = Math.max(0, item.total);
  return {
    ...item,
    total,
    paid: Math.min(Math.max(0, item.paid), total),
  };
}

function buildTaskTitle(mode: Mode, subject: string) {
  if (mode === "图片") return `整理「${subject}」的风格参考`;
  if (mode === "视频") return `完成「${subject}」的视频脚本初稿`;
  return subject;
}

function buildDraft(mode: Mode, subject: string) {
  if (mode === "图片") {
    return [
      `围绕「${subject}」先确定 3 个关键词：主色、花艺、灯光氛围。`,
      "把喜欢的布置图收进同一个灵感池，统一筛掉不符合预算的方案。",
      "下一步可以把最终关键词交给策划或设计师确认落地报价。",
    ];
  }

  if (mode === "视频") {
    return [
      `「${subject}」可以拆成开场、筹备过程、情绪收束 3 个镜头。`,
      "先写 30 秒口播，再补充画面清单，避免拍摄当天临时想内容。",
      "把脚本加入今日小事后，可以继续细化为分镜和拍摄道具清单。",
    ];
  }

  return [
    `以文本模式处理「${subject}」，先拆成 3 个最小动作，今天只做第一个。`,
    "每个任务都设置负责人、截止时间和确认标准，避免反复沟通。",
    "把需要写的内容交给 AI 起草，你只保留真实故事和个人语气。",
  ];
}

export function WeddingPlanner() {
  const [prompt, setPrompt] = useState("帮我把备婚拆成每天能完成的小事");
  const [mode, setMode] = useState<Mode>("文本");
  const [draft, setDraft] = useState(aiSuggestions);
  const [taskList, setTaskList] = useState(tasks);
  const [budgetList, setBudgetList] = useState(budgetItems);
  const [collaborationList, setCollaborationList] = useState(collaborationItems);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [notice, setNotice] = useState("AI 服务已就绪，输入需求即可生成今日计划。");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const promptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          setWorkspaceLoaded(true);
          return;
        }

        const workspace = JSON.parse(saved) as Partial<SavedWorkspace>;
        if (Array.isArray(workspace.taskList)) setTaskList(workspace.taskList);
        if (Array.isArray(workspace.budgetList)) {
          setBudgetList(workspace.budgetList.map(normalizeBudget));
        }
        if (Array.isArray(workspace.collaborationList)) {
          setCollaborationList(workspace.collaborationList);
        }
        if (Array.isArray(workspace.draft)) setDraft(workspace.draft);
        if (workspace.mode && ["文本", "图片", "视频"].includes(workspace.mode)) {
          setMode(workspace.mode);
        }
        if (typeof workspace.prompt === "string") setPrompt(workspace.prompt);
        if (typeof workspace.aiConfigured === "boolean") setAiConfigured(workspace.aiConfigured);
        setNotice("已恢复上次的备婚工作台。");
      } catch {
        setNotice("本地保存读取失败，已使用默认备婚清单。");
      } finally {
        setWorkspaceLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!workspaceLoaded) return;

    const workspace: SavedWorkspace = {
      taskList,
      budgetList,
      collaborationList,
      draft,
      mode,
      prompt,
      aiConfigured,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [aiConfigured, budgetList, collaborationList, draft, mode, prompt, taskList, workspaceLoaded]);

  const totals = useMemo(() => {
    const total = budgetList.reduce((sum, item) => sum + item.total, 0);
    const paid = budgetList.reduce((sum, item) => sum + item.paid, 0);
    return {
      total,
      paid,
      rate: total > 0 ? Math.round((paid / total) * 100) : 0,
    };
  }, [budgetList]);

  const completedTasks = taskList.filter((task) => task.status === "已完成").length;
  const taskProgress = taskList.length > 0 ? Math.round((completedTasks / taskList.length) * 100) : 0;
  const completedCollaboration = collaborationList.filter((item) => item.done).length;

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

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    const modePrompts: Record<Mode, string> = {
      文本: "帮我写一份婚礼当天流程清单",
      图片: "帮我生成红金婚礼布置灵感关键词",
      视频: "帮我生成一条备婚短视频脚本",
    };
    setPrompt(modePrompts[nextMode]);
    setNotice(`已切换到${nextMode}模式，可以直接生成对应内容。`);
  }

  function generatePlan() {
    const subject = prompt.trim() || "备婚计划";
    const generatedTitle = buildTaskTitle(mode, subject);

    setDraft(buildDraft(mode, subject));
    setTaskList((current) => [
      ...current,
      {
        id: nextId(current),
        title: generatedTitle,
        stage: "AI 生成",
        status: "待确认",
      },
    ]);
    setNotice(`AI 已生成建议，并加入今日小事：${generatedTitle}`);
    scrollToSection("plan");
  }

  function addTodayTask(title?: string) {
    const nextTitle =
      title?.trim() || prompt.trim() || extraTasks[taskList.length % extraTasks.length];
    setTaskList((current) => [
      ...current,
      {
        id: nextId(current),
        title: nextTitle,
        stage: "新增",
        status: "待确认",
      },
    ]);
    setNotice(`已新增今日小事：${nextTitle}`);
  }

  function updateTask(taskId: number, patch: Partial<Task>) {
    setTaskList((current) =>
      current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    );
  }

  function cycleTaskStatus(taskId: number) {
    setTaskList((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const nextStatus = taskStatuses[(taskStatuses.indexOf(task.status) + 1) % taskStatuses.length];
        return { ...task, status: nextStatus };
      }),
    );
  }

  function deleteTask(taskId: number) {
    const task = taskList.find((item) => item.id === taskId);
    setTaskList((current) => current.filter((item) => item.id !== taskId));
    setNotice(task ? `已删除今日小事：${task.title}` : "已删除今日小事。");
  }

  function addBudgetItem() {
    setBudgetList((current) => [
      ...current,
      {
        id: nextId(current),
        name: "新增预算项",
        total: 10000,
        paid: 0,
      },
    ]);
    setNotice("已新增预算项，可以直接修改名称和金额。");
  }

  function updateBudgetItem(budgetId: number, patch: Partial<BudgetItem>) {
    setBudgetList((current) =>
      current.map((item) => (item.id === budgetId ? normalizeBudget({ ...item, ...patch }) : item)),
    );
  }

  function deleteBudgetItem(budgetId: number) {
    const budget = budgetList.find((item) => item.id === budgetId);
    setBudgetList((current) => current.filter((item) => item.id !== budgetId));
    setNotice(budget ? `已删除预算项：${budget.name}` : "已删除预算项。");
  }

  function toggleCollaboration(itemId: number) {
    setCollaborationList((current) =>
      current.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    );
  }

  function resetWorkspace() {
    setTaskList(tasks);
    setBudgetList(budgetItems);
    setCollaborationList(collaborationItems);
    setDraft(aiSuggestions);
    setMode("文本");
    setPrompt("帮我把备婚拆成每天能完成的小事");
    setAiConfigured(false);
    window.localStorage.removeItem(STORAGE_KEY);
    setNotice("已恢复第一版默认备婚工作台。");
  }

  return (
    <main className="xiyuan-page">
      <nav className="top-nav" aria-label="喜缘导航">
        <div className="brand">
          <span className="brand-mark">
            <NextImage
              src="/xiyuan-wedding-badge.svg"
              alt=""
              width={52}
              height={52}
              aria-hidden="true"
            />
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
          <button type="button" onClick={startExperience}>
            开始体验
          </button>
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
            {(["文本", "图片", "视频"] as Mode[]).map((item) => (
              <button
                type="button"
                className={mode === item ? "selected" : ""}
                onClick={() => selectMode(item)}
                key={item}
              >
                {item === "文本" && <CheckCircle2 size={15} aria-hidden="true" />}
                {item === "图片" && <ImageIcon size={15} aria-hidden="true" />}
                {item === "视频" && <Video size={15} aria-hidden="true" />}
                {item}
              </button>
            ))}
          </div>

          <p className="notice-bar" aria-live="polite">
            {notice}
          </p>

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
              <strong>{taskProgress}%</strong>
              <span>完成进度</span>
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
                <button
                  type="button"
                  className={`task-icon task-toggle ${statusClass(task.status).replace("status ", "")}`}
                  onClick={() => cycleTaskStatus(task.id)}
                  aria-label={`切换${task.title}状态`}
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                </button>
                <div className="task-copy">
                  <input
                    className="task-title-input"
                    value={task.title}
                    onChange={(event) => updateTask(task.id, { title: event.target.value })}
                    aria-label="任务标题"
                  />
                  <input
                    className="task-stage-input"
                    value={task.stage}
                    onChange={(event) => updateTask(task.id, { stage: event.target.value })}
                    aria-label="任务阶段"
                  />
                </div>
                <div className="task-actions">
                  <select
                    className={statusClass(task.status)}
                    value={task.status}
                    onChange={(event) =>
                      updateTask(task.id, { status: event.target.value as TaskStatus })
                    }
                    aria-label="任务状态"
                  >
                    {taskStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="delete-task"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`删除${task.title}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-action" onClick={() => addTodayTask()}>
              <Plus size={17} aria-hidden="true" />
              新增今日小事
            </button>
            <button type="button" className="subtle-action" onClick={resetWorkspace}>
              <RotateCcw size={16} aria-hidden="true" />
              重置
            </button>
          </div>
        </article>

        <article className="panel ai-panel">
          <div className="section-title">
            <Bot size={19} aria-hidden="true" />
            <h2>AI 陪伴建议</h2>
          </div>
          <ol className="ai-result">
            {draft.map((item) => (
              <li key={item}>
                <span>{item}</span>
                <button type="button" className="inline-action" onClick={() => addTodayTask(item)}>
                  加入任务
                </button>
              </li>
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
            {budgetList.map((item) => (
              <div className="budget-row" key={item.id}>
                <div className="budget-editor">
                  <input
                    value={item.name}
                    onChange={(event) => updateBudgetItem(item.id, { name: event.target.value })}
                    aria-label="预算名称"
                  />
                  <label>
                    总预算
                    <input
                      type="number"
                      min={0}
                      value={item.total}
                      onChange={(event) =>
                        updateBudgetItem(item.id, { total: parseMoney(event.target.value) })
                      }
                      aria-label={`${item.name}总预算`}
                    />
                  </label>
                  <label>
                    已支付
                    <input
                      type="number"
                      min={0}
                      max={item.total}
                      value={item.paid}
                      onChange={(event) =>
                        updateBudgetItem(item.id, { paid: parseMoney(event.target.value) })
                      }
                      aria-label={`${item.name}已支付`}
                    />
                  </label>
                  <button
                    type="button"
                    className="delete-task"
                    onClick={() => deleteBudgetItem(item.id)}
                    aria-label={`删除${item.name}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span>删除</span>
                  </button>
                </div>
                <meter min={0} max={Math.max(item.total, 1)} value={item.paid} />
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action budget-action" onClick={addBudgetItem}>
            <Plus size={17} aria-hidden="true" />
            添加预算
          </button>
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
          <p className="muted">
            已完成 {completedCollaboration}/{collaborationList.length} 项，点击即可切换。
          </p>
          <div className="feature-strip">
            {collaborationList.map((item) => (
              <button
                type="button"
                className={item.done ? "checked" : ""}
                onClick={() => toggleCollaboration(item.id)}
                key={item.id}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                {item.title}
              </button>
            ))}
          </div>
        </article>

        <article className="panel video-panel">
          <Play size={22} fill="currentColor" aria-hidden="true" />
          <div>
            <strong>生成备婚短视频脚本</strong>
            <small>切换到视频模式后输入主题，AI 会生成脚本并自动加入今日小事。</small>
          </div>
        </article>
      </section>

      <footer className="footer-note">
        <Sparkles size={16} aria-hidden="true" />
        喜缘会自动保存这台设备上的备婚进度，刷新页面后也能继续。
      </footer>
    </main>
  );
}

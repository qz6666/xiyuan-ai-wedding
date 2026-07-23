"use client";

import {
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  Download,
  FileSpreadsheet,
  Heart,
  Image as ImageIcon,
  ListChecks,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskStatus = "已完成" | "进行中" | "待确认";
type Mode = "文本" | "图片" | "视频";
type BudgetStatus = "待付款" | "已付定金" | "已结清";
type GuestRsvp = "待确认" | "会到场" | "不参加";
type VendorStatus = "待沟通" | "已预约" | "已签约";
type CopyKind = "誓词" | "请柬文案" | "父母致辞" | "短视频脚本" | "朋友圈文案";
type CopyTone = "温柔正式" | "喜庆热闹" | "高级简洁";

type Task = {
  id: number;
  title: string;
  stage: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  notes: string;
  criteria: string;
};

type BudgetItem = {
  id: number;
  name: string;
  total: number;
  paid: number;
  status: BudgetStatus;
};

type Guest = {
  id: number;
  name: string;
  relation: string;
  count: number;
  rsvp: GuestRsvp;
  companion: boolean;
  table: string;
  notes: string;
};

type Vendor = {
  id: number;
  category: string;
  name: string;
  contact: string;
  phone: string;
  quote: number;
  deposit: number;
  status: VendorStatus;
  notes: string;
};

type WeddingEvent = {
  id: number;
  time: string;
  title: string;
  owner: string;
  location: string;
  status: TaskStatus;
  notes: string;
};

type CopywritingDoc = {
  id: number;
  kind: CopyKind;
  tone: CopyTone;
  title: string;
  content: string;
  createdAt: string;
};

type CollaborationItem = {
  id: number;
  title: string;
  done: boolean;
};

type CoupleProfile = {
  brideName: string;
  groomName: string;
  weddingDate: string;
  city: string;
  guestCount: number;
  style: string;
  budgetCap: number;
};

type StagePlan = {
  title: string;
  window: string;
  status: TaskStatus;
  tasks: string[];
};

type SavedWorkspace = {
  profile: CoupleProfile;
  taskList: Task[];
  budgetList: BudgetItem[];
  guestList: Guest[];
  vendorList: Vendor[];
  weddingTimeline: WeddingEvent[];
  copywritingList: CopywritingDoc[];
  collaborationList: CollaborationItem[];
  draft: string[];
  mode: Mode;
  prompt: string;
  aiConfigured: boolean;
};

const STORAGE_KEY = "xiyuan-wedding-workspace-v2";
const LEGACY_STORAGE_KEY = "xiyuan-wedding-workspace-v1";
const taskStatuses: TaskStatus[] = ["待确认", "进行中", "已完成"];
const budgetStatuses: BudgetStatus[] = ["待付款", "已付定金", "已结清"];
const guestRsvps: GuestRsvp[] = ["待确认", "会到场", "不参加"];
const vendorStatuses: VendorStatus[] = ["待沟通", "已预约", "已签约"];
const copyKinds: CopyKind[] = ["誓词", "请柬文案", "父母致辞", "短视频脚本", "朋友圈文案"];
const copyTones: CopyTone[] = ["温柔正式", "喜庆热闹", "高级简洁"];

const defaultProfile: CoupleProfile = {
  brideName: "新娘",
  groomName: "新郎",
  weddingDate: "2026-10-01",
  city: "杭州",
  guestCount: 120,
  style: "红金中式",
  budgetCap: 220000,
};

const tasks: Task[] = [
  {
    id: 1,
    title: "确定婚期与预算上限",
    stage: "第 1 天",
    status: "已完成",
    assignee: "两人一起",
    dueDate: "2026-07-25",
    notes: "先确认预算上限，再拆场地、策划、影像等大项。",
    criteria: "婚期、城市、预算上限三项都填写完成。",
  },
  {
    id: 2,
    title: "整理双方宾客名单",
    stage: "第 2 天",
    status: "进行中",
    assignee: "双方家庭",
    dueDate: "2026-07-28",
    notes: "先粗分亲友、同事、同学，再确认是否携伴。",
    criteria: "完成第一版名单，并标记待确认人数。",
  },
  {
    id: 3,
    title: "收集喜欢的婚礼风格图",
    stage: "第 3 天",
    status: "待确认",
    assignee: "新娘",
    dueDate: "2026-08-02",
    notes: "保留 8-12 张喜欢的图，避免风格过多。",
    criteria: "确定 3 个关键词和 1 个主色方向。",
  },
  {
    id: 4,
    title: "筛选场地与四大金刚",
    stage: "本周",
    status: "待确认",
    assignee: "新郎",
    dueDate: "2026-08-08",
    notes: "先筛档期和预算，再看作品风格。",
    criteria: "每类至少留下 2 个可沟通候选。",
  },
];

const budgetItems: BudgetItem[] = [
  { id: 1, name: "场地餐饮", total: 138000, paid: 60000, status: "已付定金" },
  { id: 2, name: "婚礼策划", total: 42000, paid: 18000, status: "已付定金" },
  { id: 3, name: "摄影摄像", total: 26000, paid: 8000, status: "已付定金" },
];

const guestItems: Guest[] = [
  {
    id: 1,
    name: "王阿姨",
    relation: "女方亲友",
    count: 2,
    rsvp: "会到场",
    companion: true,
    table: "主桌旁",
    notes: "偏清淡，方便和女方亲友同桌。",
  },
  {
    id: 2,
    name: "李同学",
    relation: "新郎同学",
    count: 1,
    rsvp: "待确认",
    companion: false,
    table: "同学桌",
    notes: "等航班确认后回复。",
  },
  {
    id: 3,
    name: "陈总",
    relation: "同事",
    count: 1,
    rsvp: "会到场",
    companion: false,
    table: "同事桌",
    notes: "需要安排靠近通道。",
  },
];

const vendorItems: Vendor[] = [
  {
    id: 1,
    category: "场地",
    name: "西子宴会厅",
    contact: "周经理",
    phone: "13800000001",
    quote: 138000,
    deposit: 60000,
    status: "已签约",
    notes: "确认红金主舞台尺寸和入场动线。",
  },
  {
    id: 2,
    category: "摄影",
    name: "光影纪实团队",
    contact: "阿森",
    phone: "13800000002",
    quote: 18000,
    deposit: 5000,
    status: "已预约",
    notes: "需要补确认外景拍摄时间。",
  },
  {
    id: 3,
    category: "主持",
    name: "温礼主持工作室",
    contact: "林老师",
    phone: "13800000003",
    quote: 9800,
    deposit: 0,
    status: "待沟通",
    notes: "看一版中式仪式案例。",
  },
];

const weddingTimelineItems: WeddingEvent[] = [
  {
    id: 1,
    time: "08:00",
    title: "新娘化妆造型",
    owner: "化妆师",
    location: "酒店套房",
    status: "进行中",
    notes: "伴娘 8:30 到场，摄影 9:00 进房间。",
  },
  {
    id: 2,
    time: "11:18",
    title: "接亲与敬茶",
    owner: "伴郎团",
    location: "新娘家",
    status: "待确认",
    notes: "提前准备红包、茶具、拍摄道具。",
  },
  {
    id: 3,
    time: "17:28",
    title: "仪式正式开始",
    owner: "主持人",
    location: "宴会厅",
    status: "待确认",
    notes: "确认音乐、灯光、戒指和誓词稿。",
  },
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

const copywritingItems: CopywritingDoc[] = [
  {
    id: 1,
    kind: "请柬文案",
    tone: "温柔正式",
    title: "红金中式婚礼请柬",
    content:
      "我们将于 2026 年 10 月 1 日，在杭州迎来人生中重要的一天。诚邀你来见证我们的婚礼，把祝福、笑声和温柔的时刻，一起留在这个红金色的秋天。",
    createdAt: "默认文案",
  },
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
  const paid = Math.min(Math.max(0, item.paid), total);
  const fallbackStatus = paid <= 0 ? "待付款" : paid >= total && total > 0 ? "已结清" : "已付定金";
  return {
    ...item,
    total,
    paid,
    status: budgetStatuses.includes(item.status) ? item.status : fallbackStatus,
  };
}

function budgetStatusClass(status: BudgetStatus) {
  if (status === "已结清") return "budget-status settled";
  if (status === "已付定金") return "budget-status deposit";
  return "budget-status unpaid";
}

function normalizeGuest(guest: Partial<Guest> & { id: number }) {
  return {
    id: guest.id,
    name: guest.name || "新宾客",
    relation: guest.relation || "亲友",
    count: Math.max(1, Math.round(Number(guest.count) || 1)),
    rsvp: guest.rsvp && guestRsvps.includes(guest.rsvp) ? guest.rsvp : "待确认",
    companion: Boolean(guest.companion),
    table: guest.table || "待排桌",
    notes: guest.notes || "",
  };
}

function normalizeVendor(vendor: Partial<Vendor> & { id: number }) {
  return {
    id: vendor.id,
    category: vendor.category || "供应商",
    name: vendor.name || "新供应商",
    contact: vendor.contact || "",
    phone: vendor.phone || "",
    quote: parseMoney(String(vendor.quote ?? 0)),
    deposit: parseMoney(String(vendor.deposit ?? 0)),
    status: vendor.status && vendorStatuses.includes(vendor.status) ? vendor.status : "待沟通",
    notes: vendor.notes || "",
  };
}

function normalizeWeddingEvent(event: Partial<WeddingEvent> & { id: number }) {
  return {
    id: event.id,
    time: event.time || "待定",
    title: event.title || "新流程",
    owner: event.owner || "待分配",
    location: event.location || "待确认",
    status: event.status || "待确认",
    notes: event.notes || "",
  };
}

function normalizeCopywriting(doc: Partial<CopywritingDoc> & { id: number }) {
  return {
    id: doc.id,
    kind: doc.kind && copyKinds.includes(doc.kind) ? doc.kind : "请柬文案",
    tone: doc.tone && copyTones.includes(doc.tone) ? doc.tone : "温柔正式",
    title: doc.title || "新的 AI 文案",
    content: doc.content || "",
    createdAt: doc.createdAt || new Date().toLocaleString("zh-CN"),
  };
}

function escapeHtml(value: string | number | boolean) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeTask(task: Partial<Task> & { id: number; title?: string }) {
  return {
    id: task.id,
    title: task.title || "新的备婚任务",
    stage: task.stage || "待安排",
    status: task.status || "待确认",
    assignee: task.assignee || "两人一起",
    dueDate: task.dueDate || "",
    notes: task.notes || "",
    criteria: task.criteria || "完成后双方确认一次。",
  };
}

function normalizeProfile(profile?: Partial<CoupleProfile>) {
  return {
    ...defaultProfile,
    ...profile,
    guestCount: Math.max(0, Math.round(Number(profile?.guestCount) || defaultProfile.guestCount)),
    budgetCap: parseMoney(String(profile?.budgetCap ?? defaultProfile.budgetCap)),
  };
}

function getDaysUntil(dateValue: string) {
  if (!dateValue) return null;
  const weddingDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(weddingDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((weddingDate.getTime() - today.getTime()) / 86400000);
}

function getCurrentStageIndex(daysUntil: number | null) {
  if (daysUntil === null) return 0;
  if (daysUntil > 180) return 0;
  if (daysUntil > 120) return 1;
  if (daysUntil > 75) return 2;
  if (daysUntil > 30) return 3;
  return 4;
}

function buildStagePlan(profile: CoupleProfile, daysUntil: number | null): StagePlan[] {
  const currentIndex = getCurrentStageIndex(daysUntil);
  const baseStages = [
    {
      title: "定预算与方向",
      window: "婚前 6-12 个月",
      tasks: [
        `确认 ${profile.city} 婚礼预算上限为 ${currency(profile.budgetCap)}`,
        `锁定 ${profile.style} 的婚礼关键词`,
        `按 ${profile.guestCount} 位宾客估算桌数和场地规模`,
      ],
    },
    {
      title: "定场地与团队",
      window: "婚前 4-6 个月",
      tasks: ["预约场地看档期和菜单", "确认婚礼策划服务范围", "筛选摄影摄像与主持候选"],
    },
    {
      title: "定四大金刚",
      window: "婚前 2-4 个月",
      tasks: ["确认摄影摄像档期", "试妆并确认妆造方案", "确定主持风格和仪式结构"],
    },
    {
      title: "排流程与宾客",
      window: "婚前 1-2 个月",
      tasks: ["完成宾客名单和座位偏好", "确认婚礼当天流程表", "整理请柬、誓词和父母致辞"],
    },
    {
      title: "婚前最终确认",
      window: "婚前 30 天",
      tasks: ["逐项确认供应商到场时间", "完成物料打包清单", "安排彩排和应急联系人"],
    },
  ];

  return baseStages.map((stage, index) => ({
    ...stage,
    status: index < currentIndex ? "已完成" : index === currentIndex ? "进行中" : "待确认",
  }));
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

function buildCopywriting(profile: CoupleProfile, kind: CopyKind, tone: CopyTone, brief: string) {
  const names = `${profile.brideName} & ${profile.groomName}`;
  const shared = `婚期：${profile.weddingDate || "待确认"}｜城市：${profile.city}｜风格：${profile.style}｜宾客：${profile.guestCount} 位`;
  const direction = brief.trim() || "希望文案真诚、好读、适合婚礼当天直接使用";
  const toneLine =
    tone === "喜庆热闹"
      ? "语气可以更有仪式感和热闹感，适合现场氛围。"
      : tone === "高级简洁"
        ? "语气保持克制、清爽、有质感，避免堆砌形容词。"
        : "语气温柔、正式、真诚，适合发给亲友或现场朗读。";

  if (kind === "誓词") {
    return {
      title: `${names} 婚礼誓词`,
      content: `亲爱的你：\n\n从决定一起走向这场婚礼开始，我越来越确定，生活里最珍贵的不是盛大的瞬间，而是每天都愿意把对方放在心上。\n\n在 ${profile.city}，在我们的 ${profile.style} 婚礼上，我想认真地告诉你：未来无论是热闹还是平淡，我都会和你站在一起。我们一起面对琐碎，一起分享好运，也一起把普通日子过得有光。\n\n${direction}\n\n今天，我把承诺说给你听，也说给在场所有爱我们的人听：我会珍惜你、尊重你、陪伴你，和你一起把未来慢慢过好。\n\n${toneLine}`,
    };
  }

  if (kind === "请柬文案") {
    return {
      title: `${profile.city}${profile.style}婚礼请柬`,
      content: `亲爱的朋友：\n\n我们将于 ${profile.weddingDate || "婚期待定"} 在 ${profile.city} 举办婚礼。\n\n这一天，我们想把最重要的时刻，分享给一路陪伴和祝福我们的人。诚邀你来到现场，见证 ${profile.brideName} 与 ${profile.groomName} 开启新的生活章节。\n\n婚礼风格：${profile.style}\n预计宾客：${profile.guestCount} 位\n\n${direction}\n\n期待与你相见，也期待把这份喜悦亲手递给你。\n\n${toneLine}`,
    };
  }

  if (kind === "父母致辞") {
    return {
      title: `${names} 父母致辞`,
      content: `各位亲朋好友：\n\n感谢大家在百忙之中来到 ${profile.city}，参加孩子们的婚礼。今天看到他们站在这里，我们心里有感动，也有放心。\n\n婚礼只是一天，婚姻是一生。希望你们以后遇到事情多商量，遇到困难多承担，遇到开心的事也记得一起分享。家永远是你们身后的支持。\n\n${direction}\n\n也感谢所有亲友一直以来的照顾和祝福。愿两个孩子在未来的日子里，相互理解、相互成就，把小家经营得温暖踏实。\n\n${toneLine}`,
    };
  }

  if (kind === "短视频脚本") {
    return {
      title: `${profile.style}备婚短视频脚本`,
      content: `片名：我们的备婚进度\n\n镜头 1｜开场\n画面：婚礼资料、请柬、红金色布置灵感一闪而过。\n口播：距离婚礼越来越近，我们正在把一件件小事慢慢完成。\n\n镜头 2｜过程\n画面：宾客名单、预算表、供应商沟通、婚礼当天流程。\n字幕：${shared}\n\n镜头 3｜情绪\n画面：两个人一起确认清单，镜头停在婚期上。\n口播：备婚有很多琐碎，但想到那一天会见到所有祝福，就觉得一切都值得。\n\n镜头 4｜收尾\n画面：喜缘工作台或婚礼倒计时。\n字幕：${direction}\n\n${toneLine}`,
    };
  }

  return {
    title: `${names} 朋友圈文案`,
    content: `我们要结婚啦。\n\n婚期定在 ${profile.weddingDate || "待确认"}，地点在 ${profile.city}。从确定预算、整理宾客，到沟通供应商、安排流程，才发现婚礼是由很多认真完成的小事组成的。\n\n${profile.style} 是我们喜欢的样子，也希望那一天能把热闹、郑重和温柔都留住。\n\n${direction}\n\n谢谢每一份祝福，我们婚礼见。\n\n${toneLine}`,
  };
}

export function WeddingPlanner() {
  const [profile, setProfile] = useState(defaultProfile);
  const [prompt, setPrompt] = useState("帮我把备婚拆成每天能完成的小事");
  const [mode, setMode] = useState<Mode>("文本");
  const [draft, setDraft] = useState(aiSuggestions);
  const [taskList, setTaskList] = useState(tasks);
  const [budgetList, setBudgetList] = useState(budgetItems);
  const [guestList, setGuestList] = useState(guestItems);
  const [vendorList, setVendorList] = useState(vendorItems);
  const [weddingTimeline, setWeddingTimeline] = useState(weddingTimelineItems);
  const [copyKind, setCopyKind] = useState<CopyKind>("请柬文案");
  const [copyTone, setCopyTone] = useState<CopyTone>("温柔正式");
  const [copyBrief, setCopyBrief] = useState("想要一版可以直接发给亲友的文案");
  const [copywritingList, setCopywritingList] = useState(copywritingItems);
  const [collaborationList, setCollaborationList] = useState(collaborationItems);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [notice, setNotice] = useState("AI 服务已就绪，输入需求即可生成今日计划。");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(tasks[0]?.id ?? null);
  const promptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved =
          window.localStorage.getItem(STORAGE_KEY) ||
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!saved) {
          setWorkspaceLoaded(true);
          return;
        }

        const workspace = JSON.parse(saved) as Partial<SavedWorkspace>;
        setProfile(normalizeProfile(workspace.profile));
        if (Array.isArray(workspace.taskList)) {
          setTaskList(workspace.taskList.map(normalizeTask));
          setOpenTaskId(workspace.taskList[0]?.id ?? null);
        }
        if (Array.isArray(workspace.budgetList)) {
          setBudgetList(workspace.budgetList.map(normalizeBudget));
        }
        if (Array.isArray(workspace.guestList)) {
          setGuestList(workspace.guestList.map(normalizeGuest));
        }
        if (Array.isArray(workspace.vendorList)) {
          setVendorList(workspace.vendorList.map(normalizeVendor));
        }
        if (Array.isArray(workspace.weddingTimeline)) {
          setWeddingTimeline(workspace.weddingTimeline.map(normalizeWeddingEvent));
        }
        if (Array.isArray(workspace.copywritingList)) {
          setCopywritingList(workspace.copywritingList.map(normalizeCopywriting));
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
      profile,
      taskList,
      budgetList,
      guestList,
      vendorList,
      weddingTimeline,
      copywritingList,
      collaborationList,
      draft,
      mode,
      prompt,
      aiConfigured,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [
    aiConfigured,
    budgetList,
    collaborationList,
    copywritingList,
    draft,
    guestList,
    mode,
    profile,
    prompt,
    taskList,
    vendorList,
    weddingTimeline,
    workspaceLoaded,
  ]);

  const daysUntil = useMemo(() => getDaysUntil(profile.weddingDate), [profile.weddingDate]);
  const stagePlan = useMemo(() => buildStagePlan(profile, daysUntil), [daysUntil, profile]);

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
  const budgetGap = profile.budgetCap - totals.total;
  const settledBudgetCount = budgetList.filter((item) => item.status === "已结清").length;
  const confirmedGuestCount = guestList
    .filter((guest) => guest.rsvp === "会到场")
    .reduce((sum, guest) => sum + guest.count, 0);
  const pendingGuestCount = guestList.filter((guest) => guest.rsvp === "待确认").length;
  const signedVendorCount = vendorList.filter((vendor) => vendor.status === "已签约").length;
  const vendorQuoteTotal = vendorList.reduce((sum, vendor) => sum + vendor.quote, 0);
  const confirmedTimelineCount = weddingTimeline.filter((event) => event.status === "已完成").length;

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateProfile(patch: Partial<CoupleProfile>) {
    setProfile((current) => normalizeProfile({ ...current, ...patch }));
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
      `AI 服务已读取 ${profile.city}、${profile.guestCount} 位宾客、${profile.style} 风格。`,
      "后续生成内容会优先保持喜庆、正式、好执行的语气。",
      "你可以继续输入需求，喜缘会自动拆成清单、文案或视频脚本。",
    ]);
    setNotice("AI 服务配置已更新：新人资料、阶段计划、任务详情已联动。");
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
    const generatedTask: Task = {
      id: nextId(taskList),
      title: generatedTitle,
      stage: "AI 生成",
      status: "待确认",
      assignee: "两人一起",
      dueDate: profile.weddingDate,
      notes: `基于 ${profile.city}、${profile.style}、${profile.guestCount} 位宾客生成。`,
      criteria: "确认内容能落地执行，并同步给相关负责人。",
    };

    setDraft(buildDraft(mode, subject));
    setTaskList((current) => [...current, generatedTask]);
    setOpenTaskId(generatedTask.id);
    setNotice(`AI 已生成建议，并加入今日小事：${generatedTitle}`);
    scrollToSection("plan");
  }

  function addTodayTask(title?: string) {
    const nextTitle =
      title?.trim() || prompt.trim() || extraTasks[taskList.length % extraTasks.length];
    const newTask: Task = {
      id: nextId(taskList),
      title: nextTitle,
      stage: "新增",
      status: "待确认",
      assignee: "两人一起",
      dueDate: "",
      notes: "",
      criteria: "完成后双方确认一次。",
    };

    setTaskList((current) => [...current, newTask]);
    setOpenTaskId(newTask.id);
    setNotice(`已新增今日小事：${nextTitle}`);
  }

  function applyStageTasks() {
    const generatedTasks = stagePlan.flatMap((stage) =>
      stage.tasks.map((title) => ({
        id: 0,
        title,
        stage: stage.title,
        status: stage.status,
        assignee: stage.title.includes("预算") ? "两人一起" : "待分配",
        dueDate: profile.weddingDate,
        notes: `${stage.window}重点任务，适配 ${profile.city} ${profile.style} 婚礼。`,
        criteria: "任务完成后更新状态，并同步给相关家人或供应商。",
      })),
    );

    setTaskList((current) => {
      const existingTitles = new Set(current.map((task) => task.title));
      let nextTaskId = nextId(current);
      const uniqueGenerated = generatedTasks
        .filter((task) => !existingTitles.has(task.title))
        .map((task) => ({ ...task, id: nextTaskId++ }));

      if (uniqueGenerated.length === 0) {
        setNotice("当前阶段任务已在清单里，无需重复添加。");
        return current;
      }

      setOpenTaskId(uniqueGenerated[0].id);
      setNotice(`已根据婚期生成 ${uniqueGenerated.length} 个阶段任务。`);
      return [...current, ...uniqueGenerated];
    });
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
    setOpenTaskId((current) => (current === taskId ? null : current));
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
        status: "待付款",
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

  function addGuest() {
    setGuestList((current) => [
      ...current,
      {
        id: nextId(current),
        name: "新宾客",
        relation: "亲友",
        count: 1,
        rsvp: "待确认",
        companion: false,
        table: "待排桌",
        notes: "",
      },
    ]);
    setNotice("已新增宾客，可以填写关系、人数和座位偏好。");
  }

  function updateGuest(guestId: number, patch: Partial<Guest>) {
    setGuestList((current) =>
      current.map((guest) => (guest.id === guestId ? normalizeGuest({ ...guest, ...patch }) : guest)),
    );
  }

  function deleteGuest(guestId: number) {
    const guest = guestList.find((item) => item.id === guestId);
    setGuestList((current) => current.filter((item) => item.id !== guestId));
    setNotice(guest ? `已删除宾客：${guest.name}` : "已删除宾客。");
  }

  function addVendor() {
    setVendorList((current) => [
      ...current,
      {
        id: nextId(current),
        category: "供应商",
        name: "新供应商",
        contact: "",
        phone: "",
        quote: 0,
        deposit: 0,
        status: "待沟通",
        notes: "",
      },
    ]);
    setNotice("已新增供应商，可以填写报价、联系人和确认状态。");
  }

  function updateVendor(vendorId: number, patch: Partial<Vendor>) {
    setVendorList((current) =>
      current.map((vendor) =>
        vendor.id === vendorId ? normalizeVendor({ ...vendor, ...patch }) : vendor,
      ),
    );
  }

  function deleteVendor(vendorId: number) {
    const vendor = vendorList.find((item) => item.id === vendorId);
    setVendorList((current) => current.filter((item) => item.id !== vendorId));
    setNotice(vendor ? `已删除供应商：${vendor.name}` : "已删除供应商。");
  }

  function addWeddingEvent() {
    setWeddingTimeline((current) => [
      ...current,
      {
        id: nextId(current),
        time: "待定",
        title: "新流程",
        owner: "待分配",
        location: "待确认",
        status: "待确认",
        notes: "",
      },
    ]);
    setNotice("已新增婚礼当天流程，可以填写时间、地点和负责人。");
  }

  function updateWeddingEvent(eventId: number, patch: Partial<WeddingEvent>) {
    setWeddingTimeline((current) =>
      current.map((event) =>
        event.id === eventId ? normalizeWeddingEvent({ ...event, ...patch }) : event,
      ),
    );
  }

  function deleteWeddingEvent(eventId: number) {
    const event = weddingTimeline.find((item) => item.id === eventId);
    setWeddingTimeline((current) => current.filter((item) => item.id !== eventId));
    setNotice(event ? `已删除流程：${event.title}` : "已删除流程。");
  }

  function toggleCollaboration(itemId: number) {
    setCollaborationList((current) =>
      current.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    );
  }

  function generateCopywriting() {
    const generated = buildCopywriting(profile, copyKind, copyTone, copyBrief);
    const newDoc: CopywritingDoc = {
      id: nextId(copywritingList),
      kind: copyKind,
      tone: copyTone,
      title: generated.title,
      content: generated.content,
      createdAt: new Date().toLocaleString("zh-CN"),
    };

    setCopywritingList((current) => [newDoc, ...current]);
    setNotice(`已生成${copyKind}：${generated.title}`);
    scrollToSection("copywriting");
  }

  function updateCopywriting(docId: number, patch: Partial<CopywritingDoc>) {
    setCopywritingList((current) =>
      current.map((doc) =>
        doc.id === docId ? normalizeCopywriting({ ...doc, ...patch }) : doc,
      ),
    );
  }

  function deleteCopywriting(docId: number) {
    const doc = copywritingList.find((item) => item.id === docId);
    setCopywritingList((current) => current.filter((item) => item.id !== docId));
    setNotice(doc ? `已删除文案：${doc.title}` : "已删除文案。");
  }

  async function copyCopywriting(doc: CopywritingDoc) {
    const content = `${doc.title}\n\n${doc.content}`;
    try {
      await navigator.clipboard.writeText(content);
      setNotice(`已复制文案：${doc.title}`);
    } catch {
      setNotice("复制被浏览器拦截，可以直接选中文案内容复制。");
    }
  }

  function addCopywritingToTask(doc: CopywritingDoc) {
    addTodayTask(`完善${doc.kind}：${doc.title}`);
    setNotice(`已加入今日小事：${doc.title}`);
  }

  function buildPrintableHtml() {
    const taskRows = taskList
      .map(
        (task) =>
          `<tr><td>${escapeHtml(task.title)}</td><td>${escapeHtml(task.stage)}</td><td>${escapeHtml(task.status)}</td><td>${escapeHtml(task.assignee)}</td><td>${escapeHtml(task.dueDate || "待定")}</td></tr>`,
      )
      .join("");
    const budgetRows = budgetList
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(currency(item.total))}</td><td>${escapeHtml(currency(item.paid))}</td><td>${escapeHtml(item.status)}</td></tr>`,
      )
      .join("");
    const copyRows = copywritingList
      .map(
        (doc) =>
          `<section class="copy-doc"><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(doc.kind)} / ${escapeHtml(doc.tone)} / ${escapeHtml(doc.createdAt)}</p><pre>${escapeHtml(doc.content)}</pre></section>`,
      )
      .join("");

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>喜缘备婚清单</title>
  <style>
    body { margin: 0; padding: 32px; color: #3a0f14; font-family: Arial, "Microsoft YaHei", sans-serif; background: #fff7eb; }
    h1 { margin: 0 0 8px; color: #8f1725; font-size: 30px; }
    h2 { margin: 28px 0 12px; color: #8f1725; border-bottom: 2px solid #c99a48; padding-bottom: 8px; }
    .meta { color: #8a5a50; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fffaf1; }
    th, td { border: 1px solid #e2b16b; padding: 9px 10px; text-align: left; vertical-align: top; }
    th { background: #f1cf84; color: #3a0f14; }
    .copy-doc { break-inside: avoid; border: 1px solid #e2b16b; border-radius: 12px; padding: 14px; margin: 12px 0; background: #fffaf1; }
    .copy-doc h3 { margin: 0 0 6px; color: #8f1725; }
    .copy-doc p { margin: 0 0 10px; color: #8a5a50; font-weight: 700; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; font: inherit; line-height: 1.7; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <h1>喜缘备婚清单</h1>
  <p class="meta">${escapeHtml(profile.brideName)} & ${escapeHtml(profile.groomName)}｜${escapeHtml(profile.city)}｜${escapeHtml(profile.weddingDate || "婚期待确认")}｜${escapeHtml(profile.style)}</p>
  <h2>今日小事</h2>
  <table><thead><tr><th>任务</th><th>阶段</th><th>状态</th><th>负责人</th><th>截止</th></tr></thead><tbody>${taskRows}</tbody></table>
  <h2>预算表</h2>
  <table><thead><tr><th>项目</th><th>总预算</th><th>已支付</th><th>状态</th></tr></thead><tbody>${budgetRows}</tbody></table>
  <h2>AI 文案生成区</h2>
  ${copyRows || "<p>暂无文案。</p>"}
</body>
</html>`;
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank", "width=980,height=720");
    if (!printWindow) {
      setNotice("浏览器拦截了 PDF 页面，请允许弹窗后重试。");
      return;
    }

    printWindow.document.write(buildPrintableHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setNotice("已打开 PDF 打印页，可选择“保存为 PDF”。");
  }

  function exportExcel() {
    const table = (title: string, headers: string[], rows: (string | number | boolean)[][]) => `
      <h2>${escapeHtml(title)}</h2>
      <table border="1">
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table>`;
    const excelContent = `\ufeff<html><head><meta charset="utf-8" /></head><body>
      <h1>喜缘备婚数据</h1>
      ${table("新人资料", ["项目", "内容"], [
        ["新娘", profile.brideName],
        ["新郎", profile.groomName],
        ["婚期", profile.weddingDate || "待确认"],
        ["城市", profile.city],
        ["宾客人数", profile.guestCount],
        ["婚礼风格", profile.style],
        ["预算上限", currency(profile.budgetCap)],
      ])}
      ${table(
        "今日小事",
        ["任务", "阶段", "状态", "负责人", "截止", "备注", "确认标准"],
        taskList.map((task) => [
          task.title,
          task.stage,
          task.status,
          task.assignee,
          task.dueDate || "待定",
          task.notes || "无",
          task.criteria || "无",
        ]),
      )}
      ${table(
        "预算表",
        ["项目", "总预算", "已支付", "状态"],
        budgetList.map((item) => [item.name, item.total, item.paid, item.status]),
      )}
      ${table(
        "宾客名单",
        ["姓名", "关系", "人数", "回执", "携伴", "桌位", "备注"],
        guestList.map((guest) => [
          guest.name,
          guest.relation,
          guest.count,
          guest.rsvp,
          guest.companion ? "是" : "否",
          guest.table,
          guest.notes || "无",
        ]),
      )}
      ${table(
        "供应商管理",
        ["类型", "名称", "联系人", "电话", "报价", "定金", "状态", "备注"],
        vendorList.map((vendor) => [
          vendor.category,
          vendor.name,
          vendor.contact || "待定",
          vendor.phone || "待定",
          vendor.quote,
          vendor.deposit,
          vendor.status,
          vendor.notes || "无",
        ]),
      )}
      ${table(
        "婚礼当天流程",
        ["时间", "流程", "负责人", "地点", "状态", "备注"],
        weddingTimeline.map((event) => [
          event.time,
          event.title,
          event.owner,
          event.location,
          event.status,
          event.notes || "无",
        ]),
      )}
      ${table(
        "AI 文案生成区",
        ["类型", "语气", "标题", "内容", "创建时间"],
        copywritingList.map((doc) => [doc.kind, doc.tone, doc.title, doc.content, doc.createdAt]),
      )}
    </body></html>`;

    downloadTextFile(
      `喜缘备婚数据-${profile.weddingDate || "未定婚期"}.xls`,
      excelContent,
      "application/vnd.ms-excel;charset=utf-8",
    );
    setNotice("已导出 Excel 表格，可直接用 Excel 打开。");
  }

  function resetWorkspace() {
    setProfile(defaultProfile);
    setTaskList(tasks);
    setBudgetList(budgetItems);
    setGuestList(guestItems);
    setVendorList(vendorItems);
    setWeddingTimeline(weddingTimelineItems);
    setCopyKind("请柬文案");
    setCopyTone("温柔正式");
    setCopyBrief("想要一版可以直接发给亲友的文案");
    setCopywritingList(copywritingItems);
    setCollaborationList(collaborationItems);
    setDraft(aiSuggestions);
    setMode("文本");
    setPrompt("帮我把备婚拆成每天能完成的小事");
    setAiConfigured(false);
    setOpenTaskId(tasks[0]?.id ?? null);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setNotice("已恢复第二版默认备婚工作台。");
  }

  function exportWorkspace() {
    const exportedAt = new Date().toLocaleString("zh-CN");
    const content = [
      `# 喜缘备婚清单`,
      "",
      `导出时间：${exportedAt}`,
      "",
      `## 新人资料`,
      `- 新人：${profile.brideName} & ${profile.groomName}`,
      `- 婚期：${profile.weddingDate || "待确认"}`,
      `- 城市：${profile.city}`,
      `- 宾客人数：${profile.guestCount}`,
      `- 婚礼风格：${profile.style}`,
      `- 预算上限：${currency(profile.budgetCap)}`,
      `- ${budgetGap < 0 ? `已超预算：${currency(Math.abs(budgetGap))}` : `预算余量：${currency(budgetGap)}`}`,
      "",
      `## 今日小事`,
      ...taskList.map(
        (task, index) =>
          `${index + 1}. [${task.status}] ${task.title}｜${task.stage}｜负责人：${task.assignee || "待定"}｜截止：${task.dueDate || "待定"}\n   - 备注：${task.notes || "无"}\n   - 确认标准：${task.criteria || "无"}`,
      ),
      "",
      `## 预算表`,
      ...budgetList.map(
        (item, index) =>
          `${index + 1}. ${item.name}｜总预算：${currency(item.total)}｜已支付：${currency(item.paid)}｜状态：${item.status}`,
      ),
      "",
      `## 宾客名单`,
      ...guestList.map(
        (guest, index) =>
          `${index + 1}. ${guest.name}｜${guest.relation}｜${guest.count} 人｜${guest.rsvp}｜${guest.companion ? "携伴" : "不携伴"}｜桌位：${guest.table}｜备注：${guest.notes || "无"}`,
      ),
      "",
      `## 供应商管理`,
      ...vendorList.map(
        (vendor, index) =>
          `${index + 1}. ${vendor.category}｜${vendor.name}｜联系人：${vendor.contact || "待定"}｜电话：${vendor.phone || "待定"}｜报价：${currency(vendor.quote)}｜定金：${currency(vendor.deposit)}｜状态：${vendor.status}｜备注：${vendor.notes || "无"}`,
      ),
      "",
      `## 婚礼当天流程`,
      ...weddingTimeline.map(
        (event, index) =>
          `${index + 1}. ${event.time}｜${event.title}｜负责人：${event.owner}｜地点：${event.location}｜状态：${event.status}｜备注：${event.notes || "无"}`,
      ),
      "",
      `## AI 文案生成区`,
      ...copywritingList.map(
        (doc, index) =>
          `${index + 1}. ${doc.title}｜${doc.kind}｜${doc.tone}｜${doc.createdAt}\n\n${doc.content}`,
      ),
      "",
      `## 协作清单`,
      ...collaborationList.map((item) => `- ${item.done ? "[x]" : "[ ]"} ${item.title}`),
      "",
      `## AI 陪伴建议`,
      ...draft.map((item, index) => `${index + 1}. ${item}`),
      "",
    ].join("\n");

    downloadTextFile(
      `喜缘备婚清单-${profile.weddingDate || "未定婚期"}.md`,
      content,
      "text/markdown;charset=utf-8",
    );
    setNotice("已导出备婚清单，可发送给家人或策划师。");
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
            <a href="#profile">新人资料</a>
            <a href="#plan">备婚计划</a>
            <a href="#details">阶段计划</a>
            <a href="#copywriting">AI 文案</a>
            <a href="#business">业务模块</a>
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
            距离婚礼还有 {daysUntil === null ? "待确认" : `${Math.max(daysUntil, 0)} 天`}。
            <br />
            {profile.city} · {profile.style} · {profile.guestCount} 位宾客。
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

      <section className="profile-panel panel" id="profile">
        <div className="section-title">
          <UsersRound size={19} aria-hidden="true" />
          <h2>新人资料配置</h2>
        </div>
        <div className="profile-grid">
          <label>
            新娘
            <input
              value={profile.brideName}
              onChange={(event) => updateProfile({ brideName: event.target.value })}
            />
          </label>
          <label>
            新郎
            <input
              value={profile.groomName}
              onChange={(event) => updateProfile({ groomName: event.target.value })}
            />
          </label>
          <label>
            婚期
            <input
              type="date"
              value={profile.weddingDate}
              onChange={(event) => updateProfile({ weddingDate: event.target.value })}
            />
          </label>
          <label>
            城市
            <input
              value={profile.city}
              onChange={(event) => updateProfile({ city: event.target.value })}
            />
          </label>
          <label>
            宾客人数
            <input
              type="number"
              min={0}
              value={profile.guestCount}
              onChange={(event) => updateProfile({ guestCount: Number(event.target.value) })}
            />
          </label>
          <label>
            婚礼风格
            <input
              value={profile.style}
              onChange={(event) => updateProfile({ style: event.target.value })}
            />
          </label>
          <label>
            预算上限
            <input
              type="number"
              min={0}
              value={profile.budgetCap}
              onChange={(event) => updateProfile({ budgetCap: parseMoney(event.target.value) })}
            />
          </label>
        </div>
        <div className="profile-summary">
          <span>
            {profile.brideName} & {profile.groomName}
          </span>
          <span>{daysUntil === null ? "婚期待确认" : `距离婚礼 ${Math.max(daysUntil, 0)} 天`}</span>
          <span className={budgetGap < 0 ? "over-budget" : ""}>
            {budgetGap < 0 ? `已超预算 ${currency(Math.abs(budgetGap))}` : `剩余预算 ${currency(budgetGap)}`}
          </span>
        </div>
        <div className="panel-actions export-actions">
          <button type="button" className="ghost-action" onClick={exportWorkspace}>
            <Download size={17} aria-hidden="true" />
            导出备婚清单
          </button>
          <button type="button" className="subtle-action" onClick={exportPdf}>
            <Printer size={17} aria-hidden="true" />
            导出 PDF
          </button>
          <button type="button" className="subtle-action" onClick={exportExcel}>
            <FileSpreadsheet size={17} aria-hidden="true" />
            导出 Excel
          </button>
        </div>
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

      <section className="copywriting-panel panel" id="copywriting">
        <div className="section-title">
          <Sparkles size={19} aria-hidden="true" />
          <h2>AI 文案生成区</h2>
        </div>
        <div className="copywriting-controls">
          <label>
            文案类型
            <select
              value={copyKind}
              onChange={(event) => setCopyKind(event.target.value as CopyKind)}
            >
              {copyKinds.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label>
            语气风格
            <select
              value={copyTone}
              onChange={(event) => setCopyTone(event.target.value as CopyTone)}
            >
              {copyTones.map((tone) => (
                <option key={tone}>{tone}</option>
              ))}
            </select>
          </label>
          <label>
            重点要求
            <textarea
              value={copyBrief}
              onChange={(event) => setCopyBrief(event.target.value)}
            />
          </label>
          <button type="button" className="ghost-action" onClick={generateCopywriting}>
            <Sparkles size={17} aria-hidden="true" />
            生成文案
          </button>
        </div>
        <div className="copywriting-list">
          {copywritingList.map((doc) => (
            <article className="copywriting-card" key={doc.id}>
              <div className="copywriting-meta">
                <span>{doc.kind}</span>
                <span>{doc.tone}</span>
                <span>{doc.createdAt}</span>
              </div>
              <input
                className="copywriting-title-input"
                value={doc.title}
                onChange={(event) => updateCopywriting(doc.id, { title: event.target.value })}
                aria-label="文案标题"
              />
              <textarea
                className="copywriting-content"
                value={doc.content}
                onChange={(event) => updateCopywriting(doc.id, { content: event.target.value })}
                aria-label={`${doc.title}内容`}
              />
              <div className="copywriting-actions">
                <button type="button" className="subtle-action" onClick={() => copyCopywriting(doc)}>
                  <Copy size={16} aria-hidden="true" />
                  复制
                </button>
                <button
                  type="button"
                  className="subtle-action"
                  onClick={() => addCopywritingToTask(doc)}
                >
                  <Plus size={16} aria-hidden="true" />
                  加入任务
                </button>
                <button
                  type="button"
                  className="delete-task"
                  onClick={() => deleteCopywriting(doc.id)}
                  aria-label={`删除${doc.title}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  <span>删除</span>
                </button>
              </div>
            </article>
          ))}
        </div>
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
                    className="subtle-action task-detail-toggle"
                    onClick={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
                  >
                    详情
                  </button>
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
                {openTaskId === task.id && (
                  <div className="task-detail">
                    <label>
                      负责人
                      <input
                        value={task.assignee}
                        onChange={(event) => updateTask(task.id, { assignee: event.target.value })}
                      />
                    </label>
                    <label>
                      截止日期
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                      />
                    </label>
                    <label>
                      备注
                      <textarea
                        value={task.notes}
                        onChange={(event) => updateTask(task.id, { notes: event.target.value })}
                      />
                    </label>
                    <label>
                      确认标准
                      <textarea
                        value={task.criteria}
                        onChange={(event) => updateTask(task.id, { criteria: event.target.value })}
                      />
                    </label>
                  </div>
                )}
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
          <p className={`muted ${budgetGap < 0 ? "over-budget" : ""}`}>
            已支付 {currency(totals.paid)} · 当前执行 {totals.rate}% ·
            {budgetGap < 0 ? ` 超预算 ${currency(Math.abs(budgetGap))}` : ` 预算余量 ${currency(budgetGap)}`}
          </p>
          <p className="budget-summary">
            已结清 {settledBudgetCount}/{budgetList.length} 项，预算超过上限时会自动标红提醒。
          </p>
          <div className="budget-bars">
            {budgetList.map((item) => (
              <div className={`budget-row ${item.status === "已结清" ? "settled" : ""}`} key={item.id}>
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
                  <label>
                    状态
                    <select
                      className={budgetStatusClass(item.status)}
                      value={item.status}
                      onChange={(event) =>
                        updateBudgetItem(item.id, { status: event.target.value as BudgetStatus })
                      }
                      aria-label={`${item.name}付款状态`}
                    >
                      {budgetStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
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
            <h2>智能备婚阶段</h2>
          </div>
          <div className="phase-list">
            {stagePlan.map((stage, index) => (
              <div className={`phase-card ${statusClass(stage.status).replace("status ", "")}`} key={stage.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{stage.title}</strong>
                  <small>{stage.window}</small>
                </div>
                <em>{stage.status}</em>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={applyStageTasks}>
            <ListChecks size={17} aria-hidden="true" />
            生成阶段任务
          </button>
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

      <section className="business-grid" id="business">
        <article className="panel business-panel" id="guests">
          <div className="section-title">
            <UserPlus size={19} aria-hidden="true" />
            <h2>宾客名单管理</h2>
          </div>
          <p className="module-summary">
            已确认 {confirmedGuestCount} 人到场，仍有 {pendingGuestCount} 位宾客待回复。
          </p>
          <div className="business-list">
            {guestList.map((guest) => (
              <div className="business-row guest-row" key={guest.id}>
                <input
                  value={guest.name}
                  onChange={(event) => updateGuest(guest.id, { name: event.target.value })}
                  aria-label="宾客姓名"
                />
                <input
                  value={guest.relation}
                  onChange={(event) => updateGuest(guest.id, { relation: event.target.value })}
                  aria-label="宾客关系"
                />
                <label>
                  人数
                  <input
                    type="number"
                    min={1}
                    value={guest.count}
                    onChange={(event) => updateGuest(guest.id, { count: Number(event.target.value) })}
                    aria-label={`${guest.name}人数`}
                  />
                </label>
                <label>
                  回执
                  <select
                    value={guest.rsvp}
                    onChange={(event) => updateGuest(guest.id, { rsvp: event.target.value as GuestRsvp })}
                    aria-label={`${guest.name}回执`}
                  >
                    {guestRsvps.map((rsvp) => (
                      <option key={rsvp}>{rsvp}</option>
                    ))}
                  </select>
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={guest.companion}
                    onChange={(event) => updateGuest(guest.id, { companion: event.target.checked })}
                  />
                  携伴
                </label>
                <input
                  value={guest.table}
                  onChange={(event) => updateGuest(guest.id, { table: event.target.value })}
                  aria-label={`${guest.name}桌位偏好`}
                />
                <textarea
                  value={guest.notes}
                  onChange={(event) => updateGuest(guest.id, { notes: event.target.value })}
                  aria-label={`${guest.name}备注`}
                />
                <button
                  type="button"
                  className="delete-task"
                  onClick={() => deleteGuest(guest.id)}
                  aria-label={`删除${guest.name}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  <span>删除</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={addGuest}>
            <Plus size={17} aria-hidden="true" />
            新增宾客
          </button>
        </article>

        <article className="panel business-panel" id="vendors">
          <div className="section-title">
            <Building2 size={19} aria-hidden="true" />
            <h2>供应商管理</h2>
          </div>
          <p className="module-summary">
            已签约 {signedVendorCount}/{vendorList.length} 家，供应商报价合计 {currency(vendorQuoteTotal)}。
          </p>
          <div className="business-list">
            {vendorList.map((vendor) => (
              <div className="business-row vendor-row" key={vendor.id}>
                <input
                  value={vendor.category}
                  onChange={(event) => updateVendor(vendor.id, { category: event.target.value })}
                  aria-label="供应商类型"
                />
                <input
                  value={vendor.name}
                  onChange={(event) => updateVendor(vendor.id, { name: event.target.value })}
                  aria-label="供应商名称"
                />
                <input
                  value={vendor.contact}
                  onChange={(event) => updateVendor(vendor.id, { contact: event.target.value })}
                  aria-label={`${vendor.name}联系人`}
                />
                <input
                  value={vendor.phone}
                  onChange={(event) => updateVendor(vendor.id, { phone: event.target.value })}
                  aria-label={`${vendor.name}电话`}
                />
                <label>
                  报价
                  <input
                    type="number"
                    min={0}
                    value={vendor.quote}
                    onChange={(event) => updateVendor(vendor.id, { quote: parseMoney(event.target.value) })}
                  />
                </label>
                <label>
                  定金
                  <input
                    type="number"
                    min={0}
                    value={vendor.deposit}
                    onChange={(event) => updateVendor(vendor.id, { deposit: parseMoney(event.target.value) })}
                  />
                </label>
                <label>
                  状态
                  <select
                    value={vendor.status}
                    onChange={(event) =>
                      updateVendor(vendor.id, { status: event.target.value as VendorStatus })
                    }
                  >
                    {vendorStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <textarea
                  value={vendor.notes}
                  onChange={(event) => updateVendor(vendor.id, { notes: event.target.value })}
                  aria-label={`${vendor.name}备注`}
                />
                <button
                  type="button"
                  className="delete-task"
                  onClick={() => deleteVendor(vendor.id)}
                  aria-label={`删除${vendor.name}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  <span>删除</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={addVendor}>
            <Plus size={17} aria-hidden="true" />
            新增供应商
          </button>
        </article>

        <article className="panel business-panel timeline-business">
          <div className="section-title">
            <CalendarDays size={19} aria-hidden="true" />
            <h2>婚礼当天流程表</h2>
          </div>
          <p className="module-summary">
            已确认 {confirmedTimelineCount}/{weddingTimeline.length} 个当天节点，适合发给伴郎伴娘和供应商。
          </p>
          <div className="business-list">
            {weddingTimeline.map((event) => (
              <div className="business-row event-row" key={event.id}>
                <input
                  value={event.time}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { time: inputEvent.target.value })
                  }
                  aria-label={`${event.title}时间`}
                />
                <input
                  value={event.title}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { title: inputEvent.target.value })
                  }
                  aria-label="流程标题"
                />
                <input
                  value={event.owner}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { owner: inputEvent.target.value })
                  }
                  aria-label={`${event.title}负责人`}
                />
                <input
                  value={event.location}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { location: inputEvent.target.value })
                  }
                  aria-label={`${event.title}地点`}
                />
                <label>
                  状态
                  <select
                    value={event.status}
                    onChange={(inputEvent) =>
                      updateWeddingEvent(event.id, { status: inputEvent.target.value as TaskStatus })
                    }
                  >
                    {taskStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <textarea
                  value={event.notes}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { notes: inputEvent.target.value })
                  }
                  aria-label={`${event.title}备注`}
                />
                <button
                  type="button"
                  className="delete-task"
                  onClick={() => deleteWeddingEvent(event.id)}
                  aria-label={`删除${event.title}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  <span>删除</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={addWeddingEvent}>
            <Plus size={17} aria-hidden="true" />
            新增流程
          </button>
        </article>
      </section>

      <footer className="footer-note">
        <Sparkles size={16} aria-hidden="true" />
        喜缘会自动保存这台设备上的备婚进度，刷新页面后也能继续。
      </footer>
    </main>
  );
}

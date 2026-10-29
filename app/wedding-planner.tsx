"use client";

import {
  Bot,
  Bell,
  Building2,
  Camera,
  CalendarDays,
  Calculator,
  CheckSquare,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  ClipboardCheck,
  Cloud,
  CloudOff,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderOpen,
  FileText,
  Gauge,
  Heart,
  HeartHandshake,
  History,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LayoutDashboard,
  ListChecks,
  ListFilter,
  LogIn,
  LogOut,
  LoaderCircle,
  Mail,
  Menu,
  MonitorPlay,
  Play,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  ReceiptText,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  UserPlus,
  UserCog,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WeddingStoryEmbed } from "./wedding-story-embed";

const WeddingScene3D = lazy(async () => ({
  default: (await import("./wedding-scene-3d")).WeddingScene3D,
}));

type TaskStatus = "已完成" | "进行中" | "待确认";
type Mode = "文本" | "图片" | "视频";
type BudgetStatus = "待付款" | "已付定金" | "已结清";
type GuestRsvp = "待确认" | "会到场" | "不参加";
type InvitationChannel = "链接" | "邮件" | "短信" | "微信";
type InvitationDeliveryStatus = "未发送" | "链接已生成" | "已发送" | "发送失败";
type VendorStatus = "待沟通" | "已预约" | "已签约";
type VendorContractStatus = "未上传" | "待确认" | "已签署";
type VendorPaymentStatus = "待支付" | "已支付";
type CopyKind = "誓词" | "请柬文案" | "父母致辞" | "短视频脚本" | "朋友圈文案";
type CopyTone = "温柔正式" | "喜庆热闹" | "高级简洁";
type MediaKind = "场景效果图" | "AI 证件照" | "视频分镜";
type MediaStyle = "红金中式" | "清透森系" | "现代极简" | "复古电影";
type MediaRatio = "16:9" | "9:16" | "1:1";
type MediaGenerationStatus =
  | "template"
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";
type MediaJobFilter = "全部" | "处理中" | "已完成" | "失败" | "已收藏";
type MediaKindFilter = "全部类型" | MediaKind;
type MediaSort = "最新生成" | "最早生成" | "名称排序";
type CloudSyncStatus =
  | "连接中"
  | "保存中"
  | "已保存"
  | "仅本机"
  | "同步失败"
  | "同步冲突";

type AssistantIntentId =
  | "plan"
  | "budget"
  | "guest"
  | "seating"
  | "vendor"
  | "command"
  | "copywriting"
  | "image"
  | "video"
  | "collaboration"
  | "profile";

type AssistantIntent = {
  id: AssistantIntentId;
  label: string;
  description: string;
  targetId: string;
  keywords: string[];
  example: string;
};

const assistantIntents: AssistantIntent[] = [
  {
    id: "seating",
    label: "智能排桌",
    description: "自动分桌、检查超员和手动换桌",
    targetId: "seating",
    keywords: ["智能排桌", "排桌", "座位表", "座位", "桌位", "座次", "分桌"],
    example: "帮我智能排桌",
  },
  {
    id: "command",
    label: "当天指挥",
    description: "流程执行、物料核对和紧急联系人",
    targetId: "wedding-command",
    keywords: ["婚礼当天流程", "婚礼当天", "当天指挥", "现场指挥", "现场执行", "应急", "物料", "紧急联系人"],
    example: "打开婚礼当天指挥中心",
  },
  {
    id: "copywriting",
    label: "AI 文案",
    description: "请柬、誓词、致辞和朋友圈文案",
    targetId: "copywriting",
    keywords: ["请柬文案", "朋友圈文案", "父母致辞", "婚礼致辞", "誓词", "文案", "写请柬"],
    example: "帮我写一份请柬文案",
  },
  {
    id: "guest",
    label: "宾客邀请",
    description: "宾客名单、在线回执、批量发送与催办",
    targetId: "guests",
    keywords: ["批量催办", "批量发送", "宾客邀请", "邀请宾客", "宾客", "邀请", "请柬", "回执", "rsvp", "催办"],
    example: "给待回复宾客批量催办",
  },
  {
    id: "budget",
    label: "预算管理",
    description: "预算上限、付款进度和费用明细",
    targetId: "budget",
    keywords: ["婚礼预算", "预算", "费用", "花费", "支出", "付款", "超预算"],
    example: "查看婚礼预算",
  },
  {
    id: "vendor",
    label: "供应商管理",
    description: "合同、报价、档期和付款节点",
    targetId: "vendors",
    keywords: ["供应商合同", "供应商", "合同", "婚庆公司", "四大金刚", "摄影师", "摄像师", "主持人", "酒店"],
    example: "查看供应商合同和付款",
  },
  {
    id: "image",
    label: "AI 图片",
    description: "婚礼效果图、布置灵感和证件照",
    targetId: "media-studio",
    keywords: ["ai证件照", "证件照", "场景效果图", "效果图", "布置图", "图片", "婚礼场景"],
    example: "生成红金婚礼场景效果图",
  },
  {
    id: "video",
    label: "AI 视频",
    description: "短视频脚本、分镜和视频生成",
    targetId: "media-studio",
    keywords: ["视频分镜", "婚礼视频", "短视频", "视频", "分镜", "预告片"],
    example: "生成婚礼预告视频分镜",
  },
  {
    id: "collaboration",
    label: "协作分工",
    description: "新人、伴郎伴娘和策划共同推进",
    targetId: "collaboration",
    keywords: ["协作清单", "协作", "分工", "负责人", "伴郎", "伴娘", "共同编辑"],
    example: "查看婚礼协作分工",
  },
  {
    id: "profile",
    label: "新人资料",
    description: "婚期、城市、人数与婚礼风格",
    targetId: "profile",
    keywords: ["新人资料", "婚期", "结婚日期", "婚礼城市", "婚礼风格", "宾客人数"],
    example: "修改婚期和婚礼风格",
  },
  {
    id: "plan",
    label: "备婚计划",
    description: "阶段计划、每日任务和完成进度",
    targetId: "plan",
    keywords: ["备婚计划", "阶段计划", "每日任务", "今日任务", "任务", "进度", "计划", "清单"],
    example: "查看我的备婚计划",
  },
];

function matchAssistantIntents(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return [];
  return assistantIntents
    .map((intent) => {
      const matched = intent.keywords.filter((keyword) =>
        normalized.includes(keyword.toLowerCase()),
      );
      return {
        intent,
        score: matched.reduce((sum, keyword) => sum + keyword.length * keyword.length, 0),
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.intent);
}

type CloudConflict = {
  currentRevision: number;
  updatedAt?: string;
};

type WorkspaceBackupSummary = {
  id: string;
  reason: "autosave" | "delete" | "restore" | "manual";
  createdAt: string;
  checksum: string;
};

function teamRoleLabel(role: TeamRole) {
  if (role === "owner") return "空间拥有者";
  if (role === "planner") return "婚礼策划";
  if (role === "viewer") return "仅查看";
  return "共同编辑";
}

type MediaUsage = {
  month: string;
  limit: number;
  imageCalls: number;
  videoCalls: number;
  estimatedSpendCny: number;
  monthlyBudgetCny: number;
  imageEstimateCny: number;
  videoSecondEstimateCny: number;
  videoSeconds: number;
  hardLimit: boolean;
};

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
  invitationCode?: string;
  invitedAt?: string;
  respondedAt?: string;
  dietary?: string;
  contact?: string;
  invitationChannel?: InvitationChannel;
  deliveryStatus?: InvitationDeliveryStatus;
  sentAt?: string;
  remindedAt?: string;
  reminderCount?: number;
};

type VendorPayment = {
  id: number;
  label: string;
  amount: number;
  dueDate: string;
  status: VendorPaymentStatus;
  paidAt?: string;
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
  contractStatus: VendorContractStatus;
  contractName?: string;
  contractUrl?: string;
  contractStorageKey?: string;
  contractUploadedAt?: string;
  payments: VendorPayment[];
};

type WeddingEvent = {
  id: number;
  time: string;
  title: string;
  owner: string;
  location: string;
  status: TaskStatus;
  notes: string;
  phone?: string;
  delayMinutes?: number;
  completedAt?: string;
};

type SeatingTable = {
  id: number;
  name: string;
  capacity: number;
  zone: string;
};

type CommandSupply = {
  id: number;
  title: string;
  owner: string;
  checked: boolean;
};

type EmergencyContact = {
  id: number;
  role: string;
  name: string;
  phone: string;
};

type CommandCenterState = {
  liveMode: boolean;
  supplies: CommandSupply[];
  contacts: EmergencyContact[];
  incidentNote: string;
};

type CopywritingDoc = {
  id: number;
  kind: CopyKind;
  tone: CopyTone;
  title: string;
  content: string;
  createdAt: string;
  model?: string;
};

type AiProviderService = {
  provider: string;
  configured: boolean;
  source: string;
  model: string;
  verified?: boolean | null;
  latencyMs?: number | null;
  modelAvailable?: boolean | null;
  error?: string | null;
};

type AiServiceConfig = {
  checked: boolean;
  configured: boolean;
  copy: AiProviderService;
  image: AiProviderService;
  video: AiProviderService;
};

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isAdmin?: boolean;
};

type AuthSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  device: string;
  ipHint: string;
  current: boolean;
};

type PrivacyOverview = {
  required: {
    termsVersion: string;
    privacyVersion: string;
  };
  consent: {
    acceptedAt: string;
    termsVersion: string;
    privacyVersion: string;
  } | null;
  current: boolean;
};

type AccountLifecycleOverview = {
  coolingOffDays: number;
  requiresConfirmation: string;
  deletion: {
    requestedAt: string;
    scheduledFor: string;
    status: "pending" | "cancelled" | "completed";
  } | null;
};

type AuthMode = "登录" | "注册" | "验证邮箱" | "找回密码";

type TeamRole = "owner" | "planner" | "editor" | "viewer";

type TeamMember = {
  userId: string;
  email: string;
  displayName: string;
  role: TeamRole;
  joinedAt: string;
};

type TeamInvite = {
  id: string;
  email: string;
  role: Exclude<TeamRole, "owner">;
  expiresAt: string;
};

type AuditEntry = {
  id: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
};

type TeamOverview = {
  role: TeamRole;
  canManage: boolean;
  canWrite: boolean;
  members: TeamMember[];
  invites: TeamInvite[];
  audit: AuditEntry[];
};

type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  wechat: boolean;
  phone: string;
};

type NotificationOverview = {
  unread: number;
  items: Array<{
    id: string;
    title: string;
    message: string;
    kind: "info" | "success" | "warning";
    read: boolean;
    createdAt: string;
  }>;
  preferences: NotificationPreferences;
  capabilities: {
    email: boolean;
    sms: boolean;
    wechat: boolean;
  };
};

type BillingOverview = {
  canManage: boolean;
  paymentConfigured: boolean;
  record: {
    plan: "free" | "pro" | "studio";
    status: "free" | "active" | "past_due" | "cancelled";
  };
  plans: Array<{
    id: "free" | "pro" | "studio";
    name: string;
    priceCny: number;
    memberLimit: number;
    monthlyAiLimit: number;
    features: string[];
  }>;
};

type AiUsageOverview = {
  month: string;
  allowance: number;
  available: number;
  bonus: number;
  plan: {
    id: "free" | "pro" | "studio";
    name: string;
    baseAllowance: number;
  };
  record: {
    usedUnits: number;
    reservedUnits: number;
    refundedUnits: number;
    estimatedCostCny: number;
    operations: {
      copy: number;
      image: number;
      portrait: number;
      video: number;
    };
  };
  policies: Record<
    "copy" | "image" | "portrait" | "video",
    { label: string; units: number; estimatedCostCny: number }
  >;
};

type ReminderOverview = {
  canRun: boolean;
  rules: Array<{
    id: string;
    title: string;
    message: string;
    kind: "info" | "success" | "warning";
  }>;
};

type AdminOwnerRow = {
  ownerId: string;
  user: {
    email: string;
    displayName: string;
  } | null;
  plan: "free" | "pro" | "studio";
  billingStatus: "free" | "active" | "past_due" | "cancelled";
  allowance: number;
  bonus: number;
  usedUnits: number;
  reservedUnits: number;
  estimatedCostCny: number;
};

type AdminOverview = {
  month: string;
  metrics: {
    users: number;
    verifiedUsers: number;
    workspaces: number;
    activeVideoJobs: number;
    totalUsed: number;
    totalReserved: number;
    estimatedCostCny: number;
  };
  planCounts: {
    free: number;
    pro: number;
    studio: number;
  };
  alerts: Array<{
    kind: string;
    title: string;
    detail: string;
  }>;
  owners: AdminOwnerRow[];
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    createdAt: string;
  }>;
  operations: {
    status: "healthy" | "degraded";
    checkedAt: string;
    metrics: {
      requests: number;
      errors: number;
      rateLimited: number;
      queueRetries: number;
      reminderFailures: number;
      updatedAt: string;
    };
    incidents: Array<{
      id: string;
      createdAt: string;
      source: string;
      severity: "warning" | "error" | "critical";
      code: string;
      message: string;
      path?: string;
      status?: number;
      state: "open" | "resolved";
      resolvedAt?: string;
      resolvedBy?: string;
      occurrences?: number;
    }>;
  };
  readiness: {
    ready: boolean;
    pendingDeletions: number;
    checkedAt: string;
    checks: Array<{
      id: string;
      label: string;
      ready: boolean;
    }>;
    lastMigrationReport: {
      kind: "workspace-migration" | "recovery-drill";
      completedAt: string;
      scanned: number;
      migrated: number;
      current: number;
      recoverable: number;
      missing: number;
      corrupted: number;
    } | null;
  };
};

type ServiceDiagnostic = {
  name: string;
  configured: boolean;
  reachable: boolean | null;
  latencyMs: number | null;
  status: number | null;
  message: string;
};

type MediaAsset = {
  id: number;
  kind: MediaKind;
  style: MediaStyle;
  ratio: MediaRatio;
  title: string;
  prompt: string;
  assetPath: string;
  frames: string[];
  favorite: boolean;
  createdAt: string;
  status: MediaGenerationStatus;
  progress: number;
  providerJobId?: string;
  model?: string;
  error?: string;
  storageKey?: string;
  sizeBytes?: number;
  estimatedCostCny?: number;
};

type RecycleEntityType =
  | "task"
  | "budget"
  | "guest"
  | "vendor"
  | "timeline"
  | "copywriting"
  | "media";

type RecycleItem = {
  id: string;
  entityType: RecycleEntityType;
  label: string;
  deletedAt: string;
  expiresAt: string;
  data: unknown;
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
  seatingTables: SeatingTable[];
  vendorList: Vendor[];
  weddingTimeline: WeddingEvent[];
  commandCenter: CommandCenterState;
  copywritingList: CopywritingDoc[];
  mediaLibrary: MediaAsset[];
  recycleBin: RecycleItem[];
  collaborationList: CollaborationItem[];
  draft: string[];
  mode: Mode;
  prompt: string;
  aiConfigured: boolean;
};

const STORAGE_KEY = "xiyuan-wedding-workspace-v2";
const LEGACY_STORAGE_KEY = "xiyuan-wedding-workspace-v1";
const MEDIA_USAGE_KEY = "xiyuan-media-usage-v1";
const SYNC_CODE_KEY = "xiyuan-cloud-sync-code-v1";
const DEEPSEEK_KEY_STORAGE = "xiyuan-deepseek-api-key";
const ARK_KEY_STORAGE = "xiyuan-ark-api-key";
const DEEPSEEK_MODEL_STORAGE = "xiyuan-deepseek-model";
const ARK_IMAGE_MODEL_STORAGE = "xiyuan-ark-image-model";
const ARK_VIDEO_MODEL_STORAGE = "xiyuan-ark-video-model";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_ARK_IMAGE_MODEL = "doubao-seedream-5-0-260128";
const DEFAULT_ARK_VIDEO_MODEL = "doubao-seedance-2-0-260128";
const taskStatuses: TaskStatus[] = ["待确认", "进行中", "已完成"];
const budgetStatuses: BudgetStatus[] = ["待付款", "已付定金", "已结清"];
const guestRsvps: GuestRsvp[] = ["待确认", "会到场", "不参加"];
const invitationChannels: InvitationChannel[] = ["链接", "邮件", "短信", "微信"];
const vendorStatuses: VendorStatus[] = ["待沟通", "已预约", "已签约"];
const vendorContractStatuses: VendorContractStatus[] = ["未上传", "待确认", "已签署"];
const vendorPaymentStatuses: VendorPaymentStatus[] = ["待支付", "已支付"];
const copyKinds: CopyKind[] = ["誓词", "请柬文案", "父母致辞", "短视频脚本", "朋友圈文案"];
const copyTones: CopyTone[] = ["温柔正式", "喜庆热闹", "高级简洁"];
const mediaStyles: MediaStyle[] = ["红金中式", "清透森系", "现代极简", "复古电影"];
const mediaRatios: MediaRatio[] = ["16:9", "9:16", "1:1"];
const mediaJobFilters: MediaJobFilter[] = ["全部", "处理中", "已完成", "失败", "已收藏"];
const mediaKindFilters: MediaKindFilter[] = ["全部类型", "场景效果图", "AI 证件照", "视频分镜"];
const mediaSortOptions: MediaSort[] = ["最新生成", "最早生成", "名称排序"];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMediaUsage(value?: Partial<MediaUsage>): MediaUsage {
  const limit = Math.min(500, Math.max(1, Math.round(Number(value?.limit) || 30)));
  const monthlyBudgetCny = Math.min(
    100000,
    Math.max(1, Number(value?.monthlyBudgetCny) || 100),
  );
  const imageEstimateCny = Math.min(
    10000,
    Math.max(0.01, Number(value?.imageEstimateCny) || 0.36),
  );
  const videoSecondEstimateCny = Math.min(
    10000,
    Math.max(0.01, Number(value?.videoSecondEstimateCny) || 0.72),
  );
  const videoSeconds = [4, 8, 12].includes(Number(value?.videoSeconds))
    ? Number(value?.videoSeconds)
    : 8;
  if (value?.month !== currentMonth()) {
    return {
      month: currentMonth(),
      limit,
      imageCalls: 0,
      videoCalls: 0,
      estimatedSpendCny: 0,
      monthlyBudgetCny,
      imageEstimateCny,
      videoSecondEstimateCny,
      videoSeconds,
      hardLimit: value?.hardLimit !== false,
    };
  }
  return {
    month: currentMonth(),
    limit,
    imageCalls: Math.max(0, Math.round(Number(value.imageCalls) || 0)),
    videoCalls: Math.max(0, Math.round(Number(value.videoCalls) || 0)),
    estimatedSpendCny: Math.max(0, Number(value.estimatedSpendCny) || 0),
    monthlyBudgetCny,
    imageEstimateCny,
    videoSecondEstimateCny,
    videoSeconds,
    hardLimit: value.hardLimit !== false,
  };
}

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
    contractStatus: "已签署",
    contractName: "西子宴会厅婚宴合同.pdf",
    payments: [
      {
        id: 1,
        label: "签约定金",
        amount: 60000,
        dueDate: "2026-07-10",
        status: "已支付",
        paidAt: "2026-07-10",
      },
      {
        id: 2,
        label: "婚礼前尾款",
        amount: 78000,
        dueDate: "2026-09-25",
        status: "待支付",
      },
    ],
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
    contractStatus: "待确认",
    payments: [
      {
        id: 1,
        label: "档期定金",
        amount: 5000,
        dueDate: "2026-07-18",
        status: "已支付",
        paidAt: "2026-07-18",
      },
      {
        id: 2,
        label: "交片尾款",
        amount: 13000,
        dueDate: "2026-10-02",
        status: "待支付",
      },
    ],
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
    contractStatus: "未上传",
    payments: [],
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
    phone: "13800000010",
    delayMinutes: 0,
  },
  {
    id: 2,
    time: "11:18",
    title: "接亲与敬茶",
    owner: "伴郎团",
    location: "新娘家",
    status: "待确认",
    notes: "提前准备红包、茶具、拍摄道具。",
    phone: "13800000011",
    delayMinutes: 0,
  },
  {
    id: 3,
    time: "17:28",
    title: "仪式正式开始",
    owner: "主持人",
    location: "宴会厅",
    status: "待确认",
    notes: "确认音乐、灯光、戒指和誓词稿。",
    phone: "13800000012",
    delayMinutes: 0,
  },
];

const seatingTableItems: SeatingTable[] = [
  { id: 1, name: "主桌", capacity: 10, zone: "舞台正前方" },
  { id: 2, name: "女方亲友 1 桌", capacity: 10, zone: "左侧前区" },
  { id: 3, name: "男方亲友 1 桌", capacity: 10, zone: "右侧前区" },
  { id: 4, name: "同学朋友桌", capacity: 10, zone: "中区" },
  { id: 5, name: "同事桌", capacity: 10, zone: "中区" },
];

const defaultCommandCenter: CommandCenterState = {
  liveMode: false,
  supplies: [
    { id: 1, title: "戒指与戒枕", owner: "伴郎", checked: false },
    { id: 2, title: "红包与签到物料", owner: "双方家人", checked: false },
    { id: 3, title: "誓词、音乐与视频文件", owner: "婚礼策划", checked: false },
  ],
  contacts: [
    { id: 1, role: "总协调", name: "婚礼策划", phone: "13800000020" },
    { id: 2, role: "新人家属", name: "双方家庭联系人", phone: "13800000021" },
  ],
  incidentNote: "",
};

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

const mediaItems: MediaAsset[] = [
  {
    id: 1,
    kind: "场景效果图",
    style: "红金中式",
    ratio: "16:9",
    title: "红金中式主舞台灵感",
    prompt:
      "杭州酒店宴会厅，红金中式婚礼主舞台，深红丝绒、古金结构、暖色烛光与克制花艺，高级婚礼纪实摄影。",
    assetPath: "/media-red-gold-ceremony.webp",
    frames: [],
    favorite: true,
    createdAt: "示例灵感",
    status: "template",
    progress: 100,
  },
  {
    id: 2,
    kind: "视频分镜",
    style: "复古电影",
    ratio: "16:9",
    title: "我们要结婚了 · 30 秒预告",
    prompt:
      "一对新人从红金婚礼入口牵手走向仪式区，暖金轮廓光，真实婚礼电影质感，情绪克制而温暖。",
    assetPath: "/media-red-gold-film.webp",
    frames: ["请柬与戒指特写", "新人牵手入场", "亲友笑脸与拥抱", "婚期字幕收尾"],
    favorite: false,
    createdAt: "示例分镜",
    status: "template",
    progress: 100,
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
    invitationCode: guest.invitationCode || undefined,
    invitedAt: guest.invitedAt || undefined,
    respondedAt: guest.respondedAt || undefined,
    dietary: guest.dietary || "",
    contact: guest.contact || "",
    invitationChannel:
      guest.invitationChannel && invitationChannels.includes(guest.invitationChannel)
        ? guest.invitationChannel
        : "链接",
    deliveryStatus: guest.deliveryStatus || "未发送",
    sentAt: guest.sentAt || undefined,
    remindedAt: guest.remindedAt || undefined,
    reminderCount: Math.max(0, Math.round(Number(guest.reminderCount) || 0)),
  };
}

function normalizeVendorPayment(
  payment: Partial<VendorPayment> & { id: number },
): VendorPayment {
  return {
    id: payment.id,
    label: payment.label || "付款节点",
    amount: parseMoney(String(payment.amount ?? 0)),
    dueDate: payment.dueDate || "",
    status:
      payment.status && vendorPaymentStatuses.includes(payment.status)
        ? payment.status
        : "待支付",
    paidAt: payment.paidAt || undefined,
  };
}

function normalizeVendor(vendor: Partial<Vendor> & { id: number }) {
  const payments = Array.isArray(vendor.payments)
    ? vendor.payments.map(normalizeVendorPayment)
    : vendor.deposit
      ? [
          {
            id: 1,
            label: "定金",
            amount: parseMoney(String(vendor.deposit)),
            dueDate: "",
            status: "已支付" as VendorPaymentStatus,
            paidAt: undefined,
          },
        ]
      : [];
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
    contractStatus:
      vendor.contractStatus &&
      vendorContractStatuses.includes(vendor.contractStatus)
        ? vendor.contractStatus
        : vendor.contractName
          ? "待确认"
          : "未上传",
    contractName: vendor.contractName || undefined,
    contractUrl: vendor.contractUrl || undefined,
    contractStorageKey: vendor.contractStorageKey || undefined,
    contractUploadedAt: vendor.contractUploadedAt || undefined,
    payments,
  };
}

function normalizeRecycleBin(items: unknown): RecycleItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is RecycleItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<RecycleItem>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.deletedAt === "string" &&
        typeof candidate.expiresAt === "string" &&
        typeof candidate.entityType === "string" &&
        ["task", "budget", "guest", "vendor", "timeline", "copywriting", "media"].includes(
          candidate.entityType,
        )
      );
    })
    .slice(0, 100);
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
    phone: event.phone || "",
    delayMinutes: Math.max(0, Math.round(Number(event.delayMinutes) || 0)),
    completedAt: event.completedAt || undefined,
  };
}

function normalizeSeatingTable(
  table: Partial<SeatingTable> & { id: number },
): SeatingTable {
  return {
    id: table.id,
    name: table.name || `第 ${table.id} 桌`,
    capacity: Math.min(30, Math.max(2, Math.round(Number(table.capacity) || 10))),
    zone: table.zone || "宴会区",
  };
}

function normalizeCommandCenter(
  value?: Partial<CommandCenterState>,
): CommandCenterState {
  return {
    liveMode: Boolean(value?.liveMode),
    supplies: Array.isArray(value?.supplies)
      ? value.supplies.map((item, index) => ({
          id: Number(item.id) || index + 1,
          title: item.title || "待确认物料",
          owner: item.owner || "待分配",
          checked: Boolean(item.checked),
        }))
      : defaultCommandCenter.supplies,
    contacts: Array.isArray(value?.contacts)
      ? value.contacts.map((item, index) => ({
          id: Number(item.id) || index + 1,
          role: item.role || "紧急联系人",
          name: item.name || "待填写",
          phone: item.phone || "",
        }))
      : defaultCommandCenter.contacts,
    incidentNote: value?.incidentNote || "",
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
    model: doc.model || undefined,
  };
}

function normalizeMediaAsset(asset: Partial<MediaAsset> & { id: number }) {
  const kind: MediaKind =
    asset.kind === "视频分镜"
      ? "视频分镜"
      : asset.kind === "AI 证件照"
        ? "AI 证件照"
        : "场景效果图";
  return {
    id: asset.id,
    kind,
    style:
      asset.style && mediaStyles.includes(asset.style) ? asset.style : "红金中式",
    ratio:
      asset.ratio && mediaRatios.includes(asset.ratio) ? asset.ratio : "16:9",
    title:
      asset.title ||
      (kind === "视频分镜"
        ? "新的婚礼视频分镜"
        : kind === "AI 证件照"
          ? "新的 AI 证件照"
          : "新的婚礼场景效果图"),
    prompt: asset.prompt || "",
    assetPath:
      asset.assetPath ||
      (kind === "视频分镜" ? "/media-red-gold-film.webp" : "/media-red-gold-ceremony.webp"),
    frames: Array.isArray(asset.frames) ? asset.frames : [],
    favorite: Boolean(asset.favorite),
    createdAt: asset.createdAt || new Date().toLocaleString("zh-CN"),
    status:
      asset.status &&
      ["template", "queued", "in_progress", "completed", "failed", "cancelled"].includes(
        asset.status,
      )
        ? asset.status
        : "template",
    progress: Math.min(100, Math.max(0, Number(asset.progress) || 0)),
    providerJobId: asset.providerJobId || undefined,
    model: asset.model || undefined,
    error: asset.error || undefined,
    storageKey: asset.storageKey || undefined,
    sizeBytes: Math.max(0, Number(asset.sizeBytes) || 0) || undefined,
    estimatedCostCny: Math.max(0, Number(asset.estimatedCostCny) || 0) || undefined,
  };
}

async function readMediaApi<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "AI 服务暂时无法完成请求。");
  }
  return payload;
}

function mediaStatusLabel(asset: MediaAsset) {
  if (asset.status === "queued") return "排队中";
  if (asset.status === "in_progress") return `生成中 ${Math.round(asset.progress)}%`;
  if (asset.status === "completed") return "真实生成";
  if (asset.status === "failed") return "生成失败";
  if (asset.status === "cancelled") return "已取消";
  return "示例模板";
}

function createSyncCode() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `xy-${randomPart.slice(0, 24).toLowerCase()}`;
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, encoded] = dataUrl.split(",", 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || "image/webp";
  const binary = window.atob(encoded || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function formatStorageSize(bytes?: number) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "大小未知";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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

function buildMediaAsset(
  profile: CoupleProfile,
  kind: MediaKind,
  style: MediaStyle,
  ratio: MediaRatio,
  brief: string,
) {
  const direction = brief.trim() || "高级、喜庆、适合婚礼现场落地";
  const basePrompt = `${profile.city}${style}婚礼，${profile.brideName}与${profile.groomName}，${profile.guestCount} 位宾客，${direction}，画面比例 ${ratio}`;

  if (kind === "视频分镜") {
    return {
      title: `${style}婚礼 · 30 秒预告分镜`,
      prompt: `${basePrompt}。婚礼电影质感，真实自然，镜头包含细节、人物、仪式与情绪收尾。`,
      assetPath: "/media-red-gold-film.webp",
      frames: [
        "0-4 秒｜请柬、戒指与婚礼日期特写",
        "5-12 秒｜新人准备与牵手入场",
        "13-22 秒｜仪式、亲友笑脸与拥抱",
        "23-30 秒｜两人并肩背影与婚期收尾",
      ],
    };
  }

  if (kind === "AI 证件照") {
    return {
      title: `${style}婚礼登记证件照`,
      prompt: `${direction}。正式婚礼登记证件照，保持人物身份特征与真实五官，正面平视，肩部以上构图，干净背景，肤色自然，光线均匀。`,
      assetPath: "/media-red-gold-ceremony.webp",
      frames: [],
    };
  }

  return {
    title: `${style}婚礼场景效果图`,
    prompt: `${basePrompt}。婚礼空间摄影，布置结构清晰，材质真实，灯光自然，无文字与水印。`,
    assetPath: "/media-red-gold-ceremony.webp",
    frames: [],
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
  const [seatingTables, setSeatingTables] = useState(seatingTableItems);
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [batchInvitationBusy, setBatchInvitationBusy] = useState(false);
  const [vendorList, setVendorList] = useState(vendorItems);
  const [recycleBin, setRecycleBin] = useState<RecycleItem[]>([]);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);
  const [invitationBusyGuestId, setInvitationBusyGuestId] = useState<number | null>(null);
  const [openVendorId, setOpenVendorId] = useState<number | null>(vendorItems[0]?.id ?? null);
  const [contractBusyVendorId, setContractBusyVendorId] = useState<number | null>(null);
  const [weddingTimeline, setWeddingTimeline] = useState(weddingTimelineItems);
  const [commandCenter, setCommandCenter] = useState(defaultCommandCenter);
  const [commandClock, setCommandClock] = useState("");
  const [copyKind, setCopyKind] = useState<CopyKind>("请柬文案");
  const [copyTone, setCopyTone] = useState<CopyTone>("温柔正式");
  const [copyBrief, setCopyBrief] = useState("想要一版可以直接发给亲友的文案");
  const [copywritingList, setCopywritingList] = useState(copywritingItems);
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind>("场景效果图");
  const [mediaStyle, setMediaStyle] = useState<MediaStyle>("红金中式");
  const [mediaRatio, setMediaRatio] = useState<MediaRatio>("16:9");
  const [mediaBrief, setMediaBrief] = useState("高级、喜庆、适合婚礼现场落地");
  const [mediaLibrary, setMediaLibrary] = useState(mediaItems);
  const [mediaGenerating, setMediaGenerating] = useState(false);
  const [mediaJobFilter, setMediaJobFilter] = useState<MediaJobFilter>("全部");
  const [mediaKindFilter, setMediaKindFilter] = useState<MediaKindFilter>("全部类型");
  const [mediaSort, setMediaSort] = useState<MediaSort>("最新生成");
  const [mediaSearch, setMediaSearch] = useState("");
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [assetTitleDraft, setAssetTitleDraft] = useState("");
  const [mediaUsage, setMediaUsage] = useState<MediaUsage>(() => normalizeMediaUsage());
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [syncCode, setSyncCode] = useState("");
  const [syncCodeDraft, setSyncCodeDraft] = useState("");
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>("连接中");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudRevision, setCloudRevision] = useState(0);
  const [cloudConflict, setCloudConflict] = useState<CloudConflict | null>(null);
  const [cloudSaveRequest, setCloudSaveRequest] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [backupPanelOpen, setBackupPanelOpen] = useState(false);
  const [workspaceBackups, setWorkspaceBackups] = useState<
    WorkspaceBackupSummary[]
  >([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("登录");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authCodeSending, setAuthCodeSending] = useState(false);
  const [registrationConsent, setRegistrationConsent] = useState(false);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [authSessions, setAuthSessions] = useState<AuthSession[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [accountSafetyOpen, setAccountSafetyOpen] = useState(false);
  const [privacyState, setPrivacyState] = useState<PrivacyOverview | null>(null);
  const [accountLifecycle, setAccountLifecycle] =
    useState<AccountLifecycleOverview | null>(null);
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [accountSafetyBusy, setAccountSafetyBusy] = useState(false);
  const [teamOverview, setTeamOverview] = useState<TeamOverview | null>(null);
  const [notificationOverview, setNotificationOverview] =
    useState<NotificationOverview | null>(null);
  const [billingOverview, setBillingOverview] = useState<BillingOverview | null>(null);
  const [aiUsageOverview, setAiUsageOverview] =
    useState<AiUsageOverview | null>(null);
  const [reminderOverview, setReminderOverview] =
    useState<ReminderOverview | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [serviceDiagnostics, setServiceDiagnostics] = useState<
    ServiceDiagnostic[]
  >([]);
  const [adminGrantUnits, setAdminGrantUnits] = useState("50");
  const [adminBusy, setAdminBusy] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamBusy, setTeamBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<TeamRole, "owner">>("editor");
  const [latestInviteCode, setLatestInviteCode] = useState("");
  const [acceptInviteCode, setAcceptInviteCode] = useState("");
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false);
  const [deepSeekKeyDraft, setDeepSeekKeyDraft] = useState("");
  const [arkKeyDraft, setArkKeyDraft] = useState("");
  const [browserDeepSeekKey, setBrowserDeepSeekKey] = useState("");
  const [browserArkKey, setBrowserArkKey] = useState("");
  const [deepSeekModelDraft, setDeepSeekModelDraft] = useState(DEFAULT_DEEPSEEK_MODEL);
  const [arkImageModelDraft, setArkImageModelDraft] = useState(DEFAULT_ARK_IMAGE_MODEL);
  const [arkVideoModelDraft, setArkVideoModelDraft] = useState(DEFAULT_ARK_VIDEO_MODEL);
  const [showDeepSeekKey, setShowDeepSeekKey] = useState(false);
  const [showArkKey, setShowArkKey] = useState(false);
  const [mediaService, setMediaService] = useState<AiServiceConfig>({
    checked: false,
    configured: false,
    copy: {
      provider: "DeepSeek",
      configured: false,
      source: "none",
      model: DEFAULT_DEEPSEEK_MODEL,
    },
    image: {
      provider: "豆包 Seedream",
      configured: false,
      source: "none",
      model: DEFAULT_ARK_IMAGE_MODEL,
    },
    video: {
      provider: "Seedance 2.0",
      configured: false,
      source: "none",
      model: DEFAULT_ARK_VIDEO_MODEL,
    },
  });
  const [collaborationList, setCollaborationList] = useState(collaborationItems);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [notice, setNotice] = useState("AI 服务已就绪，输入需求即可生成今日计划。");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(tasks[0]?.id ?? null);
  const promptRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const mediaUploadRef = useRef<HTMLInputElement>(null);
  const mediaLibraryRef = useRef(mediaItems);
  const cloudRevisionRef = useRef(0);
  const forceCloudOverwriteRef = useRef(false);
  const workspaceChannelRef = useRef<BroadcastChannel | null>(null);
  const workspaceStorageKey = currentUser
    ? `${STORAGE_KEY}:user:${currentUser.id}`
    : STORAGE_KEY;
  const mediaUsageStorageKey = currentUser
    ? `${MEDIA_USAGE_KEY}:user:${currentUser.id}`
    : MEDIA_USAGE_KEY;
  const workspaceScopeKey = currentUser
    ? `user:${currentUser.id}`
    : syncCode
      ? `code:${syncCode}`
      : "";

  const applyWorkspace = useCallback((workspace: Partial<SavedWorkspace>) => {
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
    if (Array.isArray(workspace.seatingTables)) {
      setSeatingTables(workspace.seatingTables.map(normalizeSeatingTable));
    } else {
      setSeatingTables(seatingTableItems);
    }
    if (Array.isArray(workspace.vendorList)) {
      setVendorList(workspace.vendorList.map(normalizeVendor));
    }
    setRecycleBin(normalizeRecycleBin(workspace.recycleBin));
    if (Array.isArray(workspace.weddingTimeline)) {
      setWeddingTimeline(workspace.weddingTimeline.map(normalizeWeddingEvent));
    }
    setCommandCenter(normalizeCommandCenter(workspace.commandCenter));
    if (Array.isArray(workspace.copywritingList)) {
      setCopywritingList(workspace.copywritingList.map(normalizeCopywriting));
    }
    if (Array.isArray(workspace.mediaLibrary)) {
      setMediaLibrary(workspace.mediaLibrary.map(normalizeMediaAsset));
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          authenticated?: boolean;
          user?: AuthUser | null;
        };
        if (result.authenticated && result.user) setCurrentUser(result.user);
      } catch {
        // Anonymous mode remains available when the account service is offline.
      } finally {
        if (!controller.signal.aborted) setAuthChecked(true);
      }
    }
    void checkSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!authChecked || !currentUser) return;
    const controller = new AbortController();
    async function loadTeamHub() {
      setTeamLoading(true);
      try {
        const [
          teamResponse,
          notificationResponse,
          billingResponse,
          usageResponse,
          reminderResponse,
          privacyResponse,
          accountResponse,
          adminResponse,
        ] =
          await Promise.all([
            fetch("/api/collaboration", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/notifications", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/billing", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/usage", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/reminders", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/privacy", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/account", {
              cache: "no-store",
              signal: controller.signal,
            }),
            currentUser.isAdmin
              ? fetch("/api/admin", {
                  cache: "no-store",
                  signal: controller.signal,
                })
              : Promise.resolve(null),
          ]);
        if (teamResponse.ok) {
          setTeamOverview((await teamResponse.json()) as TeamOverview);
        }
        if (notificationResponse.ok) {
          setNotificationOverview(
            (await notificationResponse.json()) as NotificationOverview,
          );
        }
        if (billingResponse.ok) {
          setBillingOverview((await billingResponse.json()) as BillingOverview);
        }
        if (usageResponse.ok) {
          setAiUsageOverview((await usageResponse.json()) as AiUsageOverview);
        }
        if (reminderResponse.ok) {
          setReminderOverview(
            (await reminderResponse.json()) as ReminderOverview,
          );
        }
        if (privacyResponse.ok) {
          setPrivacyState((await privacyResponse.json()) as PrivacyOverview);
        }
        if (accountResponse.ok) {
          setAccountLifecycle(
            (await accountResponse.json()) as AccountLifecycleOverview,
          );
        }
        if (adminResponse?.ok) {
          setAdminOverview((await adminResponse.json()) as AdminOverview);
        }
      } catch {
        // The planning workspace remains usable if team services are temporarily offline.
      } finally {
        if (!controller.signal.aborted) setTeamLoading(false);
      }
    }
    void loadTeamHub();
    return () => controller.abort();
  }, [authChecked, currentUser]);

  useEffect(() => {
    if (!authChecked) return;
    const restoreTimer = window.setTimeout(() => {
      setWorkspaceLoaded(false);
      setCloudReady(false);
      try {
        const saved =
          window.localStorage.getItem(workspaceStorageKey) ||
          (!currentUser ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);
        if (!saved) {
          resetWorkspace({ preserveStorage: true, silent: true });
          setWorkspaceLoaded(true);
          return;
        }

        const workspace = JSON.parse(saved) as Partial<SavedWorkspace>;
        applyWorkspace(workspace);
        setNotice(
          currentUser
            ? `已恢复 ${currentUser.displayName} 的备婚工作台。`
            : "已恢复上次的备婚工作台。",
        );
      } catch {
        setNotice("本地保存读取失败，已使用默认备婚清单。");
      } finally {
        setWorkspaceLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
    // resetWorkspace only applies deterministic starter data here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyWorkspace, authChecked, currentUser, workspaceStorageKey]);

  useEffect(() => {
    if (!workspaceLoaded) return;

    const workspace: SavedWorkspace = {
      profile,
      taskList,
      budgetList,
      guestList,
      seatingTables,
      vendorList,
      recycleBin,
      weddingTimeline,
      commandCenter,
      copywritingList,
      mediaLibrary,
      collaborationList,
      draft,
      mode,
      prompt,
      aiConfigured,
    };
    try {
      window.localStorage.setItem(workspaceStorageKey, JSON.stringify(workspace));
    } catch {
      window.setTimeout(
        () =>
          setNotice(
            "影像素材较大，当前页面可继续使用，但浏览器空间不足，刷新后可能无法保留最新图片。",
          ),
        0,
      );
    }
  }, [
    aiConfigured,
    budgetList,
    collaborationList,
    copywritingList,
    draft,
    guestList,
    seatingTables,
    mediaLibrary,
    mode,
    profile,
    prompt,
    taskList,
    vendorList,
    recycleBin,
    weddingTimeline,
    commandCenter,
    workspaceLoaded,
    workspaceStorageKey,
  ]);

  useEffect(() => {
    mediaLibraryRef.current = mediaLibrary;
  }, [mediaLibrary]);

  useEffect(() => {
    const updateClock = () =>
      setCommandClock(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    const initialTimer = window.setTimeout(updateClock, 0);
    const clockTimer = window.setInterval(updateClock, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    if (!workspaceLoaded || recycleBin.length === 0) return;
    const now = Date.now();
    const expired = recycleBin.filter(
      (item) => new Date(item.expiresAt).getTime() <= now,
    );
    if (expired.length === 0) return;
    const storageKeys = expired.flatMap((item) => {
      if (item.entityType === "media") {
        const asset = item.data as MediaAsset;
        if (asset.assetPath?.startsWith("blob:")) URL.revokeObjectURL(asset.assetPath);
        return asset.storageKey ? [asset.storageKey] : [];
      }
      if (item.entityType === "vendor") {
        const vendor = item.data as Vendor;
        return vendor.contractStorageKey ? [vendor.contractStorageKey] : [];
      }
      return [];
    });
    const cleanupTimer = window.setTimeout(() => {
      setRecycleBin((current) =>
        current.filter((item) => new Date(item.expiresAt).getTime() > now),
      );
      storageKeys.forEach((key) => {
        void fetch(`/api/library?key=${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: { "x-workspace-id": syncCode },
        }).catch(() => undefined);
      });
    }, 0);
    return () => window.clearTimeout(cleanupTimer);
  }, [recycleBin, syncCode, workspaceLoaded]);

  useEffect(() => {
    const restoreApiTimer = window.setTimeout(() => {
      const deepSeekKey = window.sessionStorage.getItem(DEEPSEEK_KEY_STORAGE) || "";
      const arkKey = window.sessionStorage.getItem(ARK_KEY_STORAGE) || "";
      const deepSeekModel =
        window.sessionStorage.getItem(DEEPSEEK_MODEL_STORAGE) || DEFAULT_DEEPSEEK_MODEL;
      const imageModel =
        window.sessionStorage.getItem(ARK_IMAGE_MODEL_STORAGE) || DEFAULT_ARK_IMAGE_MODEL;
      const videoModel =
        window.sessionStorage.getItem(ARK_VIDEO_MODEL_STORAGE) || DEFAULT_ARK_VIDEO_MODEL;
      setBrowserDeepSeekKey(deepSeekKey);
      setBrowserArkKey(arkKey);
      setDeepSeekKeyDraft(deepSeekKey);
      setArkKeyDraft(arkKey);
      setDeepSeekModelDraft(deepSeekModel);
      setArkImageModelDraft(imageModel);
      setArkVideoModelDraft(videoModel);
      void checkMediaService(false, { deepSeekKey, arkKey, deepSeekModel, imageModel, videoModel });
    }, 0);
    return () => window.clearTimeout(restoreApiTimer);
    // The service check receives the complete session snapshot explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (portraitPreview) URL.revokeObjectURL(portraitPreview);
    };
  }, [portraitPreview]);

  useEffect(() => {
    const restoreUsageTimer = window.setTimeout(() => {
      try {
        if (!authChecked) return;
        const savedUsage = window.localStorage.getItem(mediaUsageStorageKey);
        if (savedUsage) setMediaUsage(normalizeMediaUsage(JSON.parse(savedUsage)));
        else setMediaUsage(normalizeMediaUsage());
      } catch {
        setNotice("AI 调用统计读取失败，已从本月 0 次重新记录。");
      }
    }, 0);
    return () => window.clearTimeout(restoreUsageTimer);
  }, [authChecked, mediaUsageStorageKey]);

  useEffect(() => {
    if (!workspaceLoaded) return;
    window.localStorage.setItem(mediaUsageStorageKey, JSON.stringify(mediaUsage));
  }, [mediaUsage, mediaUsageStorageKey, workspaceLoaded]);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      const savedCode = window.localStorage.getItem(SYNC_CODE_KEY) || createSyncCode();
      window.localStorage.setItem(SYNC_CODE_KEY, savedCode);
      setSyncCode(savedCode);
      setSyncCodeDraft(savedCode);
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, []);

  useEffect(() => {
    const updateOnlineState = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        setCloudSaveRequest((current) => current + 1);
      } else {
        setCloudSyncStatus("仅本机");
        setNotice("当前网络已断开，修改会先保存在本机，联网后自动继续同步。");
      }
    };
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!workspaceScopeKey || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("xiyuan-workspace-sync");
    workspaceChannelRef.current = channel;
    channel.onmessage = (event: MessageEvent<{
      scope?: string;
      revision?: number;
      updatedAt?: string;
    }>) => {
      const incoming = event.data;
      if (
        incoming.scope !== workspaceScopeKey ||
        !incoming.revision ||
        incoming.revision <= cloudRevisionRef.current
      ) {
        return;
      }
      setCloudConflict({
        currentRevision: incoming.revision,
        updatedAt: incoming.updatedAt,
      });
      setCloudSyncStatus("同步冲突");
      setNotice("另一个页面刚刚更新了云端资料，请选择载入云端或保留本机版本。");
    };
    return () => {
      if (workspaceChannelRef.current === channel) {
        workspaceChannelRef.current = null;
      }
      channel.close();
    };
  }, [workspaceScopeKey]);

  useEffect(() => {
    if (
      !workspaceLoaded ||
      !authChecked ||
      (!currentUser && !syncCode) ||
      cloudReady
    ) return;
    const controller = new AbortController();

    async function restoreCloudWorkspace() {
      setCloudSyncStatus("连接中");
      try {
        const response = await fetch("/api/workspace", {
          headers: {
            "x-workspace-id": syncCode,
          },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          data?: {
            revision?: number;
            updatedAt?: string;
            usage?: Partial<MediaUsage>;
            workspace?: Partial<SavedWorkspace>;
          } | null;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "云端资料连接失败。");

        const nextRevision = result.data?.revision || 0;
        cloudRevisionRef.current = nextRevision;
        setCloudRevision(nextRevision);
        setCloudConflict(null);
        if (result.data?.workspace) {
          applyWorkspace(result.data.workspace);
          if (result.data.usage) setMediaUsage(normalizeMediaUsage(result.data.usage));
          setCloudUpdatedAt(result.data.updatedAt || "");
          setNotice(
            currentUser
              ? `已从账号云端恢复 ${currentUser.displayName} 的备婚资料。`
              : "已从云端恢复最新备婚资料。",
          );
        }
        setCloudSyncStatus("已保存");
      } catch (error) {
        if (controller.signal.aborted) return;
        setCloudSyncStatus("仅本机");
        setNotice(
          error instanceof Error
            ? `${error.message} 当前仍会安全保存在这台设备。`
            : "云端资料连接失败，当前仍会安全保存在这台设备。",
        );
      } finally {
        if (!controller.signal.aborted) setCloudReady(true);
      }
    }

    void restoreCloudWorkspace();
    return () => controller.abort();
  }, [applyWorkspace, authChecked, cloudReady, currentUser, syncCode, workspaceLoaded]);

  useEffect(() => {
    if (!workspaceLoaded || !cloudReady || (!currentUser && !syncCode)) return;
    if (!isOnline) return;
    if (cloudConflict && !forceCloudOverwriteRef.current) return;

    const cloudSaveTimer = window.setTimeout(async () => {
      const workspace: SavedWorkspace = {
        profile,
        taskList,
        budgetList,
        guestList,
        seatingTables,
        vendorList,
        recycleBin,
        weddingTimeline,
        commandCenter,
        copywritingList,
        mediaLibrary,
        collaborationList,
        draft,
        mode,
        prompt,
        aiConfigured,
      };

      setCloudSyncStatus("保存中");
      const forceOverwrite = forceCloudOverwriteRef.current;
      forceCloudOverwriteRef.current = false;
      try {
        const response = await fetch("/api/workspace", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-workspace-id": syncCode,
            "if-match": String(cloudRevisionRef.current),
            ...(forceOverwrite ? { "x-force-overwrite": "1" } : {}),
          },
          body: JSON.stringify({
            workspace,
            usage: mediaUsage,
          }),
        });
        const result = (await response.json()) as {
          code?: string;
          currentRevision?: number;
          error?: string;
          revision?: number;
          updatedAt?: string;
        };
        if (response.status === 409 && result.code === "workspace_conflict") {
          setCloudConflict({
            currentRevision: result.currentRevision || cloudRevisionRef.current + 1,
            updatedAt: result.updatedAt,
          });
          setCloudSyncStatus("同步冲突");
          setNotice("云端资料已有新修改，请选择载入云端或确认保留本机版本。");
          return;
        }
        if (!response.ok) throw new Error(result.error || "云端保存失败。");
        const nextUpdatedAt = result.updatedAt || new Date().toISOString();
        const nextRevision = result.revision || cloudRevisionRef.current + 1;
        cloudRevisionRef.current = nextRevision;
        setCloudRevision(nextRevision);
        setCloudConflict(null);
        setCloudUpdatedAt(nextUpdatedAt);
        setCloudSyncStatus("已保存");
        workspaceChannelRef.current?.postMessage({
          scope: workspaceScopeKey,
          revision: nextRevision,
          updatedAt: nextUpdatedAt,
        });
      } catch {
        setCloudSyncStatus("同步失败");
      }
    }, 1200);

    return () => window.clearTimeout(cloudSaveTimer);
  }, [
    aiConfigured,
    budgetList,
    cloudReady,
    cloudConflict,
    cloudSaveRequest,
    collaborationList,
    copywritingList,
    draft,
    guestList,
    seatingTables,
    mediaLibrary,
    mediaUsage,
    mode,
    isOnline,
    profile,
    prompt,
    syncCode,
    taskList,
    vendorList,
    recycleBin,
    weddingTimeline,
    commandCenter,
    workspaceLoaded,
    workspaceScopeKey,
    currentUser,
  ]);

  useEffect(() => {
    if (!workspaceLoaded) return;

    const pollActiveVideos = () => {
      mediaLibraryRef.current
        .filter(
          (asset) =>
            asset.kind === "视频分镜" &&
            asset.providerJobId &&
            (asset.status === "queued" || asset.status === "in_progress"),
        )
        .forEach((asset) => void refreshVideoAsset(asset));
    };

    pollActiveVideos();
    const pollTimer = window.setInterval(pollActiveVideos, 15000);
    return () => window.clearInterval(pollTimer);
    // The poller reads the latest asset list from mediaLibraryRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceLoaded]);

  useEffect(() => {
    if (!workspaceLoaded || !authChecked || (!currentUser && !syncCode)) return;
    const controller = new AbortController();

    async function recoverServerVideoJobs() {
      try {
        const response = await fetch("/api/media/jobs", {
          cache: "no-store",
          headers: mediaRequestHeaders(),
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          jobs?: Array<{
            id: string;
            status: MediaGenerationStatus;
            progress: number;
            model: string;
            prompt: string;
            ratio: "16:9" | "9:16";
            seconds: number;
            title: string;
            style: string;
            createdAt: string;
            error?: string | null;
          }>;
        };
        if (!response.ok || !Array.isArray(result.jobs)) return;
        setMediaLibrary((current) => {
          const knownJobs = new Set(
            current.map((asset) => asset.providerJobId).filter(Boolean),
          );
          let id = nextId(current);
          const recovered = result.jobs
            .filter((job) => !knownJobs.has(job.id))
            .map((job): MediaAsset => {
              return {
                id: id++,
                kind: "视频分镜",
                style: mediaStyles.includes(job.style as MediaStyle)
                  ? (job.style as MediaStyle)
                  : "复古电影",
                ratio: job.ratio,
                title: job.title,
                prompt: job.prompt,
                assetPath: "/media-red-gold-film.webp",
                frames: [],
                favorite: false,
                createdAt: new Date(job.createdAt).toLocaleString("zh-CN"),
                status: job.status === "completed" ? "in_progress" : job.status,
                progress: job.status === "completed" ? 99 : job.progress,
                providerJobId: job.id,
                model: job.model,
                error: job.error || undefined,
                estimatedCostCny:
                  mediaUsage.videoSecondEstimateCny * Math.max(1, job.seconds),
              };
            });
          return recovered.length > 0 ? [...recovered, ...current] : current;
        });
      } catch {
        // Existing local tasks remain available if the recovery registry is offline.
      }
    }

    void recoverServerVideoJobs();
    return () => controller.abort();
    // Recovery runs once for each authenticated or sync-code workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, currentUser, syncCode, workspaceLoaded]);

  const daysUntil = useMemo(() => getDaysUntil(profile.weddingDate), [profile.weddingDate]);
  const stagePlan = useMemo(() => buildStagePlan(profile, daysUntil), [daysUntil, profile]);
  const assistantMatches = useMemo(() => matchAssistantIntents(prompt), [prompt]);
  const primaryAssistantMatch = assistantMatches[0] || null;

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
  const invitedGuestCount = guestList.filter((guest) => guest.invitationCode).length;
  const respondedGuestCount = guestList.filter((guest) => guest.respondedAt).length;
  const deliveredInvitationCount = guestList.filter(
    (guest) => guest.deliveryStatus === "已发送" || guest.deliveryStatus === "链接已生成",
  ).length;
  const seatingSummaries = seatingTables.map((table) => {
    const guests = guestList.filter((guest) => guest.table === table.name);
    const occupied = guests.reduce((sum, guest) => sum + guest.count, 0);
    return { ...table, guests, occupied, remaining: table.capacity - occupied };
  });
  const seatingPeople = guestList
    .filter((guest) => guest.rsvp !== "不参加")
    .reduce((sum, guest) => sum + guest.count, 0);
  const unseatedGuestCount = guestList.filter(
    (guest) =>
      guest.rsvp !== "不参加" &&
      !seatingTables.some((table) => table.name === guest.table),
  ).length;
  const overCapacityTables = seatingSummaries.filter((table) => table.remaining < 0).length;
  const signedVendorCount = vendorList.filter((vendor) => vendor.status === "已签约").length;
  const vendorQuoteTotal = vendorList.reduce((sum, vendor) => sum + vendor.quote, 0);
  const vendorPaidTotal = vendorList
    .flatMap((vendor) => vendor.payments)
    .filter((payment) => payment.status === "已支付")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const overdueVendorPayments = vendorList
    .flatMap((vendor) => vendor.payments)
    .filter(
      (payment) =>
        payment.status === "待支付" &&
        Boolean(payment.dueDate) &&
        new Date(`${payment.dueDate}T23:59:59`).getTime() < Date.now(),
    ).length;
  const confirmedTimelineCount = weddingTimeline.filter((event) => event.status === "已完成").length;
  const commandActiveEvent =
    weddingTimeline.find((event) => event.status === "进行中") ||
    [...weddingTimeline]
      .sort((a, b) => a.time.localeCompare(b.time))
      .find((event) => event.status !== "已完成") ||
    null;
  const checkedSupplyCount = commandCenter.supplies.filter((item) => item.checked).length;
  const delayedEventCount = weddingTimeline.filter((event) => (event.delayMinutes || 0) > 0).length;
  const mediaUsageTotal = mediaUsage.imageCalls + mediaUsage.videoCalls;
  const mediaUsageRate = Math.min(100, Math.round((mediaUsageTotal / mediaUsage.limit) * 100));
  const mediaBudgetRate = Math.min(
    100,
    Math.round((mediaUsage.estimatedSpendCny / mediaUsage.monthlyBudgetCny) * 100),
  );
  const nextMediaCost =
    mediaKind === "视频分镜"
      ? mediaUsage.videoSecondEstimateCny * mediaUsage.videoSeconds
      : mediaUsage.imageEstimateCny;
  const mediaStorageTotal = mediaLibrary.reduce(
    (sum, asset) => sum + (Number(asset.sizeBytes) || 0),
    0,
  );
  const mediaJobStats = useMemo(() => {
    const realJobs = mediaLibrary.filter((asset) => asset.status !== "template");
    return {
      total: realJobs.length,
      active: realJobs.filter(
        (asset) => asset.status === "queued" || asset.status === "in_progress",
      ).length,
      completed: realJobs.filter((asset) => asset.status === "completed").length,
      failed: realJobs.filter(
        (asset) => asset.status === "failed" || asset.status === "cancelled",
      ).length,
    };
  }, [mediaLibrary]);
  const filteredMediaLibrary = useMemo(() => {
    let filtered = mediaLibrary;
    if (mediaJobFilter === "处理中") {
      filtered = filtered.filter(
        (asset) => asset.status === "queued" || asset.status === "in_progress",
      );
    } else if (mediaJobFilter === "已完成") {
      filtered = filtered.filter((asset) => asset.status === "completed");
    } else if (mediaJobFilter === "失败") {
      filtered = filtered.filter(
        (asset) => asset.status === "failed" || asset.status === "cancelled",
      );
    } else if (mediaJobFilter === "已收藏") {
      filtered = filtered.filter((asset) => asset.favorite);
    }
    if (mediaKindFilter !== "全部类型") {
      filtered = filtered.filter((asset) => asset.kind === mediaKindFilter);
    }
    const keyword = mediaSearch.trim().toLowerCase();
    if (keyword) {
      filtered = filtered.filter((asset) =>
        [asset.title, asset.prompt, asset.style, asset.kind, asset.model || ""]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      );
    }
    return [...filtered].sort((left, right) => {
      if (mediaSort === "名称排序") return left.title.localeCompare(right.title, "zh-CN");
      if (mediaSort === "最早生成") return left.id - right.id;
      return right.id - left.id;
    });
  }, [mediaJobFilter, mediaKindFilter, mediaLibrary, mediaSearch, mediaSort]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateProfile(patch: Partial<CoupleProfile>) {
    setProfile((current) => normalizeProfile({ ...current, ...patch }));
  }

  async function submitAuth() {
    if (authSubmitting) return;
    setAuthSubmitting(true);
    try {
      const endpoint =
        authMode === "注册"
          ? "/api/auth/register"
          : authMode === "验证邮箱"
            ? "/api/auth/verify/confirm"
            : authMode === "找回密码"
              ? "/api/auth/password/reset"
              : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authMode === "找回密码" ? authNewPassword : authPassword,
          displayName: authDisplayName,
          code: authCode,
          acceptedTerms: authMode === "注册" ? registrationConsent : undefined,
        }),
      });
      const result = (await response.json()) as {
        code?: string;
        devCode?: string;
        error?: string;
        verificationRequired?: boolean;
        user?: AuthUser;
      };
      if (!response.ok) {
        if (result.code === "email_not_verified") setAuthMode("验证邮箱");
        throw new Error(result.error || `${authMode}失败，请稍后重试。`);
      }
      if (authMode === "注册" && result.verificationRequired) {
        setAuthMode("验证邮箱");
        setAuthCode(result.devCode || "");
        setAuthPassword("");
        setNotice(
          result.devCode
            ? `本地验证模式已生成验证码 ${result.devCode}，填写后即可进入账号。`
            : "账号已创建，验证码已发送到邮箱，请完成验证。",
        );
        return;
      }
      if (!result.user) throw new Error(`${authMode}失败，请稍后重试。`);
      setWorkspaceLoaded(false);
      setCloudReady(false);
      setCloudSyncStatus("连接中");
      setCurrentUser(result.user);
      setAuthPassword("");
      setAuthNewPassword("");
      setAuthCode("");
      setRegistrationConsent(false);
      setAuthPanelOpen(false);
      setNotice(
        authMode === "验证邮箱"
          ? `邮箱验证成功，正在建立 ${result.user.displayName} 的独立备婚空间。`
          : authMode === "找回密码"
            ? `密码已更新，正在恢复 ${result.user.displayName} 的云端资料。`
            : `登录成功，正在恢复 ${result.user.displayName} 的云端备婚资料。`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${authMode}失败，请稍后重试。`);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function requestAuthCode(purpose: "verify" | "reset") {
    if (authCodeSending) return;
    setAuthCodeSending(true);
    try {
      const response = await fetch(
        purpose === "verify"
          ? "/api/auth/verify/request"
          : "/api/auth/password/request",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: authEmail }),
        },
      );
      const result = (await response.json()) as {
        devCode?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "验证码发送失败。");
      if (result.devCode) setAuthCode(result.devCode);
      setNotice(
        result.devCode
          ? `本地验证模式验证码：${result.devCode}`
          : result.message || "验证码已发送，请检查邮箱。",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "验证码发送失败。");
    } finally {
      setAuthCodeSending(false);
    }
  }

  async function logoutUser() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setWorkspaceLoaded(false);
      setCloudReady(false);
      setCloudSyncStatus("连接中");
      setTeamOverview(null);
      setNotificationOverview(null);
      setBillingOverview(null);
      setAiUsageOverview(null);
      setReminderOverview(null);
      setAdminOverview(null);
      setSessionPanelOpen(false);
      setAuthSessions([]);
      setAccountSafetyOpen(false);
      setPrivacyState(null);
      setAccountLifecycle(null);
      setDeletionConfirmation("");
      setCurrentUser(null);
      setAuthPanelOpen(false);
      setNotice("已退出账号，当前切换回本机同步码空间。");
    }
  }

  async function loadAuthSessions(forceOpen = false) {
    if (sessionPanelOpen && !forceOpen) {
      setSessionPanelOpen(false);
      return;
    }
    setSessionBusy(true);
    try {
      const response = await fetch("/api/auth/sessions", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        sessions?: AuthSession[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "登录设备读取失败。");
      setAuthSessions(result.sessions || []);
      setSessionPanelOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "登录设备读取失败。");
    } finally {
      setSessionBusy(false);
    }
  }

  async function revokeAuthSessions(sessionId?: string) {
    setSessionBusy(true);
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          sessionId
            ? { action: "revoke_session", sessionId }
            : { action: "revoke_others" },
        ),
      });
      const result = (await response.json()) as {
        revoked?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "设备退出失败。");
      setNotice(
        result.revoked
          ? `已退出 ${result.revoked} 个登录设备。`
          : "当前没有其他登录设备。",
      );
      await loadAuthSessions(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "设备退出失败。");
    } finally {
      setSessionBusy(false);
    }
  }

  async function toggleAccountSafety() {
    if (accountSafetyOpen) {
      setAccountSafetyOpen(false);
      return;
    }
    setAccountSafetyBusy(true);
    try {
      const [privacyResponse, accountResponse] = await Promise.all([
        fetch("/api/privacy", { cache: "no-store" }),
        fetch("/api/account", { cache: "no-store" }),
      ]);
      if (!privacyResponse.ok || !accountResponse.ok) {
        throw new Error("账号与隐私状态读取失败。");
      }
      setPrivacyState((await privacyResponse.json()) as PrivacyOverview);
      setAccountLifecycle(
        (await accountResponse.json()) as AccountLifecycleOverview,
      );
      setAccountSafetyOpen(true);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "账号与隐私状态读取失败。",
      );
    } finally {
      setAccountSafetyBusy(false);
    }
  }

  async function acceptPrivacyPolicies() {
    setAccountSafetyBusy(true);
    try {
      const response = await fetch("/api/privacy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      const result = (await response.json()) as {
        consent?: PrivacyOverview["consent"];
        error?: string;
      };
      if (!response.ok || !result.consent) {
        throw new Error(result.error || "隐私授权记录失败。");
      }
      setPrivacyState((current) =>
        current
          ? { ...current, consent: result.consent!, current: true }
          : current,
      );
      setNotice("用户协议与隐私政策授权记录已更新。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "隐私授权记录失败。");
    } finally {
      setAccountSafetyBusy(false);
    }
  }

  async function scheduleAccountDeletion() {
    setAccountSafetyBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: deletionConfirmation }),
      });
      const result = (await response.json()) as {
        deletion?: AccountLifecycleOverview["deletion"];
        error?: string;
      };
      if (!response.ok || !result.deletion) {
        throw new Error(result.error || "账号注销申请失败。");
      }
      setAccountLifecycle((current) =>
        current ? { ...current, deletion: result.deletion! } : current,
      );
      setDeletionConfirmation("");
      setNotice("注销申请已提交，7 天冷静期内可以随时取消。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "账号注销申请失败。");
    } finally {
      setAccountSafetyBusy(false);
    }
  }

  async function cancelScheduledDeletion() {
    setAccountSafetyBusy(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const result = (await response.json()) as {
        deletion?: AccountLifecycleOverview["deletion"];
        error?: string;
      };
      if (!response.ok || !result.deletion) {
        throw new Error(result.error || "取消注销失败。");
      }
      setAccountLifecycle((current) =>
        current ? { ...current, deletion: result.deletion! } : current,
      );
      setNotice("账号注销申请已取消，所有资料继续保留。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "取消注销失败。");
    } finally {
      setAccountSafetyBusy(false);
    }
  }

  async function downloadAuditLog() {
    setTeamBusy(true);
    try {
      const response = await fetch("/api/collaboration/audit/export");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "操作记录导出失败。");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `喜缘操作记录-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("完整操作记录已导出为 Excel 可打开的 CSV 文件。");
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "操作记录导出失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function refreshTeamHub() {
    if (!currentUser) return;
    const [
      teamResponse,
      notificationResponse,
      billingResponse,
      usageResponse,
      reminderResponse,
      privacyResponse,
      accountResponse,
      adminResponse,
    ] = await Promise.all([
      fetch("/api/collaboration", { cache: "no-store" }),
      fetch("/api/notifications", { cache: "no-store" }),
      fetch("/api/billing", { cache: "no-store" }),
      fetch("/api/usage", { cache: "no-store" }),
      fetch("/api/reminders", { cache: "no-store" }),
      fetch("/api/privacy", { cache: "no-store" }),
      fetch("/api/account", { cache: "no-store" }),
      currentUser.isAdmin
        ? fetch("/api/admin", { cache: "no-store" })
        : Promise.resolve(null),
    ]);
    if (teamResponse.ok) setTeamOverview((await teamResponse.json()) as TeamOverview);
    if (notificationResponse.ok) {
      setNotificationOverview(
        (await notificationResponse.json()) as NotificationOverview,
      );
    }
    if (billingResponse.ok) {
      setBillingOverview((await billingResponse.json()) as BillingOverview);
    }
    if (usageResponse.ok) {
      setAiUsageOverview((await usageResponse.json()) as AiUsageOverview);
    }
    if (reminderResponse.ok) {
      setReminderOverview(
        (await reminderResponse.json()) as ReminderOverview,
      );
    }
    if (privacyResponse.ok) {
      setPrivacyState((await privacyResponse.json()) as PrivacyOverview);
    }
    if (accountResponse.ok) {
      setAccountLifecycle(
        (await accountResponse.json()) as AccountLifecycleOverview,
      );
    }
    if (adminResponse?.ok) {
      setAdminOverview((await adminResponse.json()) as AdminOverview);
    }
  }

  async function refreshAiUsage() {
    if (!currentUser) return;
    const response = await fetch("/api/usage", { cache: "no-store" });
    if (response.ok) {
      setAiUsageOverview((await response.json()) as AiUsageOverview);
    }
  }

  async function runAutomaticReminderCheck() {
    setTeamBusy(true);
    try {
      const response = await fetch("/api/reminders", { method: "POST" });
      const result = (await response.json()) as {
        sent?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "自动提醒检查失败。");
      setNotice(
        result.sent
          ? `自动提醒检查完成，已发送 ${result.sent} 条提醒。`
          : "自动提醒检查完成，目前没有需要发送的提醒。",
      );
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "自动提醒检查失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function runAdminAction(
    action:
      | "grant_quota"
      | "set_plan"
      | "run_reminders"
      | "diagnose_services"
      | "migrate_workspaces"
      | "run_recovery_drill",
    ownerId = "",
    plan?: "free" | "pro" | "studio",
  ) {
    setAdminBusy(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: mediaRequestHeaders(true),
        body: JSON.stringify({
          action,
          ownerId,
          plan,
          units: Number(adminGrantUnits),
        }),
      });
      const result = (await response.json()) as {
        sent?: number;
        services?: ServiceDiagnostic[];
        migration?: AdminOverview["readiness"]["lastMigrationReport"];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "后台操作失败。");
      if (result.services) setServiceDiagnostics(result.services);
      setNotice(
        action === "grant_quota"
          ? `已为该空间设置 ${Math.max(0, Number(adminGrantUnits) || 0)} 点赠送额度。`
          : action === "set_plan"
            ? "空间套餐已更新。"
            : action === "diagnose_services"
              ? "真实服务诊断已完成，未触发任何付费生成。"
              : action === "migrate_workspaces"
                ? `数据迁移检查完成：迁移 ${result.migration?.migrated || 0} 个，异常 ${result.migration?.corrupted || 0} 个。`
                : action === "run_recovery_drill"
                  ? `恢复演练完成：${result.migration?.recoverable || 0} 个备份可恢复。`
              : `提醒任务已运行，发送 ${result.sent || 0} 条。`,
      );
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "后台操作失败。");
    } finally {
      setAdminBusy(false);
    }
  }

  async function updateIncidentState(
    incidentId: string,
    action: "resolve_incident" | "reopen_incident",
  ) {
    setAdminBusy(true);
    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, incidentId }),
      });
      const result = (await response.json()) as {
        operations?: AdminOverview["operations"];
        error?: string;
      };
      if (!response.ok || !result.operations) {
        throw new Error(result.error || "异常事件状态更新失败。");
      }
      setAdminOverview((current) =>
        current ? { ...current, operations: result.operations! } : current,
      );
      setNotice(
        action === "resolve_incident"
          ? "异常事件已标记为已处理。"
          : "异常事件已重新打开。",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "异常事件状态更新失败。",
      );
    } finally {
      setAdminBusy(false);
    }
  }

  async function createTeamInvite() {
    if (teamBusy) return;
    setTeamBusy(true);
    try {
      const response = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const result = (await response.json()) as {
        code?: string;
        error?: string;
        delivery?: { delivered?: string[] };
      };
      if (!response.ok || !result.code) {
        throw new Error(result.error || "邀请创建失败。");
      }
      setLatestInviteCode(result.code);
      setInviteEmail("");
      setNotice(
        result.delivery?.delivered?.includes("email")
          ? `邀请邮件已发送，邀请码 ${result.code}。`
          : `邀请已创建，邀请码 ${result.code}，可复制后发给成员。`,
      );
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "邀请创建失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function acceptTeamInvite() {
    if (teamBusy) return;
    setTeamBusy(true);
    try {
      const response = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept", code: acceptInviteCode }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "接受邀请失败。");
      setAcceptInviteCode("");
      setWorkspaceLoaded(false);
      setCloudReady(false);
      setCloudSyncStatus("连接中");
      setNotice("已加入协作空间，正在恢复共享备婚资料。");
      await refreshTeamHub();
      setCurrentUser((current) => (current ? { ...current } : current));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "接受邀请失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function updateTeamMemberRole(userId: string, role: TeamRole) {
    setTeamBusy(true);
    try {
      const response = await fetch("/api/collaboration", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "权限调整失败。");
      setNotice("成员权限已更新。");
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "权限调整失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function removeTeamMember(userId: string) {
    setTeamBusy(true);
    try {
      const response = await fetch(
        `/api/collaboration?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "移除成员失败。");
      setNotice("成员已移出当前备婚空间。");
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "移除成员失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function saveNotificationPreferences(
    patch: Partial<NotificationPreferences>,
  ) {
    if (!notificationOverview) return;
    const preferences = { ...notificationOverview.preferences, ...patch };
    setNotificationOverview({ ...notificationOverview, preferences });
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "preferences", preferences }),
      });
      const result = (await response.json()) as NotificationPreferences & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "通知设置保存失败。");
      setNotificationOverview((current) =>
        current ? { ...current, preferences: result } : current,
      );
      setNotice("通知偏好已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "通知设置保存失败。");
      await refreshTeamHub();
    }
  }

  async function testNotificationChannels() {
    setTeamBusy(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const result = (await response.json()) as {
        delivered?: string[];
        unavailable?: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "通知测试失败。");
      setNotice(
        result.delivered?.length
          ? `通知测试成功：${result.delivered.join("、")}。`
          : "站内通知已生成；外部通知通道尚未配置。",
      );
      await refreshTeamHub();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "通知测试失败。");
    } finally {
      setTeamBusy(false);
    }
  }

  async function markTeamNotificationsRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    });
    await refreshTeamHub();
  }

  async function startPlanCheckout(plan: "pro" | "studio") {
    setTeamBusy(true);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "支付页面创建失败。");
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "支付页面创建失败。");
      setTeamBusy(false);
    }
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

  function mediaRequestHeaders(
    json = false,
    values = {
      deepSeekKey: browserDeepSeekKey,
      arkKey: browserArkKey,
      deepSeekModel: deepSeekModelDraft,
      imageModel: arkImageModelDraft,
      videoModel: arkVideoModelDraft,
    },
  ) {
    return {
      ...(json ? { "content-type": "application/json" } : {}),
      ...(values.deepSeekKey ? { "x-deepseek-api-key": values.deepSeekKey } : {}),
      ...(values.arkKey ? { "x-ark-api-key": values.arkKey } : {}),
      ...(syncCode ? { "x-workspace-id": syncCode } : {}),
      "x-deepseek-model": values.deepSeekModel,
      "x-ark-image-model": values.imageModel,
      "x-ark-video-model": values.videoModel,
    };
  }

  async function checkMediaService(
    showNotice = true,
    values = {
      deepSeekKey: browserDeepSeekKey,
      arkKey: browserArkKey,
      deepSeekModel: deepSeekModelDraft,
      imageModel: arkImageModelDraft,
      videoModel: arkVideoModelDraft,
    },
    verify = false,
  ) {
    try {
      const response = await fetch(`/api/media/config${verify ? "?verify=1" : ""}`, {
        cache: "no-store",
        headers: mediaRequestHeaders(false, values),
      });
      const config = await readMediaApi<{
        configured: boolean;
        copy: AiProviderService;
        image: AiProviderService;
        video: AiProviderService;
      }>(response);
      setMediaService({
        checked: true,
        configured: config.configured,
        copy: config.copy,
        image: config.image,
        video: config.video,
      });
      setAiConfigured(config.configured);

      if (showNotice) {
        const connected = [
          config.copy.configured ? "DeepSeek 文案" : "",
          config.image.configured ? "豆包图片与 Seedance 视频" : "",
        ].filter(Boolean);
        const failed = [config.copy.error, config.image.error].filter(Boolean);
        setNotice(
          failed.length > 0
            ? failed.join(" ")
            : connected.length > 0
              ? `已连接：${connected.join("、")}。`
              : "AI 服务尚未配置，请填写 DeepSeek 和火山方舟 API Key。",
        );
      }
      return config.configured;
    } catch {
      setMediaService((current) => ({ ...current, checked: true, configured: false }));
      setAiConfigured(false);
      if (showNotice) setNotice("无法检查 AI 服务，请确认本地服务正在运行。");
      return false;
    }
  }

  async function configureService() {
    const configured = await checkMediaService(true);
    setDraft([
      `AI 服务已读取 ${profile.city}、${profile.guestCount} 位宾客、${profile.style} 风格。`,
      configured
        ? "DeepSeek 文案、豆包图片和 Seedance 视频接口均已连接。"
        : "部分服务密钥尚未配置，可在 AI 工作台分别接入。",
      "生成的视频会自动显示排队与处理进度，完成后可直接播放和下载。",
    ]);
    scrollToSection("media-studio");
  }

  async function saveBrowserApiKeys() {
    const deepSeekKey = deepSeekKeyDraft.trim();
    const arkKey = arkKeyDraft.trim();
    const deepSeekModel = deepSeekModelDraft.trim() || DEFAULT_DEEPSEEK_MODEL;
    const imageModel = arkImageModelDraft.trim() || DEFAULT_ARK_IMAGE_MODEL;
    const videoModel = arkVideoModelDraft.trim() || DEFAULT_ARK_VIDEO_MODEL;
    if (!deepSeekKey && !arkKey) {
      setNotice("请至少填写一套 API Key。");
      return;
    }
    if (deepSeekKey) window.sessionStorage.setItem(DEEPSEEK_KEY_STORAGE, deepSeekKey);
    else window.sessionStorage.removeItem(DEEPSEEK_KEY_STORAGE);
    if (arkKey) window.sessionStorage.setItem(ARK_KEY_STORAGE, arkKey);
    else window.sessionStorage.removeItem(ARK_KEY_STORAGE);
    window.sessionStorage.setItem(DEEPSEEK_MODEL_STORAGE, deepSeekModel);
    window.sessionStorage.setItem(ARK_IMAGE_MODEL_STORAGE, imageModel);
    window.sessionStorage.setItem(ARK_VIDEO_MODEL_STORAGE, videoModel);
    setBrowserDeepSeekKey(deepSeekKey);
    setBrowserArkKey(arkKey);
    const configured = await checkMediaService(
      true,
      { deepSeekKey, arkKey, deepSeekModel, imageModel, videoModel },
      true,
    );
    if (configured) setApiSettingsOpen(false);
  }

  function clearBrowserApiKeys() {
    [
      DEEPSEEK_KEY_STORAGE,
      ARK_KEY_STORAGE,
      DEEPSEEK_MODEL_STORAGE,
      ARK_IMAGE_MODEL_STORAGE,
      ARK_VIDEO_MODEL_STORAGE,
    ].forEach((key) => window.sessionStorage.removeItem(key));
    setBrowserDeepSeekKey("");
    setBrowserArkKey("");
    setDeepSeekKeyDraft("");
    setArkKeyDraft("");
    setDeepSeekModelDraft(DEFAULT_DEEPSEEK_MODEL);
    setArkImageModelDraft(DEFAULT_ARK_IMAGE_MODEL);
    setArkVideoModelDraft(DEFAULT_ARK_VIDEO_MODEL);
    setMediaService((current) => ({
      ...current,
      checked: true,
      configured: false,
      copy: { ...current.copy, configured: false, source: "none" },
      image: { ...current.image, configured: false, source: "none" },
      video: { ...current.video, configured: false, source: "none" },
    }));
    setAiConfigured(false);
    setNotice("已清除当前浏览器会话中的 DeepSeek 与火山方舟 Key。");
    void checkMediaService(false, {
      deepSeekKey: "",
      arkKey: "",
      deepSeekModel: DEFAULT_DEEPSEEK_MODEL,
      imageModel: DEFAULT_ARK_IMAGE_MODEL,
      videoModel: DEFAULT_ARK_VIDEO_MODEL,
    });
  }

  function selectPortraitFile(file: File | null) {
    if (portraitPreview) URL.revokeObjectURL(portraitPreview);
    setPortraitFile(file);
    setPortraitPreview(file ? URL.createObjectURL(file) : "");
  }

  function updateMediaUsageLimit(value: string) {
    setMediaUsage((current) =>
      normalizeMediaUsage({
        ...current,
        limit: Math.min(500, Math.max(1, Math.round(Number(value) || 1))),
      }),
    );
  }

  function recordMediaUsage(kind: MediaKind) {
    setMediaUsage((current) => {
      const normalized = normalizeMediaUsage(current);
      const estimatedCostCny =
        kind === "视频分镜"
          ? normalized.videoSecondEstimateCny * normalized.videoSeconds
          : normalized.imageEstimateCny;
      return kind === "视频分镜"
        ? {
            ...normalized,
            videoCalls: normalized.videoCalls + 1,
            estimatedSpendCny: normalized.estimatedSpendCny + estimatedCostCny,
          }
        : {
            ...normalized,
            imageCalls: normalized.imageCalls + 1,
            estimatedSpendCny: normalized.estimatedSpendCny + estimatedCostCny,
          };
    });
  }

  function updateMediaCostSetting(
    key:
      | "monthlyBudgetCny"
      | "imageEstimateCny"
      | "videoSecondEstimateCny"
      | "videoSeconds",
    value: string,
  ) {
    setMediaUsage((current) =>
      normalizeMediaUsage({
        ...current,
        [key]: Number(value),
      }),
    );
  }

  function saveSyncCode() {
    const nextCode = syncCodeDraft.trim().toLowerCase();
    if (!/^[a-z0-9-]{16,80}$/i.test(nextCode)) {
      setNotice("同步码至少需要 16 位，只能包含字母、数字和短横线。");
      return;
    }
    window.localStorage.setItem(SYNC_CODE_KEY, nextCode);
    setSyncCode(nextCode);
    cloudRevisionRef.current = 0;
    setCloudRevision(0);
    setCloudConflict(null);
    setCloudReady(false);
    setCloudSyncStatus("连接中");
    setNotice("正在连接这个同步码对应的云端备婚资料。");
  }

  async function copySyncCode() {
    try {
      await navigator.clipboard.writeText(syncCode);
      setNotice("云端同步码已复制，可在另一台设备输入同一个同步码。");
    } catch {
      setNotice("复制被浏览器拦截，可以直接选中同步码复制。");
    }
  }

  function regenerateSyncCode() {
    const nextCode = createSyncCode();
    setSyncCodeDraft(nextCode);
    window.localStorage.setItem(SYNC_CODE_KEY, nextCode);
    setSyncCode(nextCode);
    cloudRevisionRef.current = 0;
    setCloudRevision(0);
    setCloudConflict(null);
    setCloudReady(false);
    setCloudSyncStatus("连接中");
    setNotice("已创建新的独立云端空间，旧同步码中的资料不会被删除。");
  }

  function reloadCloudWorkspace() {
    cloudRevisionRef.current = 0;
    setCloudRevision(0);
    setCloudConflict(null);
    setCloudReady(false);
    setCloudSyncStatus("连接中");
    setNotice("正在载入云端最新资料，本机未同步的修改将由云端版本替换。");
  }

  function keepLocalWorkspace() {
    forceCloudOverwriteRef.current = true;
    setCloudConflict(null);
    setCloudSyncStatus("保存中");
    setCloudSaveRequest((current) => current + 1);
    setNotice("正在将本机版本保存为新的云端版本。");
  }

  async function loadWorkspaceBackups() {
    if (!currentUser && !syncCode) {
      setNotice("请先登录或连接云端同步码。");
      return;
    }
    if (backupPanelOpen) {
      setBackupPanelOpen(false);
      return;
    }
    setBackupBusy(true);
    try {
      const response = await fetch("/api/backups", {
        headers: syncCode ? { "x-workspace-id": syncCode } : undefined,
        cache: "no-store",
      });
      const result = (await response.json()) as {
        backups?: WorkspaceBackupSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "历史版本读取失败。");
      setWorkspaceBackups(result.backups || []);
      setBackupPanelOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "历史版本读取失败。");
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreWorkspaceVersion(snapshotId: string) {
    if (
      !window.confirm(
        "确定恢复这个历史版本吗？当前版本会先自动备份，再执行恢复。",
      )
    ) {
      return;
    }
    setBackupBusy(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(syncCode ? { "x-workspace-id": syncCode } : {}),
        },
        body: JSON.stringify({ action: "restore", snapshotId }),
      });
      const result = (await response.json()) as {
        restored?: boolean;
        error?: string;
      };
      if (!response.ok || !result.restored) {
        throw new Error(result.error || "历史版本恢复失败。");
      }
      setBackupPanelOpen(false);
      cloudRevisionRef.current = 0;
      setCloudRevision(0);
      setCloudConflict(null);
      setCloudReady(false);
      setCloudSyncStatus("连接中");
      setNotice("历史版本已恢复，正在重新载入云端资料。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "历史版本恢复失败。");
    } finally {
      setBackupBusy(false);
    }
  }

  async function createManualWorkspaceBackup() {
    setBackupBusy(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(syncCode ? { "x-workspace-id": syncCode } : {}),
        },
        body: JSON.stringify({ action: "create" }),
      });
      const result = (await response.json()) as {
        created?: boolean;
        backup?: WorkspaceBackupSummary;
        error?: string;
      };
      if (!response.ok || !result.created) {
        throw new Error(result.error || "手动备份创建失败。");
      }
      if (result.backup) {
        setWorkspaceBackups((current) => [
          result.backup!,
          ...current.filter((item) => item.id !== result.backup!.id),
        ]);
      }
      setNotice("手动备份已创建并完成完整性标记。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "手动备份创建失败。");
    } finally {
      setBackupBusy(false);
    }
  }

  async function downloadWorkspaceExport() {
    setBackupBusy(true);
    try {
      const response = await fetch("/api/backups/export", {
        headers: syncCode ? { "x-workspace-id": syncCode } : undefined,
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "云端资料导出失败。");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `喜缘备婚资料-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("云端资料已完成校验并下载。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "云端资料导出失败。");
    } finally {
      setBackupBusy(false);
    }
  }

  async function persistMediaBlob(blob: Blob) {
    if (!syncCode) throw new Error("同步码尚未准备好。");
    const response = await fetch("/api/library", {
      method: "POST",
      headers: {
        "content-type": blob.type || "image/webp",
        "x-workspace-id": syncCode,
      },
      body: blob,
    });
    const result = (await response.json()) as {
      contentUrl?: string;
      error?: string;
      key?: string;
      size?: number;
    };
    if (!response.ok || !result.contentUrl || !result.key) {
      throw new Error(result.error || "素材云端保存失败。");
    }
    return {
      assetPath: result.contentUrl,
      storageKey: result.key,
      sizeBytes: result.size || blob.size,
    };
  }

  function prepareMediaRetry(asset: MediaAsset) {
    setMediaKind(asset.kind);
    setMediaStyle(asset.style);
    setMediaRatio(asset.kind === "AI 证件照" ? "9:16" : asset.ratio);
    setMediaBrief(asset.prompt);
    setMediaJobFilter("全部");
    if (asset.kind === "AI 证件照" && !portraitFile) {
      setNotice("已恢复证件照参数，请重新选择本人照片后生成。");
    } else {
      setNotice(`已恢复生成参数：${asset.title}，可以再次生成。`);
    }
    scrollToSection("media-studio");
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

  function runAssistantIntent(intent: AssistantIntent, query = prompt) {
    const normalizedQuery = query.trim() || intent.example;
    setPrompt(normalizedQuery);

    if (intent.id === "copywriting") {
      setMode("文本");
      setCopyBrief(normalizedQuery);
      if (normalizedQuery.includes("誓词")) setCopyKind("誓词");
      else if (normalizedQuery.includes("父母") || normalizedQuery.includes("致辞")) {
        setCopyKind("父母致辞");
      } else if (normalizedQuery.includes("朋友圈")) setCopyKind("朋友圈文案");
      else setCopyKind("请柬文案");
    }

    if (intent.id === "image") {
      setMode("图片");
      setMediaKind(normalizedQuery.includes("证件照") ? "AI 证件照" : "场景效果图");
      setMediaBrief(normalizedQuery);
    }

    if (intent.id === "video") {
      setMode("视频");
      setMediaKind("视频分镜");
      setMediaBrief(normalizedQuery);
    }

    if (
      intent.id === "guest" &&
      (normalizedQuery.includes("催办") || normalizedQuery.includes("批量发送"))
    ) {
      selectPendingGuests();
    }

    setDraft([
      `喜缘小助手已识别：${intent.label}。`,
      `已带入当前需求：${normalizedQuery}。`,
      `你可以在${intent.label}中继续完成具体设置。`,
    ]);
    setNotice(`喜缘小助手已为你匹配「${intent.label}」。`);
    window.setTimeout(() => scrollToSection(intent.targetId), 40);
  }

  function submitAssistantRequest() {
    if (primaryAssistantMatch) {
      runAssistantIntent(primaryAssistantMatch);
      return;
    }
    generatePlan();
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

  function moveToRecycleBin(
    entityType: RecycleEntityType,
    label: string,
    data: unknown,
    silent = false,
  ) {
    const deletedAt = new Date();
    const item: RecycleItem = {
      id: crypto.randomUUID(),
      entityType,
      label,
      data,
      deletedAt: deletedAt.toISOString(),
      expiresAt: new Date(
        deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
    setRecycleBin((current) => [item, ...normalizeRecycleBin(current)].slice(0, 100));
    setLastDeletedId(item.id);
    if (!silent) setNotice(`${label}已移入回收站，可在 30 天内撤销。`);
    return item.id;
  }

  function restoreRecycleItem(itemId: string) {
    const item = recycleBin.find((candidate) => candidate.id === itemId);
    if (!item) {
      setNotice("该项目已不在回收站中。");
      return;
    }
    if (item.entityType === "task") {
      const data = item.data as Task;
      setTaskList((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeTask(data), ...current],
      );
    } else if (item.entityType === "budget") {
      const data = item.data as BudgetItem;
      setBudgetList((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeBudget(data), ...current],
      );
    } else if (item.entityType === "guest") {
      const data = item.data as Guest;
      setGuestList((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeGuest(data), ...current],
      );
    } else if (item.entityType === "vendor") {
      const data = item.data as Vendor;
      setVendorList((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeVendor(data), ...current],
      );
    } else if (item.entityType === "timeline") {
      const data = item.data as WeddingEvent;
      setWeddingTimeline((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeWeddingEvent(data), ...current],
      );
    } else if (item.entityType === "copywriting") {
      const data = item.data as CopywritingDoc;
      setCopywritingList((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeCopywriting(data), ...current],
      );
    } else if (item.entityType === "media") {
      const data = item.data as MediaAsset;
      setMediaLibrary((current) =>
        current.some((entry) => entry.id === data.id)
          ? current
          : [normalizeMediaAsset(data), ...current],
      );
    }
    setRecycleBin((current) => current.filter((candidate) => candidate.id !== itemId));
    setLastDeletedId((current) => (current === itemId ? null : current));
    setNotice(`已恢复：${item.label}`);
  }

  async function removeRecycleStorage(item: RecycleItem) {
    const storageKeys: string[] = [];
    if (item.entityType === "media") {
      const asset = item.data as MediaAsset;
      if (asset.storageKey) storageKeys.push(asset.storageKey);
      if (asset.assetPath?.startsWith("blob:")) URL.revokeObjectURL(asset.assetPath);
    }
    if (item.entityType === "vendor") {
      const vendor = item.data as Vendor;
      if (vendor.contractStorageKey) storageKeys.push(vendor.contractStorageKey);
    }
    await Promise.all(
      storageKeys.map((key) =>
        fetch(`/api/library?key=${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: { "x-workspace-id": syncCode },
        }).catch(() => undefined),
      ),
    );
  }

  async function permanentlyDeleteRecycleItem(itemId: string) {
    const item = recycleBin.find((candidate) => candidate.id === itemId);
    if (!item) return;
    await removeRecycleStorage(item);
    setRecycleBin((current) => current.filter((candidate) => candidate.id !== itemId));
    setLastDeletedId((current) => (current === itemId ? null : current));
    setNotice(`已永久删除：${item.label}`);
  }

  async function emptyRecycleBin() {
    if (recycleBin.length === 0) return;
    if (!window.confirm(`确定永久清空回收站中的 ${recycleBin.length} 项吗？`)) return;
    await Promise.all(recycleBin.map(removeRecycleStorage));
    setRecycleBin([]);
    setLastDeletedId(null);
    setNotice("回收站已清空。");
  }

  function deleteTask(taskId: number) {
    const task = taskList.find((item) => item.id === taskId);
    if (!task) return;
    setTaskList((current) => current.filter((item) => item.id !== taskId));
    setOpenTaskId((current) => (current === taskId ? null : current));
    moveToRecycleBin("task", `今日小事：${task.title}`, task);
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
    if (!budget) return;
    setBudgetList((current) => current.filter((item) => item.id !== budgetId));
    moveToRecycleBin("budget", `预算项：${budget.name}`, budget);
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

  async function requestGuestInvitation(guest: Guest) {
    const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(syncCode ? { "x-workspace-id": syncCode } : {}),
        },
        body: JSON.stringify({ guest, profile }),
      });
    const result = (await response.json()) as {
        invitation?: {
          code?: string;
          respondedAt?: string | null;
          dietary?: string;
        };
        invitationUrl?: string;
        error?: string;
      };
    if (!response.ok || !result.invitation?.code || !result.invitationUrl) {
      throw new Error(result.error || "宾客邀请创建失败。");
    }
    return {
      code: result.invitation.code,
      url: result.invitationUrl,
      respondedAt: result.invitation.respondedAt || undefined,
      dietary: result.invitation.dietary || guest.dietary || "",
    };
  }

  async function createGuestInvitation(guest: Guest) {
    setInvitationBusyGuestId(guest.id);
    try {
      const invitation = await requestGuestInvitation(guest);
      updateGuest(guest.id, {
        invitationCode: invitation.code,
        invitedAt: guest.invitedAt || new Date().toISOString(),
        respondedAt: invitation.respondedAt,
        dietary: invitation.dietary,
        deliveryStatus: "链接已生成",
      });
      try {
        await navigator.clipboard.writeText(invitation.url);
        setNotice(`已复制 ${guest.name} 的专属回执链接，可直接发送给宾客。`);
      } catch {
        setNotice(`${guest.name} 的回执链接已生成，可点击链接按钮再次复制。`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "宾客邀请创建失败。");
    } finally {
      setInvitationBusyGuestId(null);
    }
  }

  async function copyGuestInvitation(guest: Guest) {
    if (!guest.invitationCode) {
      await createGuestInvitation(guest);
      return;
    }
    const url = `${window.location.origin}/rsvp/${guest.invitationCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`已复制 ${guest.name} 的回执链接。`);
    } catch {
      setNotice(`回执地址：${url}`);
    }
  }

  function toggleGuestSelection(guestId: number) {
    setSelectedGuestIds((current) =>
      current.includes(guestId)
        ? current.filter((id) => id !== guestId)
        : [...current, guestId],
    );
  }

  function selectPendingGuests() {
    setSelectedGuestIds(
      guestList
        .filter((guest) => guest.rsvp === "待确认")
        .map((guest) => guest.id),
    );
    setNotice("已选择所有待回复宾客。");
  }

  async function batchSendGuestInvitations(reminder: boolean) {
    const selected = guestList.filter((guest) => selectedGuestIds.includes(guest.id));
    const targets = reminder
      ? selected.filter((guest) => guest.rsvp === "待确认")
      : selected;
    if (targets.length === 0) {
      setNotice(reminder ? "请选择仍未回复的宾客。" : "请先选择需要发送邀请的宾客。");
      return;
    }
    setBatchInvitationBusy(true);
    try {
      const prepared = await Promise.all(
        targets.map(async (guest) => ({
          guest,
          invitation: await requestGuestInvitation(guest),
        })),
      );
      const response = await fetch("/api/rsvp/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(syncCode ? { "x-workspace-id": syncCode } : {}),
        },
        body: JSON.stringify({
          reminder,
          items: prepared.map(({ guest, invitation }) => ({
            code: invitation.code,
            channel: guest.invitationChannel || "链接",
            contact: guest.contact || "",
          })),
        }),
      });
      const result = (await response.json()) as {
        sent?: number;
        links?: number;
        failed?: number;
        error?: string;
        results?: Array<{
          code: string;
          status: "sent" | "link_ready" | "failed";
          invitationUrl?: string;
          error?: string;
        }>;
      };
      if (!response.ok || !result.results) {
        throw new Error(result.error || "批量邀请发送失败。");
      }
      const resultByCode = new Map(result.results.map((item) => [item.code, item]));
      const preparedByGuest = new Map(prepared.map((item) => [item.guest.id, item]));
      const now = new Date().toISOString();
      setGuestList((current) =>
        current.map((guest) => {
          const preparedItem = preparedByGuest.get(guest.id);
          if (!preparedItem) return guest;
          const delivery = resultByCode.get(preparedItem.invitation.code);
          return normalizeGuest({
            ...guest,
            invitationCode: preparedItem.invitation.code,
            invitedAt: guest.invitedAt || now,
            deliveryStatus:
              delivery?.status === "sent"
                ? "已发送"
                : delivery?.status === "link_ready"
                  ? "链接已生成"
                  : "发送失败",
            sentAt: delivery?.status === "sent" ? now : guest.sentAt,
            remindedAt:
              reminder && delivery?.status !== "failed" ? now : guest.remindedAt,
            reminderCount:
              reminder && delivery?.status !== "failed"
                ? (guest.reminderCount || 0) + 1
                : guest.reminderCount || 0,
          });
        }),
      );
      const links = result.results
        .filter((item) => item.invitationUrl)
        .map((item) => {
          const preparedItem = prepared.find(
            (entry) => entry.invitation.code === item.code,
          );
          return `${preparedItem?.guest.name || "宾客"}：${item.invitationUrl}`;
        });
      if (links.length > 0 && (result.links || 0) > 0) {
        try {
          await navigator.clipboard.writeText(links.join("\n"));
        } catch {
          // Links remain available from each guest row if clipboard access is denied.
        }
      }
      setSelectedGuestIds([]);
      setNotice(
        `${reminder ? "催办" : "邀请"}处理完成：发送 ${result.sent || 0}，生成链接 ${result.links || 0}，失败 ${result.failed || 0}。`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "批量邀请发送失败。");
    } finally {
      setBatchInvitationBusy(false);
    }
  }

  async function refreshGuestRsvps() {
    setInvitationBusyGuestId(0);
    try {
      const response = await fetch("/api/rsvp", {
        headers: syncCode ? { "x-workspace-id": syncCode } : undefined,
        cache: "no-store",
      });
      const result = (await response.json()) as {
        invitations?: Array<{
          guestId: number;
          code: string;
          rsvp: GuestRsvp;
          attendingCount: number;
          companion: boolean;
          dietary: string;
          respondedAt: string | null;
        }>;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "在线回执刷新失败。");
      const byGuest = new Map(
        (result.invitations || []).map((invitation) => [
          invitation.guestId,
          invitation,
        ]),
      );
      setGuestList((current) =>
        current.map((guest) => {
          const invitation = byGuest.get(guest.id);
          if (!invitation) return guest;
          return normalizeGuest({
            ...guest,
            invitationCode: invitation.code,
            rsvp: invitation.rsvp,
            count:
              invitation.rsvp === "会到场"
                ? invitation.attendingCount
                : guest.count,
            companion: invitation.companion,
            dietary: invitation.dietary,
            respondedAt: invitation.respondedAt || undefined,
          });
        }),
      );
      const responded = (result.invitations || []).filter(
        (invitation) => invitation.respondedAt,
      ).length;
      setNotice(`已刷新在线回执，共收到 ${responded} 份回复。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "在线回执刷新失败。");
    } finally {
      setInvitationBusyGuestId(null);
    }
  }

  function deleteGuest(guestId: number) {
    const guest = guestList.find((item) => item.id === guestId);
    if (!guest) return;
    setGuestList((current) => current.filter((item) => item.id !== guestId));
    if (guest.invitationCode) {
      void fetch(
        `/api/rsvp?code=${encodeURIComponent(guest.invitationCode)}`,
        {
          method: "DELETE",
          headers: { "x-workspace-id": syncCode },
        },
      ).catch(() => undefined);
    }
    moveToRecycleBin("guest", `宾客：${guest.name}`, {
      ...guest,
      invitationCode: undefined,
      invitedAt: undefined,
      respondedAt: undefined,
    });
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
        contractStatus: "未上传",
        payments: [],
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

  function saveVendorPayments(vendorId: number, payments: VendorPayment[]) {
    const paid = payments
      .filter((payment) => payment.status === "已支付")
      .reduce((sum, payment) => sum + payment.amount, 0);
    setVendorList((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? normalizeVendor({ ...vendor, payments, deposit: paid })
          : vendor,
      ),
    );
  }

  function addVendorPayment(vendorId: number) {
    const vendor = vendorList.find((item) => item.id === vendorId);
    if (!vendor) return;
    const outstanding = Math.max(0, vendor.quote - vendor.deposit);
    saveVendorPayments(vendorId, [
      ...vendor.payments,
      {
        id: nextId(vendor.payments),
        label: vendor.payments.length === 0 ? "签约定金" : "后续款项",
        amount: outstanding,
        dueDate: profile.weddingDate,
        status: "待支付",
      },
    ]);
    setNotice(`已为 ${vendor.name} 新增付款节点。`);
  }

  function updateVendorPayment(
    vendorId: number,
    paymentId: number,
    patch: Partial<VendorPayment>,
  ) {
    const vendor = vendorList.find((item) => item.id === vendorId);
    if (!vendor) return;
    const payments = vendor.payments.map((payment) =>
      payment.id === paymentId
        ? normalizeVendorPayment({
            ...payment,
            ...patch,
            paidAt:
              patch.status === "已支付" && payment.status !== "已支付"
                ? new Date().toISOString()
                : patch.status === "待支付"
                  ? undefined
                  : payment.paidAt,
          })
        : payment,
    );
    saveVendorPayments(vendorId, payments);
  }

  function deleteVendorPayment(vendorId: number, paymentId: number) {
    const vendor = vendorList.find((item) => item.id === vendorId);
    if (!vendor) return;
    saveVendorPayments(
      vendorId,
      vendor.payments.filter((payment) => payment.id !== paymentId),
    );
    setNotice(`已删除 ${vendor.name} 的付款节点。`);
  }

  async function uploadVendorContract(vendorId: number, file: File | null) {
    if (!file) return;
    if (
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
    ) {
      setNotice("合同仅支持 PDF、JPG 或 PNG 文件。");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setNotice("合同文件不能超过 20MB。");
      return;
    }
    const vendor = vendorList.find((item) => item.id === vendorId);
    if (!vendor) return;
    setContractBusyVendorId(vendorId);
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-workspace-id": syncCode,
        },
        body: file,
      });
      const result = (await response.json()) as {
        key?: string;
        contentUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.key || !result.contentUrl) {
        throw new Error(result.error || "合同上传失败。");
      }
      if (vendor.contractStorageKey) {
        void fetch(
          `/api/library?key=${encodeURIComponent(vendor.contractStorageKey)}`,
          {
            method: "DELETE",
            headers: { "x-workspace-id": syncCode },
          },
        ).catch(() => undefined);
      }
      updateVendor(vendorId, {
        contractName: file.name,
        contractUrl: result.contentUrl,
        contractStorageKey: result.key,
        contractUploadedAt: new Date().toISOString(),
        contractStatus: "待确认",
      });
      setNotice(`${vendor.name} 的合同已保存到云端。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "合同上传失败。");
    } finally {
      setContractBusyVendorId(null);
    }
  }

  function deleteVendor(vendorId: number) {
    const vendor = vendorList.find((item) => item.id === vendorId);
    if (!vendor) return;
    setVendorList((current) => current.filter((item) => item.id !== vendorId));
    setOpenVendorId((current) => (current === vendorId ? null : current));
    moveToRecycleBin("vendor", `供应商：${vendor.name}`, vendor);
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
    if (!event) return;
    setWeddingTimeline((current) => current.filter((item) => item.id !== eventId));
    moveToRecycleBin("timeline", `婚礼流程：${event.title}`, event);
  }

  function addSeatingTable() {
    setSeatingTables((current) => [
      ...current,
      {
        id: nextId(current),
        name: `第 ${current.length + 1} 桌`,
        capacity: 10,
        zone: "宴会区",
      },
    ]);
    setNotice("已新增一桌，可修改桌名、容量和区域。");
  }

  function updateSeatingTable(tableId: number, patch: Partial<SeatingTable>) {
    const existing = seatingTables.find((table) => table.id === tableId);
    if (!existing) return;
    const next = normalizeSeatingTable({ ...existing, ...patch });
    setSeatingTables((current) =>
      current.map((table) => (table.id === tableId ? next : table)),
    );
    if (patch.name && patch.name !== existing.name) {
      setGuestList((current) =>
        current.map((guest) =>
          guest.table === existing.name ? { ...guest, table: next.name } : guest,
        ),
      );
    }
  }

  function deleteSeatingTable(tableId: number) {
    const table = seatingTables.find((item) => item.id === tableId);
    if (!table) return;
    setSeatingTables((current) => current.filter((item) => item.id !== tableId));
    setGuestList((current) =>
      current.map((guest) =>
        guest.table === table.name ? { ...guest, table: "待排桌" } : guest,
      ),
    );
    setNotice(`已删除 ${table.name}，原桌宾客已回到待排桌。`);
  }

  function assignGuestToTable(guestId: number, tableName: string) {
    updateGuest(guestId, { table: tableName });
  }

  function autoArrangeSeating() {
    const attending = guestList
      .filter((guest) => guest.rsvp !== "不参加")
      .sort((a, b) =>
        a.relation === b.relation
          ? b.count - a.count
          : a.relation.localeCompare(b.relation, "zh-CN"),
      );
    if (attending.length === 0) {
      setNotice("目前没有可排桌的到场或待确认宾客。");
      return;
    }
    const nextTables = (seatingTables.length > 0
      ? seatingTables
      : seatingTableItems
    ).map(normalizeSeatingTable);
    const totalPeople = attending.reduce((sum, guest) => sum + guest.count, 0);
    let totalCapacity = nextTables.reduce((sum, table) => sum + table.capacity, 0);
    let nextTableId = nextId(nextTables);
    while (totalCapacity < totalPeople) {
      const table = {
        id: nextTableId,
        name: `智能加桌 ${nextTableId}`,
        capacity: 10,
        zone: "宴会区后区",
      };
      nextTables.push(table);
      totalCapacity += table.capacity;
      nextTableId += 1;
    }
    const remaining = new Map(nextTables.map((table) => [table.name, table.capacity]));
    const relationTable = new Map<string, string>();
    const assignments = new Map<number, string>();
    attending.forEach((guest) => {
      const preferred = relationTable.get(guest.relation);
      let selected =
        preferred && (remaining.get(preferred) || 0) >= guest.count
          ? preferred
          : nextTables.find(
              (table) => (remaining.get(table.name) || 0) >= guest.count,
            )?.name;
      if (!selected) {
        const table = {
          id: nextTableId,
          name: `特别席 ${nextTableId}`,
          capacity: Math.max(10, guest.count),
          zone: "宴会区后区",
        };
        nextTables.push(table);
        remaining.set(table.name, table.capacity);
        nextTableId += 1;
        selected = table.name;
      }
      assignments.set(guest.id, selected);
      relationTable.set(guest.relation, selected);
      remaining.set(selected, (remaining.get(selected) || 0) - guest.count);
    });
    setSeatingTables(nextTables);
    setGuestList((current) =>
      current.map((guest) =>
        assignments.has(guest.id)
          ? { ...guest, table: assignments.get(guest.id)! }
          : guest.rsvp === "不参加"
            ? { ...guest, table: "不安排座位" }
            : guest,
      ),
    );
    setNotice(`智能排桌完成：${totalPeople} 人安排到 ${nextTables.length} 桌。`);
  }

  function exportSeatingPlan() {
    const rows = ["桌名,区域,容量,已排人数,宾客"];
    seatingTables.forEach((table) => {
      const guests = guestList.filter((guest) => guest.table === table.name);
      rows.push(
        [
          table.name,
          table.zone,
          table.capacity,
          guests.reduce((sum, guest) => sum + guest.count, 0),
          guests.map((guest) => `${guest.name}(${guest.count})`).join("、"),
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      );
    });
    downloadTextFile(
      `喜缘座位表-${profile.weddingDate || "婚期待定"}.csv`,
      `\ufeff${rows.join("\n")}`,
      "text/csv;charset=utf-8",
    );
    setNotice("座位表已导出，可交给酒店和婚礼策划。");
  }

  function setWeddingEventCommandStatus(
    eventId: number,
    status: TaskStatus,
  ) {
    updateWeddingEvent(eventId, {
      status,
      completedAt: status === "已完成" ? new Date().toISOString() : undefined,
    });
    const event = weddingTimeline.find((item) => item.id === eventId);
    if (event) setNotice(`${event.title} 已更新为${status}。`);
  }

  function delayWeddingEvent(eventId: number) {
    const event = weddingTimeline.find((item) => item.id === eventId);
    if (!event) return;
    updateWeddingEvent(eventId, {
      delayMinutes: (event.delayMinutes || 0) + 10,
      status: event.status === "已完成" ? "已完成" : "进行中",
    });
    setNotice(`${event.title} 已记录延迟 10 分钟。`);
  }

  function updateCommandSupply(supplyId: number, patch: Partial<CommandSupply>) {
    setCommandCenter((current) => ({
      ...current,
      supplies: current.supplies.map((item) =>
        item.id === supplyId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addCommandSupply() {
    setCommandCenter((current) => ({
      ...current,
      supplies: [
        ...current.supplies,
        {
          id: nextId(current.supplies),
          title: "新增物料",
          owner: "待分配",
          checked: false,
        },
      ],
    }));
  }

  function deleteCommandSupply(supplyId: number) {
    setCommandCenter((current) => ({
      ...current,
      supplies: current.supplies.filter((item) => item.id !== supplyId),
    }));
  }

  function updateEmergencyContact(
    contactId: number,
    patch: Partial<EmergencyContact>,
  ) {
    setCommandCenter((current) => ({
      ...current,
      contacts: current.contacts.map((item) =>
        item.id === contactId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addEmergencyContact() {
    setCommandCenter((current) => ({
      ...current,
      contacts: [
        ...current.contacts,
        {
          id: nextId(current.contacts),
          role: "紧急联系人",
          name: "待填写",
          phone: "",
        },
      ],
    }));
  }

  function deleteEmergencyContact(contactId: number) {
    setCommandCenter((current) => ({
      ...current,
      contacts: current.contacts.filter((item) => item.id !== contactId),
    }));
  }

  function exportWeddingCommandPlan() {
    const content = [
      "喜缘婚礼当天执行表",
      `新人：${profile.brideName} & ${profile.groomName}`,
      `日期：${profile.weddingDate}  城市：${profile.city}`,
      "",
      "【流程】",
      ...weddingTimeline.map(
        (event) =>
          `${event.time} ${event.title}｜${event.owner}｜${event.location}｜${event.phone || "无电话"}｜${event.status}${event.delayMinutes ? `｜延迟${event.delayMinutes}分钟` : ""}`,
      ),
      "",
      "【物料】",
      ...commandCenter.supplies.map(
        (item) => `${item.checked ? "[已确认]" : "[待确认]"} ${item.title}｜${item.owner}`,
      ),
      "",
      "【紧急联系人】",
      ...commandCenter.contacts.map(
        (item) => `${item.role}｜${item.name}｜${item.phone || "待填写"}`,
      ),
      "",
      `现场异常记录：${commandCenter.incidentNote || "无"}`,
    ].join("\n");
    downloadTextFile(
      `喜缘婚礼执行表-${profile.weddingDate || "日期待定"}.txt`,
      content,
      "text/plain;charset=utf-8",
    );
    setNotice("婚礼当天执行表已导出。");
  }

  function toggleCollaboration(itemId: number) {
    setCollaborationList((current) =>
      current.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    );
  }

  async function generateCopywriting() {
    if (copyGenerating) return;
    setCopyGenerating(true);
    setNotice(`DeepSeek 正在生成${copyKind}。`);
    try {
      const response = await fetch("/api/copywriting", {
        method: "POST",
        headers: mediaRequestHeaders(true),
        body: JSON.stringify({
          kind: copyKind,
          tone: copyTone,
          brief: copyBrief,
          profile,
        }),
      });
      const generated = await readMediaApi<{
        title: string;
        content: string;
        model: string;
      }>(response);
      const newDoc: CopywritingDoc = {
        id: nextId(copywritingList),
        kind: copyKind,
        tone: copyTone,
        title: generated.title,
        content: generated.content,
        createdAt: new Date().toLocaleString("zh-CN"),
        model: generated.model,
      };

      setCopywritingList((current) => [newDoc, ...current]);
      setNotice(`DeepSeek 已生成${copyKind}：${generated.title}`);
      void refreshAiUsage();
      scrollToSection("copywriting");
    } catch (error) {
      const message = error instanceof Error ? error.message : "DeepSeek 文案生成失败。";
      setNotice(message);
      if (message.includes("DeepSeek") && message.includes("配置")) {
        setApiSettingsOpen(true);
        setMediaService((current) => ({
          ...current,
          configured: false,
          copy: { ...current.copy, configured: false },
        }));
      }
    } finally {
      setCopyGenerating(false);
    }
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
    if (!doc) return;
    setCopywritingList((current) => current.filter((item) => item.id !== docId));
    moveToRecycleBin("copywriting", `AI 文案：${doc.title}`, doc);
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

  async function getVideoContentStorage(jobId: string) {
    const path = `/api/media/video/content?id=${encodeURIComponent(jobId)}`;
    const response = await fetch(path, {
      headers: mediaRequestHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "视频内容读取失败。");
    }
    const blob = await response.blob();
    try {
      return await persistMediaBlob(blob);
    } catch {
      return {
        assetPath: URL.createObjectURL(blob),
        storageKey: undefined,
        sizeBytes: blob.size,
      };
    }
  }

  async function generateMediaAsset() {
    if (mediaGenerating) return;
    if (mediaUsageTotal >= mediaUsage.limit) {
      setApiSettingsOpen(true);
      setNotice(`本月已达到 ${mediaUsage.limit} 次安全上限，请调整调用上限后继续。`);
      return;
    }
    if (
      mediaUsage.hardLimit &&
      mediaUsage.estimatedSpendCny + nextMediaCost > mediaUsage.monthlyBudgetCny
    ) {
      setApiSettingsOpen(true);
      setNotice(
        `本次预计 ¥${nextMediaCost.toFixed(2)}，会超过本月 ¥${mediaUsage.monthlyBudgetCny.toFixed(2)} 的费用上限。`,
      );
      return;
    }
    setMediaGenerating(true);
    const generated = buildMediaAsset(profile, mediaKind, mediaStyle, mediaRatio, mediaBrief);
    setNotice(
      mediaKind === "视频分镜"
        ? "正在提交真实视频生成任务，提交后可离开页面继续备婚。"
        : "正在生成真实婚礼图片，通常需要几十秒到两分钟。",
    );

    try {
      if (mediaKind !== "视频分镜") {
        if (mediaKind === "AI 证件照" && !portraitFile) {
          portraitInputRef.current?.click();
          throw new Error("请先上传一张清晰的本人正面照片。");
        }

        const portraitForm = new FormData();
        if (portraitFile) portraitForm.set("image", portraitFile);
        portraitForm.set("prompt", generated.prompt);
        const response = await fetch(
          mediaKind === "AI 证件照" ? "/api/media/portrait" : "/api/media/image",
          {
          method: "POST",
            headers: mediaRequestHeaders(mediaKind === "场景效果图"),
            body:
              mediaKind === "AI 证件照"
                ? portraitForm
                : JSON.stringify({
                    prompt: generated.prompt,
                    ratio: mediaRatio,
                  }),
          },
        );
        const result = await readMediaApi<{
          imageBase64: string;
          mimeType: string;
          model: string;
          revisedPrompt?: string | null;
        }>(response);
        const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        let storedAsset: Pick<MediaAsset, "assetPath" | "sizeBytes" | "storageKey"> = {
          assetPath: dataUrl,
          sizeBytes: dataUrlToBlob(dataUrl).size,
        };
        try {
          storedAsset = await persistMediaBlob(dataUrlToBlob(dataUrl));
        } catch {
          setNotice("图片已生成，但云端素材存储暂不可用，当前先保存在本机。");
        }
        const newAsset: MediaAsset = {
          id: nextId(mediaLibraryRef.current),
          kind: mediaKind,
          style: mediaStyle,
          ratio: mediaRatio,
          title: generated.title,
          prompt: result.revisedPrompt || generated.prompt,
          assetPath: storedAsset.assetPath,
          frames: generated.frames,
          favorite: false,
          createdAt: new Date().toLocaleString("zh-CN"),
          status: "completed",
          progress: 100,
          model: result.model,
          storageKey: storedAsset.storageKey,
          sizeBytes: storedAsset.sizeBytes,
          estimatedCostCny: nextMediaCost,
        };
        setMediaLibrary((current) => [newAsset, ...current]);
        recordMediaUsage(mediaKind);
        setNotice(
          mediaKind === "AI 证件照"
            ? `AI 证件照已生成：${generated.title}`
            : `婚礼场景效果图已生成：${generated.title}`,
        );
        void refreshAiUsage();
        return;
      }

      const idempotencyKey = crypto.randomUUID();
      const videoRequest = {
        method: "POST",
        headers: {
          ...mediaRequestHeaders(true),
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          prompt: generated.prompt,
          ratio: mediaRatio,
          seconds: mediaUsage.videoSeconds,
          title: generated.title,
          style: mediaStyle,
        }),
      };
      let response: Response;
      try {
        response = await fetch("/api/media/video", videoRequest);
      } catch {
        response = await fetch("/api/media/video", videoRequest);
      }
      const result = await readMediaApi<{
        id: string;
        status: "queued" | "in_progress" | "completed";
        progress: number;
        model: string;
      }>(response);
      const completedStorage =
        result.status === "completed"
          ? await getVideoContentStorage(result.id)
          : {
              assetPath: "/media-red-gold-film.webp",
              storageKey: undefined,
              sizeBytes: undefined,
            };
      const newAsset: MediaAsset = {
        id: nextId(mediaLibraryRef.current),
        kind: mediaKind,
        style: mediaStyle,
        ratio: mediaRatio === "1:1" ? "16:9" : mediaRatio,
        title: generated.title,
        prompt: generated.prompt,
        assetPath: completedStorage.assetPath,
        frames: generated.frames,
        favorite: false,
        createdAt: new Date().toLocaleString("zh-CN"),
        status: result.status,
        progress: result.progress,
        providerJobId: result.id,
        model: result.model,
        storageKey: completedStorage.storageKey,
        sizeBytes: completedStorage.sizeBytes,
        estimatedCostCny: nextMediaCost,
      };
      setMediaLibrary((current) => [newAsset, ...current]);
      recordMediaUsage(mediaKind);
      setNotice(
        result.status === "completed"
          ? `真实视频已生成：${generated.title}`
          : `视频任务已提交，当前${result.status === "queued" ? "正在排队" : "正在生成"}。`,
      );
      void refreshAiUsage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "真实 AI 生成失败，请稍后重试。";
      setNotice(message);
      if (message.includes("火山方舟") && message.includes("配置")) {
        setApiSettingsOpen(true);
        setMediaService((current) => ({
          ...current,
          checked: true,
          configured: false,
          image: { ...current.image, configured: false },
          video: { ...current.video, configured: false },
        }));
        setAiConfigured(false);
      }
    } finally {
      setMediaGenerating(false);
    }
  }

  async function refreshVideoAsset(asset: MediaAsset) {
    if (!asset.providerJobId) return;
    try {
      const response = await fetch(
        `/api/media/video?id=${encodeURIComponent(asset.providerJobId)}`,
        {
          cache: "no-store",
          headers: mediaRequestHeaders(),
        },
      );
      const result = await readMediaApi<{
        status: "queued" | "in_progress" | "completed" | "failed";
        progress: number;
        model?: string;
        error?: string | null;
      }>(response);
      const completedStorage =
        result.status === "completed" && !asset.storageKey
          ? await getVideoContentStorage(asset.providerJobId)
          : {
              assetPath: asset.assetPath,
              storageKey: asset.storageKey,
              sizeBytes: asset.sizeBytes,
            };
      setMediaLibrary((current) =>
        current.map((item) =>
          item.id === asset.id
            ? {
                ...item,
                status: result.status,
                progress: result.status === "completed" ? 100 : result.progress,
                assetPath:
                  result.status === "completed"
                    ? completedStorage.assetPath
                    : item.assetPath,
                storageKey:
                  result.status === "completed"
                    ? completedStorage.storageKey
                    : item.storageKey,
                sizeBytes:
                  result.status === "completed"
                    ? completedStorage.sizeBytes
                    : item.sizeBytes,
                model: result.model || item.model,
                error: result.error || undefined,
              }
            : item,
        ),
      );
      if (result.status === "completed") setNotice(`真实视频已生成：${asset.title}`);
      if (result.status === "failed") {
        setNotice(result.error || `视频生成失败：${asset.title}`);
      }
      if (result.status === "completed" || result.status === "failed") {
        void refreshAiUsage();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频进度更新失败。";
      setNotice(`${message} 系统会继续自动重试。`);
    }
  }

  function toggleMediaFavorite(assetId: number) {
    setMediaLibrary((current) =>
      current.map((asset) =>
        asset.id === assetId ? { ...asset, favorite: !asset.favorite } : asset,
      ),
    );
  }

  async function copyMediaPrompt(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.prompt);
      setNotice(`已复制生成提示词：${asset.title}`);
    } catch {
      setNotice("复制被浏览器拦截，可以直接选中提示词复制。");
    }
  }

  function downloadMediaAsset(asset: MediaAsset) {
    if (asset.status === "queued" || asset.status === "in_progress") {
      setNotice("视频仍在生成中，完成后才能下载。");
      return;
    }
    if (asset.status === "failed") {
      setNotice(asset.error || "该素材生成失败，暂时无法下载。");
      return;
    }
    if (asset.status === "cancelled") {
      setNotice("该任务已取消，没有可下载的素材。");
      return;
    }

    const link = document.createElement("a");
    link.href = asset.assetPath;
    link.download = `喜缘-${asset.title.replace(/[\\/:*?"<>|]/g, "-")}.${asset.kind === "视频分镜" && asset.status === "completed" ? "mp4" : "webp"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setNotice(
      asset.kind === "视频分镜" && asset.status === "completed"
        ? `已开始下载视频：${asset.title}`
        : `已开始下载图片：${asset.title}`,
    );
  }

  function addMediaToTask(asset: MediaAsset) {
    addTodayTask(
      asset.kind === "视频分镜"
        ? `确认并拍摄视频分镜：${asset.title}`
        : `确认婚礼视觉方向：${asset.title}`,
    );
    setNotice(`已加入今日小事：${asset.title}`);
  }

  function toggleMediaSelection(assetId: number) {
    setSelectedMediaIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  }

  function toggleAllVisibleMedia() {
    const visibleIds = filteredMediaLibrary.map((asset) => asset.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedMediaIds.includes(id));
    setSelectedMediaIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );
  }

  function startRenameMedia(asset: MediaAsset) {
    setEditingAssetId(asset.id);
    setAssetTitleDraft(asset.title);
  }

  function saveMediaTitle(assetId: number) {
    const title = assetTitleDraft.trim();
    if (!title) {
      setNotice("素材名称不能为空。");
      return;
    }
    setMediaLibrary((current) =>
      current.map((asset) => (asset.id === assetId ? { ...asset, title } : asset)),
    );
    setEditingAssetId(null);
    setAssetTitleDraft("");
    setNotice("素材名称已更新。");
  }

  async function cancelMediaJob(asset: MediaAsset) {
    if (!asset.providerJobId) return;
    try {
      const response = await fetch(
        `/api/media/video?id=${encodeURIComponent(asset.providerJobId)}`,
        {
          method: "DELETE",
          headers: mediaRequestHeaders(),
        },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error || "视频任务取消失败。");
      }
      setMediaLibrary((current) =>
        current.map((item) =>
          item.id === asset.id
            ? { ...item, status: "cancelled", error: "任务已由你取消。" }
            : item,
        ),
      );
      setNotice(`已取消视频任务：${asset.title}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "视频任务取消失败。");
    }
  }

  async function importMediaFile(file: File | null) {
    if (!file) return;
    const isVideo = file.type === "video/mp4";
    const isImage = ["image/webp", "image/png", "image/jpeg"].includes(file.type);
    if (!isVideo && !isImage) {
      setNotice("素材库仅支持 WebP、PNG、JPG 和 MP4 文件。");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setNotice("单个素材不能超过 100MB。");
      return;
    }

    setNotice(`正在保存素材：${file.name}`);
    let storedAsset: Pick<MediaAsset, "assetPath" | "sizeBytes" | "storageKey"> = {
      assetPath: URL.createObjectURL(file),
      sizeBytes: file.size,
    };
    try {
      storedAsset = await persistMediaBlob(file);
    } catch {
      setNotice("云端素材存储暂不可用，文件已先保存在本机当前会话。");
    }

    const title = file.name.replace(/\.[^.]+$/, "") || "新上传的婚礼素材";
    setMediaLibrary((current) => [
      {
        id: nextId(current),
        kind: isVideo ? "视频分镜" : "场景效果图",
        style: mediaStyle,
        ratio: mediaRatio,
        title,
        prompt: "用户上传素材",
        assetPath: storedAsset.assetPath,
        frames: [],
        favorite: false,
        createdAt: new Date().toLocaleString("zh-CN"),
        status: "completed",
        progress: 100,
        model: "用户上传",
        storageKey: storedAsset.storageKey,
        sizeBytes: storedAsset.sizeBytes,
        estimatedCostCny: 0,
      },
      ...current,
    ]);
    setNotice(`素材已加入资料库：${title}`);
    if (mediaUploadRef.current) mediaUploadRef.current.value = "";
  }

  async function deleteMediaAsset(assetId: number, silent = false) {
    const asset = mediaLibrary.find((item) => item.id === assetId);
    if (!asset) return;
    setMediaLibrary((current) => current.filter((item) => item.id !== assetId));
    setSelectedMediaIds((current) => current.filter((id) => id !== assetId));
    if (asset?.providerJobId) {
      void fetch(`/api/media/video?id=${encodeURIComponent(asset.providerJobId)}`, {
        method: "DELETE",
        headers: mediaRequestHeaders(),
      }).catch(() => undefined);
    }
    moveToRecycleBin("media", `影像方案：${asset.title}`, asset, silent);
  }

  async function deleteSelectedMedia() {
    if (selectedMediaIds.length === 0) return;
    if (!window.confirm(`确定删除选中的 ${selectedMediaIds.length} 个素材吗？`)) return;
    const ids = [...selectedMediaIds];
    await Promise.all(ids.map((id) => deleteMediaAsset(id, true)));
    setSelectedMediaIds([]);
    setNotice(`已将 ${ids.length} 个素材移入回收站。`);
  }

  function downloadSelectedMedia() {
    const downloadable = mediaLibrary.filter(
      (asset) =>
        selectedMediaIds.includes(asset.id) &&
        asset.status === "completed" &&
        Boolean(asset.assetPath),
    );
    if (downloadable.length === 0) {
      setNotice("选中的素材还没有可下载内容。");
      return;
    }
    downloadable.forEach((asset, index) => {
      window.setTimeout(() => downloadMediaAsset(asset), index * 250);
    });
    setNotice(`正在下载 ${downloadable.length} 个素材。`);
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
    const guestRows = guestList
      .map(
        (guest) =>
          `<tr><td>${escapeHtml(guest.name)}</td><td>${escapeHtml(guest.relation)}</td><td>${guest.count}</td><td>${escapeHtml(guest.rsvp)}</td><td>${escapeHtml(guest.dietary || "无")}</td></tr>`,
      )
      .join("");
    const vendorRows = vendorList
      .map(
        (vendor) =>
          `<tr><td>${escapeHtml(vendor.category)}</td><td>${escapeHtml(vendor.name)}</td><td>${escapeHtml(currency(vendor.quote))}</td><td>${escapeHtml(currency(vendor.deposit))}</td><td>${escapeHtml(vendor.contractStatus)}</td><td>${escapeHtml(vendor.status)}</td></tr>`,
      )
      .join("");
    const seatingRows = seatingTables
      .map((table) => {
        const guests = guestList.filter((guest) => guest.table === table.name);
        const occupied = guests.reduce((sum, guest) => sum + guest.count, 0);
        return `<tr><td>${escapeHtml(table.name)}</td><td>${escapeHtml(table.zone)}</td><td>${occupied}/${table.capacity}</td><td>${escapeHtml(guests.map((guest) => `${guest.name}(${guest.count})`).join("、") || "暂无")}</td></tr>`;
      })
      .join("");
    const commandRows = weddingTimeline
      .map(
        (event) =>
          `<tr><td>${escapeHtml(event.time)}</td><td>${escapeHtml(event.title)}</td><td>${escapeHtml(event.owner)}</td><td>${escapeHtml(event.location)}</td><td>${escapeHtml(event.phone || "待填写")}</td><td>${escapeHtml(event.status)}${event.delayMinutes ? ` / 延迟${event.delayMinutes}分钟` : ""}</td></tr>`,
      )
      .join("");
    const copyRows = copywritingList
      .map(
        (doc) =>
          `<section class="copy-doc"><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(doc.kind)} / ${escapeHtml(doc.tone)} / ${escapeHtml(doc.createdAt)}</p><pre>${escapeHtml(doc.content)}</pre></section>`,
      )
      .join("");
    const mediaRows = mediaLibrary
      .map(
        (asset) =>
          `<tr><td>${escapeHtml(asset.kind)}</td><td>${escapeHtml(asset.title)}</td><td>${escapeHtml(asset.style)}</td><td>${escapeHtml(asset.ratio)}</td><td>${escapeHtml(asset.prompt)}</td></tr>`,
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
  <h2>宾客回执</h2>
  <table><thead><tr><th>姓名</th><th>关系</th><th>人数</th><th>回执</th><th>饮食需求</th></tr></thead><tbody>${guestRows}</tbody></table>
  <h2>供应商合同与付款</h2>
  <table><thead><tr><th>类型</th><th>供应商</th><th>报价</th><th>已付款</th><th>合同</th><th>合作状态</th></tr></thead><tbody>${vendorRows}</tbody></table>
  <h2>智能排桌</h2>
  <table><thead><tr><th>桌位</th><th>区域</th><th>人数/容量</th><th>宾客</th></tr></thead><tbody>${seatingRows}</tbody></table>
  <h2>婚礼当天指挥中心</h2>
  <table><thead><tr><th>时间</th><th>流程</th><th>负责人</th><th>地点</th><th>电话</th><th>状态</th></tr></thead><tbody>${commandRows}</tbody></table>
  <h2>AI 文案生成区</h2>
  ${copyRows || "<p>暂无文案。</p>"}
  <h2>AI 图片/视频工作台</h2>
  <table><thead><tr><th>类型</th><th>标题</th><th>风格</th><th>比例</th><th>生成提示词</th></tr></thead><tbody>${mediaRows}</tbody></table>
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
        ["姓名", "关系", "人数", "回执", "在线邀请", "携伴", "饮食需求", "桌位", "备注"],
        guestList.map((guest) => [
          guest.name,
          guest.relation,
          guest.count,
          guest.rsvp,
          guest.invitationCode ? "已发送" : "未发送",
          guest.companion ? "是" : "否",
          guest.dietary || "无",
          guest.table,
          guest.notes || "无",
        ]),
      )}
      ${table(
        "供应商管理",
        ["类型", "名称", "联系人", "电话", "报价", "已付款", "合作状态", "合同状态", "合同文件", "备注"],
        vendorList.map((vendor) => [
          vendor.category,
          vendor.name,
          vendor.contact || "待定",
          vendor.phone || "待定",
          vendor.quote,
          vendor.deposit,
          vendor.status,
          vendor.contractStatus,
          vendor.contractName || "未上传",
          vendor.notes || "无",
        ]),
      )}
      ${table(
        "供应商付款计划",
        ["供应商", "付款节点", "金额", "到期日", "状态", "支付时间"],
        vendorList.flatMap((vendor) =>
          vendor.payments.map((payment) => [
            vendor.name,
            payment.label,
            payment.amount,
            payment.dueDate || "待定",
            payment.status,
            payment.paidAt || "未支付",
          ]),
        ),
      )}
      ${table(
        "智能排桌",
        ["桌位", "区域", "容量", "已排人数", "宾客"],
        seatingTables.map((seatingTable) => {
          const guests = guestList.filter((guest) => guest.table === seatingTable.name);
          return [
            seatingTable.name,
            seatingTable.zone,
            seatingTable.capacity,
            guests.reduce((sum, guest) => sum + guest.count, 0),
            guests.map((guest) => `${guest.name}(${guest.count})`).join("、") || "暂无",
          ];
        }),
      )}
      ${table(
        "婚礼当天流程",
        ["时间", "流程", "负责人", "地点", "电话", "状态", "延迟分钟", "备注"],
        weddingTimeline.map((event) => [
          event.time,
          event.title,
          event.owner,
          event.location,
          event.phone || "待填写",
          event.status,
          event.delayMinutes || 0,
          event.notes || "无",
        ]),
      )}
      ${table(
        "当天物料核对",
        ["物料", "负责人", "状态"],
        commandCenter.supplies.map((item) => [
          item.title,
          item.owner,
          item.checked ? "已确认" : "待确认",
        ]),
      )}
      ${table(
        "紧急联系人",
        ["角色", "姓名", "电话"],
        commandCenter.contacts.map((item) => [item.role, item.name, item.phone || "待填写"]),
      )}
      ${table(
        "AI 文案生成区",
        ["类型", "语气", "标题", "内容", "创建时间"],
        copywritingList.map((doc) => [doc.kind, doc.tone, doc.title, doc.content, doc.createdAt]),
      )}
      ${table(
        "AI 图片/视频工作台",
        ["类型", "标题", "风格", "比例", "生成提示词", "收藏", "创建时间"],
        mediaLibrary.map((asset) => [
          asset.kind,
          asset.title,
          asset.style,
          asset.ratio,
          asset.prompt,
          asset.favorite ? "是" : "否",
          asset.createdAt,
        ]),
      )}
    </body></html>`;

    downloadTextFile(
      `喜缘备婚数据-${profile.weddingDate || "未定婚期"}.xls`,
      excelContent,
      "application/vnd.ms-excel;charset=utf-8",
    );
    setNotice("已导出 Excel 表格，可直接用 Excel 打开。");
  }

  function resetWorkspace(
    options: { preserveStorage?: boolean; silent?: boolean } = {},
  ) {
    setProfile(defaultProfile);
    setTaskList(tasks);
    setBudgetList(budgetItems);
    setGuestList(guestItems);
    setVendorList(vendorItems);
    setSeatingTables(seatingTableItems);
    setSelectedGuestIds([]);
    setBatchInvitationBusy(false);
    setCommandCenter(defaultCommandCenter);
    setRecycleBin([]);
    setLastDeletedId(null);
    setOpenVendorId(vendorItems[0]?.id ?? null);
    setWeddingTimeline(weddingTimelineItems);
    setCopyKind("请柬文案");
    setCopyTone("温柔正式");
    setCopyBrief("想要一版可以直接发给亲友的文案");
    setCopywritingList(copywritingItems);
    setMediaKind("场景效果图");
    setMediaStyle("红金中式");
    setMediaRatio("16:9");
    setMediaBrief("高级、喜庆、适合婚礼现场落地");
    setMediaLibrary(mediaItems);
    setMediaGenerating(false);
    setCollaborationList(collaborationItems);
    setDraft(aiSuggestions);
    setMode("文本");
    setPrompt("帮我把备婚拆成每天能完成的小事");
    setAiConfigured(false);
    setOpenTaskId(tasks[0]?.id ?? null);
    if (!options.preserveStorage) {
      window.localStorage.removeItem(workspaceStorageKey);
      if (!currentUser) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    if (!options.silent) setNotice("已恢复默认备婚工作台。");
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
          `${index + 1}. ${guest.name}｜${guest.relation}｜${guest.count} 人｜${guest.rsvp}｜${guest.invitationCode ? "已发送在线邀请" : "未发送邀请"}｜${guest.companion ? "携伴" : "不携伴"}｜饮食：${guest.dietary || "无"}｜桌位：${guest.table}｜备注：${guest.notes || "无"}`,
      ),
      "",
      `## 供应商管理`,
      ...vendorList.map(
        (vendor, index) =>
          `${index + 1}. ${vendor.category}｜${vendor.name}｜联系人：${vendor.contact || "待定"}｜电话：${vendor.phone || "待定"}｜报价：${currency(vendor.quote)}｜已付款：${currency(vendor.deposit)}｜合作：${vendor.status}｜合同：${vendor.contractStatus}${vendor.contractName ? `（${vendor.contractName}）` : ""}｜备注：${vendor.notes || "无"}${vendor.payments.length > 0 ? `\n${vendor.payments.map((payment) => `   - ${payment.label}：${currency(payment.amount)}｜${payment.dueDate || "日期待定"}｜${payment.status}`).join("\n")}` : ""}`,
      ),
      "",
      `## 智能排桌`,
      ...seatingTables.map((table, index) => {
        const guests = guestList.filter((guest) => guest.table === table.name);
        const occupied = guests.reduce((sum, guest) => sum + guest.count, 0);
        return `${index + 1}. ${table.name}｜${table.zone}｜${occupied}/${table.capacity} 人｜${guests.map((guest) => `${guest.name}(${guest.count})`).join("、") || "暂无宾客"}`;
      }),
      "",
      `## 婚礼当天流程`,
      ...weddingTimeline.map(
        (event, index) =>
          `${index + 1}. ${event.time}｜${event.title}｜负责人：${event.owner}｜地点：${event.location}｜电话：${event.phone || "待填写"}｜状态：${event.status}${event.delayMinutes ? `｜延迟：${event.delayMinutes}分钟` : ""}｜备注：${event.notes || "无"}`,
      ),
      "",
      `## 当天物料与紧急联系人`,
      ...commandCenter.supplies.map(
        (item) => `- ${item.checked ? "[x]" : "[ ]"} ${item.title}｜负责人：${item.owner}`,
      ),
      ...commandCenter.contacts.map(
        (item) => `- ${item.role}｜${item.name}｜${item.phone || "电话待填写"}`,
      ),
      `- 现场异常记录：${commandCenter.incidentNote || "无"}`,
      "",
      `## AI 文案生成区`,
      ...copywritingList.map(
        (doc, index) =>
          `${index + 1}. ${doc.title}｜${doc.kind}｜${doc.tone}｜${doc.createdAt}\n\n${doc.content}`,
      ),
      "",
      `## AI 图片/视频工作台`,
      ...mediaLibrary.map(
        (asset, index) =>
          `${index + 1}. ${asset.title}｜${asset.kind}｜${asset.style}｜${asset.ratio}｜${asset.favorite ? "已收藏" : "未收藏"}\n   - 提示词：${asset.prompt}${asset.frames.length > 0 ? `\n   - 分镜：${asset.frames.join("；")}` : ""}`,
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
        <button
          type="button"
          className="nav-menu-toggle"
          onClick={() => setMobileNavOpen((current) => !current)}
          aria-expanded={mobileNavOpen}
          aria-controls="primary-navigation"
        >
          {mobileNavOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          {mobileNavOpen ? "收起" : "导航"}
        </button>
        <div
          className={`nav-actions${mobileNavOpen ? " is-open" : ""}`}
          id="primary-navigation"
        >
          <div className="nav-links" onClick={() => setMobileNavOpen(false)}>
            <a href="#profile">新人资料</a>
            <a href="#plan">备婚计划</a>
            <a href="#details">阶段计划</a>
            <a href="#copywriting">AI 文案</a>
            <a href="#media-studio">AI 影像</a>
            <a href="#wedding-story">婚礼故事</a>
            <a href="#business">业务模块</a>
            <a href="#collaboration">协助清单</a>
            {currentUser?.isAdmin && <a href="#admin">运营后台</a>}
          </div>
          <div className="nav-command-group">
            <button
              type="button"
              className="account-button"
              onClick={() => setAuthPanelOpen((current) => !current)}
              aria-expanded={authPanelOpen}
              aria-controls="account-panel"
            >
              <CircleUserRound size={17} aria-hidden="true" />
              {currentUser ? currentUser.displayName : "登录"}
            </button>
            <button type="button" onClick={startExperience}>
              开始体验
            </button>
          </div>
        </div>
      </nav>

      {authPanelOpen && (
        <section className="auth-panel" id="account-panel" aria-label="喜缘账号">
          {currentUser ? (
            <>
              <div className="auth-account-summary">
                <CircleUserRound size={24} aria-hidden="true" />
                <div>
                  <strong>{currentUser.displayName}</strong>
                  <span>{currentUser.email}</span>
                </div>
              </div>
              <div className="auth-account-state">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>邮箱已验证，备婚资料和素材已切换到独立账号空间</span>
                <button
                  type="button"
                  onClick={() => void loadAuthSessions()}
                  disabled={sessionBusy}
                >
                  <MonitorPlay size={15} aria-hidden="true" />
                  登录设备
                </button>
                <button
                  type="button"
                  onClick={() => void toggleAccountSafety()}
                  disabled={accountSafetyBusy}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  账号与隐私
                </button>
              </div>
              <button type="button" className="auth-logout" onClick={() => void logoutUser()}>
                <LogOut size={17} aria-hidden="true" />
                退出登录
              </button>
              {sessionPanelOpen && (
                <div className="auth-session-panel">
                  <div className="auth-session-heading">
                    <span>
                      <MonitorPlay size={16} aria-hidden="true" />
                      <strong>登录设备</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => void revokeAuthSessions()}
                      disabled={sessionBusy}
                    >
                      退出其他设备
                    </button>
                  </div>
                  <div className="auth-session-list">
                    {authSessions.map((session) => (
                      <div key={session.id}>
                        <span>
                          <strong>
                            {session.device}
                            {session.current ? " · 当前设备" : ""}
                          </strong>
                          <small>
                            {session.ipHint} ·{" "}
                            {new Date(session.createdAt).toLocaleString("zh-CN")}
                          </small>
                        </span>
                        {session.current ? (
                          <ShieldCheck size={15} aria-label="当前设备" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => void revokeAuthSessions(session.id)}
                            disabled={sessionBusy}
                            title="退出这个设备"
                          >
                            <LogOut size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {accountSafetyOpen && (
                <div className="account-safety-panel">
                  <section>
                    <div>
                      <ShieldCheck size={16} aria-hidden="true" />
                      <span>
                        <strong>隐私授权</strong>
                        <small>
                          {privacyState?.current
                            ? `已同意当前版本 · ${privacyState.consent ? new Date(privacyState.consent.acceptedAt).toLocaleDateString("zh-CN") : ""}`
                            : "需要确认最新用户协议与隐私政策"}
                        </small>
                      </span>
                    </div>
                    <p>
                      <a href="/terms" target="_blank" rel="noreferrer">
                        用户协议
                      </a>
                      <a href="/privacy" target="_blank" rel="noreferrer">
                        隐私政策
                      </a>
                    </p>
                    {!privacyState?.current && (
                      <button
                        type="button"
                        onClick={() => void acceptPrivacyPolicies()}
                        disabled={accountSafetyBusy}
                      >
                        同意当前版本
                      </button>
                    )}
                  </section>
                  <section>
                    <div>
                      <Download size={16} aria-hidden="true" />
                      <span>
                        <strong>账号数据</strong>
                        <small>下载工作区资料，注销前建议先导出备份</small>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadWorkspaceExport()}
                      disabled={accountSafetyBusy}
                    >
                      下载我的资料
                    </button>
                  </section>
                  <section className="account-deletion-control">
                    <div>
                      <TriangleAlert size={16} aria-hidden="true" />
                      <span>
                        <strong>账号注销</strong>
                        <small>提交后有 7 天冷静期，到期才会级联清理</small>
                      </span>
                    </div>
                    {accountLifecycle?.deletion?.status === "pending" ? (
                      <>
                        <p>
                          计划于{" "}
                          {new Date(
                            accountLifecycle.deletion.scheduledFor,
                          ).toLocaleString("zh-CN")}{" "}
                          清理
                        </p>
                        <button
                          type="button"
                          onClick={() => void cancelScheduledDeletion()}
                          disabled={accountSafetyBusy}
                        >
                          取消注销
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          value={deletionConfirmation}
                          onChange={(event) =>
                            setDeletionConfirmation(event.target.value)
                          }
                          placeholder="输入：注销喜缘账号"
                          aria-label="账号注销确认文字"
                        />
                        <button
                          type="button"
                          onClick={() => void scheduleAccountDeletion()}
                          disabled={
                            accountSafetyBusy ||
                            deletionConfirmation !== "注销喜缘账号"
                          }
                        >
                          申请注销
                        </button>
                      </>
                    )}
                  </section>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="auth-mode-switch" aria-label="账号操作">
                {(["登录", "注册"] as AuthMode[]).map((item) => (
                  <button
                    type="button"
                    className={authMode === item ? "selected" : ""}
                    onClick={() => setAuthMode(item)}
                    aria-pressed={authMode === item}
                    key={item}
                  >
                    {item === "登录" ? (
                      <LogIn size={16} aria-hidden="true" />
                    ) : (
                      <UserPlus size={16} aria-hidden="true" />
                    )}
                    {item}
                  </button>
                ))}
              </div>
              {(authMode === "验证邮箱" || authMode === "找回密码") && (
                <div className="auth-flow-title">
                  <Mail size={18} aria-hidden="true" />
                  <strong>{authMode}</strong>
                </div>
              )}
              {authMode === "注册" && (
                <label>
                  新人称呼
                  <input
                    value={authDisplayName}
                    onChange={(event) => setAuthDisplayName(event.target.value)}
                    placeholder="例如：小喜和小缘"
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                邮箱
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </label>
              {(authMode === "验证邮箱" || authMode === "找回密码") && (
                <label>
                  邮箱验证码
                  <span className="auth-code-field">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={authCode}
                      onChange={(event) =>
                        setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="6 位验证码"
                      autoComplete="one-time-code"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void requestAuthCode(authMode === "验证邮箱" ? "verify" : "reset")
                      }
                      disabled={authCodeSending}
                    >
                      {authCodeSending ? "发送中" : "获取验证码"}
                    </button>
                  </span>
                </label>
              )}
              {authMode !== "验证邮箱" && (
                <label>
                  {authMode === "找回密码" ? "新密码" : "密码"}
                  <input
                    type="password"
                    value={authMode === "找回密码" ? authNewPassword : authPassword}
                    onChange={(event) =>
                      authMode === "找回密码"
                        ? setAuthNewPassword(event.target.value)
                        : setAuthPassword(event.target.value)
                    }
                    placeholder="至少 8 个字符"
                    autoComplete={
                      authMode === "登录" ? "current-password" : "new-password"
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitAuth();
                    }}
                  />
                </label>
              )}
              {authMode === "注册" && (
                <label className="registration-consent">
                  <input
                    type="checkbox"
                    checked={registrationConsent}
                    onChange={(event) =>
                      setRegistrationConsent(event.target.checked)
                    }
                  />
                  <span>
                    我已阅读并同意
                    <a href="/terms" target="_blank" rel="noreferrer">
                      《用户协议》
                    </a>
                    和
                    <a href="/privacy" target="_blank" rel="noreferrer">
                      《隐私政策》
                    </a>
                  </span>
                </label>
              )}
              <button
                type="button"
                className="auth-submit"
                onClick={() => void submitAuth()}
                disabled={
                  authSubmitting || (authMode === "注册" && !registrationConsent)
                }
              >
                {authSubmitting ? (
                  <LoaderCircle className="spin" size={17} aria-hidden="true" />
                ) : authMode === "登录" ? (
                  <LogIn size={17} aria-hidden="true" />
                ) : authMode === "验证邮箱" ? (
                  <ShieldCheck size={17} aria-hidden="true" />
                ) : authMode === "找回密码" ? (
                  <KeyRound size={17} aria-hidden="true" />
                ) : (
                  <UserPlus size={17} aria-hidden="true" />
                )}
                {authSubmitting
                  ? "处理中"
                  : authMode === "找回密码"
                    ? "重置并登录"
                    : authMode}
              </button>
              <div className="auth-secondary-actions">
                {authMode !== "登录" && (
                  <button type="button" onClick={() => setAuthMode("登录")}>
                    返回登录
                  </button>
                )}
                {authMode === "登录" && (
                  <>
                    <button type="button" onClick={() => setAuthMode("验证邮箱")}>
                      验证邮箱
                    </button>
                    <button type="button" onClick={() => setAuthMode("找回密码")}>
                      忘记密码
                    </button>
                  </>
                )}
              </div>
              <p>邮箱验证后，工作区、素材和生成任务按账号隔离；密码不会以明文保存。</p>
            </>
          )}
        </section>
      )}

      <section className="hero">
        <NextImage
          className="hero-backdrop"
          src="/media-red-gold-ceremony.webp"
          alt="红金中式婚礼仪式通道"
          fill
          priority
          sizes="(max-width: 980px) 100vw, 1220px"
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-copy">
          <h1>
            <span>让备婚，</span>
            <span>像婚礼一样从容</span>
          </h1>
          <p className="hero-subtitle">
            喜缘是你的 AI 备婚搭子。每天只推进一件小事，把预算、文案、影像与宾客安排成一条清晰的路。
          </p>
          <div className="hero-meta" aria-label="当前婚礼信息">
            <span>婚期 {daysUntil === null ? "待确认" : `还有 ${Math.max(daysUntil, 0)} 天`}</span>
            <span>{profile.city}</span>
            <span>{profile.style}</span>
            <span>{profile.guestCount} 位宾客</span>
          </div>

          <div className="hero-controls">
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
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitAssistantRequest();
                  }}
                  aria-label="告诉喜缘小助手你的备婚需求"
                />
                <button type="button" onClick={submitAssistantRequest} aria-label="让小助手处理需求">
                  <Send size={18} aria-hidden="true" />
                </button>
              </label>
              <button type="button" className="config-button" onClick={configureService}>
                <Settings size={18} aria-hidden="true" />
                {aiConfigured ? "重新配置 AI 服务" : "配置 AI 服务"}
              </button>
            </div>

            <div className="assistant-matcher" aria-live="polite">
              <div className="assistant-matcher-title">
                <Bot size={17} aria-hidden="true" />
                <strong>喜缘小助手</strong>
                <span>
                  {primaryAssistantMatch
                    ? `匹配到：${primaryAssistantMatch.label}`
                    : "常用入口"}
                </span>
              </div>
              <div className="assistant-match-actions">
                {(assistantMatches.length > 0
                  ? assistantMatches
                  : assistantIntents.filter((intent) =>
                      ["plan", "budget", "guest", "seating", "command"].includes(intent.id),
                    )
                ).map((intent) => (
                  <button
                    type="button"
                    className={intent.id === primaryAssistantMatch?.id ? "is-primary" : ""}
                    onClick={() =>
                      runAssistantIntent(
                        intent,
                        assistantMatches.length > 0 ? prompt : intent.example,
                      )
                    }
                    key={intent.id}
                  >
                    <span>{intent.label}</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="ai-console" aria-label="AI 备婚控制台">
          <NextImage
            className="console-backdrop"
            src="/media-red-gold-film.webp"
            alt="新人牵手走向红金中式婚礼仪式"
            fill
            sizes="(max-width: 980px) 100vw, 440px"
          />
          <div className="console-scrim" aria-hidden="true" />
          <div className="console-content">
            <h2>今天，先完成 {taskList.length} 件小事。</h2>
            <p>不用一次想清整场婚礼。喜缘把下一步放在你面前，做完一件，再走一步。</p>
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
            <button type="button" onClick={continuePlan}>
              继续备婚计划
              <ChevronRight size={19} aria-hidden="true" />
            </button>
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

      <section className="capability-section" aria-labelledby="capability-title">
        <div className="capability-intro">
          <h2 id="capability-title">备婚不必靠熬夜和记忆。</h2>
          <p>从计划、预算到文案与宾客，喜缘把散落的事情收进同一条时间线。</p>
        </div>
        <div className="capability-grid">
          {capabilityCards.map((card) => (
            <article className="capability-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
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
          <button
            type="button"
            className="ghost-action"
            onClick={() => void generateCopywriting()}
            disabled={copyGenerating}
          >
            {copyGenerating ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <Sparkles size={17} aria-hidden="true" />
            )}
            {copyGenerating ? "DeepSeek 生成中" : "DeepSeek 生成"}
          </button>
        </div>
        <div className="copywriting-list">
          {copywritingList.map((doc) => (
            <article className="copywriting-card" key={doc.id}>
              <div className="copywriting-meta">
                <span>{doc.kind}</span>
                <span>{doc.tone}</span>
                {doc.model && <span>{doc.model}</span>}
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

      <section className="media-studio panel" id="media-studio">
        <div className="media-studio-heading">
          <div className="section-title">
            <MonitorPlay size={20} aria-hidden="true" />
            <div>
              <h2>AI 视觉与 3D 工作台</h2>
              <p>生成婚礼场景效果图、正式证件照和短视频，并实时查看 3D 空间布局。</p>
            </div>
          </div>
          <div className="media-heading-actions">
            <span
              className={`media-service-status ${mediaService.copy.configured ? "ready" : "missing"}`}
            >
              DeepSeek {mediaService.copy.configured ? "已连接" : "待配置"}
            </span>
            <span
              className={`media-service-status ${mediaService.image.configured ? "ready" : "missing"}`}
            >
              豆包图片 {mediaService.image.configured ? "已连接" : "待配置"}
            </span>
            <span
              className={`media-service-status ${mediaService.video.configured ? "ready" : "missing"}`}
            >
              Seedance {mediaService.video.configured ? "已连接" : "待配置"}
            </span>
            <button
              type="button"
              onClick={() => setApiSettingsOpen((current) => !current)}
              aria-expanded={apiSettingsOpen}
              aria-controls="media-api-settings"
            >
              <KeyRound size={14} aria-hidden="true" />
              API 接入
            </button>
            <span>{mediaLibrary.length} 个影像方案</span>
          </div>
        </div>

        <div className="cloud-sync-bar" aria-label="云端数据同步">
          <div className="cloud-sync-summary">
            {cloudSyncStatus === "已保存" || cloudSyncStatus === "保存中" ? (
              <Cloud size={19} aria-hidden="true" />
            ) : (
              <CloudOff size={19} aria-hidden="true" />
            )}
            <div>
              <strong>{currentUser ? `${currentUser.displayName} 的账号云端` : "云端备婚资料"}</strong>
              <span className={`cloud-sync-status status-${cloudSyncStatus}`}>
                {cloudSyncStatus}
                {cloudUpdatedAt && cloudSyncStatus === "已保存"
                  ? ` · ${new Date(cloudUpdatedAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} · 版本 ${cloudRevision}`
                  : ""}
              </span>
            </div>
          </div>
          {currentUser ? (
            <div className="account-scope-note">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>资料、素材与任务仅属于当前账号</span>
              <button
                type="button"
                onClick={() => void loadWorkspaceBackups()}
                disabled={backupBusy}
              >
                <History size={15} aria-hidden="true" />
                历史版本
              </button>
            </div>
          ) : (
            <>
              <label className="sync-code-field">
                同步码
                <input
                  value={syncCodeDraft}
                  onChange={(event) => setSyncCodeDraft(event.target.value)}
                  spellCheck={false}
                  aria-label="云端同步码"
                />
              </label>
              <div className="cloud-sync-actions">
                <button type="button" onClick={saveSyncCode} title="连接同步码">
                  <Save size={15} aria-hidden="true" />
                  连接
                </button>
                <button type="button" onClick={copySyncCode} title="复制同步码">
                  <Copy size={15} aria-hidden="true" />
                  复制
                </button>
                <button type="button" onClick={regenerateSyncCode} title="新建云端空间">
                  <RefreshCw size={15} aria-hidden="true" />
                  新空间
                </button>
                <button
                  type="button"
                  onClick={() => void loadWorkspaceBackups()}
                  disabled={backupBusy}
                  title="查看历史版本"
                >
                  <History size={15} aria-hidden="true" />
                  版本
                </button>
              </div>
            </>
          )}
          {cloudConflict && (
            <div className="cloud-conflict-actions" role="alert">
              <span>
                <TriangleAlert size={17} aria-hidden="true" />
                云端已有更新，当前本机草稿尚未覆盖它。
              </span>
              <div>
                <button type="button" onClick={reloadCloudWorkspace}>
                  <RefreshCw size={15} aria-hidden="true" />
                  载入云端
                </button>
                <button type="button" onClick={keepLocalWorkspace}>
                  <Save size={15} aria-hidden="true" />
                  保留本机
                </button>
              </div>
            </div>
          )}
        </div>

        {backupPanelOpen && (
          <div className="workspace-backup-panel" aria-label="云端历史版本">
            <div>
              <span>
                <History size={17} aria-hidden="true" />
                <strong>云端历史版本</strong>
              </span>
              <small>最多保留 30 个版本，保留期 180 天</small>
              <div className="workspace-backup-actions">
                <button
                  type="button"
                  onClick={() => void createManualWorkspaceBackup()}
                  disabled={backupBusy}
                >
                  <Save size={14} aria-hidden="true" />
                  立即备份
                </button>
                <button
                  type="button"
                  onClick={() => void downloadWorkspaceExport()}
                  disabled={backupBusy}
                >
                  <Download size={14} aria-hidden="true" />
                  下载资料
                </button>
              </div>
            </div>
            <div className="workspace-backup-list">
              {workspaceBackups.map((backup) => (
                <div key={backup.id}>
                  <span>
                    <strong>
                      {backup.reason === "delete"
                        ? "删除前版本"
                        : backup.reason === "restore"
                          ? "恢复前版本"
                          : backup.reason === "manual"
                            ? "手动备份"
                            : "自动保存版本"}
                    </strong>
                    <small>
                      {new Date(backup.createdAt).toLocaleString("zh-CN")}
                    </small>
                  </span>
                  <code>{backup.checksum.slice(0, 10)}</code>
                  <button
                    type="button"
                    onClick={() => void restoreWorkspaceVersion(backup.id)}
                    disabled={backupBusy}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    恢复
                  </button>
                </div>
              ))}
              {workspaceBackups.length === 0 && (
                <p>当前还没有历史版本。资料下一次发生变化时会自动保留。</p>
              )}
            </div>
          </div>
        )}

        {apiSettingsOpen && (
          <div className="media-api-settings" id="media-api-settings">
            <div className="media-api-copy">
              <KeyRound size={20} aria-hidden="true" />
              <div>
                <strong>多模型 AI 服务配置</strong>
                <p>Key 仅保存在当前浏览器会话，关闭浏览器后自动清除，不会写入云端备婚资料。</p>
              </div>
            </div>
            <div className="provider-settings-grid">
              <div className="provider-settings-card">
                <div className="provider-settings-title">
                  <strong>DeepSeek 文案</strong>
                  <span
                    className={
                      mediaService.copy.verified === false
                        ? "missing"
                        : mediaService.copy.configured
                          ? "ready"
                          : "missing"
                    }
                  >
                    {mediaService.copy.verified === true
                      ? "已验证"
                      : mediaService.copy.verified === false
                        ? "验证失败"
                        : mediaService.copy.configured
                          ? "已连接"
                          : "待配置"}
                  </span>
                </div>
                <label className="api-key-field">
                  DeepSeek API Key
                  <span>
                    <input
                      type={showDeepSeekKey ? "text" : "password"}
                      value={deepSeekKeyDraft}
                      onChange={(event) => setDeepSeekKeyDraft(event.target.value)}
                      placeholder="sk-..."
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeepSeekKey((current) => !current)}
                      aria-label={showDeepSeekKey ? "隐藏 DeepSeek Key" : "显示 DeepSeek Key"}
                      title={showDeepSeekKey ? "隐藏 DeepSeek Key" : "显示 DeepSeek Key"}
                    >
                      {showDeepSeekKey ? (
                        <EyeOff size={17} aria-hidden="true" />
                      ) : (
                        <Eye size={17} aria-hidden="true" />
                      )}
                    </button>
                  </span>
                </label>
                <label className="provider-model-field">
                  文案模型
                  <input
                    value={deepSeekModelDraft}
                    onChange={(event) => setDeepSeekModelDraft(event.target.value)}
                    spellCheck={false}
                  />
                </label>
                {mediaService.copy.verified === true && (
                  <p className="provider-diagnostic">
                    真实联调 {mediaService.copy.latencyMs || 0}ms
                    {mediaService.copy.modelAvailable === false
                      ? " · 当前账号未开放该模型"
                      : " · 模型可用"}
                  </p>
                )}
                {mediaService.copy.error && (
                  <p className="provider-error">{mediaService.copy.error}</p>
                )}
              </div>

              <div className="provider-settings-card">
                <div className="provider-settings-title">
                  <strong>火山方舟影像</strong>
                  <span
                    className={
                      mediaService.image.verified === false
                        ? "missing"
                        : mediaService.image.configured
                          ? "ready"
                          : "missing"
                    }
                  >
                    {mediaService.image.verified === true
                      ? "已验证"
                      : mediaService.image.verified === false
                        ? "验证失败"
                        : mediaService.image.configured
                          ? "已连接"
                          : "待配置"}
                  </span>
                </div>
                <label className="api-key-field">
                  Ark API Key
                  <span>
                    <input
                      type={showArkKey ? "text" : "password"}
                      value={arkKeyDraft}
                      onChange={(event) => setArkKeyDraft(event.target.value)}
                      placeholder="火山方舟 API Key"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowArkKey((current) => !current)}
                      aria-label={showArkKey ? "隐藏 Ark Key" : "显示 Ark Key"}
                      title={showArkKey ? "隐藏 Ark Key" : "显示 Ark Key"}
                    >
                      {showArkKey ? (
                        <EyeOff size={17} aria-hidden="true" />
                      ) : (
                        <Eye size={17} aria-hidden="true" />
                      )}
                    </button>
                  </span>
                </label>
                <div className="provider-model-grid">
                  <label className="provider-model-field">
                    豆包图片模型
                    <input
                      value={arkImageModelDraft}
                      onChange={(event) => setArkImageModelDraft(event.target.value)}
                      spellCheck={false}
                    />
                  </label>
                  <label className="provider-model-field">
                    Seedance 视频模型
                    <input
                      value={arkVideoModelDraft}
                      onChange={(event) => setArkVideoModelDraft(event.target.value)}
                      spellCheck={false}
                    />
                  </label>
                </div>
                {mediaService.image.verified === true && (
                  <p className="provider-diagnostic">
                    真实联调 {mediaService.image.latencyMs || 0}ms
                    {mediaService.image.modelAvailable === false ||
                    mediaService.video.modelAvailable === false
                      ? " · 请检查模型接入点"
                      : " · 图片与视频通道可访问"}
                  </p>
                )}
                {mediaService.image.error && (
                  <p className="provider-error">{mediaService.image.error}</p>
                )}
              </div>
            </div>
            <div className="media-api-actions">
              <button
                type="button"
                className="media-generate"
                onClick={() => void saveBrowserApiKeys()}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                保存并验证
              </button>
              <button type="button" className="subtle-action" onClick={clearBrowserApiKeys}>
                <Trash2 size={15} aria-hidden="true" />
                清除全部
              </button>
              <button
                type="button"
                className="subtle-action"
                onClick={() => void checkMediaService(true, undefined, true)}
              >
                <Settings size={15} aria-hidden="true" />
                重新检查
              </button>
            </div>
            <div className="media-cost-settings">
              <div className="media-cost-settings-title">
                <Calculator size={18} aria-hidden="true" />
                <div>
                  <strong>费用与额度控制</strong>
                  <span>以下为本地预估，不代替 DeepSeek 或火山方舟账单。</span>
                </div>
              </div>
              <label>
                本月生成上限
                <span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={mediaUsage.limit}
                    onChange={(event) => updateMediaUsageLimit(event.target.value)}
                  />
                  <small>次</small>
                </span>
              </label>
              <label>
                月预算上限
                <span>
                  <small>¥</small>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={mediaUsage.monthlyBudgetCny}
                    onChange={(event) =>
                      updateMediaCostSetting("monthlyBudgetCny", event.target.value)
                    }
                  />
                </span>
              </label>
              <label>
                每张图片估算
                <span>
                  <small>¥</small>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={mediaUsage.imageEstimateCny}
                    onChange={(event) =>
                      updateMediaCostSetting("imageEstimateCny", event.target.value)
                    }
                  />
                </span>
              </label>
              <label>
                视频每秒估算
                <span>
                  <small>¥</small>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={mediaUsage.videoSecondEstimateCny}
                    onChange={(event) =>
                      updateMediaCostSetting("videoSecondEstimateCny", event.target.value)
                    }
                  />
                </span>
              </label>
              <label>
                视频时长
                <select
                  value={mediaUsage.videoSeconds}
                  onChange={(event) =>
                    updateMediaCostSetting("videoSeconds", event.target.value)
                  }
                >
                  <option value={4}>4 秒</option>
                  <option value={8}>8 秒</option>
                  <option value={12}>12 秒</option>
                </select>
              </label>
              <label className="hard-limit-toggle">
                <input
                  type="checkbox"
                  checked={mediaUsage.hardLimit}
                  onChange={(event) =>
                    setMediaUsage((current) => ({
                      ...current,
                      hardLimit: event.target.checked,
                    }))
                  }
                />
                超出月预算时阻止生成
              </label>
            </div>
          </div>
        )}

        <div className="media-workbench">
          <div className="media-kind-switch" aria-label="影像生成类型">
            {(["场景效果图", "AI 证件照", "视频分镜"] as MediaKind[]).map((kind) => (
              <button
                type="button"
                className={mediaKind === kind ? "selected" : ""}
                onClick={() => {
                  setMediaKind(kind);
                  if (kind === "视频分镜" && mediaRatio === "1:1") setMediaRatio("16:9");
                  if (kind === "AI 证件照") setMediaRatio("9:16");
                }}
                key={kind}
              >
                {kind === "场景效果图" ? (
                  <ImageIcon size={16} aria-hidden="true" />
                ) : kind === "AI 证件照" ? (
                  <Camera size={16} aria-hidden="true" />
                ) : (
                  <Video size={16} aria-hidden="true" />
                )}
                {kind}
              </button>
            ))}
          </div>

          <div
            className={`media-controls ${mediaKind === "AI 证件照" ? "portrait-mode" : ""}`}
          >
            <label>
              视觉风格
              <select
                value={mediaStyle}
                onChange={(event) => setMediaStyle(event.target.value as MediaStyle)}
              >
                {mediaStyles.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            <label>
              画面比例
              <select
                value={mediaRatio}
                onChange={(event) => setMediaRatio(event.target.value as MediaRatio)}
              >
                {mediaRatios
                  .filter((ratio) =>
                    mediaKind === "AI 证件照"
                      ? ratio === "9:16"
                      : mediaKind === "视频分镜"
                        ? ratio !== "1:1"
                        : true,
                  )
                  .map((ratio) => (
                  <option key={ratio}>{ratio}</option>
                  ))}
              </select>
            </label>
            <label className="media-brief-field">
              画面要求
              <textarea
                value={mediaBrief}
                onChange={(event) => setMediaBrief(event.target.value)}
                placeholder="例如：酒店宴会厅、暖金灯光、红色花艺、不要人物"
              />
            </label>
            {mediaKind === "AI 证件照" && (
              <div className="portrait-upload-field">
                <span>本人正面照片</span>
                <input
                  ref={portraitInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectPortraitFile(event.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="portrait-upload"
                  onClick={() => portraitInputRef.current?.click()}
                >
                  {portraitPreview ? (
                    <NextImage
                      src={portraitPreview}
                      alt="待处理证件照原图"
                      width={44}
                      height={44}
                      unoptimized
                    />
                  ) : (
                    <Upload size={18} aria-hidden="true" />
                  )}
                  <span>{portraitFile ? portraitFile.name : "选择 JPG、PNG 或 WebP"}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className="media-generate"
              onClick={generateMediaAsset}
              disabled={mediaGenerating}
            >
              <Sparkles size={17} aria-hidden="true" />
              {mediaGenerating ? "生成中…" : `生成${mediaKind}`}
            </button>
            <span className="media-next-cost">
              本次预估 ¥{nextMediaCost.toFixed(2)}
              {mediaKind === "视频分镜" ? ` · ${mediaUsage.videoSeconds} 秒` : ""}
            </span>
          </div>
        </div>

        <Suspense
          fallback={
            <section className="scene-3d-band scene-3d-loading" aria-labelledby="scene-loading-title">
              <div className="scene-3d-copy">
                <span>实时空间方案</span>
                <h3 id="scene-loading-title">3D 婚礼现场预览</h3>
                <p>正在加载可旋转的婚礼空间…</p>
              </div>
              <LoaderCircle size={28} aria-hidden="true" />
            </section>
          }
        >
          <WeddingScene3D style={mediaStyle} />
        </Suspense>

        <section className="media-job-center" aria-labelledby="media-job-title">
          <div className="media-job-heading">
            <div>
              <ListFilter size={19} aria-hidden="true" />
              <div>
                <h3 id="media-job-title">AI 任务中心</h3>
                <p>统一查看生成状态、素材结果和本月调用次数。</p>
              </div>
            </div>
            <div className="media-usage">
              <Gauge size={16} aria-hidden="true" />
              <div>
                <span>
                  本月 {mediaUsageTotal}/{mediaUsage.limit} 次
                </span>
                <meter min={0} max={100} value={mediaUsageRate} />
              </div>
              <div>
                <span>
                  预估 ¥{mediaUsage.estimatedSpendCny.toFixed(2)}/
                  {mediaUsage.monthlyBudgetCny.toFixed(2)}
                </span>
                <meter min={0} max={100} value={mediaBudgetRate} />
              </div>
            </div>
          </div>

          <div className="media-job-stats">
            <div>
              <strong>{mediaJobStats.total}</strong>
              <span>真实任务</span>
            </div>
            <div>
              <strong>{mediaJobStats.active}</strong>
              <span>处理中</span>
            </div>
            <div>
              <strong>{mediaJobStats.completed}</strong>
              <span>已完成</span>
            </div>
            <div>
              <strong>{mediaJobStats.failed}</strong>
              <span>失败/取消</span>
            </div>
          </div>

          <div className="media-job-filters" aria-label="AI 任务筛选">
            {mediaJobFilters.map((filter) => (
              <button
                type="button"
                className={mediaJobFilter === filter ? "selected" : ""}
                onClick={() => setMediaJobFilter(filter)}
                aria-pressed={mediaJobFilter === filter}
                key={filter}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <div className="media-library-toolbar">
          <div className="media-library-heading">
            <FolderOpen size={19} aria-hidden="true" />
            <div>
              <strong>完整素材库</strong>
              <span>
                {mediaLibrary.length} 个素材 · {formatStorageSize(mediaStorageTotal)}
              </span>
            </div>
          </div>
          <label className="media-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              value={mediaSearch}
              onChange={(event) => setMediaSearch(event.target.value)}
              placeholder="搜索名称、风格或提示词"
              aria-label="搜索素材"
            />
          </label>
          <select
            value={mediaKindFilter}
            onChange={(event) => setMediaKindFilter(event.target.value as MediaKindFilter)}
            aria-label="素材类型"
          >
            {mediaKindFilters.map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>
          <select
            value={mediaSort}
            onChange={(event) => setMediaSort(event.target.value as MediaSort)}
            aria-label="素材排序"
          >
            {mediaSortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            ref={mediaUploadRef}
            type="file"
            accept="image/webp,image/png,image/jpeg,video/mp4"
            onChange={(event) => void importMediaFile(event.target.files?.[0] || null)}
            hidden
          />
          <button type="button" onClick={() => mediaUploadRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            上传素材
          </button>
        </div>

        <div className="media-batch-bar">
          <button type="button" onClick={toggleAllVisibleMedia}>
            {filteredMediaLibrary.length > 0 &&
            filteredMediaLibrary.every((asset) => selectedMediaIds.includes(asset.id)) ? (
              <CheckSquare size={16} aria-hidden="true" />
            ) : (
              <Square size={16} aria-hidden="true" />
            )}
            选择当前结果
          </button>
          <span>已选择 {selectedMediaIds.length} 个</span>
          <button
            type="button"
            onClick={downloadSelectedMedia}
            disabled={selectedMediaIds.length === 0}
          >
            <Download size={16} aria-hidden="true" />
            批量下载
          </button>
          <button
            type="button"
            className="danger-action"
            onClick={() => void deleteSelectedMedia()}
            disabled={selectedMediaIds.length === 0}
          >
            <Trash2 size={16} aria-hidden="true" />
            批量删除
          </button>
        </div>

        <div className="media-library">
          {filteredMediaLibrary.map((asset) => (
            <article
              className={`media-card ${selectedMediaIds.includes(asset.id) ? "selected" : ""}`}
              key={asset.id}
            >
              <div className={`media-preview ratio-${asset.ratio.replace(":", "-")}`}>
                {asset.kind === "视频分镜" && asset.status === "completed" ? (
                  <video
                    src={asset.assetPath}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={`${asset.title}视频`}
                  />
                ) : (
                  <NextImage
                    src={asset.assetPath}
                    alt={`${asset.title}预览`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 560px"
                  />
                )}
                <div className="media-preview-top">
                  <span>{asset.kind}</span>
                  <span>{asset.ratio}</span>
                  <span className={`generation-status ${asset.status}`}>
                    {mediaStatusLabel(asset)}
                  </span>
                </div>
                {asset.kind === "视频分镜" && asset.status === "template" && (
                  <span className="media-play" aria-hidden="true">
                    <Play size={24} fill="currentColor" />
                  </span>
                )}
                {(asset.status === "queued" || asset.status === "in_progress") && (
                  <div className="media-progress-overlay" role="status">
                    <LoaderCircle size={28} aria-hidden="true" />
                    <strong>{asset.status === "queued" ? "等待生成" : "视频生成中"}</strong>
                    <span>{Math.round(asset.progress)}%</span>
                    <meter min={0} max={100} value={asset.progress} />
                  </div>
                )}
                {asset.status === "failed" && (
                  <div className="media-progress-overlay failed" role="status">
                    <strong>生成失败</strong>
                    <span>{asset.error || "请调整画面要求后重试"}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="media-select"
                  onClick={() => toggleMediaSelection(asset.id)}
                  aria-label={selectedMediaIds.includes(asset.id) ? `取消选择${asset.title}` : `选择${asset.title}`}
                  aria-pressed={selectedMediaIds.includes(asset.id)}
                  title={selectedMediaIds.includes(asset.id) ? "取消选择" : "选择素材"}
                >
                  {selectedMediaIds.includes(asset.id) ? (
                    <CheckSquare size={18} aria-hidden="true" />
                  ) : (
                    <Square size={18} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className={`media-favorite ${asset.favorite ? "selected" : ""}`}
                  onClick={() => toggleMediaFavorite(asset.id)}
                  aria-label={asset.favorite ? `取消收藏${asset.title}` : `收藏${asset.title}`}
                  aria-pressed={asset.favorite}
                  title={asset.favorite ? "取消收藏" : "收藏"}
                >
                  <Heart size={17} fill={asset.favorite ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </div>

              <div className="media-card-body">
                <div className="media-card-title">
                  <div>
                    <span>{asset.style}</span>
                    {editingAssetId === asset.id ? (
                      <span className="media-title-editor">
                        <input
                          value={assetTitleDraft}
                          onChange={(event) => setAssetTitleDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveMediaTitle(asset.id);
                            if (event.key === "Escape") setEditingAssetId(null);
                          }}
                          aria-label="素材名称"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveMediaTitle(asset.id)}
                          aria-label="保存素材名称"
                          title="保存名称"
                        >
                          <Save size={15} aria-hidden="true" />
                        </button>
                      </span>
                    ) : (
                      <span className="media-title-display">
                        <h3>{asset.title}</h3>
                        <button
                          type="button"
                          onClick={() => startRenameMedia(asset)}
                          aria-label={`重命名${asset.title}`}
                          title="重命名"
                        >
                          <Settings size={14} aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </div>
                  <small>{asset.createdAt}</small>
                </div>
                <div className="media-asset-meta">
                  <span>{asset.model || "未知来源"}</span>
                  <span>{formatStorageSize(asset.sizeBytes)}</span>
                  <span>预估 ¥{(asset.estimatedCostCny || 0).toFixed(2)}</span>
                  <span>{asset.storageKey ? "云端素材" : "本机素材"}</span>
                </div>
                <p className="media-prompt">{asset.prompt}</p>

                {asset.frames.length > 0 && (
                  <ol className="storyboard-list">
                    {asset.frames.map((frame) => (
                      <li key={frame}>{frame}</li>
                    ))}
                  </ol>
                )}

                <div className="media-actions">
                  {(asset.status === "queued" || asset.status === "in_progress") && (
                    <>
                      <button
                        type="button"
                        className="subtle-action"
                        onClick={() => void refreshVideoAsset(asset)}
                      >
                        <RefreshCw size={15} aria-hidden="true" />
                        刷新进度
                      </button>
                      <button
                        type="button"
                        className="delete-task"
                        onClick={() => void cancelMediaJob(asset)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        取消任务
                      </button>
                    </>
                  )}
                  {(asset.status === "failed" || asset.status === "cancelled") && (
                    <button
                      type="button"
                      className="subtle-action"
                      onClick={() => prepareMediaRetry(asset)}
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      重新设置
                    </button>
                  )}
                  <button
                    type="button"
                    className="subtle-action"
                    onClick={() => copyMediaPrompt(asset)}
                  >
                    <Copy size={15} aria-hidden="true" />
                    复制提示词
                  </button>
                  <button
                    type="button"
                    className="subtle-action"
                    onClick={() => downloadMediaAsset(asset)}
                    disabled={
                      asset.status === "queued" ||
                      asset.status === "in_progress" ||
                      asset.status === "failed" ||
                      asset.status === "cancelled"
                    }
                  >
                    <Download size={15} aria-hidden="true" />
                    {asset.kind === "视频分镜" && asset.status === "completed"
                      ? "下载视频"
                      : asset.kind === "视频分镜"
                        ? "下载分镜"
                        : "下载图片"}
                  </button>
                  <button
                    type="button"
                    className="subtle-action"
                    onClick={() => addMediaToTask(asset)}
                  >
                    <Plus size={15} aria-hidden="true" />
                    加入任务
                  </button>
                  <button
                    type="button"
                    className="delete-task"
                    onClick={() => void deleteMediaAsset(asset.id)}
                    aria-label={`删除${asset.title}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filteredMediaLibrary.length === 0 && (
            <div className="media-empty-state">
              <ListFilter size={22} aria-hidden="true" />
              <strong>当前筛选没有任务</strong>
              <span>切换到“全部”查看示例素材与生成结果。</span>
              <button type="button" onClick={() => setMediaJobFilter("全部")}>
                查看全部
              </button>
            </div>
          )}
        </div>

        <p className="media-footnote">
          <HeartHandshake size={16} aria-hidden="true" />
          文案由 {mediaService.copy.model} 生成；场景效果图和证件照由 {mediaService.image.model} 生成；视频由 {mediaService.video.model} 异步渲染。3D 预览在本机实时运行，不消耗 API 额度。
        </p>
      </section>

      <WeddingStoryEmbed />

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
            <button type="button" className="subtle-action" onClick={() => resetWorkspace()}>
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

        <article className="panel" id="budget">
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
          {!currentUser ? (
            <div className="team-login-prompt">
              <ShieldCheck size={19} aria-hidden="true" />
              <div>
                <strong>登录后启用多人协作</strong>
                <span>成员权限、通知记录和套餐额度都会绑定到独立婚礼空间。</span>
              </div>
              <button
                type="button"
                className="subtle-action"
                onClick={() => setAuthPanelOpen(true)}
              >
                登录账号
              </button>
            </div>
          ) : (
            <div className="team-hub" aria-label="多人协作中心">
              {teamOverview && !teamOverview.canWrite && (
                <div className="team-readonly-banner" role="status">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <div>
                    <strong>当前为只读空间</strong>
                    <span>你可以查看备婚资料、预算和素材，修改与 AI 生成操作已由系统拦截。</span>
                  </div>
                </div>
              )}
              <section className="team-module">
                <div className="team-module-title">
                  <UserCog size={18} aria-hidden="true" />
                  <div>
                    <strong>空间成员</strong>
                    <span>
                      {teamLoading
                        ? "正在读取"
                        : `${teamOverview?.members.length || 1} 位成员 · ${
                            teamOverview ? teamRoleLabel(teamOverview.role) : "读取中"
                          }`}
                    </span>
                  </div>
                </div>
                <div className="team-member-list">
                  {teamOverview?.members.map((member) => (
                    <div className="team-member-row" key={member.userId}>
                      <span className="team-avatar">
                        {member.displayName.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{member.displayName}</strong>
                        <small>{member.email}</small>
                      </div>
                      {teamOverview.canManage && member.role !== "owner" ? (
                        <select
                          value={member.role}
                          onChange={(event) =>
                            void updateTeamMemberRole(
                              member.userId,
                              event.target.value as TeamRole,
                            )
                          }
                          aria-label={`${member.displayName}角色`}
                          disabled={teamBusy}
                        >
                          <option value="planner">婚礼策划</option>
                          <option value="editor">共同编辑</option>
                          <option value="viewer">仅查看</option>
                        </select>
                      ) : (
                        <em>{teamRoleLabel(member.role)}</em>
                      )}
                      {teamOverview.canManage && member.role !== "owner" && (
                        <button
                          type="button"
                          className="icon-danger"
                          onClick={() => void removeTeamMember(member.userId)}
                          aria-label={`移除${member.displayName}`}
                          title="移除成员"
                          disabled={teamBusy}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {teamOverview?.canManage && (
                  <div className="team-invite-form">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="成员邮箱"
                      aria-label="邀请成员邮箱"
                    />
                    <select
                      value={inviteRole}
                      onChange={(event) =>
                        setInviteRole(
                          event.target.value as Exclude<TeamRole, "owner">,
                        )
                      }
                      aria-label="邀请成员角色"
                    >
                      <option value="planner">婚礼策划</option>
                      <option value="editor">共同编辑</option>
                      <option value="viewer">仅查看</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void createTeamInvite()}
                      disabled={teamBusy}
                    >
                      <UserPlus size={15} aria-hidden="true" />
                      发出邀请
                    </button>
                  </div>
                )}
                {latestInviteCode && (
                  <div className="invite-code-result">
                    <span>邀请码</span>
                    <strong>{latestInviteCode}</strong>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(latestInviteCode)}
                      aria-label="复制邀请码"
                    >
                      <Copy size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="team-accept-form">
                  <input
                    value={acceptInviteCode}
                    onChange={(event) =>
                      setAcceptInviteCode(event.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="输入 10 位邀请码"
                    aria-label="协作邀请码"
                  />
                  <button
                    type="button"
                    onClick={() => void acceptTeamInvite()}
                    disabled={teamBusy || acceptInviteCode.length !== 10}
                  >
                    加入空间
                  </button>
                </div>
              </section>

              <section className="team-module">
                <div className="team-module-title">
                  <Bell size={18} aria-hidden="true" />
                  <div>
                    <strong>通知中心</strong>
                    <span>{notificationOverview?.unread || 0} 条未读提醒</span>
                  </div>
                  {(notificationOverview?.unread || 0) > 0 && (
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => void markTeamNotificationsRead()}
                    >
                      全部已读
                    </button>
                  )}
                </div>
                <div className="notification-toggles">
                  {(["email", "sms", "wechat"] as const).map((channel) => (
                    <label key={channel}>
                      <input
                        type="checkbox"
                        checked={notificationOverview?.preferences[channel] || false}
                        onChange={(event) =>
                          void saveNotificationPreferences({
                            [channel]: event.target.checked,
                          })
                        }
                      />
                      <span>
                        {channel === "email"
                          ? "邮件"
                          : channel === "sms"
                            ? "短信"
                            : "微信"}
                      </span>
                      <small>
                        {notificationOverview?.capabilities[channel]
                          ? "可用"
                          : "待配置"}
                      </small>
                    </label>
                  ))}
                </div>
                {notificationOverview?.preferences.sms && (
                  <input
                    className="notification-phone"
                    value={notificationOverview.preferences.phone}
                    onChange={(event) =>
                      setNotificationOverview((current) =>
                        current
                          ? {
                              ...current,
                              preferences: {
                                ...current.preferences,
                                phone: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                    onBlur={(event) =>
                      void saveNotificationPreferences({ phone: event.target.value })
                    }
                    placeholder="接收短信的手机号"
                    aria-label="通知手机号"
                  />
                )}
                <div className="notification-list">
                  {notificationOverview?.items.slice(0, 3).map((item) => (
                    <div className={item.read ? "read" : ""} key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                    </div>
                  ))}
                  {notificationOverview?.items.length === 0 && (
                    <p>暂无提醒，婚期节点和预算提醒会显示在这里。</p>
                  )}
                </div>
                <div className="automatic-reminder-box">
                  <div>
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>
                      <strong>自动提醒</strong>
                      <small>每天 09:00 检查婚期、任务和预算</small>
                    </span>
                  </div>
                  {reminderOverview?.rules.length ? (
                    <ul>
                      {reminderOverview.rules.slice(0, 3).map((rule) => (
                        <li key={rule.id}>{rule.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>当前没有需要立即提醒的事项。</p>
                  )}
                  <button
                    type="button"
                    className="text-action"
                    onClick={() => void runAutomaticReminderCheck()}
                    disabled={teamBusy || !reminderOverview?.canRun}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    立即检查
                  </button>
                </div>
                <button
                  type="button"
                  className="subtle-action"
                  onClick={() => void testNotificationChannels()}
                  disabled={teamBusy}
                >
                  <Send size={15} aria-hidden="true" />
                  测试通知
                </button>
              </section>

              <section className="team-module billing-module">
                <div className="team-module-title">
                  <CreditCard size={18} aria-hidden="true" />
                  <div>
                    <strong>套餐与额度</strong>
                    <span>
                      当前{" "}
                      {billingOverview?.plans.find(
                        (plan) => plan.id === billingOverview.record.plan,
                      )?.name || "轻松备婚"}
                    </span>
                  </div>
                </div>
                {aiUsageOverview && (
                  <div className="server-usage-summary">
                    <div>
                      <span>
                        本月已使用
                        <strong>
                          {aiUsageOverview.record.usedUnits +
                            aiUsageOverview.record.reservedUnits}
                          /{aiUsageOverview.allowance}
                        </strong>
                      </span>
                      <meter
                        min={0}
                        max={100}
                        value={Math.min(
                          100,
                          ((aiUsageOverview.record.usedUnits +
                            aiUsageOverview.record.reservedUnits) /
                            Math.max(1, aiUsageOverview.allowance)) *
                            100,
                        )}
                      />
                    </div>
                    <div className="usage-facts">
                      <span>可用 {aiUsageOverview.available} 点</span>
                      <span>处理中 {aiUsageOverview.record.reservedUnits} 点</span>
                      <span>
                        API 预估 ¥{aiUsageOverview.record.estimatedCostCny.toFixed(2)}
                      </span>
                    </div>
                    <small>
                      文案 {aiUsageOverview.record.operations.copy} · 图片{" "}
                      {aiUsageOverview.record.operations.image} · 证件照{" "}
                      {aiUsageOverview.record.operations.portrait} · 视频{" "}
                      {aiUsageOverview.record.operations.video}
                    </small>
                  </div>
                )}
                <div className="billing-plan-list">
                  {billingOverview?.plans.map((plan) => {
                    const current = billingOverview.record.plan === plan.id;
                    return (
                      <div className={current ? "current" : ""} key={plan.id}>
                        <span>
                          <strong>{plan.name}</strong>
                          <small>
                            {plan.priceCny === 0 ? "免费" : `¥${plan.priceCny}/月`}
                          </small>
                        </span>
                        <p>
                          {plan.memberLimit} 人协作 · 每月 {plan.monthlyAiLimit} 点 AI
                        </p>
                        {current ? (
                          <em>当前套餐</em>
                        ) : plan.id !== "free" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void startPlanCheckout(plan.id as "pro" | "studio")
                            }
                            disabled={
                              teamBusy ||
                              !billingOverview.canManage ||
                              !billingOverview.paymentConfigured
                            }
                          >
                            升级
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {!billingOverview?.paymentConfigured && (
                  <p className="billing-note">支付通道待配置，当前不会产生扣款。</p>
                )}
              </section>

              <section className="team-module audit-module">
                <div className="team-module-title">
                  <History size={18} aria-hidden="true" />
                  <div>
                    <strong>操作记录</strong>
                    <span>最近 {teamOverview?.audit.length || 0} 条</span>
                  </div>
                  {teamOverview?.canManage && (
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => void downloadAuditLog()}
                      disabled={teamBusy}
                    >
                      <Download size={14} aria-hidden="true" />
                      导出
                    </button>
                  )}
                </div>
                <div className="audit-list">
                  {teamOverview?.audit.slice(0, 5).map((item) => (
                    <div key={item.id}>
                      <span>{item.actorName}</span>
                      <strong>{item.action}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                  {teamOverview?.audit.length === 0 && (
                    <p>成员邀请、权限调整和资料保存会记录在这里。</p>
                  )}
                </div>
              </section>
            </div>
          )}
        </article>

      </section>

      {currentUser?.isAdmin && (
        <section className="admin-band" id="admin" aria-labelledby="admin-title">
          <div className="admin-heading">
            <div>
              <LayoutDashboard size={22} aria-hidden="true" />
              <span>
                <small>喜缘运营控制台</small>
                <h2 id="admin-title">后台管理中心</h2>
              </span>
            </div>
            <div className="admin-heading-actions">
              <button
                type="button"
                className="subtle-action"
                onClick={() => void runAdminAction("diagnose_services")}
                disabled={adminBusy}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                检查真实服务
              </button>
              <button
                type="button"
                className="subtle-action"
                onClick={() => void runAdminAction("run_reminders")}
                disabled={adminBusy}
              >
                <Bell size={16} aria-hidden="true" />
                运行提醒任务
              </button>
            </div>
          </div>

          <div className="admin-metrics">
            <div>
              <strong>{adminOverview?.metrics.users || 0}</strong>
              <span>注册用户</span>
            </div>
            <div>
              <strong>{adminOverview?.metrics.workspaces || 0}</strong>
              <span>婚礼空间</span>
            </div>
            <div>
              <strong>{adminOverview?.metrics.totalUsed || 0}</strong>
              <span>本月已用额度</span>
            </div>
            <div>
              <strong>{adminOverview?.metrics.totalReserved || 0}</strong>
              <span>处理中额度</span>
            </div>
            <div>
              <strong>{adminOverview?.metrics.activeVideoJobs || 0}</strong>
              <span>视频任务</span>
            </div>
            <div>
              <strong>
                ¥{(adminOverview?.metrics.estimatedCostCny || 0).toFixed(2)}
              </strong>
              <span>API 预估费用</span>
            </div>
          </div>

          <div className="admin-layout">
            <section className="admin-alerts" aria-label="运营预警">
              <div className="admin-section-title">
                <TriangleAlert size={17} aria-hidden="true" />
                <div>
                  <strong>运营预警</strong>
                  <span>{adminOverview?.alerts.length || 0} 项需要关注</span>
                </div>
              </div>
              <div className="admin-alert-list">
                {adminOverview?.alerts.slice(0, 8).map((alert, index) => (
                  <div key={`${alert.kind}-${index}`}>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                ))}
                {adminOverview?.alerts.length === 0 && (
                  <p>当前没有付款、额度或任务异常。</p>
                )}
              </div>
              <div className="admin-plan-distribution">
                <span>免费 {adminOverview?.planCounts.free || 0}</span>
                <span>专业 {adminOverview?.planCounts.pro || 0}</span>
                <span>工作室 {adminOverview?.planCounts.studio || 0}</span>
              </div>
            </section>

            <section className="admin-owner-management" aria-label="空间额度管理">
              <div className="admin-section-title">
                <Gauge size={17} aria-hidden="true" />
                <div>
                  <strong>空间与额度管理</strong>
                  <span>调整套餐、赠送额度并查看 API 成本</span>
                </div>
                <label>
                  赠送额度
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={adminGrantUnits}
                    onChange={(event) => setAdminGrantUnits(event.target.value)}
                  />
                </label>
              </div>
              <div className="admin-owner-list">
                {adminOverview?.owners.slice(0, 20).map((owner) => (
                  <div className="admin-owner-row" key={owner.ownerId}>
                    <span>
                      <strong>{owner.user?.displayName || "未命名空间"}</strong>
                      <small>{owner.user?.email || owner.ownerId}</small>
                    </span>
                    <span className="admin-owner-usage">
                      <strong>
                        {owner.usedUnits + owner.reservedUnits}/{owner.allowance}
                      </strong>
                      <small>¥{owner.estimatedCostCny.toFixed(2)}</small>
                    </span>
                    <select
                      value={owner.plan}
                      onChange={(event) =>
                        void runAdminAction(
                          "set_plan",
                          owner.ownerId,
                          event.target.value as "free" | "pro" | "studio",
                        )
                      }
                      aria-label={`${owner.user?.displayName || owner.ownerId}套餐`}
                      disabled={adminBusy}
                    >
                      <option value="free">免费版</option>
                      <option value="pro">专业版</option>
                      <option value="studio">工作室版</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        void runAdminAction("grant_quota", owner.ownerId)
                      }
                      disabled={adminBusy}
                    >
                      赠送
                    </button>
                  </div>
                ))}
                {adminOverview?.owners.length === 0 && (
                  <p>尚未产生可管理的婚礼空间。</p>
                )}
              </div>
            </section>
          </div>

          <div className="admin-operations-grid">
            <section aria-label="运行状态">
              <div className="admin-section-title">
                <ShieldCheck size={17} aria-hidden="true" />
                <div>
                  <strong>运行状态</strong>
                  <span>请求、限流、队列与定时任务</span>
                </div>
              </div>
              <div className="operations-facts">
                <span>
                  <strong>{adminOverview?.operations.metrics.requests || 0}</strong>
                  今日请求
                </span>
                <span>
                  <strong>{adminOverview?.operations.metrics.errors || 0}</strong>
                  服务异常
                </span>
                <span>
                  <strong>
                    {adminOverview?.operations.metrics.rateLimited || 0}
                  </strong>
                  已限流
                </span>
                <span>
                  <strong>
                    {adminOverview?.operations.metrics.queueRetries || 0}
                  </strong>
                  队列重试
                </span>
              </div>
            </section>

            <section aria-label="真实服务诊断">
              <div className="admin-section-title">
                <RefreshCw size={17} aria-hidden="true" />
                <div>
                  <strong>真实 API 联调</strong>
                  <span>只检查连接和模型，不产生生成费用</span>
                </div>
              </div>
              <div className="service-diagnostic-list">
                {serviceDiagnostics.map((service) => (
                  <div key={service.name}>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.message}</small>
                    </span>
                    <b
                      className={
                        service.reachable
                          ? "is-healthy"
                          : service.configured
                            ? "is-error"
                            : ""
                      }
                    >
                      {service.reachable
                        ? `${service.latencyMs || 0}ms`
                        : service.configured
                          ? "异常"
                          : "未配置"}
                    </b>
                  </div>
                ))}
                {serviceDiagnostics.length === 0 && (
                  <p>点击“检查真实服务”后显示 DeepSeek、豆包、邮件和支付状态。</p>
                )}
              </div>
            </section>

            <section aria-label="异常事件">
              <div className="admin-section-title">
                <TriangleAlert size={17} aria-hidden="true" />
                <div>
                  <strong>异常处理中心</strong>
                  <span>
                    {adminOverview?.operations.incidents.length || 0} 条近期事件
                  </span>
                </div>
              </div>
              <div className="incident-list">
                {adminOverview?.operations.incidents.slice(0, 8).map((incident) => (
                  <div
                    className={incident.state === "resolved" ? "is-resolved" : ""}
                    key={incident.id}
                  >
                    <span>
                      <strong>{incident.source}</strong>
                      <small>
                        {incident.message}
                        {(incident.occurrences || 1) > 1
                          ? ` · 重复 ${incident.occurrences} 次`
                          : ""}
                      </small>
                    </span>
                    <b className={`severity-${incident.severity}`}>
                      {incident.state === "resolved"
                        ? "已处理"
                        : incident.status || incident.severity}
                    </b>
                    <button
                      type="button"
                      onClick={() =>
                        void updateIncidentState(
                          incident.id,
                          incident.state === "resolved"
                            ? "reopen_incident"
                            : "resolve_incident",
                        )
                      }
                      disabled={adminBusy}
                      title={
                        incident.state === "resolved" ? "重新打开" : "标记已处理"
                      }
                    >
                      {incident.state === "resolved" ? (
                        <RotateCcw size={13} aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={13} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
                {adminOverview?.operations.incidents.length === 0 && (
                  <p>目前没有记录到服务端、队列或定时任务异常。</p>
                )}
              </div>
            </section>
          </div>
          <section className="admin-readiness" aria-label="上线验收清单">
            <div className="admin-section-title">
              <ClipboardCheck size={17} aria-hidden="true" />
              <div>
                <strong>上线验收清单</strong>
                <span>
                  {adminOverview?.readiness.ready
                    ? "核心运行条件已满足"
                    : "仍有配置项需要完成"}
                </span>
              </div>
              <b>
                {adminOverview?.readiness.checks.filter((item) => item.ready)
                  .length || 0}
                /{adminOverview?.readiness.checks.length || 8}
              </b>
            </div>
            <div className="readiness-checks">
              {adminOverview?.readiness.checks.map((item) => (
                <span className={item.ready ? "ready" : "missing"} key={item.id}>
                  {item.ready ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : (
                    <TriangleAlert size={14} aria-hidden="true" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
            <div className="readiness-actions">
              <button
                type="button"
                onClick={() => void runAdminAction("migrate_workspaces")}
                disabled={adminBusy}
              >
                <Cloud size={14} aria-hidden="true" />
                迁移旧数据
              </button>
              <button
                type="button"
                onClick={() => void runAdminAction("run_recovery_drill")}
                disabled={adminBusy}
              >
                <RotateCcw size={14} aria-hidden="true" />
                恢复演练
              </button>
              {adminOverview?.readiness.lastMigrationReport && (
                <span>
                  最近检查{" "}
                  {new Date(
                    adminOverview.readiness.lastMigrationReport.completedAt,
                  ).toLocaleString("zh-CN")}
                  {" · "}
                  扫描 {adminOverview.readiness.lastMigrationReport.scanned}
                  {" · "}
                  异常 {adminOverview.readiness.lastMigrationReport.corrupted}
                </span>
              )}
            </div>
            <small>
              待执行注销 {adminOverview?.readiness.pendingDeletions || 0} 个 ·
              检查真实 API 不会触发付费生成
            </small>
          </section>
        </section>
      )}

      <section className="business-grid" id="business">
        <article className="panel business-panel" id="guests">
          <div className="section-title">
            <UserPlus size={19} aria-hidden="true" />
            <h2>宾客名单管理</h2>
          </div>
          <p className="module-summary">
            已确认 {confirmedGuestCount} 人到场，仍有 {pendingGuestCount} 位宾客待回复。
          </p>
          <div className="guest-rsvp-overview">
            <span>
              <Link2 size={15} aria-hidden="true" />
              已建邀请 {invitedGuestCount} 份 · 已送达 {deliveredInvitationCount} 份 · 已收回执 {respondedGuestCount} 份
            </span>
            <button
              type="button"
              onClick={() => void refreshGuestRsvps()}
              disabled={invitationBusyGuestId === 0}
            >
              {invitationBusyGuestId === 0 ? (
                <LoaderCircle className="media-spin" size={14} aria-hidden="true" />
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
              刷新回执
            </button>
          </div>
          <div className="invitation-batch-toolbar" aria-label="邀请批量发送与催办">
            <strong>已选 {selectedGuestIds.length} 人</strong>
            <button type="button" onClick={selectPendingGuests}>
              <CheckSquare size={14} aria-hidden="true" />
              选择待回复
            </button>
            <button
              type="button"
              onClick={() => setSelectedGuestIds([])}
              disabled={selectedGuestIds.length === 0}
            >
              清除选择
            </button>
            <button
              type="button"
              className="batch-primary"
              onClick={() => void batchSendGuestInvitations(false)}
              disabled={batchInvitationBusy || selectedGuestIds.length === 0}
            >
              {batchInvitationBusy ? (
                <LoaderCircle className="media-spin" size={14} aria-hidden="true" />
              ) : (
                <Send size={14} aria-hidden="true" />
              )}
              批量发送
            </button>
            <button
              type="button"
              className="batch-reminder"
              onClick={() => void batchSendGuestInvitations(true)}
              disabled={batchInvitationBusy || selectedGuestIds.length === 0}
            >
              <Bell size={14} aria-hidden="true" />
              批量催办
            </button>
          </div>
          <div className="business-list">
            {guestList.map((guest) => (
              <div className="business-row guest-row" key={guest.id}>
                <label className="guest-select-field">
                  <input
                    type="checkbox"
                    checked={selectedGuestIds.includes(guest.id)}
                    onChange={() => toggleGuestSelection(guest.id)}
                    aria-label={`选择${guest.name}`}
                  />
                  选择
                </label>
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
                <div className="guest-invitation-actions">
                  <input
                    className="guest-contact-input"
                    value={guest.contact || ""}
                    onChange={(event) => updateGuest(guest.id, { contact: event.target.value })}
                    placeholder="邮箱、手机号或微信标识"
                    aria-label={`${guest.name}邀请联系方式`}
                  />
                  <select
                    className="guest-channel-select"
                    value={guest.invitationChannel || "链接"}
                    onChange={(event) =>
                      updateGuest(guest.id, {
                        invitationChannel: event.target.value as InvitationChannel,
                      })
                    }
                    aria-label={`${guest.name}邀请发送方式`}
                  >
                    {invitationChannels.map((channel) => (
                      <option key={channel}>{channel}</option>
                    ))}
                  </select>
                  <span
                    className={
                      guest.respondedAt
                        ? "responded"
                        : guest.invitationCode
                          ? "sent"
                          : "not-sent"
                    }
                  >
                    {guest.respondedAt
                      ? `已在线回复 · ${guest.rsvp}`
                      : guest.deliveryStatus && guest.deliveryStatus !== "未发送"
                        ? `${guest.deliveryStatus}，等待宾客回复`
                        : "尚未发送专属邀请"}
                    {(guest.reminderCount || 0) > 0 ? ` · 已催办 ${guest.reminderCount} 次` : ""}
                    {guest.dietary ? ` · ${guest.dietary}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      guest.invitationCode
                        ? void copyGuestInvitation(guest)
                        : void createGuestInvitation(guest)
                    }
                    disabled={invitationBusyGuestId === guest.id}
                  >
                    {invitationBusyGuestId === guest.id ? (
                      <LoaderCircle className="media-spin" size={14} aria-hidden="true" />
                    ) : (
                      <Link2 size={14} aria-hidden="true" />
                    )}
                    {guest.invitationCode ? "复制邀请" : "生成邀请"}
                  </button>
                  {guest.invitationCode && (
                    <a
                      href={`/rsvp/${guest.invitationCode}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开回执页
                    </a>
                  )}
                </div>
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
            已签约 {signedVendorCount}/{vendorList.length} 家，报价 {currency(vendorQuoteTotal)}，
            已支付 {currency(vendorPaidTotal)}。
          </p>
          {overdueVendorPayments > 0 && (
            <div className="vendor-payment-warning" role="status">
              <TriangleAlert size={15} aria-hidden="true" />
              有 {overdueVendorPayments} 个付款节点已到期，请尽快确认。
            </div>
          )}
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
                  已付款
                  <input
                    type="number"
                    min={0}
                    value={vendor.deposit}
                    readOnly
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
                <button
                  type="button"
                  className="subtle-action vendor-detail-toggle"
                  onClick={() =>
                    setOpenVendorId((current) =>
                      current === vendor.id ? null : vendor.id,
                    )
                  }
                  aria-expanded={openVendorId === vendor.id}
                >
                  <ReceiptText size={15} aria-hidden="true" />
                  合同与付款
                </button>
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
                {openVendorId === vendor.id && (
                  <div className="vendor-contract-payment">
                    <section className="vendor-contract-tools">
                      <div>
                        <FileText size={18} aria-hidden="true" />
                        <span>
                          <strong>合同文件</strong>
                          <small>
                            {vendor.contractName || "支持 PDF、JPG、PNG，最大 20MB"}
                          </small>
                        </span>
                      </div>
                      <select
                        value={vendor.contractStatus}
                        onChange={(event) =>
                          updateVendor(vendor.id, {
                            contractStatus: event.target.value as VendorContractStatus,
                          })
                        }
                        aria-label={`${vendor.name}合同状态`}
                      >
                        {vendorContractStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <label className="vendor-contract-upload">
                        <Upload size={14} aria-hidden="true" />
                        {contractBusyVendorId === vendor.id ? "上传中" : "上传合同"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          disabled={contractBusyVendorId === vendor.id}
                          onChange={(event) => {
                            void uploadVendorContract(
                              vendor.id,
                              event.target.files?.[0] || null,
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {vendor.contractUrl && (
                        <a href={vendor.contractUrl} target="_blank" rel="noreferrer">
                          查看合同
                        </a>
                      )}
                    </section>

                    <section className="vendor-payment-tools">
                      <div className="vendor-payment-heading">
                        <span>
                          <ReceiptText size={17} aria-hidden="true" />
                          <strong>付款计划</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => addVendorPayment(vendor.id)}
                        >
                          <Plus size={14} aria-hidden="true" />
                          新增节点
                        </button>
                      </div>
                      <div className="vendor-payment-list">
                        {vendor.payments.map((payment) => (
                          <div className="vendor-payment-row" key={payment.id}>
                            <input
                              value={payment.label}
                              onChange={(event) =>
                                updateVendorPayment(vendor.id, payment.id, {
                                  label: event.target.value,
                                })
                              }
                              aria-label="付款节点名称"
                            />
                            <label>
                              金额
                              <input
                                type="number"
                                min={0}
                                value={payment.amount}
                                onChange={(event) =>
                                  updateVendorPayment(vendor.id, payment.id, {
                                    amount: parseMoney(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label>
                              到期日
                              <input
                                type="date"
                                value={payment.dueDate}
                                onChange={(event) =>
                                  updateVendorPayment(vendor.id, payment.id, {
                                    dueDate: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <select
                              value={payment.status}
                              onChange={(event) =>
                                updateVendorPayment(vendor.id, payment.id, {
                                  status: event.target.value as VendorPaymentStatus,
                                })
                              }
                              aria-label={`${payment.label}状态`}
                            >
                              {vendorPaymentStatuses.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="icon-danger"
                              onClick={() =>
                                deleteVendorPayment(vendor.id, payment.id)
                              }
                              aria-label={`删除${payment.label}`}
                              title="删除付款节点"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        {vendor.payments.length === 0 && (
                          <p>暂未设置付款节点，可按定金、中期款和尾款拆分。</p>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="ghost-action" onClick={addVendor}>
            <Plus size={17} aria-hidden="true" />
            新增供应商
          </button>
        </article>

        <article className="panel business-panel seating-panel" id="seating">
          <div className="seating-heading">
            <div>
              <div className="section-title">
                <LayoutDashboard size={19} aria-hidden="true" />
                <h2>智能排桌</h2>
              </div>
              <p className="module-summary">
                共 {seatingPeople} 人 · {seatingTables.length} 桌 · {unseatedGuestCount} 位宾客待排桌
                {overCapacityTables > 0 ? ` · ${overCapacityTables} 桌超员` : ""}
              </p>
            </div>
            <div className="seating-toolbar">
              <button type="button" className="seating-primary" onClick={autoArrangeSeating}>
                <Sparkles size={15} aria-hidden="true" />
                一键智能排桌
              </button>
              <button type="button" onClick={addSeatingTable}>
                <Plus size={15} aria-hidden="true" />
                新增桌位
              </button>
              <button type="button" onClick={exportSeatingPlan}>
                <Download size={15} aria-hidden="true" />
                导出座位表
              </button>
            </div>
          </div>
          {(unseatedGuestCount > 0 || overCapacityTables > 0) && (
            <div className="seating-warning" role="status">
              <TriangleAlert size={16} aria-hidden="true" />
              {overCapacityTables > 0
                ? `有 ${overCapacityTables} 桌超过容量，请调整座位或增加桌位。`
                : `还有 ${unseatedGuestCount} 位宾客未安排到有效桌位。`}
            </div>
          )}
          <div className="seating-layout">
            <div className="seating-table-list" aria-label="桌位配置">
              {seatingSummaries.map((table) => (
                <section
                  className={`seating-table-row${table.remaining < 0 ? " is-over" : ""}`}
                  key={table.id}
                >
                  <div className="seating-table-fields">
                    <input
                      value={table.name}
                      onChange={(event) =>
                        updateSeatingTable(table.id, { name: event.target.value })
                      }
                      aria-label="桌位名称"
                    />
                    <input
                      value={table.zone}
                      onChange={(event) =>
                        updateSeatingTable(table.id, { zone: event.target.value })
                      }
                      aria-label={`${table.name}区域`}
                    />
                    <label>
                      容量
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={table.capacity}
                        onChange={(event) =>
                          updateSeatingTable(table.id, {
                            capacity: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-danger"
                      onClick={() => deleteSeatingTable(table.id)}
                      aria-label={`删除${table.name}`}
                      title="删除桌位"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="seating-occupancy">
                    <span>
                      已排 {table.occupied}/{table.capacity} 人
                    </span>
                    <div aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.min(100, Math.round((table.occupied / table.capacity) * 100))}%`,
                        }}
                      />
                    </div>
                    <strong>{table.remaining >= 0 ? `余 ${table.remaining}` : `超 ${Math.abs(table.remaining)}`}</strong>
                  </div>
                  <div className="seating-guest-chips">
                    {table.guests.map((guest) => (
                      <span key={guest.id}>{guest.name} · {guest.count}人</span>
                    ))}
                    {table.guests.length === 0 && <small>暂未安排宾客</small>}
                  </div>
                </section>
              ))}
            </div>
            <aside className="seating-assignment-list">
              <div className="seating-assignment-title">
                <UsersRound size={17} aria-hidden="true" />
                <strong>宾客换桌</strong>
              </div>
              {guestList
                .filter((guest) => guest.rsvp !== "不参加")
                .map((guest) => (
                  <label key={guest.id}>
                    <span>
                      <strong>{guest.name}</strong>
                      <small>{guest.relation} · {guest.count} 人</small>
                    </span>
                    <select
                      value={seatingTables.some((table) => table.name === guest.table) ? guest.table : "待排桌"}
                      onChange={(event) => assignGuestToTable(guest.id, event.target.value)}
                    >
                      <option>待排桌</option>
                      {seatingTables.map((table) => (
                        <option key={table.id} value={table.name}>{table.name}</option>
                      ))}
                    </select>
                  </label>
                ))}
            </aside>
          </div>
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

        <article className="panel business-panel command-center-panel" id="wedding-command">
          <div className="command-center-heading">
            <div>
              <div className="section-title">
                <MonitorPlay size={19} aria-hidden="true" />
                <h2>婚礼当天指挥中心</h2>
              </div>
              <p className="module-summary">
                流程完成 {confirmedTimelineCount}/{weddingTimeline.length} · 延迟 {delayedEventCount} 项 ·
                物料确认 {checkedSupplyCount}/{commandCenter.supplies.length}
              </p>
            </div>
            <div className="command-center-actions">
              <time>{commandClock || "--:--:--"}</time>
              <button
                type="button"
                className={commandCenter.liveMode ? "live-active" : ""}
                onClick={() =>
                  setCommandCenter((current) => ({ ...current, liveMode: !current.liveMode }))
                }
              >
                <Play size={14} aria-hidden="true" />
                {commandCenter.liveMode ? "指挥模式运行中" : "开启指挥模式"}
              </button>
              <button type="button" onClick={exportWeddingCommandPlan}>
                <Download size={14} aria-hidden="true" />
                导出执行表
              </button>
            </div>
          </div>

          <section className="command-now" aria-live="polite">
            <span>{commandCenter.liveMode ? "现场进行中" : "下一流程"}</span>
            {commandActiveEvent ? (
              <div>
                <strong>{commandActiveEvent.time} · {commandActiveEvent.title}</strong>
                <small>{commandActiveEvent.owner} · {commandActiveEvent.location}</small>
              </div>
            ) : (
              <div><strong>所有流程已完成</strong></div>
            )}
          </section>

          <div className="command-event-list">
            {weddingTimeline.map((event) => (
              <div className={`command-event-row status-${event.status}`} key={event.id}>
                <time>{event.time}</time>
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.owner} · {event.location}</small>
                </div>
                <input
                  value={event.phone || ""}
                  onChange={(inputEvent) =>
                    updateWeddingEvent(event.id, { phone: inputEvent.target.value })
                  }
                  placeholder="负责人电话"
                  aria-label={`${event.title}负责人电话`}
                />
                <span className="command-event-state">
                  {event.status}{event.delayMinutes ? ` · 延迟${event.delayMinutes}分钟` : ""}
                </span>
                <div className="command-event-actions">
                  <button
                    type="button"
                    onClick={() => setWeddingEventCommandStatus(event.id, "进行中")}
                    disabled={event.status === "进行中"}
                  >
                    开始
                  </button>
                  <button
                    type="button"
                    className="command-done"
                    onClick={() => setWeddingEventCommandStatus(event.id, "已完成")}
                    disabled={event.status === "已完成"}
                  >
                    完成
                  </button>
                  <button type="button" onClick={() => delayWeddingEvent(event.id)}>
                    延迟10分钟
                  </button>
                  {event.phone && (
                    <a href={`tel:${event.phone}`} aria-label={`拨打${event.owner}电话`}>
                      拨打
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="command-support-grid">
            <section className="command-supplies">
              <div className="command-subheading">
                <ClipboardCheck size={17} aria-hidden="true" />
                <strong>现场物料核对</strong>
                <button type="button" onClick={addCommandSupply} aria-label="新增现场物料" title="新增物料">
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
              {commandCenter.supplies.map((item) => (
                <div className="command-supply-row" key={item.id}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) => updateCommandSupply(item.id, { checked: event.target.checked })}
                    aria-label={`确认${item.title}`}
                  />
                  <input
                    value={item.title}
                    onChange={(event) => updateCommandSupply(item.id, { title: event.target.value })}
                    aria-label="物料名称"
                  />
                  <input
                    value={item.owner}
                    onChange={(event) => updateCommandSupply(item.id, { owner: event.target.value })}
                    aria-label={`${item.title}负责人`}
                  />
                  <button type="button" className="icon-danger" onClick={() => deleteCommandSupply(item.id)} aria-label={`删除${item.title}`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </section>

            <section className="command-contacts">
              <div className="command-subheading">
                <CircleUserRound size={17} aria-hidden="true" />
                <strong>紧急联系人</strong>
                <button type="button" onClick={addEmergencyContact} aria-label="新增紧急联系人" title="新增联系人">
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
              {commandCenter.contacts.map((contact) => (
                <div className="command-contact-row" key={contact.id}>
                  <input value={contact.role} onChange={(event) => updateEmergencyContact(contact.id, { role: event.target.value })} aria-label="联系人角色" />
                  <input value={contact.name} onChange={(event) => updateEmergencyContact(contact.id, { name: event.target.value })} aria-label="联系人姓名" />
                  <input value={contact.phone} onChange={(event) => updateEmergencyContact(contact.id, { phone: event.target.value })} placeholder="手机号" aria-label={`${contact.name}电话`} />
                  {contact.phone && <a href={`tel:${contact.phone}`}>拨打</a>}
                  <button type="button" className="icon-danger" onClick={() => deleteEmergencyContact(contact.id)} aria-label={`删除${contact.name}`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </section>
          </div>

          <label className="command-incident-note">
            <span>现场异常与交接记录</span>
            <textarea
              value={commandCenter.incidentNote}
              onChange={(event) =>
                setCommandCenter((current) => ({ ...current, incidentNote: event.target.value }))
              }
              placeholder="记录临时变更、供应商异常、宾客需求和后续交接事项"
            />
          </label>
        </article>

        <article className="panel business-panel recycle-panel" id="recycle-bin">
          <div className="recycle-heading">
            <div className="section-title">
              <Trash2 size={19} aria-hidden="true" />
              <h2>回收站与撤销</h2>
            </div>
            <div>
              {lastDeletedId && recycleBin.some((item) => item.id === lastDeletedId) && (
                <button
                  type="button"
                  className="recycle-undo"
                  onClick={() => restoreRecycleItem(lastDeletedId)}
                >
                  <Undo2 size={15} aria-hidden="true" />
                  撤销上次删除
                </button>
              )}
              <button
                type="button"
                className="recycle-empty"
                onClick={() => void emptyRecycleBin()}
                disabled={recycleBin.length === 0}
              >
                清空回收站
              </button>
            </div>
          </div>
          <p className="module-summary">
            删除内容保留 30 天；恢复会回到原模块，永久删除会同步清理云端文件。
          </p>
          <div className="recycle-list">
            {recycleBin.map((item) => (
              <div className="recycle-row" key={item.id}>
                <span className={`recycle-type type-${item.entityType}`}>
                  {item.entityType === "task"
                    ? "任务"
                    : item.entityType === "budget"
                      ? "预算"
                      : item.entityType === "guest"
                        ? "宾客"
                        : item.entityType === "vendor"
                          ? "供应商"
                          : item.entityType === "timeline"
                            ? "流程"
                            : item.entityType === "copywriting"
                              ? "文案"
                              : "素材"}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>
                    删除于 {new Date(item.deletedAt).toLocaleString("zh-CN")} ·
                    {Math.max(
                      1,
                      Math.ceil(
                        (new Date(item.expiresAt).getTime() - Date.now()) /
                          (24 * 60 * 60 * 1000),
                      ),
                    )}{" "}
                    天后清理
                  </small>
                </div>
                <button type="button" onClick={() => restoreRecycleItem(item.id)}>
                  <Undo2 size={14} aria-hidden="true" />
                  恢复
                </button>
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() => void permanentlyDeleteRecycleItem(item.id)}
                  aria-label={`永久删除${item.label}`}
                  title="永久删除"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
            {recycleBin.length === 0 && (
              <div className="recycle-empty-state">
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>回收站为空，删除内容会暂存在这里。</span>
              </div>
            )}
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

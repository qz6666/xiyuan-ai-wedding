export const weddingPages = {
  service: { title: "喜缘小助手", description: "告诉喜缘现在想解决的事，继续进入对应的备婚工具。" },
  profile: { title: "新人资料", description: "婚期、城市、风格与预算，是你们所有筹备安排的共同起点。" },
  plan: { title: "备婚计划", description: "把筹备拆成每天能完成的小事，逐项确认进度。" },
  details: { title: "阶段计划", description: "按婚期查看当前阶段，安排接下来需要确认的事项。" },
  budget: { title: "婚礼预算", description: "查看预算上限、费用明细与付款进度。" },
  copywriting: { title: "AI 文案", description: "在这里整理请柬、誓词、致辞和你们的婚礼故事文案。" },
  "media-studio": { title: "AI 影像", description: "场景效果图、证件照、视频分镜和 3D 现场，在同一个工作台创作。" },
  "wedding-photo": { title: "婚礼照片", description: "上传、筛选和整理你们的婚礼照片，所有影像素材集中在这里。" },
  "wedding-story": { title: "婚礼故事", description: "填写真实经历，整理属于你们的五幕故事。" },
  business: { title: "业务模块", description: "选择需要处理的婚礼事务，进入对应工具。" },
  collaboration: { title: "协助清单", description: "和家人、伴郎伴娘及婚礼团队一起确认筹备事项。" },
  guests: { title: "宾客名单", description: "整理亲友名单、发送邀请并查看出席回执。" },
  vendors: { title: "供应商管理", description: "集中管理团队信息、沟通记录、合同与付款节点。" },
  seating: { title: "智能排桌", description: "配置桌位、安排宾客并导出座位表。" },
  timeline: { title: "当天流程", description: "确认婚礼当天的时间、负责人、地点和执行备注。" },
  "wedding-command": { title: "当天指挥", description: "跟进现场流程，核对物料并记录需要交接的事项。" },
  "recycle-bin": { title: "回收站", description: "查看和恢复最近删除的筹备内容。" },
  account: { title: "喜缘账号", description: "登录账号，继续管理你们的婚礼空间与协作设置。" },
  admin: { title: "运营后台", description: "查看平台运行情况与需要处理的运营事项。" },
} as const;

export type WeddingView = keyof typeof weddingPages;

export const primaryWeddingViews: WeddingView[] = [
  "profile", "plan", "details", "copywriting", "media-studio", "wedding-photo", "wedding-story", "business", "collaboration",
];

export const businessWeddingViews: WeddingView[] = [
  "guests", "vendors", "seating", "timeline", "wedding-command", "recycle-bin",
];

export function isWeddingView(value: string): value is WeddingView {
  return Object.prototype.hasOwnProperty.call(weddingPages, value);
}

export function weddingPageHref(view: string) {
  if (view === "capabilities") return "/#capabilities";
  if (view === "wedding-story") return "/wedding-story/";
  if (view === "portrait") return "/workspace/media-studio?kind=portrait";
  if (view === "photo-library") return "/workspace/wedding-photo";
  return isWeddingView(view) ? `/workspace/${view}` : "/";
}

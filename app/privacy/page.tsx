import Link from "next/link";

export default function PrivacyPage() {
  const operator = process.env.LEGAL_OPERATOR_NAME?.trim() || "待配置运营主体";
  const email = process.env.LEGAL_CONTACT_EMAIL?.trim() || "待配置联系邮箱";
  const address = process.env.LEGAL_ADDRESS?.trim() || "待配置联系地址";
  return (
    <main className="legal-page">
      <header>
        <Link href="/">喜缘</Link>
        <span>隐私政策 · 2026-07-24 版</span>
      </header>
      <article>
        <h1>喜缘隐私政策</h1>
        <p>
          本政策说明喜缘如何收集、使用、保存和删除你的个人信息。系统遵循必要、明确和可撤销原则。
        </p>
        <h2>1. 收集的信息</h2>
        <p>
          包括账号邮箱与称呼、婚礼资料、任务与预算、宾客和供应商信息、协作记录、生成提示词、素材文件、
          登录设备类型、脱敏网络信息、用量和异常日志。
        </p>
        <h2>2. 使用目的</h2>
        <p>
          信息用于账号验证、跨设备同步、婚礼流程管理、AI 任务执行、额度控制、提醒通知、支付状态、安全防护和故障处理。
        </p>
        <h2>3. 第三方处理</h2>
        <p>
          仅在你使用对应功能时，将必要内容发送给已配置的 DeepSeek、火山方舟、Resend、Stripe
          或其他通知通道。浏览器中填写的 API Key 不写入云端工作区。
        </p>
        <h2>4. 保存与安全</h2>
        <p>
          结构化数据使用事务数据库，限流与兼容缓存使用 KV，图片和视频使用对象存储。工作区带完整性校验，
          历史版本最多保留 30 个、最长 180 天。登录令牌不会返回到页面。
        </p>
        <h2>5. 你的权利</h2>
        <p>
          你可以下载资料、导出操作记录、退出其他设备、更新隐私授权、申请注销或在冷静期内取消注销。
        </p>
        <h2>6. 删除机制</h2>
        <p>
          注销冷静期结束后，系统会清理账号和关联业务数据。依法需要保留的支付或安全记录将按法定期限单独处理。
        </p>
        <h2>7. 联系与更新</h2>
        <p>
          运营主体：{operator}；联系邮箱：{email}；联系地址：{address}。政策版本变化时会重新记录授权。
        </p>
      </article>
    </main>
  );
}

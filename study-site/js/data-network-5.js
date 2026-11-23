/* ============================================================================
 * data-network-5.js —— 网络知识 1.13 - 1.15
 * BGP → TCP/UDP → DNS/HTTP/HTTPS，把互联网“怎么连起来、怎么访问网页”补齐
 * ==========================================================================*/

(function () {
  var sec = (window.STUDY_SECTIONS || []).filter(function (s) { return s.id === 'network'; })[0];
  if (!sec) return;

  sec.chapters.push(
    /* ------------------------------------------------------------------ */
    {
      id: 'net-13',
      title: 'BGP：互联网的“外交协议”',
      lead: '一个 AS 像一个国家，BGP 是国与国之间的通邮协议，重点不是最短，而是“按政策走”。',
      minutes: 12,
      tags: ['BGP', '互联网'],
      blocks: [
        { t: 'h3', text: 'AS 与 BGP' },
        {
          t: 'p',
          html: '互联网由成千上万个自治系统（AS）组成，每个 AS 有一个 AS 号（ASN）。AS 内部用自己的 IGP（OSPF、IS-IS）找路，AS 之间靠 BGP 交换“我这里能到哪些网段”的信息。BGP 是路径矢量协议，路由里带着经过的 AS 列表，天然可以防环。'
        },
        { t: 'h3', text: 'EBGP 与 IBGP' },
        {
          t: 'table',
          head: ['类型', '邻居关系', '默认 TTL', '注意'],
          rows: [
            ['EBGP', '不同 AS 之间', '1', '一般直连，需改多跳时加 ebgp-max-hop'],
            ['IBGP', '同一 AS 内', '255', '默认不转发给其他 IBGP 邻居，需要全互联或反射器']
          ]
        },
        { t: 'h3', text: 'BGP 报文与状态机' },
        {
          t: 'p',
          html: '四种报文：<strong>Open</strong> 建邻居、协商参数；<strong>Update</strong> 通告/撤销路由；<strong>Keepalive</strong> 保活；<strong>Notification</strong> 报错并关闭。状态机：Idle → Connect → Active → OpenSent → OpenConfirm → Established，只有 Established 才真正交换路由。'
        },
        { t: 'h3', text: '路径属性' },
        {
          t: 'table',
          head: ['属性', '作用', '怎么影响选路'],
          rows: [
            ['AS_PATH', '记录经过的 AS', '越短通常越优先，也是防环依据'],
            ['Next_Hop', '下一跳', '必须可达，否则路由无效'],
            ['Local Preference', '本地优先级', '数值越大越优先，只在本 AS 内传'],
            ['MED', '多出口区分', '数值越小越优先，用来影响邻居选入口'],
            ['Community', '路由标记', '配合策略做批量过滤/打标签'],
            ['Origin', '路由来源', 'IGP &lt; EGP &lt; Incomplete']
          ]
        },
        { t: 'h3', text: 'BGP 选路规则' },
        {
          t: 'p',
          html: '常见顺序：最高 Weight（厂商私有）→ 最高 Local Preference → 本地始发 → 最短 AS_PATH → 最低 Origin → 最低 MED → EBGP 优于 IBGP → 到下一跳 IGP 开销最小 → 最小 Router ID。实际排障时先看前几条，后面很少用到。'
        },
        { t: 'h3', text: '防环机制' },
        {
          t: 'p',
          html: 'AS 之间靠 AS_PATH：收到含自己 AS 号的路由直接丢弃。AS 内部靠 IBGP 水平分割：从 IBGP 学到的路由不再发给其他 IBGP 邻居，避免环路。代价是 IBGP 需要全互联，规模大了用路由反射器或联盟解决。'
        },
        { t: 'h3', text: '路由反射器与联盟' },
        {
          t: 'p',
          html: '路由反射器（RR）把一台路由器设为中心，客户端从 RR 学路由，RR 再反射给其他客户端；用 Cluster ID 防环。联盟（Confederation）把一个大 AS 切成多个子 AS，外部看起来仍是一个 AS。两者都是为了减少 IBGP 全互联。'
        },
        { t: 'h3', text: '配置与排障' },
        {
          t: 'code',
          title: '华为设备 BGP 基础配置',
          lang: 'bash',
          code: 'bgp 65001\n router-id 1.1.1.1\n peer 202.1.1.2 as-number 65002\n network 10.1.1.0 255.255.255.0\n quit\n\ndisplay bgp peer\ndisplay bgp routing-table\ndisplay bgp routing-table 10.1.1.0'
        },
        {
          t: 'p',
          html: '邻居起不来：查 AS 号、认证、TTL（EBGP 多跳）、路由可达；有邻居没路由：查 network/import-route、策略、下一跳；选了次优路径：按属性逐条查。BGP 配置错误可能泄漏路由，影响很大，变更前先在实验环境验证。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '各国邮政互相转运包裹，不只看距离，还要看两国协议、费用和安全。BGP 就是那张“哪些国家可以中转、优先走哪条”的外交协议。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'BGP 不按带宽算最短路，而是按属性做政策选择；IBGP 不是随便两台设备就能同步，需要全互联或反射器；BGP 收敛慢，不适合频繁抖动的小网络。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · TCP/IP 协议', url: 'https://www.runoob.com/tcpip/tcpip-protocols.html' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'net-14',
      title: 'TCP、UDP 与端口：打电话还是发短信',
      lead: 'TCP 像打电话，先接通、每句话都要确认；UDP 像发短信，发出去就不管了。',
      minutes: 11,
      tags: ['TCP', 'UDP'],
      blocks: [
        { t: 'h3', text: '传输层的作用' },
        {
          t: 'p',
          html: 'IP 负责把包送到主机，传输层负责把数据交给正确的应用进程。它用端口号区分不同服务，用 TCP/UDP 提供不同的可靠性。一台服务器可以同时跑 Web、SSH、数据库，靠的就是端口复用。'
        },
        { t: 'h3', text: 'TCP 首部关键字段' },
        {
          t: 'p',
          html: '源/目的端口、序号（seq）、确认号（ack）、标志位（SYN/ACK/FIN/RST/PSH/URG）、窗口大小、校验和、选项（MSS、窗口缩放、SACK）。序号和确认号是可靠传输的基础，窗口决定能连续发多少数据。'
        },
        { t: 'h3', text: '三次握手' },
        {
          t: 'p',
          html: '客户端发 <code>SYN</code>（带初始序号），服务端回 <code>SYN+ACK</code>，客户端再回 <code>ACK</code>。目的是确认双方收发能力、同步初始序号。SYN 队列被打满会拒绝新连接，这就是 SYN Flood 攻击的原理。'
        },
        { t: 'h3', text: '四次挥手与 TIME_WAIT' },
        {
          t: 'p',
          html: '主动关闭方发 FIN，对方 ACK；对方数据发完再发 FIN，主动方 ACK。主动关闭方进入 TIME_WAIT，等待 2MSL，确保最后一个 ACK 能到达、旧连接的数据不会串到新连接。TIME_WAIT 过多会占用端口，但不要盲目调小。'
        },
        { t: 'h3', text: '可靠传输机制' },
        {
          t: 'p',
          html: '序号 + 确认实现按序和去重；超时重传和快速重传处理丢包；滑动窗口做流量控制，避免发送方压垮接收方；拥塞控制根据网络状况调整发送速率。'
        },
        { t: 'h3', text: '拥塞控制' },
        {
          t: 'p',
          html: '慢启动（窗口指数增长）→ 拥塞避免（线性增长）→ 快速重传/快速恢复。遇到丢包就减小窗口。现代还有 BBR 等基于带宽时延的算法。拥塞控制是 TCP 对整条网络“友好”的关键。'
        },
        { t: 'h3', text: 'UDP 与常见端口' },
        {
          t: 'p',
          html: 'UDP 首部只有 8 字节，不保证到达和顺序，但快、开销小，适合视频、语音、DNS、游戏。常用端口：22 SSH、80 HTTP、443 HTTPS、53 DNS、3306 MySQL、6379 Redis、3389 RDP、179 BGP。'
        },
        { t: 'h3', text: '抓包与排障' },
        {
          t: 'code',
          title: '常用命令',
          lang: 'bash',
          code: 'ss -lntp\nss -s\ncurl -v https://example.com\ntcpdump -i eth0 port 443 -nn\n# Windows\nnetstat -ano\n# 抓包文件用 Wireshark 看三次握手、重传、RST'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: 'TCP 像打电话：先拨通、确认对方在听、说完再挂；UDP 像寄明信片：写完投进邮筒，不保证一定到，但便宜又快。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '能 ping 通不代表端口开着；TCP 不是绝对安全；UDP 也能做可靠传输（QUIC）；TIME_WAIT 不是“连接没关干净”，是正常状态。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · TCP/IP 教程', url: 'https://www.runoob.com/tcpip/tcpip-tutorial.html' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'net-15',
      title: 'DNS、HTTP 与 HTTPS：打开一个网页发生了什么',
      lead: '打开一个网页，背后至少发生了六件事：找地址、建连接、加密、发请求、收响应、渲染。',
      minutes: 11,
      tags: ['DNS', 'HTTP', 'HTTPS'],
      blocks: [
        { t: 'h3', text: 'DNS 解析流程' },
        {
          t: 'p',
          html: '浏览器先查缓存，再问操作系统、路由器、运营商 DNS；本地 DNS 递归地问根服务器、顶级域服务器、权威服务器，最终拿到 IP。结果按 TTL 缓存，TTL 内不会重新查。'
        },
        { t: 'h3', text: 'DNS 记录类型' },
        {
          t: 'table',
          head: ['记录', '作用'],
          rows: [
            ['A', '域名 → IPv4 地址'],
            ['AAAA', '域名 → IPv6 地址'],
            ['CNAME', '域名别名，指向另一个域名'],
            ['MX', '邮件服务器'],
            ['TXT', '验证、SPF 等信息'],
            ['NS', '该域由哪些 DNS 服务器负责']
          ]
        },
        { t: 'h3', text: 'HTTP 请求与响应' },
        {
          t: 'p',
          html: 'HTTP 是“请求—响应”协议：请求行（方法 + 路径 + 版本）、请求头、请求体；响应行（版本 + 状态码）、响应头、响应体。常用方法 GET/POST/PUT/DELETE；常用头 Host、User-Agent、Content-Type、Cookie、Cache-Control。'
        },
        { t: 'h3', text: '状态码' },
        {
          t: 'table',
          head: ['状态码', '含义', '常见原因'],
          rows: [
            ['200', '成功', '正常返回'],
            ['301/302', '重定向', '换域名、强制 HTTPS'],
            ['304', '没修改', '走浏览器缓存'],
            ['401/403', '未认证 / 无权限', '没登录、权限不足'],
            ['404', '找不到', '路径写错、资源被删'],
            ['500/502/503', '服务端错误/网关错误/不可用', '程序异常、后端挂了、过载']
          ]
        },
        { t: 'h3', text: 'HTTPS 与 TLS' },
        {
          t: 'p',
          html: 'HTTPS = HTTP + TLS。TLS 握手协商加密套件、验证证书、生成会话密钥；之后用对称加密传数据。证书由 CA 签发，证明“这个公钥属于这个域名”。TLS 能防偷看和篡改，但不代表网站内容可信。'
        },
        { t: 'h3', text: '打开网页的完整过程' },
        {
          t: 'flow',
          items: [
            { title: '网络准备', text: 'DHCP 拿 IP/网关/DNS，或使用静态配置；同网段先 ARP 找网关。' },
            { title: 'DNS 解析', text: '把域名变成 IP。' },
            { title: 'TCP 握手', text: '和服务器或 CDN 节点建立连接。' },
            { title: 'TLS 握手', text: '验证证书、协商密钥。' },
            { title: 'HTTP 请求/响应', text: '服务器返回 HTML、CSS、JS、图片。' },
            { title: '浏览器渲染', text: '解析、布局、绘制，可能再发起更多请求。' }
          ]
        },
        { t: 'h3', text: 'CDN 与缓存' },
        {
          t: 'p',
          html: 'CDN 把静态资源缓存到离用户近的节点，通过 DNS 调度让用户访问最近节点。缓存由 Cache-Control、Expires、ETag 控制。动态内容可以走回源，静态资源尽量长缓存并带版本号。'
        },
        { t: 'h3', text: '常见问题' },
        {
          t: 'p',
          html: '域名解析慢：查 DNS、TTL、权威服务器；HTTPS 报错：查证书过期、域名不匹配、中间证书缺失；开了 CDN 但内容不更新：查缓存和刷新；301 配错会被浏览器长期记住。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: 'DNS 是查电话簿，TCP 是拨号接通，TLS 是对暗号确认身份，HTTP 是见面说事，浏览器渲染是把对方说的话整理成一份图文报告。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'HTTPS 只保证传输安全和域名匹配，不保证网站不骗人；DNS 有缓存，换 IP 不会立刻全球生效；HTTP/2 的多路复用不改变“一个域名一条连接”的语义。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · HTTP 教程', url: 'https://www.runoob.com/http/http-tutorial.html' },
            { label: 'MDN · HTTP 文档', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP' }
          ]
        }
      ]
    }
  );
})();

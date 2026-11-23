/* ============================================================================
 * data-network-4.js —— 网络知识 1.11 - 1.12
 * 1.11 ACL 与 NAT（8 小节）
 * 1.12 网络安全与排障（7 小节）
 * ==========================================================================*/

(function () {
  var sec = (window.STUDY_SECTIONS || []).filter(function (s) { return s.id === 'network'; })[0];
  if (!sec) return;

  sec.chapters.push(
    /* ------------------------------------------------------------------ */
    {
      id: 'net-11',
      title: 'ACL 与 NAT：放行谁、怎么上网',
      lead: 'ACL 是“谁能过”的规则清单，NAT 是“内网私有地址怎么变成公网地址”的翻译官。',
      minutes: 10,
      tags: ['ACL', 'NAT'],
      blocks: [
        { t: 'h3', text: 'ACL 是什么' },
        {
          t: 'p',
          html: 'ACL（访问控制列表）是一组按顺序排列的规则，用来匹配报文的源/目的 IP、端口、协议等字段，匹配后执行 permit（放行）或 deny（拒绝）。它本身不“生效”，要应用到接口、NAT、路由策略或防火墙策略上才起作用。'
        },
        { t: 'h3', text: '基本 ACL、高级 ACL 与二层 ACL' },
        {
          t: 'table',
          head: ['类型', '编号范围', '能匹配什么', '典型用途'],
          rows: [
            ['基本 ACL', '2000–2999', '源 IP', '简单过滤、NAT 地址池'],
            ['高级 ACL', '3000–3999', '源/目的 IP、协议、端口、时间', '精确控制业务访问'],
            ['二层 ACL', '4000–4999', '源/目的 MAC、VLAN', '二层准入'],
            ['用户 ACL', '6000–6999', '用户/用户组', '配合认证策略']
          ]
        },
        { t: 'h3', text: '匹配规则与通配符' },
        {
          t: 'p',
          html: 'ACL 从上往下逐条匹配，命中第一条就执行，不再往下看；所有规则都没命中时，默认行为取决于调用它的业务（很多场景默认放行，接口 ACL 默认拒绝）。通配符掩码 0 表示必须匹配、1 表示忽略，例如 <code>192.168.1.0 0.0.0.255</code> 匹配整个 /24 网段。'
        },
        {
          t: 'p',
          html: '规则顺序非常重要：先把精确的 deny/permit 放前面，再放宽泛规则。比如先拒绝某个 IP，再允许整个网段，否则宽泛规则会先命中，精确规则永远轮不到。'
        },
        { t: 'h3', text: 'NAT 的作用' },
        {
          t: 'p',
          html: '私有地址不能直接在公网路由，NAT（网络地址转换）在出口把内网源地址换成公网地址，回包再换回来。它解决了 IPv4 地址不足，也隐藏了内网结构；但 NAT 会破坏端到端连通性，某些 P2P、VoIP 协议需要额外处理。'
        },
        { t: 'h3', text: '静态 NAT、动态 NAT 与 NAPT' },
        {
          t: 'table',
          head: ['方式', '映射关系', '特点'],
          rows: [
            ['静态 NAT', '一个私网 IP ↔ 一个公网 IP', '固定，适合对外提供服务的服务器'],
            ['动态 NAT', '从地址池里临时分配公网 IP', '一对一，地址池用完就失败'],
            ['NAPT', '多个私网 IP + 端口 ↔ 一个公网 IP', '最常用，家庭/企业出口都是它'],
            ['Easy IP', '直接用出口接口的公网 IP 做 NAPT', '配置最简单，适合小网络']
          ]
        },
        { t: 'h3', text: 'Easy IP 与 NAT Server' },
        {
          t: 'p',
          html: 'Easy IP 是 NAPT 的简化版：不建地址池，直接把内网地址转换成出接口的公网地址，适合拨号或固定 IP 的小型出口。NAT Server（端口映射）反过来，把公网 IP 的某个端口映射到内网服务器，让外部能访问内部 Web、邮件等服务。'
        },
        { t: 'h3', text: '配置示例' },
        {
          t: 'code',
          title: '华为路由器：ACL + Easy IP + 端口映射',
          lang: 'bash',
          code: 'acl number 2000\n rule 5 permit source 192.168.1.0 0.0.0.255\n quit\ninterface GigabitEthernet0/0/1\n nat outbound 2000\n quit\n\n# 把公网 202.1.1.1:8080 映射到内网 192.168.1.10:80\nacl number 3000\n rule 5 permit tcp destination 202.1.1.1 0 destination-port eq 8080\n quit\ninterface GigabitEthernet0/0/1\n nat server protocol tcp global 202.1.1.1 8080 inside 192.168.1.10 80'
        },
        { t: 'h3', text: '常见排错' },
        {
          t: 'p',
          html: '内网上不了网：查默认路由、NAT 是否命中、ACL 是否放行；外网访问不了映射服务：查 NAT Server、安全策略、服务器防火墙；部分网站能开部分不能：查 MTU/MSS、DNS、ACL 端口。用 <code>display nat session</code> 看会话，用 <code>display acl</code> 看命中计数。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: 'ACL 是小区门禁名单：按顺序查，第一个人说“不让进”就结束。NAT 是前台总机：外面只看到总机号码，总机再把电话转给内部某个分机。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'ACL 写好了不调用等于没写；规则顺序放反会让精确规则失效；NAT 只改地址不改路由，内网仍需默认路由；NAT Server 还要放行安全策略，否则映射了也访问不了。'
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
      id: 'net-12',
      title: '网络安全与排障：先分层，再动手',
      lead: '网络问题不要一上来就重启，先按“物理 → IP → 路由 → 端口 → 应用”一层层缩小范围。',
      minutes: 9,
      tags: ['安全', '排障'],
      blocks: [
        { t: 'h3', text: '防火墙与安全区域' },
        {
          t: 'p',
          html: '防火墙把接口划分到不同安全区域（Trust、Untrust、DMZ 等），默认高优先级区域可以访问低优先级，反向要配安全策略。策略匹配源/目的区域、地址、用户、应用和动作，和 ACL 一样按顺序命中。'
        },
        { t: 'h3', text: 'VPN 基础' },
        {
          t: 'p',
          html: 'VPN 在公网上建一条加密隧道，让异地办公像在同一内网。常见有 IPSec VPN（站点到站点，适合分支互联）和 SSL VPN（客户端拨入，适合远程办公）。VPN 解决的是“加密 + 私网地址互通”，不是“上网加速”。'
        },
        { t: 'h3', text: '常见攻击与防护' },
        {
          t: 'cards',
          items: [
            { title: 'DDoS', text: '大量流量打满带宽或连接数，用高防、限速、流量清洗缓解。' },
            { title: 'ARP 欺骗', text: '伪造网关 MAC，把流量引到自己这里；可用静态 ARP、DAI 防护。' },
            { title: 'DNS 劫持', text: '篡改解析结果，把你带到假网站；用可信 DNS + HTTPS。' },
            { title: '弱口令 / 钓鱼', text: '最常见也最致命；强密码 + MFA + 不点陌生链接。' }
          ]
        },
        { t: 'h3', text: '分层排障方法' },
        {
          t: 'flow',
          items: [
            { title: '物理层', text: '网线、光模块、端口指示灯、Wi-Fi 是否连接。' },
            { title: '数据链路层', text: 'VLAN、Trunk、MAC 表、环路、双工是否匹配。' },
            { title: '网络层', text: 'IP、掩码、网关、路由、NAT、ACL。' },
            { title: '传输层', text: '端口是否监听、防火墙是否放行、TCP 能否握手。' },
            { title: '应用层', text: 'DNS、HTTP 状态码、证书、应用日志。' }
          ]
        },
        { t: 'h3', text: '命令工具箱' },
        {
          t: 'code',
          title: 'Windows / Linux 常用排障命令',
          lang: 'bash',
          code: '# Windows\nipconfig /all\nping 192.168.1.1\ntracert www.example.com\nnslookup www.example.com\nnetstat -ano\n\n# Linux\nip addr\nip route\nping -c 4 192.168.1.1\ntraceroute www.example.com\ndig www.example.com\nss -lntp\ncurl -I https://www.example.com'
        },
        { t: 'h3', text: '真实案例：能上微信不能开网页' },
        {
          t: 'p',
          html: '微信走长连接，网页要 DNS + 80/443。先 <code>nslookup</code> 看解析是否正常，再 <code>curl -I</code> 看 80/443 是否通，最后查防火墙/DNS 策略。常见原因是 DNS 配错、出口 ACL 只放了部分端口、代理配置异常。'
        },
        { t: 'h3', text: '网络工程师的好习惯' },
        {
          t: 'p',
          html: '变更前先备份、先看现状、先写回滚方案；变更窗口避开业务高峰；一次只改一个变量；改完立即验证并记录。排障时先问“什么时候开始、改了什么、影响范围多大”，比盲目敲命令有效得多。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '医生看病不会一上来就开刀：先量体温、再验血、再拍片。网络排障也是从最外层（物理）开始，一层层往里缩小范围。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '能 ping 通不代表网页能开（端口和防火墙）；能上网不代表 DNS 正常；重启能好不代表问题解决，根因还在，下次还会犯。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · TCP/IP 教程', url: 'https://www.runoob.com/tcpip/tcpip-tutorial.html' },
            { label: 'OWASP · Web 应用十大风险', url: 'https://owasp.org/www-project-top-ten/' }
          ]
        }
      ]
    }
  );
})();

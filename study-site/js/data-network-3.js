/* ============================================================================
 * data-network-3.js —— 网络知识 1.9 - 1.10
 * 1.9 STP 生成树（8 小节）
 * 1.10 OSPF 基础（按 Datacom 课程大纲拆成 10 个小节）
 * ==========================================================================*/

(function () {
  var sec = (window.STUDY_SECTIONS || []).filter(function (s) { return s.id === 'network'; })[0];
  if (!sec) return;

  sec.chapters.push(
    /* ------------------------------------------------------------------ */
    {
      id: 'net-09',
      title: 'STP 生成树：为什么网络里不能有环路',
      lead: '环路会让广播包永远转圈，STP 用“堵住一条路”的办法把环变成树。',
      minutes: 10,
      tags: ['STP', '二层'],
      blocks: [
        { t: 'h3', text: '环路与广播风暴' },
        {
          t: 'p',
          html: '交换机遇到广播帧会从所有其他端口转发。如果两台交换机之间有两根线形成环，广播帧就会在环里来回复制，越滚越多，几分钟就能占满带宽和 CPU，这叫<strong>广播风暴</strong>。同时 MAC 地址表会不停抖动：同一个 MAC 一会儿在这个口、一会儿在那个口，转发也跟着乱。'
        },
        { t: 'h3', text: 'STP 基本概念' },
        {
          t: 'p',
          html: 'STP 让交换机互相交换 BPDU（桥协议数据单元），选出一台<strong>根桥</strong>，再为每个网段选出一个<strong>指定端口</strong>，其余冗余端口进入阻塞状态。逻辑上把环形拓扑剪成一棵树，物理线路还在，只是暂时不用。'
        },
        {
          t: 'cards',
          items: [
            { title: '桥 ID（BID）', text: '16 位桥优先级 + 48 位 MAC，优先级默认 32768，必须是 4096 的倍数。' },
            { title: '根桥', text: 'BID 最小的交换机，是整个生成树的参考点。' },
            { title: '根路径开销', text: '本端口到根桥沿途所有出接口 cost 之和。' },
            { title: 'BPDU', text: '交换机之间交换的生成树报文，携带 BID、根路径开销、端口 ID 和计时器。' }
          ]
        },
        { t: 'h3', text: '根桥选举' },
        {
          t: 'p',
          html: '先比桥优先级，越小越优；优先级相同再比 MAC，越小越优。实际项目里通常把核心交换机优先级调低（比如 4096），让它稳定当根桥，避免接入交换机意外抢根。根桥一旦确定，其他交换机都按“到根桥的最短路径”计算端口角色。'
        },
        { t: 'h3', text: '端口角色与选举' },
        {
          t: 'p',
          html: '每台非根交换机选一个<strong>根端口</strong>（到根桥开销最小）；每条网段选一个<strong>指定端口</strong>（负责向该网段转发）；剩下的端口是<strong>阻塞端口</strong>（Alternate/Backup）。比较顺序：根路径开销 → 上游 BID → 上游端口 ID，越小越优。'
        },
        { t: 'h3', text: '端口状态与计时器' },
        {
          t: 'table',
          head: ['状态', '做什么', '默认时间'],
          rows: [
            ['Blocking', '只收 BPDU，不转发、不学习 MAC', 'Max Age 20 秒'],
            ['Listening', '参与选举，仍不转发、不学习', 'Forward Delay 15 秒'],
            ['Learning', '开始学习 MAC，仍不转发业务', 'Forward Delay 15 秒'],
            ['Forwarding', '正常转发业务', '—'],
            ['Disabled', '端口关闭或故障', '—']
          ]
        },
        { t: 'h3', text: '拓扑变化与故障恢复' },
        {
          t: 'p',
          html: '根桥故障或链路中断时，阻塞端口要重新选举并经过 Listening、Learning 才能转发，传统 STP 收敛通常要 30–50 秒。期间可能出现短暂环路或断流，所以现代网络更常用 RSTP/MSTP。'
        },
        { t: 'h3', text: 'RSTP 与 MSTP' },
        {
          t: 'p',
          html: 'RSTP（快速生成树）把端口状态简化为 Discarding、Learning、Forwarding，增加边缘端口和提议/同意机制，收敛可以到秒级。MSTP（多生成树）把多个 VLAN 映射到不同实例，不同实例走不同路径，能实现 VLAN 级负载分担。'
        },
        { t: 'h3', text: 'BPDU 保护与配置' },
        {
          t: 'p',
          html: '接终端的边缘端口要配 <code>stp edged-port enable</code>，并开启 BPDU 保护：一旦收到 BPDU 就关闭端口，防止有人私接交换机抢根。核心设备可配根保护（root protection）、环路保护（loop protection）。'
        },
        {
          t: 'code',
          title: '华为交换机 STP 基础配置',
          lang: 'bash',
          code: 'stp mode rstp\nstp instance 0 root primary\ninterface GigabitEthernet0/0/1\n stp edged-port enable\n stp bpdu-protection\n quit\ndisplay stp brief\ndisplay stp instance 0'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '一条环形跑道，如果所有人都同时往里跑会撞车。STP 规定这个路口只允许一个方向通行，另一条路先封起来，等主路断了再自动打开。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'STP 只防二层环路，不防三层路由环路；STP 收敛慢，现代网络多用 RSTP/MSTP；接入端口接错线形成环，广播风暴几分钟就能打瘫网络。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · 网络协议', url: 'https://www.runoob.com/np/np-tutorial.html' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'net-10',
      title: 'OSPF 基础：开放式最短路径优先',
      lead: 'OSPF 让每台路由器把“我旁边的路”告诉所有人，最后每台都拼出一张完整地图。',
      minutes: 16,
      tags: ['OSPF', '动态路由'],
      blocks: [
        { t: 'h3', text: '动态路由协议的分类' },
        {
          t: 'p',
          html: '按作用范围分：<strong>IGP</strong>（内部网关协议）在一个自治系统内找路，如 RIP、OSPF、IS-IS；<strong>EGP</strong>（外部网关协议）在自治系统之间交换路由，如 BGP。按算法分：距离矢量（RIP，只告诉邻居“我到某网段多远”）、链路状态（OSPF、IS-IS，把直连链路状态泛洪给所有人）、路径矢量（BGP，携带 AS 路径）。'
        },
        {
          t: 'table',
          head: ['协议', '类型', '算法', '特点'],
          rows: [
            ['RIP', 'IGP', '距离矢量', '简单，最大 15 跳，收敛慢'],
            ['OSPF', 'IGP', '链路状态', '无跳数限制，收敛快，企业主流'],
            ['IS-IS', 'IGP', '链路状态', '运营商常用，扩展性好'],
            ['BGP', 'EGP', '路径矢量', '互联网选路，按策略而非最短']
          ]
        },
        { t: 'h3', text: '链路状态通告：LSA' },
        {
          t: 'p',
          html: 'OSPF 每台路由器把自己直连链路的状态写成 LSA：链路上的邻居、开销、直连网段、接口地址、链路类型。LSA 只在同一区域内泛洪，不描述“整张网络”，只描述“我这一圈”。所有路由器收到的 LSA 拼起来，才是一张完整的区域拓扑图。'
        },
        {
          t: 'table',
          head: ['LSA 类型', '谁产生', '描述什么'],
          rows: [
            ['Type 1 Router', '每台路由器', '本路由器的直连链路和邻居'],
            ['Type 2 Network', 'DR', '广播网段的拓扑'],
            ['Type 3 Summary', 'ABR', '其他区域的网段汇总'],
            ['Type 4 ASBR Summary', 'ABR', '到哪里找 ASBR'],
            ['Type 5 External', 'ASBR', '引入的外部路由'],
            ['Type 7 NSSA', 'NSSA 内 ASBR', 'NSSA 区域的外部路由']
          ]
        },
        {
          t: 'p',
          html: '一条 LSA 由 <strong>Type + Link State ID + AdvRouter</strong> 唯一标识。更新时用序列号判断新旧，序列号越大越新；收到自己产生的 LSA 说明出现了环路或异常。'
        },
        { t: 'h3', text: '链路状态数据库：LSDB' },
        {
          t: 'p',
          html: 'LSDB 存储本区域所有路由器产生的 LSA，同一区域内的 LSDB 最终要完全一致。OSPF 用 SPF（最短路径优先）算法以自己为根计算最短路径树，再生成路由表。查看命令：<code>display ospf lsdb</code>。'
        },
        { t: 'h3', text: 'OSPF 基础术语' },
        {
          t: 'table',
          head: ['术语', '含义'],
          rows: [
            ['Area', '区域，用 Area ID 标识；Area 0 是骨干区域，其他区域必须连到 Area 0'],
            ['Router ID', '唯一标识一台 OSPF 路由器，点分十进制，建议手工配置 Loopback 地址'],
            ['Cost', '接口开销，默认按“参考带宽 ÷ 接口带宽”计算，整条路径累加'],
            ['Neighbor / Adjacency', '邻居是收到 Hello 的对方；邻接是数据库同步完成（Full）'],
            ['Hello / Dead', '广播网默认 Hello 10 秒、Dead 40 秒，4 倍关系'],
            ['DR / BDR', '广播网段上的指定路由器/备份指定路由器'],
            ['ABR / ASBR', '区域边界路由器 / 自治系统边界路由器']
          ]
        },
        { t: 'h3', text: 'OSPF 协议报文类型（五大报文）' },
        {
          t: 'table',
          head: ['报文', '作用', '关键点'],
          rows: [
            ['Hello', '发现、维护邻居，选举 DR/BDR', '周期 10 秒，携带 Router ID、区域、优先级'],
            ['DD（DBD）', '交换 LSDB 摘要', '主从协商，序列号递增'],
            ['LSR', '请求缺少的 LSA', '按 Type/Link State ID/AdvRouter 请求'],
            ['LSU', '发送完整 LSA', '真正携带链路状态数据'],
            ['LSAck', '确认收到的 LSA', '保证泛洪可靠']
          ]
        },
        {
          t: 'p',
          html: 'OSPF 直接封装在 IP 里（协议号 89），本身没有确认机制，所以用 LSAck 和序列号保证可靠。组播地址：<code>224.0.0.5</code> 给所有 OSPF 路由器，<code>224.0.0.6</code> 给 DR/BDR。'
        },
        { t: 'h3', text: 'OSPF 三大表项' },
        {
          t: 'table',
          head: ['表', '存什么', '查看命令'],
          rows: [
            ['邻居表', '邻居状态、Router ID、接口', 'display ospf peer'],
            ['LSDB', '本区域所有 LSA', 'display ospf lsdb'],
            ['OSPF 路由表', 'SPF 算出的路由', 'display ospf routing']
          ]
        },
        {
          t: 'p',
          html: '排查顺序：先看邻居表是否 Full，再看 LSDB 是否一致，最后看 OSPF 路由表有没有算出预期路由。邻居卡在 ExStart/Exchange 多半是 MTU 或 Router ID 冲突；卡在 2-Way 可能是 DR 选举正常现象。'
        },
        { t: 'h3', text: 'OSPF 初始化流程' },
        {
          t: 'table',
          head: ['状态', '发生了什么'],
          rows: [
            ['Down', '还没收到对方的 Hello'],
            ['Init', '收到 Hello，但对方还没看到我'],
            ['2-Way', '双方都看到对方；DR/BDR 与 DROther 之间停在这里'],
            ['ExStart', '协商主从，决定 DD 序列号'],
            ['Exchange', '互发 DD 摘要'],
            ['Loading', '根据摘要发 LSR 请求缺失 LSA'],
            ['Full', 'LSDB 同步完成，邻接建立']
          ]
        },
        {
          t: 'p',
          html: '广播网段先选 DR/BDR，再和 DR/BDR 建立 Full；两台非 DR 的路由器之间保持 2-Way，减少邻接数量。Hello 时间、Dead 时间、区域号、认证、MTU 不一致，都会卡在中间状态。'
        },
        { t: 'h3', text: 'DR / BDR' },
        {
          t: 'p',
          html: '广播网段上如果所有路由器两两建立邻接，邻接数量是 n(n−1)/2，LSDB 同步开销很大。OSPF 选一个 DR 和一个 BDR：所有路由器只和 DR/BDR 建立 Full，DR 负责产生 Type 2 LSA。选举先比接口优先级（默认 1，0 表示不参与），再比 Router ID，大者优先。DR/BDR 没有抢占，除非重启或接口 down。'
        },
        { t: 'h3', text: 'OSPF 路由器类型' },
        {
          t: 'p',
          html: '区域内路由器（Internal）：所有接口在同一个区域；区域边界路由器（ABR）：连接多个区域，至少一个接口在 Area 0；自治系统边界路由器（ASBR）：引入外部路由；骨干路由器：所有接口都在 Area 0。ABR 负责产生 Type 3 LSA，ASBR 负责产生 Type 5 LSA。'
        },
        { t: 'h3', text: 'OSPF 配置与验证' },
        {
          t: 'code',
          title: '华为设备 OSPF 基础配置',
          lang: 'bash',
          code: 'ospf 1 router-id 1.1.1.1\n area 0\n  network 10.1.1.0 0.0.0.255\n  network 192.168.1.0 0.0.0.255\n quit\ninterface GigabitEthernet0/0/0\n ospf cost 10\n quit\n\ndisplay ospf peer brief\ndisplay ospf lsdb\ndisplay ospf routing\ndisplay ospf interface'
        },
        {
          t: 'p',
          html: '常见故障：非骨干区域没有连 Area 0；Hello/Dead 不一致；区域号不一致；认证不一致；Router ID 冲突；MTU 不一致；接口被 <code>silent-interface</code> 抑制。排障时先看邻居状态，再看 LSDB，最后看路由表。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '每台路由器像一个路口，把自己看到的红绿灯和路况发到群里；所有人把信息拼起来，各自算一条最快路线。DR 是这个路口的组长，大家只跟组长汇报，减少重复沟通。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'OSPF 是 IGP，不负责互联网级选路；非骨干区域必须连 Area 0；有邻居不等于有路由，LSDB 同步完才算 Full；DR 选举不抢占，调优先级后要重启或重置进程才生效。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · TCP/IP 协议', url: 'https://www.runoob.com/tcpip/tcpip-protocols.html' }
          ]
        }
      ]
    }
  );
})();

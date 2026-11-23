/* ============================================================================
 * data-network-2.js —— 网络知识 1.5 - 1.8
 * VLAN → VLAN 间通信 → 路由基础 → 链路聚合
 * ==========================================================================*/

(function () {
  var sec = (window.STUDY_SECTIONS || []).filter(function (s) { return s.id === 'network'; })[0];
  if (!sec) return;

  sec.chapters.push(
    /* ------------------------------------------------------------------ */
    {
      id: 'net-05',
      title: 'VLAN 原理与配置',
      lead: 'VLAN 把一台交换机逻辑上切成几个互不相通的“小局域网”，广播不再到处乱跑。',
      minutes: 10,
      tags: ['VLAN', '交换'],
      blocks: [
        { t: 'h3', text: '为什么需要 VLAN' },
        {
          t: 'p',
          html: '一个二层网络越大，广播帧越多：ARP 请求、DHCP 发现、 NetBIOS 广播都会泛洪到所有端口。设备一多，带宽和 CPU 都被广播吃掉。VLAN（Virtual LAN）把端口划分成多个逻辑广播域，同一个 VLAN 内二层互通，不同 VLAN 默认隔离。'
        },
        { t: 'h3', text: 'VLAN 与广播域' },
        {
          t: 'p',
          html: '一个 VLAN 就是一个广播域。VLAN ID 范围 0–4095，其中 0 和 4095 保留，可用 1–4094；VLAN 1 是默认 VLAN，所有端口默认属于它。生产环境建议把管理 VLAN、业务 VLAN、语音 VLAN 分开，不要把所有东西都塞在 VLAN 1。'
        },
        { t: 'h3', text: '802.1Q 标签' },
        {
          t: 'p',
          html: '交换机之间用 802.1Q 标签区分不同 VLAN。标签插在源 MAC 后面，共 4 字节：TPID（0x8100）标识这是 802.1Q 帧，PCP 是优先级，DEI 是丢弃标记，VID 是 12 位 VLAN ID。普通终端不认识标签，所以接终端的端口通常收发无标签帧。'
        },
        { t: 'h3', text: '接口类型：Access、Trunk、Hybrid' },
        {
          t: 'table',
          head: ['类型', '接什么', '收到帧', '发出帧'],
          rows: [
            ['Access', '电脑、打印机、AP', '打上本端口 PVID', '剥掉标签再发'],
            ['Trunk', '交换机之间、到路由器', '带标签的按标签转发，不带标签的打 PVID', '只发允许 VLAN 的带标签帧'],
            ['Hybrid（华为）', '灵活场景', '同 Trunk', '可按 VLAN 配置 tag / untag']
          ]
        },
        { t: 'h3', text: 'PVID 与标签处理' },
        {
          t: 'p',
          html: 'PVID（Port VLAN ID）是端口的“默认 VLAN”。Access 口收到的无标签帧会打上 PVID；Trunk 口收到无标签帧也会打 PVID。一个端口只能有一个 PVID，但 Trunk/Hybrid 可以放行多个 VLAN。PVID 配错是 VLAN 不通的头号原因。'
        },
        { t: 'h3', text: 'VLAN 划分方式' },
        {
          t: 'p',
          html: '常见有基于接口划分（最常用，简单直观）、基于 MAC 划分（同一设备换端口仍属原 VLAN）、基于 IP 子网/协议划分（较少用）。企业里通常按部门或业务划 VLAN，再配合 IP 网段规划。'
        },
        { t: 'h3', text: 'VLAN 配置实验' },
        {
          t: 'code',
          title: '两台交换机 + 两个 VLAN',
          lang: 'bash',
          code: '# 创建 VLAN\nvlan batch 10 20\n\n# 接终端的 Access 口\ninterface GigabitEthernet0/0/1\n port link-type access\n port default vlan 10\n\n# 交换机互联的 Trunk 口\ninterface GigabitEthernet0/0/24\n port link-type trunk\n port trunk allow-pass vlan 10 20\n\n# 验证\ndisplay vlan\ndisplay port vlan'
        },
        { t: 'h3', text: '常见错误' },
        {
          t: 'p',
          html: '两端 Trunk 允许的 VLAN 不一致，导致部分 VLAN 不通；PVID 配错，终端拿到错误 VLAN；把 Access 口接到需要 Trunk 的设备；VLAN 建了但端口没加；跨交换机忘记放行管理 VLAN，导致远程管理中断。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '一栋写字楼里有很多公司，VLAN 就是给每家公司装独立门禁：同公司可以串门，不同公司即使在同一层也进不去，想见面必须到一楼大厅（三层网关）。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'VLAN 是二层隔离，不是网段；只划 VLAN 不配三层网关，跨 VLAN 就是不通；VLAN 1 不是“管理专用”，默认所有端口都在里面，反而最容易出安全问题。'
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
      id: 'net-06',
      title: 'VLAN 间通信：单臂路由与 VLANIF',
      lead: 'VLAN 把二层隔开了，想让不同 VLAN 说话，必须有人做三层转发。',
      minutes: 8,
      tags: ['VLAN', '三层'],
      blocks: [
        { t: 'h3', text: '二层隔离与三层转发' },
        {
          t: 'p',
          html: '同一 VLAN 内主机用 MAC 直接通信；跨 VLAN 时，主机会把包发给自己的网关（一个三层接口），网关查路由后再转发到目标 VLAN。所以每个 VLAN 至少要有一个三层网关地址。'
        },
        { t: 'h3', text: '单臂路由（子接口）' },
        {
          t: 'p',
          html: '路由器只有一个物理口连交换机时，可以在物理口上创建多个子接口，每个子接口对应一个 VLAN，配置 <code>dot1q termination vid</code> 识别标签。交换机侧把互联口配成 Trunk，放行这些 VLAN。这就是“单臂路由”。'
        },
        {
          t: 'code',
          title: '华为路由器单臂路由',
          lang: 'bash',
          code: 'interface GigabitEthernet0/0/0.10\n dot1q termination vid 10\n ip address 192.168.10.1 24\n arp broadcast enable\n quit\ninterface GigabitEthernet0/0/0.20\n dot1q termination vid 20\n ip address 192.168.20.1 24\n arp broadcast enable'
        },
        { t: 'h3', text: 'VLANIF 与三层交换机' },
        {
          t: 'p',
          html: '三层交换机上可以直接创建 VLANIF 接口，给每个 VLAN 配一个 IP 当网关，流量在交换机内部完成三层转发，比单臂路由性能好得多。VLANIF 的 up 条件是对应 VLAN 至少有一个 up 的成员端口。'
        },
        {
          t: 'code',
          title: '华为三层交换机 VLANIF',
          lang: 'bash',
          code: 'vlan batch 10 20\ninterface Vlanif10\n ip address 192.168.10.1 24\n quit\ninterface Vlanif20\n ip address 192.168.20.1 24\n quit\ninterface GigabitEthernet0/0/1\n port link-type access\n port default vlan 10'
        },
        { t: 'h3', text: '网关与路由规划' },
        {
          t: 'p',
          html: '每个 VLAN 对应一个网段和一个网关，网段不要重叠；核心交换机写默认路由指向出口路由器，出口路由器回程路由指向核心；跨设备 VLAN 需要在 Trunk 上放行，并保证两端 VLANIF 都有地址。'
        },
        { t: 'h3', text: '排错' },
        {
          t: 'p',
          html: '先看同 VLAN 通不通（二层问题），再看网关能不能 ping 通（VLANIF/子接口问题），最后看跨网段路由和防火墙策略。常见坑：VLANIF 没 up、子接口没配 <code>arp broadcast enable</code>、Trunk 漏放行、主机网关写错。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '单臂路由像小区只有一个大门，进出都要经过门卫；三层交换机像每栋楼都有自己的前台，楼内直接办，不用都挤到大门。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '以为划了 VLAN 就能互通；VLANIF 配了 IP 但 VLAN 没有 up 的端口；单臂路由忘记 ARP 广播使能，网关 ping 不通。'
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
      id: 'net-07',
      title: 'IP 路由基础与静态路由',
      lead: '路由器靠路由表做选择题：目的地址匹配哪条，就走哪条。',
      minutes: 11,
      tags: ['路由', '静态路由'],
      blocks: [
        { t: 'h3', text: '路由与路由表' },
        {
          t: 'p',
          html: '路由是“去某个网段该从哪个口、交给哪个下一跳”的信息。路由器每收到一个包，就拿目的 IP 查路由表：先匹配目的网段和掩码，再按优先级和度量值选最优，最后从出接口转发。路由表核心字段：目的网络、掩码、协议、优先级、开销、下一跳、出接口。'
        },
        { t: 'h3', text: '三种路由来源' },
        {
          t: 'table',
          head: ['来源', '怎么来', '特点'],
          rows: [
            ['直连路由', '接口配 IP 并 up 后自动生成', '最可靠，接口 down 就消失'],
            ['静态路由', '管理员手工配置', '简单可控，不随拓扑自动变化'],
            ['动态路由', 'OSPF、BGP 等协议学习', '自动适应变化，有收敛时间']
          ]
        },
        { t: 'h3', text: '路由优先级' },
        {
          t: 'p',
          html: '不同协议到同一目的网段时，先比优先级（Huawei 数值越小越优）：直连 0、OSPF 内部 10、IS-IS 15、静态 60、RIP 100、OSPF 外部 150、BGP 255。优先级只在“不同协议”之间比较，同一协议内再比开销。'
        },
        { t: 'h3', text: '度量值与选路' },
        {
          t: 'p',
          html: '度量值（Metric/Cost）是同一协议内比较路径好坏的数值，不同协议的度量值没有可比性。OSPF 看累计开销，RIP 看跳数，BGP 看一堆路径属性。选路顺序：最长掩码匹配 → 优先级 → 度量值 → 等价负载分担。'
        },
        { t: 'h3', text: '最长前缀匹配' },
        {
          t: 'p',
          html: '如果多条路由都能匹配目的地址，掩码最长、最具体的那条优先。比如同时有 <code>0.0.0.0/0</code> 和 <code>10.1.0.0/16</code>，访问 10.1.2.3 会走后者。默认路由只是“最后的兜底”，不会抢具体路由。'
        },
        { t: 'h3', text: '静态路由与默认路由' },
        {
          t: 'code',
          title: '华为设备配置',
          lang: 'bash',
          code: 'ip route-static 192.168.2.0 255.255.255.0 192.168.1.2\nip route-static 0.0.0.0 0.0.0.0 192.168.1.1\n\ndisplay ip routing-table\nping 192.168.2.10'
        },
        { t: 'h3', text: '路由递归与等价路由' },
        {
          t: 'p',
          html: '下一跳不是直连时，路由器要先查“怎么到下一跳”，这叫路由递归；默认路由不参与递归。去同一目的、来源相同、开销相同、下一跳不同的多条路由叫等价路由，可以做负载分担；TCP/UDP 按五元组哈希，尽量让同一条流走同一条路。'
        },
        { t: 'h3', text: '浮动路由与路由汇总' },
        {
          t: 'p',
          html: '浮动路由是给主路由配一条优先级更低的备份路由，主路失效时备份自动顶上。静态路由改 <code>preference</code>，动态路由改开销。路由汇总是把多条连续子网合成一条，减少表项；汇总不当会出现环路，可以配一条指向 NULL0 的防环路由。'
        },
        { t: 'h3', text: '配置与排障' },
        {
          t: 'p',
          html: '排障先看“有去有回”：源到目的有路由，目的回源也要有路由。再用 <code>display ip routing-table 目的地址</code> 看命中了哪条，用 <code>tracert</code> 看在哪一跳断。有路由但不通，还要查接口、NAT、ACL、防火墙。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '路由表像导航：目的地匹配最具体的那条路线；默认路由是“找不到具体地址就先上高速”；浮动路由是备用路线，主路堵了才走。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '只配去程不配回程，包能出去回不来；路由是逐跳转发，每台设备只关心下一跳；默认路由指错方向，内网流量会被送进错误出口。'
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
      id: 'net-08',
      title: '以太网链路聚合',
      lead: '把几根网线捆成一根逻辑链路：带宽叠加，断一根也不影响业务。',
      minutes: 8,
      tags: ['链路聚合', 'LACP'],
      blocks: [
        { t: 'h3', text: '为什么需要链路聚合' },
        {
          t: 'p',
          html: '两台交换机之间只连一根线，带宽和可靠性都有限。多加几根线又会被 STP 阻塞，只用一根。链路聚合（Eth-Trunk）把多条物理链路捆成一个逻辑接口，既增加带宽，又提供冗余：成员链路故障时流量自动切到其余链路。'
        },
        { t: 'h3', text: '手工模式与 LACP 模式' },
        {
          t: 'table',
          head: ['模式', '协商', '优点', '缺点'],
          rows: [
            ['手工负载分担', '不协商', '配置简单，兼容性好', '一端配置错可能成环'],
            ['LACP', '通过 LACPDU 协商', '能检测链路故障，活动/备份可控', '两端都要支持并配置']
          ]
        },
        { t: 'h3', text: '活动接口选举' },
        {
          t: 'p',
          html: 'LACP 先选主动端：比较系统优先级（默认 32768）+ MAC，小者优先；再由主动端按接口优先级（默认 32768）+ 接口编号选活动接口，小者优先。还可以配置最大活动接口数，多出来的成员口做备份。'
        },
        { t: 'h3', text: '负载分担' },
        {
          t: 'p',
          html: '聚合链路不是“一个包拆成几份”，而是按流分担：根据源/目的 MAC、IP、端口等哈希，把不同的流转到不同成员链路。同一条流通常走同一条链路，避免乱序。可以选择 <code>src-dst-ip</code>、<code>src-dst-mac</code> 等哈希模式。'
        },
        { t: 'h3', text: '配置示例' },
        {
          t: 'code',
          title: '华为交换机 LACP 聚合',
          lang: 'bash',
          code: 'interface Eth-Trunk1\n mode lacp-static\n port link-type trunk\n port trunk allow-pass vlan 10 20\n quit\ninterface GigabitEthernet0/0/23\n eth-trunk 1\n quit\ninterface GigabitEthernet0/0/24\n eth-trunk 1\n quit\n\ndisplay eth-trunk 1'
        },
        { t: 'h3', text: '常见故障' },
        {
          t: 'p',
          html: '成员口速率/双工不一致、有的口是 Access 有的是 Trunk、成员口还配了 IP、两端模式不一致，都会导致聚合起不来或只有部分链路转发。排障先看 <code>display eth-trunk</code> 的成员状态和 LACP 协商结果。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '一条两车道高速不够用，再加一条车道；两条车道按目的地分流，一条施工另一条还能走，但同一个车队尽量走同一条道，免得乱序。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '链路聚合不是“单条流带宽翻倍”，而是多条流分担；手工模式两端配置不一致可能形成环路；成员口必须恢复默认配置，不能带 IP 或业务 VLAN 配置。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · 网络协议', url: 'https://www.runoob.com/np/np-tutorial.html' }
          ]
        }
      ]
    }
  );
})();

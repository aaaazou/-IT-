/* ============================================================================
 * data-cloud-2.js —— 云计算 2.5 - 2.8
 * 云网络 VPC → Linux → Docker → Kubernetes
 * ==========================================================================*/

(function () {
  var sec = (window.STUDY_SECTIONS || []).filter(function (s) { return s.id === 'cloud'; })[0];
  if (!sec) return;

  sec.chapters.push(
    /* ------------------------------------------------------------------ */
    {
      id: 'cloud-05',
      title: '云网络：VPC、子网、安全组与负载均衡',
      lead: 'VPC 是你在云上圈的一块“私有园区”，子网是楼，安全组是门禁，负载均衡是前台。',
      minutes: 10,
      tags: ['VPC', '安全组'],
      blocks: [
        { t: 'h3', text: 'VPC 是什么' },
        {
          t: 'p',
          html: 'VPC（虚拟私有云）是一块逻辑隔离的私有网络，你可以自己规划网段，比如 <code>10.0.0.0/16</code>，再切成多个子网。不同 VPC 默认互相不通，需要通过对等连接或云企业网打通。VPC 是云上网络的地基。'
        },
        { t: 'h3', text: '子网与网段规划' },
        {
          t: 'p',
          html: '子网要按可用区划分，同一 VPC 内不同子网默认互通。规划时给每个环境（生产/测试）和每类业务（Web/App/DB）留独立网段，避免以后地址冲突。云厂商会预留每个子网的网关地址和系统地址，实际可用 IP 比理论值少几个。'
        },
        { t: 'h3', text: '路由表与 EIP' },
        {
          t: 'p',
          html: '路由表决定子网流量往哪走，默认路由通常指向 VPC 网关或 NAT 网关。EIP（弹性公网 IP）可以绑定到云服务器或负载均衡，让外部访问；不需要时可以解绑保留，避免释放后 IP 变化。'
        },
        { t: 'h3', text: 'NAT 网关' },
        {
          t: 'p',
          html: '内网服务器要访问公网（下载补丁、调用第三方 API），但不想暴露自己，就用 NAT 网关：内网流量统一从 NAT 出去，外部看不到内网地址，也省 EIP。NAT 网关分 SNAT（内网访问公网）和 DNAT（公网访问内网端口）。'
        },
        { t: 'h3', text: '安全组与网络 ACL' },
        {
          t: 'table',
          head: ['对比项', '安全组', '网络 ACL'],
          rows: [
            ['作用范围', '实例（网卡）级别', '子网级别'],
            ['状态', '有状态：出去的连接，回包自动放行', '无状态：入站和出站要分别配'],
            ['默认', '默认拒绝入站、允许出站', '默认全部允许'],
            ['用途', '给每台服务器开最小端口', '给整个子网加一层粗粒度防护']
          ]
        },
        { t: 'h3', text: '负载均衡 ELB' },
        {
          t: 'p',
          html: 'ELB 把访问流量分发到多台后端服务器，支持四层（TCP/UDP）和七层（HTTP/HTTPS），提供健康检查、会话保持、SSL 卸载。常见架构：ELB → 多台 Web → 内网 ELB/数据库。后端不健康时自动摘除，恢复后再加回来。'
        },
        { t: 'h3', text: '一个典型的三层架构' },
        {
          t: 'p',
          html: '公网 ELB 放 Web 层，Web 只开 80/443；应用层放内网，只允许 Web 访问；数据库放私有子网，只允许应用层访问，不开公网。每层一个安全组，最小权限，数据库再做白名单和审计。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: 'VPC 是园区围墙，子网是楼，安全组是每间办公室的门禁，NAT 网关是园区统一出口，ELB 是一楼前台，负责把访客分到不同楼层。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '安全组默认拒绝入站，新机器“连不上”经常是没放行端口；不要对 <code>0.0.0.0/0</code> 开放 22/3389；安全组是有状态的，别只配了入站就以为出站也要配；后端健康检查没配，ELB 会把流量打到挂掉的机器。'
        },
        {
          t: 'links',
          items: [
            { label: '华为云 · 虚拟私有云 VPC', url: 'https://www.huaweicloud.com/product/vpc.html' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'cloud-06',
      title: 'Linux 常用命令：上云第一课',
      lead: '云服务器九成是 Linux，会十几条命令就能完成日常八成操作。',
      minutes: 10,
      tags: ['Linux', '命令'],
      blocks: [
        { t: 'h3', text: '文件系统与常用目录' },
        {
          t: 'p',
          html: 'Linux 一切皆文件。常用目录：<code>/etc</code> 配置，<code>/var/log</code> 日志，<code>/home</code> 普通用户家目录，<code>/root</code> 管理员家目录，<code>/opt</code> 第三方软件，<code>/tmp</code> 临时文件。'
        },
        { t: 'h3', text: '文件与目录操作' },
        {
          t: 'code',
          title: '最常用的一组',
          lang: 'bash',
          code: 'pwd\nls -lh\ncd /opt\nmkdir -p app/logs\ncp -r app app-bak\nmv a.txt b.txt\nrm -rf /tmp/test\ntouch new.log'
        },
        { t: 'h3', text: '查看与搜索' },
        {
          t: 'p',
          html: '<code>cat</code> 看小文件，<code>less</code> 分页看，<code>tail -f</code> 实时追日志，<code>grep</code> 按关键词过滤。组合起来很常用：<code>tail -f app.log | grep ERROR</code>。'
        },
        { t: 'h3', text: '权限与属主' },
        {
          t: 'p',
          html: '权限分读（r=4）、写（w=2）、执行（x=1），分别对应属主、属组、其他人。例如 <code>chmod 755 start.sh</code> 表示属主可读写执行、其他人可读可执行。<code>chown</code> 改属主，密钥文件通常设 600。'
        },
        { t: 'h3', text: '进程与服务' },
        {
          t: 'p',
          html: '<code>ps -ef</code> 看进程，<code>top</code> 看资源，<code>kill -9</code> 强杀。现代系统用 <code>systemctl</code> 管理服务：<code>systemctl status/start/stop/restart/enable nginx</code>。'
        },
        { t: 'h3', text: '网络与端口' },
        {
          t: 'p',
          html: '<code>ip addr</code> 看 IP，<code>ip route</code> 看路由，<code>ss -lntp</code> 看监听端口，<code>curl -I</code> 测 HTTP，<code>ping</code> 测连通。<code>ss</code> 比 <code>netstat</code> 更快，推荐优先用。'
        },
        { t: 'h3', text: '软件包与磁盘' },
        {
          t: 'p',
          html: 'CentOS 用 <code>yum/dnf</code>，Ubuntu 用 <code>apt</code>。磁盘用 <code>df -h</code> 看使用率、<code>du -sh</code> 看目录大小、<code>lsblk</code> 看块设备。日志占满磁盘是线上最常见的事故之一。'
        },
        { t: 'h3', text: '一个排障小流程' },
        {
          t: 'p',
          html: '服务起不来：<code>systemctl status</code> 看状态 → <code>journalctl -u 服务</code> 看日志 → <code>ss -lntp</code> 看端口 → <code>df -h</code> 看磁盘 → 看配置文件和权限。按顺序排，比盲目重启有效。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '图形界面像触屏点菜，命令行像遥控器：一开始不熟，但熟练后更快更准，还能写成脚本批量执行。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '<code>rm -rf</code> 没有回收站；改配置前先备份；生产环境不要一直用 root 跑服务；<code>chmod 777</code> 看似省事，实际是安全漏洞。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · Linux 教程', url: 'https://www.runoob.com/linux/linux-tutorial.html' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'cloud-07',
      title: 'Docker：把应用装进集装箱',
      lead: 'Docker 把程序和它依赖的环境打包成镜像，到哪台机器都能一样跑。',
      minutes: 11,
      tags: ['Docker', '容器'],
      blocks: [
        { t: 'h3', text: '容器是什么' },
        {
          t: 'p',
          html: '容器是把应用和依赖打包在一起的运行单元，共享宿主机内核，用命名空间做隔离、用 cgroups 限制资源。它比虚拟机轻，启动快，适合微服务和快速交付。'
        },
        { t: 'h3', text: '镜像、容器与仓库' },
        {
          t: 'p',
          html: '<strong>镜像</strong>是只读模板，<strong>容器</strong>是镜像跑起来的实例，<strong>仓库</strong>是存放镜像的地方（Docker Hub、华为云 SWR、阿里云 ACR）。镜像分层存储，改一层只传一层。'
        },
        { t: 'h3', text: '与虚拟机的区别' },
        {
          t: 'table',
          head: ['对比项', '虚拟机', '容器'],
          rows: [
            ['隔离', '硬件级，各自完整系统', '进程级，共享内核'],
            ['启动', '几十秒到几分钟', '秒级'],
            ['体积', 'GB 级', 'MB 级'],
            ['隔离强度', '强', '较弱'],
            ['适用', '异构系统、强隔离', '微服务、CI/CD']
          ]
        },
        { t: 'h3', text: '镜像分层与 Dockerfile' },
        {
          t: 'p',
          html: 'Dockerfile 每条指令生成一层，层可以复用。把不常变的依赖放前面、代码放后面，构建更快。多阶段构建可以把编译环境和运行环境分开，最终镜像只留运行需要的文件。'
        },
        {
          t: 'code',
          title: '一个最小的 Dockerfile',
          lang: 'dockerfile',
          code: 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["python", "app.py"]'
        },
        { t: 'h3', text: '常用命令' },
        {
          t: 'code',
          title: '日常操作',
          lang: 'bash',
          code: 'docker pull nginx:1.27\ndocker run -d --name web -p 8080:80 nginx:1.27\ndocker ps\ndocker logs -f web\ndocker exec -it web /bin/bash\ndocker stop web && docker rm web\ndocker images'
        },
        { t: 'h3', text: '数据卷与端口映射' },
        {
          t: 'p',
          html: '容器删了，里面的数据默认也没了。重要数据要挂数据卷：<code>-v /data/mysql:/var/lib/mysql</code>。端口映射 <code>-p 宿主机端口:容器端口</code>，让外部访问容器服务。'
        },
        { t: 'h3', text: '网络模式' },
        {
          t: 'p',
          html: '默认 bridge 网络，容器有独立 IP，通过端口映射访问；host 模式直接用宿主机网络，性能好但端口冲突；none 模式无网络。多容器互通可以自定义 bridge 网络，按容器名解析。'
        },
        { t: 'h3', text: '常见问题' },
        {
          t: 'p',
          html: '镜像拉不下来查网络和镜像加速器；容器起不来先看 <code>docker logs</code>；端口被占用查 <code>ss -lntp</code>；容器内时间不对挂载宿主时区；镜像太大用 slim/alpine 基础镜像并清理缓存。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '集装箱：不管里面装的是衣服还是机器，码头都按同样的方式吊装。Docker 镜像就是集装箱，宿主机是码头，容器是正在运输的那一箱货。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: '容器不是轻量虚拟机，隔离性更弱；容器删了数据就没，重要数据要挂卷；镜像里不要塞密钥；不要长期用 <code>latest</code> 标签，版本不可控。'
        },
        {
          t: 'links',
          items: [
            { label: '菜鸟教程 · Docker 教程', url: 'https://www.runoob.com/docker/docker-tutorial.html' },
            { label: 'Docker 官方入门', url: 'https://docs.docker.com/get-started/' }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'cloud-08',
      title: 'Kubernetes：给集装箱排班',
      lead: '容器多了要有人管：放哪台机器、挂了谁来拉起来、怎么对外提供服务——这就是 K8s。',
      minutes: 12,
      tags: ['K8s', '容器编排'],
      blocks: [
        { t: 'h3', text: '为什么需要 K8s' },
        {
          t: 'p',
          html: '一台机器上跑几个容器还行，几十上百个容器分布在上百台机器上，手工管理不现实。Kubernetes 负责自动调度、故障自愈、滚动升级、服务发现、负载均衡、配置和密钥管理，是云原生容器编排的事实标准。'
        },
        { t: 'h3', text: '集群架构' },
        {
          t: 'p',
          html: 'K8s 集群分控制面（Master）和工作节点（Node）。控制面负责“决定做什么”，Node 负责“真正跑容器”。生产环境控制面通常三个节点起步，etcd 也要奇数个做高可用。'
        },
        { t: 'h3', text: '控制面组件' },
        {
          t: 'cards',
          items: [
            { title: 'kube-apiserver', text: '集群统一入口，负责认证、授权、读写 etcd。' },
            { title: 'etcd', text: '分布式键值存储，保存整个集群状态。' },
            { title: 'kube-scheduler', text: '根据资源、亲和性、污点把 Pod 调度到节点。' },
            { title: 'kube-controller-manager', text: '各种控制器，确保实际状态等于期望状态。' }
          ]
        },
        { t: 'h3', text: 'Node 组件' },
        {
          t: 'p',
          html: '<strong>kubelet</strong> 管本节点 Pod 生命周期；<strong>kube-proxy</strong> 实现 Service 的网络代理和负载均衡（iptables/ipvs）；容器运行时（containerd/Docker）真正拉镜像、起容器。'
        },
        { t: 'h3', text: 'Pod' },
        {
          t: 'p',
          html: 'Pod 是 K8s 最小调度单位，里面可以有一个或多个容器，共享网络命名空间和存储卷。同一个 Pod 里的容器用 localhost 互通。Pod 重建后 IP 会变，所以不能直接拿 Pod IP 当固定地址。'
        },
        { t: 'h3', text: 'Deployment 与 Service' },
        {
          t: 'p',
          html: 'Deployment 管理 Pod 副本数和滚动升级，挂了自动拉起；Service 给一组 Pod 一个固定访问入口和负载均衡，Pod IP 变了也不怕；Ingress 做七层入口，按域名/路径转发。'
        },
        { t: 'h3', text: '调度与自愈' },
        {
          t: 'p',
          html: '调度分过滤和打分：先排除资源不够、污点不容忍的节点，再按亲和性、负载均衡打分。节点故障时，控制器会在其他节点重建 Pod；健康检查（liveness/readiness）决定是否重启或摘流量。'
        },
        { t: 'h3', text: 'kubectl 与排错' },
        {
          t: 'code',
          title: '最常用的 kubectl',
          lang: 'bash',
          code: 'kubectl get nodes\nkubectl get pods -A\nkubectl describe pod <pod>\nkubectl logs -f deploy/web\nkubectl scale deploy web --replicas=3\nkubectl apply -f app.yaml\nkubectl rollout status deploy/web'
        },
        {
          t: 'p',
          html: '排错顺序：<code>get pods</code> 看状态 → <code>describe</code> 看事件（镜像拉取、调度失败、探针失败）→ <code>logs</code> 看应用日志 → <code>exec</code> 进容器测网络。常见原因：镜像名错、资源不够、探针配置太激进、Service 选择器不匹配。'
        },
        {
          t: 'note',
          tone: 'tip',
          title: '生活类比',
          html: '码头调度系统：Node 是泊位，Pod 是集装箱，Scheduler 是调度员，Deployment 是“这票货必须保持 3 箱”的规则，Service 是统一的提货窗口。'
        },
        {
          t: 'note',
          tone: 'warn',
          title: '常见误区',
          html: 'Pod 不是容器，而是一组容器的“壳”；Pod IP 会变，要用 Service；生产不要用 <code>latest</code> 镜像；数据库这类有状态服务不要随便塞进无状态 Deployment。'
        },
        {
          t: 'links',
          items: [
            { label: 'Kubernetes 中文文档 · 概念', url: 'https://kubernetes.io/zh-cn/docs/concepts/overview/' }
          ]
        }
      ]
    }
  );
})();

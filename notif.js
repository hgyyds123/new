// ================ 全站统一通知铃铛（可复用） ================
// 用法：<script src="/notif.js"></script>
// 在各页面加载后调用 initNotif()，传入获取当前用户 ID 的回调

(function() {
    // 插入样式
    const css = `
        .notif-badge { background: var(--error, #B3261E); color: #FFFFFF; border-radius: 9px; font-size: 11px; padding: 1px 6px; margin-left: 2px; vertical-align: middle; display: none; }
        .notif-panel { position: fixed; top: 68px; right: 16px; width: 320px; max-height: 360px; overflow-y: auto; background: var(--surface, #fff); border: 1px solid var(--outline-variant, #C4C7C5); border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); z-index: 200; padding: 8px; display: none; }
        .notif-toast { position: fixed; top: 72px; right: 16px; background: var(--surface, #fff); border: 1px solid var(--outline-variant, #C4C7C5); border-radius: 12px; padding: 10px 14px; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 150; opacity: 0; transform: translateX(20px); transition: all 0.25s ease; cursor: pointer; max-width: 280px; }
        .notif-toast.show { opacity: 1; transform: translateX(0); }
        .notif-item { padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.5; cursor: pointer; }
        .notif-item:hover { background: var(--surface-variant, #f0f4f9); }
        .notif-item.unread { background: var(--primary-container, #d3e3fd); }
        .comment-like { background: none; border: none; color: var(--primary, #0b57d0); cursor: pointer; font-size: 12px; padding: 2px 8px; }
        .notif-empty { text-align: center; color: var(--text-sub, #444); padding: 24px 0; font-size: 13px; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 插入铃铛按钮（若页面没放，自动加到 body）
    const btnHtml = `
        <button class="notif-btn" id="notifBtn" aria-label="通知" style="display:none;background:none;border:none;cursor:pointer;font-size:24px;">
            <span class="material-symbols-outlined">notifications</span><span id="notifBadge" class="notif-badge"></span>
        </button>
        <div class="notif-panel" id="notifPanel"></div>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = btnHtml;
    const notifBtn = temp.querySelector('#notifBtn');
    const notifPanel = temp.querySelector('#notifPanel');

    // 暴露全局
    window.__notif = {
        btn: null,
        panel: null,
        channel: null,
        unreadCount: 0,
        currentUserId: null,
        supabaseUrl: '',
        supabaseKey: '',
        db: null,
        initialized: false,

        init: function(opts) {
            opts = opts || {};
            this.supabaseUrl = opts.supabaseUrl || '';
            this.supabaseKey = opts.supabaseKey || '';
            this.db = opts.db || null;
            if (opts.getUserId) {
                this.currentUserId = opts.getUserId();
            } else if (opts.userId) {
                this.currentUserId = opts.userId;
            } else {
                this.currentUserId = localStorage.getItem('hg_user_id') || sessionStorage.getItem('hg_user_id');
            }
            if (!this.currentUserId) return;

            // 放入按钮到页面（若已有 id=notifBtn 则复用）
            const existing = document.getElementById('notifBtn');
            if (existing) {
                this.btn = existing;
                const existingPanel = document.getElementById('notifPanel');
                this.panel = existingPanel || notifPanel;
                if (!this.panel && existingPanel === null) {
                    // 没有面板，插入
                    document.body.appendChild(notifPanel);
                    this.panel = notifPanel;
                }
            } else {
                document.body.appendChild(notifBtn);
                document.body.appendChild(notifPanel);
                this.btn = notifBtn;
                this.panel = notifPanel;
            }

            this.btn.style.display = '';
            this.bindEvents();
            this.startRealtime();
            this.refreshBadge();
            this.initialized = true;
        },

        bindEvents: function() {
            const self = this;
            this.btn.onclick = async () => {
                if (self.panel.style.display === 'none') {
                    self.panel.style.display = 'block';
                    self.panel.innerHTML = '<div class="notif-empty">加载中...</div>';
                    await self.loadPanel();
                } else {
                    self.panel.style.display = 'none';
                }
            };

            // 点击面板外关闭
            document.addEventListener('click', (e) => {
                if (self.panel && self.panel.style.display !== 'none' && !self.panel.contains(e.target) && !e.target.closest('#notifBtn')) {
                    self.panel.style.display = 'none';
                }
            });
        },

        startRealtime: function() {
            const self = this;
            if (!self.db) {
                // 没有 db 实例，尝试用原生 fetch 轮询兜底（10秒）
                setInterval(() => self.refreshBadge(), 10000);
                return;
            }
            try {
                self.channel = self.db.channel('notifications-' + self.currentUserId)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${self.currentUserId}`
                    }, (payload) => {
                        self.unreadCount++;
                        self.updateBadge();
                        self.showToast(payload.new);
                    })
                    .subscribe();
            } catch (e) {
                console.warn('Notif realtime failed:', e);
                setInterval(() => self.refreshBadge(), 10000);
            }
        },

        refreshBadge: async function() {
            try {
                const res = await fetch(`${this.supabaseUrl}/rest/v1/notifications?user_id=eq.${this.currentUserId}&read_at=is.null&select=id`, {
                    headers: { "apikey": this.supabaseKey, "Authorization": `Bearer ${this.supabaseKey}` }
                });
                const arr = await res.json();
                this.unreadCount = Array.isArray(arr) ? arr.length : 0;
                this.updateBadge();
            } catch(e) {}
        },

        updateBadge: function() {
            const badge = document.getElementById('notifBadge');
            if (badge) badge.textContent = this.unreadCount > 0 ? String(this.unreadCount) : "";
        },

        loadPanel: async function() {
            try {
                const res = await fetch(`${this.supabaseUrl}/rest/v1/notifications?user_id=eq.${this.currentUserId}&order=created_at.desc&limit=20`, {
                    headers: { "apikey": this.supabaseKey, "Authorization": `Bearer ${this.supabaseKey}` }
                });
                const arr = await res.json();
                if (!Array.isArray(arr) || arr.length === 0) {
                    this.panel.innerHTML = '<div class="notif-empty">暂无通知</div>';
                } else {
                    this.panel.innerHTML =
                        `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 12px;"><b style="font-size:13px;">通知</b><span class="comment-like" onclick="window.__notif.markAllRead(event)">全部已读</span></div>` +
                        arr.map(n => {
                            const text = n.content || (n.type === 'reply' ? '回复了你的帖子' : n.type === 'like_post' ? '赞了你的帖子' : n.type === 'like_comment' ? '赞了你的评论' : n.type === 'follow' ? '关注了你' : n.type === 'mention' ? '提到了你' : n.type === 'chat_msg' ? '发来私聊' : n.type === 'chat_request' ? '请求私聊' : '有新动态');
                            return `<div class="notif-item${n.read_at ? '' : ' unread'}"><b>有人</b> ${text}<br><span style="font-size:11px;color:var(--text-sub);">${timeAgo(n.created_at)}</span></div>`;
                        }).join('');
                    this.unreadCount = 0;
                    this.updateBadge();
                }
            } catch (e) {
                this.panel.innerHTML = '<div class="notif-empty">加载失败</div>';
            }
        },

        markAllRead: async function(e) {
            if (e) e.stopPropagation();
            try {
                await fetch(`${this.supabaseUrl}/rest/v1/notifications?user_id=eq.${this.currentUserId}&read_at=is.null`, {
                    method: "PATCH",
                    headers: { "apikey": this.supabaseKey, "Authorization": `Bearer ${this.supabaseKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ read_at: new Date().toISOString() })
                });
                this.unreadCount = 0;
                this.updateBadge();
                if (this.panel) this.panel.style.display = 'none';
            } catch (err) {}
        },

        showToast: function(n) {
            if (this.panel && this.panel.style.display === 'block') return;
            const toast = document.createElement('div');
            toast.className = 'notif-toast';
            const text = n.content || '有新通知';
            toast.innerHTML = `<b>有人</b> ${text}`;
            toast.onclick = () => { this.btn.click(); };
            document.body.appendChild(toast);
            setTimeout(() => { toast.classList.add('show'); }, 10);
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
        },

        // 写一条通知（各页面触发点调用）
        send: async function(targetUserId, type, targetType, targetId, actorName, content) {
            if (!targetUserId || (this.currentUserId && targetUserId === this.currentUserId)) return;
            try {
                await fetch(`${this.supabaseUrl}/rest/v1/notifications`, {
                    method: "POST",
                    headers: { "apikey": this.supabaseKey, "Authorization": `Bearer ${this.supabaseKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: targetUserId,
                        actor_id: this.currentUserId || null,
                        type: type,
                        target_type: targetType,
                        target_id: String(targetId),
                        content: String(content || '').slice(0, 60)
                    })
                });
            } catch (e) { console.error(e); }
        }
    };

    // 全局 timeAgo 兜底
    window.timeAgo = window.timeAgo || function(s) {
        if (!s) return "";
        const d = new Date(s);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return "刚刚";
        if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
        if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
        if (diff < 172800) return "昨天";
        if (diff < 2592000) return Math.floor(diff / 86400) + " 天前";
        return d.toLocaleDateString("zh-CN");
    };

})();

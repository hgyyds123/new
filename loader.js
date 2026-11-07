// ================= 主页加载动画逻辑 =================
document.addEventListener('DOMContentLoaded', () => {
    // 动态生成动画 HTML，插到 body 最前面
    const loaderHTML = `
    <div id="hg-loader">
        <div class="hg-loader-content">
            <div class="hg-glow-text">hg</div>
            <div class="hg-sub-text">Loading System...</div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', loaderHTML);

    // 当网页所有资源加载完毕后，平滑淡出
    window.addEventListener('load', () => {
        const loader = document.getElementById('hg-loader');
        if (loader) {
            // 延迟 800 毫秒再消失，让用户欣赏一下动画
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 800);
        }
    });
});

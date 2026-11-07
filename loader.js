// ================= 主页加载动画逻辑 =================
document.addEventListener('DOMContentLoaded', () => {
    // 动态生成动画 HTML
    const loaderHTML = `
    <div id="hg-loader">
        <div class="hg-loader-content">
            <div class="hg-logo">hg</div>
            <div class="hg-progress-track">
                <div class="hg-progress-bar"></div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', loaderHTML);

    // 当网页加载完毕后，等待进度条动画跑完再淡出
    window.addEventListener('load', () => {
        const loader = document.getElementById('hg-loader');
        if (loader) {
            // 进度条动画是 1.8s，我们在第 1.8s 时触发淡出 (再加 200ms 缓冲)
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 2000); 
        }
    });
});

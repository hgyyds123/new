(function () {
    // 1. 检查是否通过了密码验证
    if (sessionStorage.getItem("site_auth") !== "ok") {
        window.location.href = "/verified/?redirect=" + encodeURIComponent(location.pathname);
        return;
    }

    // 2. 检查是否同意过免责声明（只在 talkroom 里需要）
    if (location.pathname.startsWith("/talkroom/") &&
        sessionStorage.getItem("disclaimer_ok") !== "yes") {
        window.location.href = "/disclaimer/";
        return;
    }
})();

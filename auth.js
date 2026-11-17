(function () {
    // talkroom 有自己的账号登录，不走这里的门禁
    if (location.pathname.startsWith("/talkroom/")) {
        return;
    }

    // 其他页面继续走原来的密码门禁
    if (sessionStorage.getItem("site_auth") !== "ok") {
        window.location.href = "/verified/?redirect=" + encodeURIComponent(location.pathname);
    }
})();

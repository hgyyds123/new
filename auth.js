(function () {
    if (sessionStorage.getItem("site_auth") !== "ok") {
        window.location.href = "/verified/?redirect=" + encodeURIComponent(location.pathname);
    }
})();
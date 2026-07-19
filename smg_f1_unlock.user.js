// ==UserScript==
// @name             SMG-F1节目解锁
// @description      解锁SMG-F1节目，解除试看倒计时与切页暂停等限制
// @version          1.0
// @updateURL        https://github.com/hexwarrior6/smg-f1-unlock/raw/refs/heads/main/smg_f1_unlock.user.js
// @downloadURL      https://github.com/hexwarrior6/smg-f1-unlock/raw/refs/heads/main/smg_f1_unlock.user.js
// @namespace        http://tampermonkey.net/
// @author           https://github.com/hexwarrior6
// @match            *://*.kankanews.com/*
// @include          *://live.kankanews.com/*
// @icon             https://live.kankanews.com/favicon.ico
// @grant            none
// @run-at           document-end
// ==/UserScript==

(function() {
    "use strict";

    console.log("[SMG-F1] ========== v1.0 ==========");
    console.log("[SMG-F1] URL:", location.href);

    // ===== 1. CSS: hide copyright mask =====
    var style = document.createElement("style");
    style.textContent = ".image-mask{display:none!important}.video-tip{display:none!important}";
    (document.head || document.documentElement).appendChild(style);
    console.log("[SMG-F1] CSS injected");

    // ===== 2. Intercept API responses =====

    // --- XHR ---
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        var urlStr = String(url);
        if (urlStr.indexOf("/content/pc/tv/") !== -1) {
            var xhr = this;
            xhr.addEventListener("readystatechange", function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        var changed = false;
                        function fp(p) {
                            if (!p) return;
                            if (p.is_shield !== undefined) { p.is_shield = 0; changed = true; }
                            if (p.is_review !== undefined) { p.is_review = 1; changed = true; }
                            if (p.can_review !== undefined) { p.can_review = 1; changed = true; }
                        }
                        if (data.result) {
                            fp(data.result);
                            if (data.result.programs) data.result.programs.forEach(fp);
                            if (data.result.channel_info) {
                                data.result.channel_info.copyright_image = "";
                                changed = true;
                            }
                        }
                        if (changed) {
                            console.log("[SMG-F1] XHR patched");
                            Object.defineProperty(xhr, "responseText", {
                                value: JSON.stringify(data), writable: false
                            });
                        }
                    } catch(e) {}
                }
            });
        }
        return origOpen.apply(this, arguments);
    };

    // --- fetch ---
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
        var urlStr = typeof input === "string" ? input : (input && input.url) || "";
        if (urlStr.indexOf("/content/pc/tv/") !== -1) {
            return origFetch.apply(this, arguments).then(function(resp) {
                return resp.clone().json().then(function(data) {
                    var changed = false;
                    function fp(p) {
                        if (!p) return;
                        if (p.is_shield !== undefined) { p.is_shield = 0; changed = true; }
                        if (p.is_review !== undefined) { p.is_review = 1; changed = true; }
                        if (p.can_review !== undefined) { p.can_review = 1; changed = true; }
                    }
                    if (data.result) {
                        fp(data.result);
                        if (data.result.programs) data.result.programs.forEach(fp);
                        if (data.result.channel_info) {
                            data.result.channel_info.copyright_image = "";
                            changed = true;
                        }
                    }
                    if (changed) {
                        console.log("[SMG-F1] fetch patched");
                        return new Response(JSON.stringify(data), {
                            status: resp.status, statusText: resp.statusText, headers: resp.headers
                        });
                    }
                    return resp;
                }).catch(function() { return resp; });
            });
        }
        return origFetch.apply(this, arguments);
    };

    console.log("[SMG-F1] API interceptors ready");

    // ===== 3. Patch Vue component =====
    function tryPatch() {
        var el = document.querySelector(".huikan");
        if (!el) return false;
        var vue = el.__vue__;
        if (!vue || typeof vue.initPlayer !== "function") return false;

        console.log("[SMG-F1] Vue component found, patching...");

        function fixObj(o) {
            if (!o) return;
            o.is_shield = 0;
            o.is_review = 1;
            o.can_review = 1;
        }
        fixObj(vue.programObj);
        fixObj(vue.programDetail);
        fixObj(vue.playingProgramObj);
        if (Array.isArray(vue.programList)) vue.programList.forEach(fixObj);

        if (vue.currChannelDetail) {
            vue.currChannelDetail.copyright_image = "";
            vue.currChannelDetail.live_shift = 0;
        }
        if (vue.currChannel) {
            vue.currChannel.copyright_image = "";
            vue.currChannel.live_shift = 0;
        }

        if (typeof vue.countdown === "number") vue.countdown = 99999999;
        vue.showOpenApp = false;
        vue.showFlag = false;
        if (typeof vue.startCountdown === "function") vue.startCountdown = function() {};
        if (vue.liveTimer) { clearTimeout(vue.liveTimer); vue.liveTimer = null; }

        if (typeof vue.pageVisibilityChange === "function") {
            document.removeEventListener("visibilitychange", vue.pageVisibilityChange);
            vue.pageVisibilityChange = function() {};
            document.addEventListener("visibilitychange", vue.pageVisibilityChange);
        }

        // Init player
        if (!vue.player && vue.programObj && vue.programObj.id) {
            console.log("[SMG-F1] Calling initPlayer()...");
            try { vue.initPlayer(); } catch(e) { console.error("[SMG-F1] initPlayer error:", e); }
        }

        vue.__smgPatched = true;
        console.log("[SMG-F1] Patch applied!");
        return true;
    }

    if (tryPatch()) {
        console.log("[SMG-F1] Patched immediately");
    } else {
        console.log("[SMG-F1] Waiting for component...");
        var observer = new MutationObserver(function() {
            if (tryPatch()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        var count = 0;
        var timer = setInterval(function() {
            count++;
            if (tryPatch()) {
                clearInterval(timer);
                observer.disconnect();
                console.log("[SMG-F1] Patched after " + count + " polls");
            } else if (count >= 60) {
                clearInterval(timer);
                console.warn("[SMG-F1] Timeout after 30s");
            }
        }, 500);
    }

    // ===== 4. Keep image-mask hidden =====
    setInterval(function() {
        var mask = document.querySelector(".image-mask");
        if (mask && mask.style.display !== "none") mask.style.display = "none";
    }, 200);

})();
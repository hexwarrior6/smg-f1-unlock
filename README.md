# 收看五星体育 / SMG 电视频道（绕过版权限制）

打开 [看看新闻](https://live.kankanews.com/huikan?id=10) 看五星体育等 SMG 频道时，F1 等版权节目会显示：

> **"版权受限，此时段不提供电视网络转播服务"**

这是因为服务端返回的节目数据中 `is_shield=1`，且频道带有 `copyright_image` 版权遮罩图，前端据此拦截播放。

本项目提供**两种方式**绕过这个限制。

---

## 为什么看不了？

看看新闻是一个 **Nuxt.js（Vue 2）单页应用**。页面加载时，服务端直接返回了带版权标志的节目数据：

| 字段 | 含义 | 被屏蔽时的值 |
|------|------|-------------|
| `programObj.is_shield` | 节目是否被屏蔽 | `1`（屏蔽） |
| `programObj.is_review` | 是否可回看 | `0`（不可） |
| `programObj.can_review` | 是否允许回看 | `0`（不允许） |
| `currChannelDetail.copyright_image` | 版权遮罩图 URL | 一个 JPG 图片地址 |

前端 Vue 组件检测到 `is_shield=1` 后，不初始化播放器，而是在 `.live-player` 上面覆盖一层 `.image-mask`（版权提示图）。

## 绕过原理

1. **隐藏 `.image-mask`** — 把版权遮罩图藏掉
2. **修改 Vue 组件数据** — 把 `is_shield` 改成 `0`，`is_review` / `can_review` 改成 `1`，清空 `copyright_image`
3. **手动调用 `initPlayer()`** — 触发播放器初始化，解密 `live_address` 并加载 HLS 视频流

三步做完，xgplayer 播放器正常加载，HLS 流开始播放。

---

## 快速开始

### 方式一：Console 粘贴（最简单，每次刷新后要重新粘贴）

1. 用 Edge / Chrome 打开 https://live.kankanews.com/huikan?id=10
2. 按 **F12** → 点 **Console** 标签
3. 粘贴以下代码，回车：

```js
var v=document.querySelector('.huikan').__vue__;
function f(o){if(!o)return;o.is_shield=0;o.is_review=1;o.can_review=1}
f(v.programObj);f(v.programDetail);f(v.playingProgramObj);
v.currChannelDetail.copyright_image='';
document.querySelector('.image-mask').style.display='none';
v.initPlayer();
```

4. 播放器出现，开始观看。

> ⚠️ 刷新页面后需要重新粘贴。切换频道不受影响（脚本已自动拦截后续 API）。

---

### 方式二：Tampermonkey 脚本（自动运行，推荐）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器插件
2. 点击 Tampermonkey 图标 → **创建新脚本**
3. 把 `smg_fivestar.user.js` 的全部内容粘贴进去
4. **Ctrl+S 保存**
5. 打开 https://live.kankanews.com/huikan?id=10 即可自动生效

脚本会自动：
- 注入 CSS 隐藏 `.image-mask`
- 拦截 XHR / fetch API，修改版权字段
- 找到 Vue 组件打补丁，初始化播放器
- 拦截试看倒计时、标签页切换暂停等

---

## 兼容性

- ✅ **Edge** / **Chrome** 最新版
- ✅ **Tampermonkey** / **Violentmonkey**
- ⚠️ Firefox 理论兼容，未充分测试
- ❌ Safari 未测试
- 📱 移动端：Android 上安装支持 Tampermonkey 的浏览器（如 Kiwi Browser），同样可用

---

## License

MIT

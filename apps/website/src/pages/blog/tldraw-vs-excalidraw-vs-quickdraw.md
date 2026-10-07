---
layout: ../../layouts/Article.astro
title: "tldraw vs Excalidraw vs Quickdraw: choosing a whiteboard library"
description: "A practical comparison of the three main whiteboard SDK options for web apps in 2026 — licensing, bundle weight, framework support, sync, and when each one is the right call."
date: 2026-08-01
---

If you're embedding a whiteboard in 2026, three names keep coming up:
**tldraw**, **Excalidraw**, and **Quickdraw**. All three will put a
competent infinite canvas in your app. They differ on licensing, weight, and
which stacks they serve. (Disclosure: this is Quickdraw's blog — so we
source our claims and link both competitors throughout.)

## Licensing — the fork in the road

**tldraw** is source-available, not open source. Since
[SDK 4.0](https://tldraw.dev/blog/tldraw-sdk-4-0) (September 2025),
production use requires a license key: a 100-day free trial, a free
[hobby license](https://tldraw.dev/community/license) (non-commercial only,
watermark required), or a commercial license arranged through sales — there
is no public price list, though users on Hacker News have reported quotes
around $6k/year for small teams. For a funded product that's often fine. For
a side project or a startup counting dollars, it's a real cost.

**Excalidraw** is MIT. Free for anything, forever.

**Quickdraw** is MIT too. It shows a small "Made with Quickdraw" badge in
the corner by default, but removal is a free, documented option
(`watermark: false`) — no license key, no signup, no phone-home.

If your legal or budget situation rules out a paid SDK license, the rest of
the comparison is between Excalidraw and Quickdraw.

## Framework support

| | tldraw | Excalidraw | Quickdraw |
|---|---|---|---|
| React | Yes | Yes | Yes |
| Plain JS / other frameworks | No | No | **Yes** |
| React Native | No | No | **Yes** |

tldraw and Excalidraw are React components at their core. Quickdraw's
engine is framework-free ESM (the React wrapper is a thin binding), which
is what makes Vue, Svelte, and vanilla embeds — and the
[React Native package](/blog/react-native-whiteboard-drawing/) — possible.

## Weight and dependencies

- **tldraw**: a full editor framework — powerful, correspondingly large,
  with a substantial dependency tree.
- **Excalidraw**: also big; you're embedding the Excalidraw app experience,
  assets and all.
- **Quickdraw**: the core is ~46 kB unpacked with **zero runtime
  dependencies**, no build step required. It's a whiteboard, not a platform.

The flip side of weight is capability: tldraw's shape and tool plugin
system is the richest of the three, and Excalidraw ships years of
accumulated features (component libraries, rich export options,
localization). Quickdraw ships a complete but focused whiteboard; its
[roadmap](https://github.com/nmndwivedi/quickdraw/issues/1) is public.

## Look and feel

Excalidraw has its signature hand-drawn aesthetic — instantly recognizable
and hard to restyle away. tldraw looks like a polished design tool.
Quickdraw sits between: crisp UI chrome, hand-drawn wobble in the shapes,
pressure-tapered ink, and twelve named colors that re-resolve when the
board switches between light and dark themes.

## Collaboration

- **tldraw** offers first-party sync as a paid product, and it's excellent.
- **Excalidraw** supports collaboration via the separate
  [excalidraw-room](https://github.com/excalidraw/excalidraw-room) server.
- **Quickdraw** builds sync into the data model — every change emits a
  JSON-safe diff you ship over any transport, with
  [source-tagged undo that stays correct in multiplayer](/blog/real-time-whiteboard-sync-json-diffs/).
  There's no first-party server yet; the relay is ~15 lines of WebSocket
  code.

## Maturity

Be honest about this one: tldraw and Excalidraw have big communities, years
of production hardening, and large test surfaces. Quickdraw is new —
smaller API surface, ~120 tests, one engine shared across three packages,
and an open [issue tracker](https://github.com/nmndwivedi/quickdraw/issues)
you can actually influence. Young projects earn trust in public; that's why
everything is MIT on GitHub.

## Recommendations

- **Funded product, budget for the license, want the richest editor
  framework:** tldraw.
- **Want maximum battle-testing with MIT, React-only is fine, the
  Excalidraw aesthetic fits:** Excalidraw.
- **Want MIT + a lightweight embed, plain-JS/Vue/Svelte support, or React
  Native:** [Quickdraw](https://tryquickdraw.com) — `npm install
  @quickdrawjs/react` and you'll know in five minutes.

Corrections welcome — licensing and features change, and we'd rather this
page be right than flattering:
[open an issue](https://github.com/nmndwivedi/quickdraw/issues).

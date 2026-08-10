# Prompt seed — context-bound settings

**Date:** 2026-08-10  
**Origin:** Author framing (conversation seed) before curated essay/docs  
**Public face:** [Context-bound settings](https://hci-nerdz.github.io/docs/hci-nerdz/context-bound-settings.html) · [When settings live across town](https://hci-nerdz.github.io/blog/when-settings-live-across-town/)

---

One of the biggest problems with apps and web apps in particular is that you can't understand what the settings you're editing are going to do, because they have to recreate the mental context the user must compute in order to understand the setting. This is especially true in systems like Google Admin console and cloud console.

I want a new type of settings paradigm where only the settings that are applicable to what you're doing in a given context are presented in that context, in a separate UI from the activity. This is more closely approximated in desktop apps but also not quite as close to what I have in mind. They are often still subject to bad mental models that require rebuilding context from scratch in the settings menu.

The settings interface needs to infer what is being done in the main UI. So the main UI has different states, and the settings menu needs to adapt dynamically to which state the main UI is in. So essentially, settings are a "side-bar" or dependent process.

This is already present to some degree in various places, but I'm wondering if we can fully extract and standardize it. It's one of the most blurry boundaries in GUI design, but the problem is that once something exceeds the "here and now" boundary of settings, it get shoved into the digital equivalent of a storage room across town hidden behind other businesses.

It fundamentally violates a lot of the existing systems we have. It requires reactivity between processes and shared memory IPC if I had to guess, or some message passing.

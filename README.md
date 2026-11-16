# lumen-moth

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/poyobi/lumen-moth/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/poyobi/lumen-moth/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Moth** is a complete arena-defence game for the desktop browser, written in dependency-free JavaScript and played entirely offline. You are the last lumen moth, guardian of the World Lantern. Each night the Hollow swarm — drifting shades, armoured beetles and moth-hunting wisps — comes to snuff it out, and on the tenth night their King comes with them. Fly with WASD or the arrow keys, aim with the mouse, and hold click or Space to fire light-sparks. Fallen enemies drop lumen: gather it, draft one of three blessings after every night (or spend 20 lumen to rekindle the lantern), mend, and hold the light until dawn. Every sound is synthesised live with WebAudio — the game ships no audio, image or font files at all.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 — or serve the `game/` folder with any static file server and open its `index.html`. No build step, no network: everything the game loads lives under `game/`.

The hand-in program copies the game and its screenshots to the output directory and writes the judge's dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---
<sub>Entered on [make.fun](https://make.fun/?ref=sfcm9bvc&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

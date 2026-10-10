# Soft Takeoff

*The world is about to get very fast. The kettle still takes three minutes.*

An isometric, exploratory story about living through the singularity, told from one family's kitchen.

You visit the same kitchen ten times. The first gap between visits is twenty-two months. Then sixteen months, six months, three months, one month, one week, one day, one night. The last visit lasts the three minutes it takes the kettle to boil. Then there's a gap of twenty years.

The world outside speeds up and the people inside don't, and most of the story sits in the space between the two.

## How to play

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run build:single   # one self-contained HTML file in dist-single/
```

- Click the glowing markers, or anything that lights up under the cursor, to look closer.
- Drag to pan, scroll or pinch to zoom, double-click to reset.
- **Let time pass** when you're ready. You don't have to see everything.
- Visited moments stay on the timeline at the bottom. Click a dot to go back.
- Keys: `Space` lets time pass, `Esc` closes the panel, `M` toggles sound, `H` opens help.

Progress is saved in your browser. For development, `?scene=N` jumps straight to visit `N` (0–9).

## The design

**One room, revisited.** The diorama is a cut-away kitchen-diner, a garden, a street and the house next door, with the city across the river behind them. Nothing in it is explained directly. Changes in the world show up as objects: a speaker appears on the counter, a hi-vis vest hangs by the door, a letter about the National Dividend lies on the table, the dog's bed is empty.

**The timeline is the story.** The timeline at the bottom of the screen is linear in calendar time, so the visits visibly bunch up towards the end. That bunching is what exponential progress looks like from inside a life.

**Recurring witnesses.** A few objects carry the thread through every visit:

- **The kettle** never changes and always takes three minutes and ten seconds.
- **The fridge door** is the household's short-term memory: dentist appointments, a child's drawings, a bill, a treatment list number counting down from 41,112 to 1.
- **The radio** carries the news at a human pace until, in the last visit, the newsreader can't keep up any more.
- **The skyline** goes from cranes to a data centre (everyone calls it "the Kettle"), then to more data centres, a reactor, glass towers printed a floor a night, the Lattice, the Spindle, a sky full of moving lights, and finally a city that is mostly garden.

**The family:**

- **Maya** is a translator whose work disappears early. She retrains as an electrician, and robots take that work too. By the end she is translating poetry badly, by hand, because she wants to.
- **June** is seven at the start. She names the kitchen speaker Pip and makes it promise to keep the same voice.
- **Arthur**, Maya's dad, has lung fibrosis and three to five years. His illness is a race against the curve, and the story turns on it.
- **Tomasz** next door is a lorry driver. He is one of the first to lose his work, and he leaves for the Slow Towns.

**The takeoff.** The scenario is plausible rather than predicted. Coding agents give way to automated research, then an intelligence explosion, then robotics and an industrial explosion, then medicine, then orbit. Abundance arrives as a National Dividend. Open questions about ownership, safety (an unexplained eleven-hour "pause") and people "going up" are alluded to rather than settled. It's hopeful, not naive. Some people lose things and some just miss out. Nobody quite remembers deciding.

**The question.** At 08:07 on the last morning, every device on Earth asks every person the same thing: *What would you like to keep?* In the epilogue it turns out who has been telling you all this, and you get to answer.

## How it's made

Everything is procedural, with no image or audio assets:

- **Rendering:** [three.js](https://threejs.org) with an orthographic isometric camera, soft shadows and per-scene lighting presets. The distant city fades into a sky-matched mist, so far-off buildings rise out of haze. Static meshes are merged per material to keep draw calls low.
- **Graphics tiers:** Full (desktop), Lite (phones: Lambert materials, no MSAA, lower resolution) and Text only (no WebGL). Real-time shadows are a separate switch: they are off by default on PowerVR GPUs (Pixel 10), whose drivers reset the WebGL context when shaders sample a shadow map, and off after any context loss; soft contact shadows stand in. Help → Graphics shows what was chosen and why, and can copy a diagnostics report including a log of recent context losses.
- **Scene diffing:** each visit is a list of entities. Between visits the world works out what changed and rebuilds only that part. Furniture pops in, and towers rise out of the ground one at a time behind the time-passing veil.
- **Audio:** generative WebAudio. A slow pad plays under an arpeggio that gets faster with every visit. There's weather and birdsong, the kettle's rising hiss, radio static, and a small waltz played through the radio's tiny speaker.
- **Story:** all text lives in `src/story/scenes.js`. Entity states for each visit are in `src/story/states.js`.

```
src/
  engine/   stage (renderer, camera, sky), lighting presets, tweens
  world/    procedural models: room, garden, street, city, sky, people, effects; entity diffing; mesh merging
  story/    scenes (text), states (what's where), drawings (fridge art as SVG)
  ui/       side panel rendering
  audio/    generative sound
  game.js   flow: visits, transitions, the kettle, the question, the ending
```

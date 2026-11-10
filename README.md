# FM27 Tactic Builder

Designs a complete Football Manager 27 tactic around **your** squad.

Drop your squad export onto one HTML page and get a printable report with everything you need to enter in FM27, in the order
the tactics screens show it:

- **Style and mentality:** the closest FM27 style to start from, and a mentality based on how strong your team is.
- **Shapes and roles:** the in-possession and out-of-possession formations as pitch diagrams, and the best eleven, each with an
  FM27 in-possession and out-of-possession role.
- **Team instructions:** all 27 (18 in possession, 9 out of possession), each with a short reason. Examples: pressing, defensive
  line, line of engagement, width, tempo, passing, counter-press or regroup.
- **Player instructions:** only where a player's attributes or traits call for one.
- **Set pieces and captain:** set-piece takers, aerial targets, who stays back, and a captain and vice-captain.
- **Squad depth:** a depth chart with a second choice for every position, and the weak areas worth strengthening, with the
  attributes to look for.
- **Alternatives and training:** three alternative tactics (away against stronger teams, at home against weaker teams, and a
  different shape), plus training sessions and an individual focus for each starter.
- **Suitability:** every player scored for every FM27 role.

**What it can't do:** it can't put the tactic into FM27 for you. You copy the settings in by hand; the report lists them in
order. It only ever *reads* your export file. It never touches the game, your saves or the game's memory, and it works
offline: the page is blocked from using the internet at all.

---

## What you need

- A Windows PC with **Football Manager 27 on Steam**
- **Google Chrome** or **Microsoft Edge** (Edge comes with Windows)
- The free **FM View Exporter** plugin, to get your squad out of FM27. FM27 has no built-in export any more: Sports
  Interactive removed it in FM26. The plugin only reads what's on screen and never changes your save.

---

## Step 1: get the Tactic Builder (one time)

1. On this project's GitHub page, click **`FM27-Tactic-Builder.html`**, then the **Download raw file** button (the arrow
   pointing down, top right of the file).
2. Put the file anywhere you like, for example your Desktop.
3. Double-click it. It opens in your web browser. That's the whole tool: there is nothing to install.

If double-clicking opens it in Notepad instead, right-click the file › **Open with** › **Microsoft Edge** (or Chrome).

## Step 2: install FM View Exporter (one time)

Full instructions are on the plugin's page: **github.com/ElectroHugin/FM-View-Exporter**. In short:

1. From its **Releases** page, download `FMViewExporter-…-setup.exe` and run it.
2. Windows may warn you, because the setup isn't signed yet. Click **More info › Run anyway**.
3. The setup finds FM27 in your Steam library (or you pick the folder that contains `fm.exe`). Click **Install**.
4. Start FM27. **The first start takes a few minutes** while the mod loader prepares itself. Later starts are normal.

To remove it later, run the setup again and click **Uninstall**. Your saves are not affected.

*Already use vinteset's **FM27 Player Export** plugin instead? That works too: the Tactic Builder reads its
semicolon-separated files.*

## Step 3: set up the squad view (one time)

The plugin exports the columns you can see, so the squad table needs to show all player attributes plus a few extras.
**Follow [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md).** The quickest way is to import the plugin's ready-made view and add 2
columns.

## Step 4: export your squad

1. In FM27 open **Squad** and choose the view from step 3.
2. Press **F9**. The list scrolls by itself. **Don't click anything until it stops.**
3. The file is saved in **`Documents\Sports Interactive\FM View Exporter`**, named like `squad_20261108_201500.csv` (there's
   an `.html` copy too; either works).

## Step 5: make your tactic

1. Open `FM27-Tactic-Builder.html`.
2. Answer **"How strong is your team in its league?"** (title favourites … underdogs). It sets the mentality and how high to
   press, and is remembered for next time.
3. Drag the `squad_….csv` file onto the box, or click **Choose file…**.
4. The report appears in a few seconds. Use **Print / Save as PDF** or **Save report** to keep it.

The page opens in **dark mode**; the sun/moon button (top right) switches to light and is remembered. Printing and PDFs always
use a light, ink-friendly layout.

Want to see it first? Click **Try the sample squad**. It uses a made-up club.

## Step 6: put it into FM27

Section 2 of the report, "Enter it in FM27", has six steps in the order of FM27's screens:

1. **Style and mentality.**
2. **Formations, players and roles:** the in-possession shape and roles, then the out-of-possession shape and roles. FM27
   roles have no duties, so there's nothing else to choose per player.
3. **Team Instructions › In Possession:** Overview, Final Third, Progression, Build-Up.
4. **Team Instructions › Out of Possession.**
5. **Player instructions.**
6. **Set pieces and captain.**

Settings that differ from FM's defaults are in **bold**; leave the rest alone. Save the alternative tactics (section 5) in FM27's
other tactic slots.

---

## Reading the report

**Colours mean the same thing everywhere:**

- **Fit (teal):** the brighter the teal ring, meter or heatmap cell, the better the player suits the role.
- **Phases:** a blue dot marks an in-possession role, an orange dot an out-of-possession role.
- **Squad profile bars:** blue means above your team's own level, red means below it.
- **Warnings:** amber items carry a warning icon and a label, so colour is never the only signal.

Hover a pitch token, a profile bar or a heatmap cell for the details.


- **Fit scores (0–100)** show how well a player suits a role: 75+ excellent, 65+ good, 55+ usable, under 55 weak. They
  compare your own players with each other. They are not FM's star ratings.
- **How a score is worked out:**
  - The role's **key attributes count 3×** and its **preferred attributes 1.5×**. These are the same attributes FM27
    highlights for that role.
  - Attributes the match engine rewards in every role (pace, acceleration, anticipation, decisions …) are blended in.
  - The score is then lowered if the player isn't comfortable in the position, or, on the wings, if he'd be on his weaker
    foot.
- **Position familiarity is estimated.** FM27 shows it only as coloured dots, which no export contains. *Best Pos* counts as
  Natural, other listed positions as Accomplished, and neighbouring positions as Competent/Unconvincing. The report marks
  these "estimated".
- **Scouting ranges** like `11-14` are scored at the middle (12.5). The report shows the possible spread as **±**.
- **Team instructions compare each part of your team with its own general level** (the average of all their outfield
  attributes), not with fixed numbers. So the advice suits your league, whatever its standard. For example, centre-backs
  whose pace is well below your team's level get a deeper defensive line, and a squad whose work rate and stamina are well
  above it gets a high press.
- **The game plan shapes the formation.** A team that should press high is steered towards shapes that keep three players
  forward out of possession. A team that should sit in a mid or low block is steered towards a compact midfield line of four
  or five. It doesn't change shape for its own sake, because FM27 makes complex tactics slower to learn.
- **Players out on loan are never picked.** They are recognised by a different club or "Out On Loan" playing time. **Injured
  players are left out of the starting XI** (you can switch that off under Options), but they still count as cover in the depth
  chart.
- **The best eleven** is worked out exactly with the Hungarian algorithm, not by picking the best player for each spot in
  turn. Every pair of formations is tested, and balance rules are applied, for example:
  - cover behind attacking full-backs
  - a ball-winner next to a playmaker
  - width on both flanks
  - not too many players staying forward

## Common problems

| Problem | Fix |
| --- | --- |
| **Nothing happens when I press F9** | A player list must be open (Squad screen). Check `BepInEx\LogOutput.log` in the FM27 game folder for a message from FM View Exporter. |
| **"Only N player attributes were found"** | Your view doesn't show the attributes. Set it up as in [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md) and export again. |
| **The report says some columns are missing** | Its last section lists each one and where it is in FM27's *Insert Column* menu. Add them and export again. The tactic still works without them, just with less detail. |
| **Some columns came out empty** | FM27 only fills about the first 255 columns of a view. Keep the view to the columns in the guide. Icon-only columns (like morale) are always empty. |
| **The export has fewer players than my squad** | You clicked or scrolled while F9 was running. Export again and keep your hands off the mouse until it stops. |
| **FM27 won't start, or acts oddly, after installing the plugin** | Delete or rename `winhttp.dll` in the FM27 game folder. The game then starts without mods. |
| **The HTML file opens as text / in Notepad** | Right-click it › Open with › Microsoft Edge (or Chrome). |
| **Strange characters in player names** | Re-export with the plugin's default settings (UTF-8). The tool also reads UTF-16 and older Windows encodings. |
| **A player out on loan was picked** | Your view needs the *Club* column (or *Playing Time*): see [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md). |
| **The CON or Fatigue column is empty** | Normal: FM27 shows these as icons, so exports leave them empty. The tool doesn't need them. |
| **The mentality or pressing feels wrong for my team** | Check your answer to "How strong is your team in its league?". The report's first lines show the answer used. |
| **My game is in another language** | The tool expects English column names. Switch FM27 to English for the export (Preferences › Language). |
| **After an FM27 patch a role's attributes changed** | In the tool open **Advanced**, click **Download roles.json**, edit the role's `key`/`preferred` lists in Notepad, then **Load my own roles.json…**. It's remembered in that browser. |
| **The printout is cut off at the side** | Print in landscape, or use **Save report as HTML** and print from there. |

---

## Privacy and safety

- Everything happens inside the page on your PC. Nothing is uploaded, and the page blocks itself from making internet
  connections.
- The tool never opens your saves, never reads the game's memory and never changes anything in FM27.

## For developers

```
npm install          # one dev tool: esbuild
npm test             # unit tests (Node 20+)
npm run build        # rebuilds FM27-Tactic-Builder.html from src/ and data/
npm run test:e2e     # builds, then checks the page in Chromium (needs Playwright)
npm run samples      # regenerates the made-up sample squads in samples/
npm run report -- samples/squad_20261108_201500.csv out/report.html
```

Layout: each layer can be swapped or fixed on its own after a patch.

| Folder | What's in it |
| --- | --- |
| `src/input/` | Readers for CSV/HTML and one adapter per export route |
| `src/parse/` | Column mapping, players, positions, missing-column check |
| `src/engine/` | Role scoring, Hungarian algorithm, formation search, balance and game-plan rules, squad profile, team and player instructions, depth chart, set pieces, captain, training, alternatives |
| `src/report/` | The HTML report |
| `src/app/` | The page you open |
| `data/` | Editable JSON: `roles.json` (79 FM27 roles), `formations.json`, `instructions.json` (FM27's tactic settings in screen order), `columns.json` (column names + FM27 menu paths), `tuning.json` (all the engine's numbers) |

## Credits and sources

- **FM View Exporter** (ElectroHugin, GPLv3) for the F9 export, and its FM27 column and menu catalogue.
- FM27 role names and their key/preferred attributes were transcribed from the game by the **FM Player Analyzer** project
  (ElectroHugin). This tool uses those game facts in its own format; no code is copied.
- FM27 tactics screen research (instruction names and screen order) from the community projects *FM27-apka* and
  *fm-ai-assistent*.
- Not affiliated with or endorsed by Sports Interactive or SEGA. Football Manager is a trademark of Sports Interactive.

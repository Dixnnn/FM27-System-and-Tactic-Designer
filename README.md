<img src="docs/crest.svg" width="64" align="right" alt="FM27 Tactic Builder crest">

# FM27 Tactic Builder

Designs a complete Football Manager 27 tactic around **your** squad.

Press **F8** on your squad screen in FM27 (or drop a squad export onto one HTML page) and get a printable report with
everything you need to enter in FM27, in the order the tactics screens show it:

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
- **Your players:** optionally, mark players who must start, a **marquee** player to build the tactic around, and **future stars**
  to develop. The tactic is rebuilt around them.

**Two ways to use it:**

- **Inside FM27, with the plugin (easiest).** Install it once, then press **F8** on your squad screen. The plugin reads your
  players straight from the screen and your tactic opens in your browser a few seconds later.
- **The page on its own.** Export your squad with FM View Exporter (F9) and drop the file onto `FM27-Tactic-Builder.html`.

**What it can't do:** it can't put the tactic into FM27 for you. You copy the settings in by hand; the report lists them in
order. It only ever *reads*: the plugin reads what FM27 shows on screen, the page reads your export. Neither touches your
saves, your game files or the game's memory, and neither uses the internet (the page is blocked from it entirely).

---

## Use it inside FM27 (the plugin)

You need a Windows PC with **Football Manager 27 on Steam**, and **Microsoft Edge** or **Google Chrome** to show the tactic
(Edge comes with Windows).

### 1. Install the plugin (one time)

1. Download **`FM27TacticBuilder-…-setup.exe`** from this project's **Releases** page. (Before the first release: open
   **Actions › Plugin**, click the latest green run and download the file under **Artifacts**; it's a zip with the setup inside.)
2. Run it. Windows may warn you because the setup isn't signed: click **More info › Run anyway**.
3. The setup finds FM27 in your Steam library (or you pick the folder that contains `fm.exe`). Click **Install**.
4. Start FM27. **The first start takes a few minutes** while the mod loader (BepInEx) prepares itself. When you're in the
   game, a small message in the top right corner says *FM27 Tactic Builder is ready*.

Already using **FM View Exporter**? That's fine: both work side by side (F9 there, F8 here), and the setup keeps the shared
BepInEx.

To remove it, run the setup again and click **Uninstall**. Your saves are not affected.

### 2. Set up the squad view (one time)

The plugin reads the columns you can see, so the squad table needs to show all player attributes plus a few extras.

- **With the built-in view:** the plugin copies its view into FM27's `views` folder as `FM27 Tactic Builder - Squad.fmf`.
  On the **Squad** screen open the table's view menu, choose **Import View…** and pick that file. In the game the view is
  called **FM27TFT**; switch to it whenever you press F8.
- **Without it** (or if Import View doesn't list it): set up the view by hand as in
  **[docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md)**. It takes about 10 minutes, and FM27 remembers it.

### 3. Make your tactic

1. In FM27 open **Squad** with that view.
2. Press **F8**. The list scrolls by itself; **don't click anything until the message in the top right corner changes.**
3. Your tactic opens in your browser (switch to it with **Alt+Tab**). Set **Team strength** at the top of the report
   (title favourites … underdogs): it sets the mentality and how high to press, and is remembered.

Everything is saved in **`Documents\Sports Interactive\FM27 Tactic Builder`**: `FM27 Tactic Builder.html` (your latest
tactic; open it any time), `exports\` (every squad you read, as CSV) and `views\`.

| Key | What it does |
| --- | --- |
| **F8** | On your Squad screen: reads your players and opens your tactic. On a shortlist or player search: opens your latest tactic with those players scored as signings |
| **Ctrl+F8** | Only saves the list as CSV (works on the squad, player database and shortlist screens) |
| **Ctrl+Shift+F8** | Writes a dump of the game's screen layout, for fixing the plugin after an FM27 patch |

Keys and other settings can be changed in the setup's **Settings** tab.

---

## Or: use the page on its own

1. **Get the page.** On this project's GitHub page, click **`FM27-Tactic-Builder.html`**, then **Download raw file** (the
   arrow pointing down, top right). Put it anywhere, for example your Desktop. If double-clicking opens it in Notepad,
   right-click it › **Open with** › **Microsoft Edge** (or Chrome).
2. **Install FM View Exporter** (free, github.com/ElectroHugin/FM-View-Exporter): run its `FMViewExporter-…-setup.exe`
   from its Releases page and click **Install**. *vinteset's **FM27 Player Export** plugin works too.*
3. **Set up the squad view** as in [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md).
4. **Export:** in FM27 open **Squad** with that view and press **F9**. Don't click until it stops scrolling. The file is
   saved in `Documents\Sports Interactive\FM View Exporter`, named like `squad_20261108_201500.csv`.
5. **Make your tactic:** open `FM27-Tactic-Builder.html`, answer **"How strong is your team in its league?"**, and drag the
   `squad_….csv` onto the box (or click **Choose file…**). Use **Export** (print, PDF, cheat sheet, image or save) to keep it.

Want to see it first? Click **Try the sample squad**; it uses a made-up club. The page opens in **dark mode**; the sun/moon
button switches to light. Printing always uses a light, ink-friendly layout.

## Build around your players (optional)

After the report appears, click **Choose players** to tell the builder about your players, then **Rebuild tactic**:

| Mark a player as | What the builder does |
| --- | --- |
| **Must start** | He is always in the starting XI, in a position he can play. Formations that can't fit him are skipped. Pick up to 11. |
| **Marquee** | The tactic is built around him. He always starts, and his fit counts 2.5 times when the builder compares formations and roles, so it chooses the shape and role that suit him best. Some team instructions are shaped for him too, for example *Progress Through* down his flank, *Pass Into Space* for a quick striker, or *Goalkeeper Distribution: Playmaker* for a deep playmaker. |
| **Unavailable** | Suspended, resting or about to be sold: the tactic, the depth chart and every alternative are built without him. |
| **Future star** | A young player with high potential. He wins close calls for a place (but won't start ahead of a much better player), is preferred as cover, and gets a development plan in the Training section. That plan covers the position and roles he grows into, how far he is from starting, which key attributes to train and how to give him minutes. If he doesn't start, an extra alternative tactic, *With your future stars starting*, puts all your future stars in the XI. |

Everything else works the same way: the same game plan, balance rules and team instructions, built around your picks. The
report's "Built around your picks" section shows each picked player's position and roles. It also says what the picks cost:
how strong the team would be if the builder chose freely, and who would play instead.

Picks are remembered for that club in this browser, so your next export of the same squad uses them automatically. If a new
export no longer fits them (say a picked player has left), the tactic is built without them and the report tells you.
Players out on loan can't be picked.

## Your idea

Click **Idea** on the report and describe the tactic you want in your own words, for example:

- *"I want Lindqvist to score as many headers as possible"*
- *"Play everything through Ellacombe"*
- *"Press high and win the ball back fast"*, *"Park the bus and hit them on the counter"*
- *"Wing play with lots of crosses"*, *"Keep the ball and wear them down"*, *"Give my young players minutes"*

While you type, the panel shows what it understood (and which player, if you didn't name one, e.g. your best striker in
the air for headers). Then choose **how hard to push it**:

| Setting | What happens |
| --- | --- |
| **Normal** | The idea shapes the instructions and nudges roles; the strongest team still comes first. |
| **Strong** | Roles and instructions follow the idea, even if a player is slightly less suited (e.g. he becomes the Target Forward). |
| **Very strong** | The idea leads: shapes and roles bend towards it, the mentality moves with it. |
| **Extreme** | Everything serves the idea, even at a clear cost in team fit (e.g. two strikers and wide crossers for a header machine). |

The report's first section shows the idea, what was done for it (his role, the shape, the instructions marked "Your idea"),
and what it costs in team fit compared with the tool's own choice. If the named player isn't good at it (say, poor in the air),
it tells you, and who would suit the idea better. The idea is remembered for that club, so your next F8 uses it; **Clear
idea** removes it. The alternative tactics are built without it, as a contrast.

**How it reads your words:** offline, without AI. It recognises your players' names and football phrases about headers,
scoring, playmakers, dribbling, long shots, wing play, playing narrow, pressing, defending deep, counter-attacking,
possession, direct play, set pieces, young players and attacking full-backs. Anything else is ignored, and the panel shows
exactly what it picked up before you build. "Don't press" is ignored rather than guessed: say what you want instead
("defend deep").

## More tools in the report

| Tool | What it does |
| --- | --- |
| **Idea** (toolbar) | Describe the tactic you want in your own words, from Normal to Extreme: see [Your idea](#your-idea). |
| **Formation** (toolbar) | Choose the in-possession and/or out-of-possession shape yourself ("I want 4-2-3-1"). The tool builds the best eleven, roles and instructions for it, and says what the tool's own choice would have been. *Let the tool choose both* goes back. Remembered per club. |
| **Checklist** (section 2) | Every setting has a tick box. Tick them off as you copy them into FM27; a bar shows how far you are. Ticks are kept for that tactic, and a changed tactic starts a fresh list. On paper the boxes print empty, to tick with a pen. |
| **Player cards** | Click a player on a pitch or any underlined name: his place in the tactic, the attributes of his roles against your team's level, who else can play there and his best roles anywhere. |
| **Signings** (section 4) | Press **F8** on your shortlist or a player search (or load such an export): every player is scored in your tactic's own positions and roles, and the report lists who would start for you, by how much he'd beat your current starter, who'd be better cover, and the best option for each weak spot. |
| **Match plan** (section 6) | Pick what your next opponent is like: stronger or weaker, home or away, how they play (press high, sit deep, long balls…) and what their players are good at. You get which of your tactics to start from, the mentality, and which team instructions to change, each with a reason from your own squad. |
| **Cup / rotation XI** (section 5) | An alternative for cup games and busy weeks: the same shapes with your first XI rested and young players first in line. |
| **Progress** (section 7) | With the plugin, every F8 is kept; the report compares your squad with your earlier reads of the same club: first-team level over time, who is improving (with the attributes that rose), who is declining, arrivals and departures. Without the plugin, load an older export. |
| **Role filter** (section 8) | Search by name, filter by position, show only the starting XI or hide players on loan. |
| **Cheat sheet** (Export menu) | Prints a single A4 page with both shapes and every setting that differs from FM's defaults, to keep next to you. |
| **Image** (Export menu) | Saves a picture of the tactic (both shapes, key instructions, set pieces) to share on Discord or Reddit. |
| **Club colours** (report header) | Your players wear your kit on the pitches: pick one of twelve kits or your own shirt and trim colours. The fit rings keep their colours. Remembered per club, and used in the saved report and the shared picture. |

Just for fun: the players walk out of the tunnel onto the pitch when a tactic opens (switched off if your system asks for
reduced motion), a studio pundit has one line to say about every tactic, and ticking off the whole checklist gets the
tactic stamped **Locked in**.

## Put it into FM27

Section 2 of the report, "Enter it in FM27", has six steps in the order of FM27's screens:

1. **Style and mentality.**
2. **Formations, players and roles:** the in-possession shape and roles, then the out-of-possession shape and roles. FM27
   roles have no duties, so there's nothing else to choose per player.
3. **Team Instructions › In Possession:** Overview, Final Third, Progression, Build-Up.
4. **Team Instructions › Out of Possession.**
5. **Player instructions.**
6. **Set pieces and captain.**

Settings that differ from FM's defaults are in **bold** and have a tick box; leave the rest alone. Save the alternative tactics
(section 5) in FM27's other tactic slots. Prefer one page? Use **Export › Print a one-page cheat sheet**.

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
| **Nothing happens when I press F8** | The game window must be in front and a player list open (Squad screen). Look in `BepInEx\LogOutput.log` in the FM27 game folder for lines from *FM27 Tactic Builder*. No such lines at all: run the setup again and click **Update**. |
| **"No player list on screen"** | Open the **Squad** screen (the list of your players, not a single player's profile) and press F8 again. |
| **"This view lacks …" / "Opened, but columns are missing"** | Switch the squad view to *FM27TFT* (or add the columns from [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md)) and press F8 again. |
| **The browser didn't open** | Open `Documents\Sports Interactive\FM27 Tactic Builder\FM27 Tactic Builder.html` yourself. To stop it opening, untick *Open the tactic in the browser* in the setup's Settings. |
| **F8 already does something in my game** | Pick another key in the setup's **Settings** tab (for example `Ctrl+Shift+T`), then restart FM27. |
| **No message appears in the game** | The message box is a nice-to-have; everything still works and is logged in `BepInEx\LogOutput.log`. It can be switched off in Settings. |
| **The plugin stopped working after an FM27 patch** | Press **Ctrl+Shift+F8** on the squad screen and send the newest file from `Documents\Sports Interactive\FM27 Tactic Builder\Diagnostics` with your `BepInEx\LogOutput.log`. Meanwhile the page on its own still works with any export. |
| **Nothing happens when I press F9** | A player list must be open (Squad screen). Check `BepInEx\LogOutput.log` in the FM27 game folder for a message from FM View Exporter. |
| **"Only N player attributes were found"** | Your view doesn't show the attributes. Set it up as in [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md) and export again. |
| **The report says some columns are missing** | Its last section lists each one and where it is in FM27's *Insert Column* menu. Add them and export again. The tactic still works without them, just with less detail. |
| **Some columns came out empty** | FM27 only fills about the first 255 columns of a view. Keep the view to the columns in the guide. Icon-only columns (like morale) are always empty. |
| **The tactic has fewer players than my squad** | You clicked or scrolled while F8/F9 was reading. Try again and keep your hands off the mouse until it stops. |
| **FM27 won't start, or acts oddly, after installing the plugin** | Delete or rename `winhttp.dll` in the FM27 game folder. The game then starts without mods. |
| **The HTML file opens as text / in Notepad** | Right-click it › Open with › Microsoft Edge (or Chrome). |
| **Strange characters in player names** | Re-export with the plugin's default settings (UTF-8). The tool also reads UTF-16 and older Windows encodings. |
| **"Your picks can't all start"** | Only one goalkeeper and at most 11 players can be marked to start. If no formation fits all of them (for example five strikers), unmark one or two. |
| **A player out on loan was picked** | Your view needs the *Club* column (or *Playing Time*): see [docs/CUSTOM-VIEW.md](docs/CUSTOM-VIEW.md). |
| **The CON or Fatigue column is empty** | Normal: FM27 shows these as icons, so exports leave them empty. The tool doesn't need them. |
| **The mentality or pressing feels wrong for my team** | Check your answer to "How strong is your team in its league?". The report's first lines show the answer used. |
| **My game is in another language** | The tool expects English column names. Switch FM27 to English for the export (Preferences › Language). |
| **After an FM27 patch a role's attributes changed** | In the tool open **Advanced**, click **Download roles.json**, edit the role's `key`/`preferred` lists in Notepad, then **Load my own roles.json…**. It's remembered in that browser. |
| **The printout is cut off at the side** | Print in landscape, or use **Save report as HTML** and print from there. |

---

## Privacy and safety

- Everything happens on your PC. Nothing is uploaded, and the page blocks itself from making internet connections. The plugin
  has no network code at all.
- The plugin only reads what FM27 shows on screen, the same way FM View Exporter does. While it reads, it briefly makes the
  list taller and the frame rate faster so it can scroll quicker, then puts both back exactly as they were. It never opens your
  saves, never reads the game's memory and never changes game files or settings.
- It writes only to `Documents\Sports Interactive\FM27 Tactic Builder`, plus its own view file into FM27's `views` folder
  (switch that off with *Install the squad view* in Settings). It never overwrites or deletes any other file.

## For developers

```
npm install          # dev tools: esbuild and three fonts (embedded in the page)
npm test             # unit tests (Node 20+)
npm run build        # rebuilds FM27-Tactic-Builder.html from src/ and data/
npm run test:e2e     # builds, then checks the page in Chromium (needs Playwright)
npm run samples      # regenerates the made-up sample squads in samples/
npm run report -- samples/squad_20261108_201500.csv out/report.html
node tools/make-icons.mjs  # after changing the crest: setup icon, setup header, docs/crest.svg (needs Playwright)

# The FM27 plugin (needs the .NET 8 SDK; build the page first, it is embedded in the DLL)
dotnet test plugin/tests/FM27TacticBuilder.Tests          # reader core, tactic page, view files, setup logic
dotnet build plugin/src/FM27TacticBuilder -c Release      # BepInEx\plugins\FM27TacticBuilder\FM27TacticBuilder.dll
plugin/packaging/package.sh 0.9.0                         # plugin zip, full package (downloads BepInEx), setup.exe
```

GitHub Actions runs all of this on every push (workflows *Tests* and *Plugin*); the *Plugin* run's **Artifacts** hold the
setup. Run *Plugin* by hand with *Publish a release* ticked to put it on the Releases page.

Layout: each layer can be swapped or fixed on its own after a patch.

| Folder | What's in it |
| --- | --- |
| `src/input/` | Readers for CSV/HTML and one adapter per export route |
| `src/parse/` | Column mapping, players, positions, missing-column check |
| `src/engine/` | Role scoring, Hungarian algorithm, formation search, balance and game-plan rules, squad profile, team and player instructions, depth chart, set pieces, captain, training, alternatives |
| `src/report/` | The HTML report |
| `src/app/` | The page you open |
| `plugin/` | The FM27 plugin (C#, BepInEx 6 IL2CPP): `src/FM27TacticBuilder` (in-game part: keys, reading the table, messages, opening the page), `src/FM27TacticBuilder.Core` (no Unity: table model, CSV, putting the squad into the page, view files), `src/FM27TacticBuilder.Setup*` (the installer), `tests/`, `packaging/`, `views/` (the built-in squad view) |
| `data/` | Editable JSON: `roles.json` (79 FM27 roles), `formations.json`, `instructions.json` (FM27's tactic settings in screen order), `columns.json` (column names + FM27 menu paths), `tuning.json` (all the engine's numbers) |

## Licence

Free software under the **GNU General Public License v3** ([LICENSE](LICENSE)), because the plugin is built on FM View
Exporter's GPLv3 code. You may use, share and change it; if you share a changed version, it must stay under the GPL with its
source. No warranty.

## Credits and sources

- **FM View Exporter** (ElectroHugin, GPLv3): the plugin's squad reader, setup program and packaging are based on its code
  (each such file says so at the top), and its FM27 column and menu catalogue. The page on its own also reads its exports.
- **BepInEx** (LGPL-2.1) and **Il2CppInterop** (LGPL-3.0) load the plugin into FM27; the full package ships them unchanged
  (see `plugin/packaging/THIRD-PARTY-NOTICES.txt`).
- FM27 role names and their key/preferred attributes were transcribed from the game by the **FM Player Analyzer** project
  (ElectroHugin). This tool uses those game facts in its own format.
- FM27 tactics screen research (instruction names and screen order) from the community projects *FM27-apka* and
  *fm-ai-assistent*.
- Fonts embedded in the page, all under the **SIL Open Font License 1.1** (`plugin/packaging/licenses/OFL-1.1.txt`):
  **Space Grotesk** (headings), **Bebas Neue** (section numbers, wordmark) and **VT323** (the scoreboard).
- The crest is this project's own artwork.
- Not affiliated with or endorsed by Sports Interactive or SEGA. Football Manager is a trademark of Sports Interactive.

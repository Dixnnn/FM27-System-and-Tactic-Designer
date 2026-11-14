# Setting up the squad view in FM27

The plugin (F8) and FM View Exporter (F9) read **exactly the columns you can see** in the squad table. So the table needs to
show every column the Tactic Builder uses. You only do this once: FM27 remembers the view.

There are three ways to get the view:

- **The built-in view (plugin):** the plugin copies its view into FM27's `views` folder as
  `FM27 Tactic Builder - Squad.fmf` (in the game it's called **FM27TFT**). On the **Squad** screen open the table's view menu, choose **Import View…** and pick it. Done.
- **Option A (quickest by hand):** import the free ready-made view that comes with FM View Exporter, then add 2 extra columns.
- **Option B:** build the view yourself from the list below (about 10 minutes).

FM27's `.fmf` view format is the game's own: a view file can only be made inside the game. That's why the built-in view
starts as a view someone made in FM27 and exported (see [Sharing your view](#sharing-your-view-so-it-can-be-built-in)).

---

## Option A: import the ready-made view, then add 2 columns

1. Download **`FM27-PlayerAnalyzer-Squad-Standard.fmf`** from the FM View Exporter project
   (github.com/ElectroHugin/FM-View-Exporter → folder `views/fm27`). The exporter's setup can also copy it into
   your FM27 `views` folder for you.
2. In FM27 go to **Squad**. Open the view menu of the player table (the views drop-down at its top-left; custom views
   are grouped under *Custom Views*) and choose **Import View…**, then pick that file. It is called
   *Player Analyzer – Squad Standard* in the game. It already has all 47 attributes, positions, best position, best role,
   feet, height, personality, club, agreed playing time and the player status column.
3. Add these 2 columns. **Right-click any column header › Insert Column**, then follow the path:

   | Column | Menu path (after *Insert Column*) | Why the tool wants it |
   | --- | --- | --- |
   | Player Trait | Training › Player Trait | Player instructions and trait clashes |
   | Injury | Fitness and Injuries › Injury | Injured players are left out of the XI |

   Don't bother with *CON* (condition) or *Fatigue*: FM27 shows them as icons, so the export leaves them empty.

4. Keep it as your own custom view (FM27 saves changes to a custom view; use the view menu's create/rename options if you
   want a separate copy called *Tactic Builder*). *Export Current View…* in the same menu saves it as a file as well.

## Option B: build the view yourself

Start from any squad view, remove the columns you don't need (right-click a header › Remove Column), then add the ones
below with **right-click a column header › Insert Column**. The *Player* name column is always there.
The order of the columns doesn't matter: the tool finds them by name.

**General**
Unique ID · Position · Age · Height · Preferred Foot · Left Foot · Right Foot · Personality · Player Status (shows as `Inf`)

**Club** and **Transfer**
Club (Club › Club) · Agreed Playing Time (Transfer › Agreed Playing Time, shows as `Playing Time`). Together these tell the
tool which players are out on loan, so it never picks them.

**Ability and Roles**
Assistant manager's opinion of this player's best position (`Best Pos`) · Assistant manager's opinion of this player's best tactical role (`Best Role`)

**Attributes › Technical**
Corners · Crossing · Dribbling · Finishing · First Touch · Free Kicks · Heading · Long Shots · Long Throws · Marking ·
Passing · Penalty Taking · Tackling · Technique

**Attributes › Mental**
Aggression · Anticipation · Bravery · Composure · Concentration · Decisions · Determination · Flair · Leadership ·
Off The Ball · Positioning · Teamwork · Vision · Work Rate

**Attributes › Physical**
Acceleration · Agility · Balance · Jumping Reach · Natural Fitness · Pace · Stamina · Strength

**Attributes › Goalkeeping**
Aerial Reach · Command Of Area · Communication · Eccentricity · Handling · Kicking · One on Ones · Punching (Tendency) ·
Reflexes · Rushing out (Tendency) · Throwing

**Fitness and Injuries**
Injury

**Training**
Player Trait

That is about 64 columns. FM27 only fills roughly the first 255 columns of a view, so keep the view to these and you'll
be well inside the limit.

## Checking it worked

Press **F8** on the squad screen (with the plugin), or press **F9** and drop the file on the Tactic Builder. If anything is missing, the report's last
section ("About your data") lists exactly which columns to add and where they are in the *Insert Column* menu.

## Shortlists and player searches (for signings)

FM27 keeps separate views per screen, so the squad view doesn't appear on the shortlist or in a player search. For
**F8 on a shortlist or player search** (signings), give that screen a view with the attributes too. The quickest way: import
FM View Exporter's ready-made *Player Analyzer – Shortlist Standard* or *Player Database Standard* view
(github.com/ElectroHugin/FM-View-Exporter → `views/fm27`). Scouted players often show attributes as ranges (`11-14`); the
tool scores the middle and shows the spread as ±.

## Sharing your view so it can be built in

1. Set the view up as in Option A or B, on the **Squad** screen.
2. Give it a clear name: in the view menu, create or rename the custom view as **FM27 Tactic Builder**.
3. In the same view menu choose **Export Current View…** and save the file (FM27 suggests a folder; any folder is fine).
4. Send that `.fmf` file. It goes into the repository as `plugin/views/squad.fmf`; the next plugin build carries it, and every
   install copies it into FM27's `views` folder (see [plugin/views/README.md](../plugin/views/README.md)).

## Menu names may shift after a patch

These paths were taken from FM27's *Insert Column* menu as catalogued by the FM View Exporter project
(`docs/columns/fm27-menu.csv` there). If a patch renames something, look for the nearest match; the tool also accepts
older column names and FM24-style abbreviations (`Acc`, `Pac`, `Wor`, …).

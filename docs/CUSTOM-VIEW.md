# Setting up the squad view in FM27

The export plugin saves **exactly the columns you can see** in the squad table. So before you press F9, the table needs to
show every column the Tactic Builder uses. You only do this once: FM27 remembers the view.

FM27 can't produce a view file for you to download from here (its `.fmf` view format is the game's own), so there are two ways
to get the view:

- **Option A (quickest):** import the free ready-made view that comes with FM View Exporter, then add 4 extra columns.
- **Option B:** build the view yourself from the list below (about 10 minutes).

---

## Option A: import the ready-made view, then add 4 columns

1. Download **`FM27-PlayerAnalyzer-Squad-Standard.fmf`** from the FM View Exporter project
   (github.com/ElectroHugin/FM-View-Exporter → folder `views/fm27`). The exporter's setup can also copy it into
   your FM27 `views` folder for you.
2. In FM27 go to **Squad**. Open the view menu of the player table (the views drop-down at its top-left; custom views
   are grouped under *Custom Views*) and choose **Import View…**, then pick that file. It is called
   *Player Analyzer – Squad Standard* in the game. It already has all 47 attributes, positions, best position, best role,
   feet, height, personality and the player status column.
3. Add these 4 columns. **Right-click any column header › Insert Column**, then follow the path:

   | Column | Menu path (after *Insert Column*) | Why the tool wants it |
   | --- | --- | --- |
   | Player Trait | Training › Player Trait | Player instructions and role choice |
   | CON | Fitness and Injuries › Overall Physical Condition | Fitness notes |
   | Injury | Fitness and Injuries › Injury | Injured players are left out of the XI |
   | Fatigue | Fitness and Injuries › Fatigue | Fitness notes |

4. Keep it as your own custom view (FM27 saves changes to a custom view; use the view menu's create/rename options if you
   want a separate copy called *Tactic Builder*). *Export Current View…* in the same menu saves it as a file as well.

## Option B: build the view yourself

Start from any squad view, remove the columns you don't need (right-click a header › Remove Column), then add the ones
below with **right-click a column header › Insert Column**. The *Player* name column is always there.
The order of the columns doesn't matter: the tool finds them by name.

**General**
Unique ID · Position · Age · Height · Preferred Foot · Left Foot · Right Foot · Personality · Player Status (shows as `Inf`)

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
Overall Physical Condition (`CON`) · Injury · Fatigue

**Training**
Player Trait

That is about 64 columns. FM27 only fills roughly the first 255 columns of a view, so keep the view to these and you'll
be well inside the limit.

## Checking it worked

Press **F9** on the squad screen, then drop the file on the Tactic Builder. If anything is missing, the report's last
section ("About your data") lists exactly which columns to add and where they are in the *Insert Column* menu.

## Menu names may shift after a patch

These paths were taken from FM27's *Insert Column* menu as catalogued by the FM View Exporter project
(`docs/columns/fm27-menu.csv` there). If a patch renames something, look for the nearest match; the tool also accepts
older column names and FM24-style abbreviations (`Acc`, `Pac`, `Wor`, …).

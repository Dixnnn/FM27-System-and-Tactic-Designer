# The built-in squad view

Put the FM27 view file here as **`squad.fmf`**. The build embeds it in the plugin DLL, and the plugin copies it at
start to:

- `Documents\Sports Interactive\Football Manager 27\views\FM27 Tactic Builder - Squad.fmf` (every FM27 user folder it
  finds), so *Import View…* in the squad table's view menu shows it straight away;
- `Documents\Sports Interactive\FM27 Tactic Builder\views\` as a spare copy.

It never overwrites or deletes another view, and can be switched off with `InstallView = false` in the settings.

`.fmf` is FM27's own file format: it can only be made in the game (view menu › *Export Current View…*). The columns it
should have are listed in [docs/CUSTOM-VIEW.md](../../docs/CUSTOM-VIEW.md). Until a `squad.fmf` is here, the plugin works
with any view that has those columns, and says so in `BepInEx\LogOutput.log`.

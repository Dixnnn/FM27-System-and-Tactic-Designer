FM27 Tactic Builder
===================

Reads your squad inside Football Manager 27 and designs a complete tactic for
it: formations and roles in and out of possession, team and player
instructions, depth, set pieces and alternatives. The tactic opens as a page
in your browser; you enter the settings in FM27 by hand.

Free software under the GNU GPL v3 (LICENSE.txt). The squad reader is based on
FM View Exporter by ElectroHugin. Not affiliated with Sports Interactive or SEGA.

The plugin only reads what the game shows on screen. It never changes a save
game, never edits game files and never connects to the internet.

Installation
------------
Easiest: run FM27TacticBuilder-<version>-setup.exe, click Install, done.

By hand (full package):
1. Steam: right-click Football Manager 27 > Manage > Browse local files.
2. Extract the whole content of the full-package zip into that folder.
   winhttp.dll and the BepInEx folder must sit right next to fm.exe.
3. Start the game. The first start takes a few minutes because BepInEx
   prepares itself once (it downloads Unity base files from
   unity.bepinex.dev once; that is BepInEx, not this plugin).

Already using FM View Exporter? Both work side by side: F9 there, F8 here.

Use it
------
1. On the Squad screen open the table's view menu, choose Import View... and pick
   "FM27 Tactic Builder - Squad.fmf" (once); in the game the view is called
   FM27TFT. The plugin copies it to
   Documents\Sports Interactive\Football Manager 27\views and to
   Documents\Sports Interactive\FM27 Tactic Builder\views.
2. With your squad on screen press F8. Don't click until the message in the
   top right corner changes. Your tactic opens in your browser.
3. Looking for signings? Press F8 on your shortlist or a player search: the
   page opens with those players scored in your tactic's positions and roles.
   (Read your squad with F8 first. The list's view needs the attributes.)

Keys
----
F8              squad screen: build your tactic and open it
                shortlist / player search: score those players as signings
Ctrl+F8         only save the list as CSV (squad, player database, shortlist)
Ctrl+Shift+F8   UI dump for troubleshooting after a game patch

Files go to Documents\Sports Interactive\FM27 Tactic Builder:
  FM27 Tactic Builder.html   your tactic (the latest squad you read)
  exports\                   every list you read, as CSV (earlier squad reads
                             are used to show who is improving)
  views\                     the squad view
  Diagnostics\               UI dumps

Settings: run the setup again (Settings tab), or edit
BepInEx\config\fm27.tacticbuilder.cfg (created on the first start).
If something goes wrong, look at BepInEx\LogOutput.log in the game folder.

Uninstall
---------
Run the setup and click Uninstall. By hand: delete the folder
BepInEx\plugins\FM27TacticBuilder. Without other mods you can also delete
winhttp.dll, doorstop_config.ini, .doorstop_version, changelog.txt and the
folders BepInEx and dotnet next to fm.exe. Your saves are not affected.

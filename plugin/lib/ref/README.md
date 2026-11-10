# Reference assemblies

These DLLs only describe interfaces (classes, methods, properties); they contain no program code. They are needed to
compile the plugin. At run time the plugin uses the real files that BepInEx creates or brings on the player's PC.
Taken over unchanged from FM View Exporter (github.com/ElectroHugin/FM-View-Exporter, `lib/ref`).

| Folder | Source |
| --- | --- |
| `fm27/` | Interop assemblies that BepInEx generates from Football Manager 27 (Unity 6000.3.18f1); only Unity and .NET base libraries, no Sports Interactive libraries. |
| `bepinex-be755/` | BepInEx 6.0.0-be.755 (LGPL-2.1) and Il2CppInterop (LGPL-3.0) from the same build. |

Make them again, for example for an FM patch that changes Unity, or a new BepInEx build:

```
./tools/make-refs.sh "<game folder>" fm27 be755
```

BepInEx must have started the game once, so that `BepInEx/interop` exists.

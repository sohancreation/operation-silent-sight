# Operation Silent Sight (prototype)

Minimal Unity scaffolding for the eye-controlled defense shooter concept. This is a code-only vertical slice that you can open in Unity 2022 LTS (or later) to wire up scenes, prefabs, and eye-tracking SDK of choice.

## How to run
1. Open this folder as a Unity project (2022.3 LTS recommended).
2. Create a canvas with a reticle `RectTransform` and attach `EyeAimingController` (plus `DummyEyeInput` for non-eye hardware).
3. Add `EyeCombatController` to the player rig and assign the aiming component, a `WeaponConfig` asset, and `MissionManager`.
4. Build NavMesh, create enemy prefabs with `EnemyHealth` + `EnemyController`, and tag head colliders as `Head` for multipliers.
5. Create `MissionDefinition` assets for each level (waves, objectives, accuracy requirement) and link to `MissionManager`.
6. Use the dummy input for keyboard/mouse: left click = fire, double click within 0.25s = reload, hold click ~0.6s = special.

## Folder map
- `Assets/Scripts/EyeControl`: input abstraction + dummy fallback.
- `Assets/Scripts/Systems`: aiming, combat, mission, scoreboard.
- `Assets/Scripts/Enemies`: basic health + NavMesh-driven controller.
- `Assets/ScriptableObjects`: configs for missions and weapons.

## Next steps
- Replace `DummyEyeInput` with your eye-tracking provider (e.g., Tobii XR, OpenXR eye gaze) by implementing `IEyeInput`.
- Build level prefabs per design doc: Training Facility, Checkpoint Defense, Drone Assault, Base Breach, Night Operation.
- Hook friend-or-foe penalties and civilian detection via collider tags and `MissionManager.OnMissionFail`.
- Add VFX/UI polish: thermal overlay on long blink, reticle bloom feedback, combo meter, headshot callouts.

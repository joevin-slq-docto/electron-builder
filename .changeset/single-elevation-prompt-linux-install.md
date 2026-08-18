---
"electron-updater": patch
---

fix: ask for authentication once per Linux package install. Before, `DebUpdater` ran `dpkg -i` and, on any failure, `apt-get install -f -y` as a **second** privileged call; `PacmanUpdater` did the same with `pacman -Sy` and a retry. Dismissing the authentication dialog counts as a failure, so cancelling an update immediately raised a second dialog — for a command the user never asked for. Telling the two cases apart from the exit code is not possible across helpers: of those `determineSudoCommand` picks from, only pkexec documents a distinct code for a dismissed dialog (126), while gksudo, kdesudo, beesu and sudo exit with 1 both when the user cancels and when the command itself fails. After, the repair is chained to the install inside the same privileged invocation (`dpkg -i … || apt-get install -f -y`), so a dismissed prompt runs neither command and a genuine dependency failure is still repaired — with a single authentication for the whole install.

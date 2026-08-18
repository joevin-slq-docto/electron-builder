import { AllPublishOptions } from "builder-util-runtime"
import { AppAdapter } from "./AppAdapter.js"
import { DownloadUpdateOptions } from "./AppUpdater.js"
import { InstallOptions } from "./BaseUpdater.js"
import { DOWNLOAD_PROGRESS, Logger } from "./types.js"
import { findFile } from "./providers/Provider.js"
import { LinuxUpdater, withFallback } from "./LinuxUpdater.js"

export class PacmanUpdater extends LinuxUpdater {
  constructor(options?: AllPublishOptions | null, app?: AppAdapter) {
    super(options, app)
  }

  /*** @private */
  protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>> {
    const provider = downloadUpdateOptions.updateInfoAndProvider.provider
    const fileInfo = findFile(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"])!
    return this.executeDownload({
      fileExtension: "pacman",
      fileInfo,
      downloadUpdateOptions,
      task: async (updateFile, downloadOptions) => {
        if (this.listenerCount(DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = it => this.emit(DOWNLOAD_PROGRESS, it)
        }
        await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions)
      },
    })
  }

  protected doInstall(options: InstallOptions): boolean {
    const installerPath = this.installerPath
    if (installerPath == null) {
      this.dispatchError(new Error("No update filepath provided, can't quit and install"))
      return false
    }
    try {
      PacmanUpdater.installWithCommandRunner(installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger)
    } catch (error: any) {
      this.dispatchError(error)
      return false
    }
    if (options.isForceRunAfter) {
      this.app.relaunch() // note: `app` is undefined in tests since vite doesn't run in electron
    }
    return true
  }

  static installWithCommandRunner(installerPath: string, commandRunner: (commandWithArgs: string[]) => void, logger: Logger) {
    logger.info("Installing with pacman, refreshing the package database and retrying once if it fails")
    const install = ["pacman", "-U", "--noconfirm", installerPath]
    // If the install fails, refresh the package database (not a full upgrade, just sync) and retry — as one
    // invocation, so the whole install needs a single authentication
    commandRunner(withFallback(install, ["(", "pacman", "-Sy", "--noconfirm", "&&", ...install, ")"]))
  }
}

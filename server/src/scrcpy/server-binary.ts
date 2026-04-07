import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { Readable } from "node:stream";

import type { Adb } from "@yume-chan/adb";
import { AdbScrcpyClient } from "@yume-chan/adb-scrcpy";
import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";

export async function pushScrcpyServer(adb: Adb, serverFile: string, serverPath: string): Promise<void> {
  await access(serverFile, constants.R_OK);

  const serverStream = Readable.toWeb(createReadStream(serverFile)) as unknown as ReadableStream<
    MaybeConsumable<Uint8Array>
  >;
  await AdbScrcpyClient.pushServer(adb, serverStream, serverPath);
}

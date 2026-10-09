import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontEndDirectory = path.resolve(scriptDirectory, "..");
const release = JSON.parse(
  await readFile(
    path.join(frontEndDirectory, "src", "release", "androidBetaRelease.json"),
    "utf8",
  ),
);
const source = path.join(
  frontEndDirectory,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "staging",
  "release",
  "app-staging-release.apk",
);
const destinationDirectory = path.join(frontEndDirectory, "dist", "downloads");
const destination = path.join(destinationDirectory, release.fileName);
const sourceBytes = await readFile(source);
const sha256 = createHash("sha256").update(sourceBytes).digest("hex").toUpperCase();
const sourceStats = await stat(source);

if (release.sha256 !== sha256) {
  throw new Error(
    `Release SHA-256 mismatch. Metadata has ${release.sha256}; APK has ${sha256}.`,
  );
}
if (release.sizeBytes !== sourceStats.size) {
  throw new Error(
    `Release size mismatch. Metadata has ${release.sizeBytes}; APK has ${sourceStats.size}.`,
  );
}

await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, destination);
await writeFile(
  path.join(destinationDirectory, "android-beta.json"),
  `${JSON.stringify(release, null, 2)}\n`,
  "utf8",
);

console.log(`Prepared ${destination}`);
console.log(`SHA-256 ${sha256}`);

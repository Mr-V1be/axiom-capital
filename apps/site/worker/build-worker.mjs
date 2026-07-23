import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../.open-next/", import.meta.url));
const assets = fileURLToPath(new URL("../.open-next/assets/", import.meta.url));
const webBuild = fileURLToPath(new URL("../../web/dist/", import.meta.url));
const worker = fileURLToPath(new URL("./worker.js", import.meta.url));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(webBuild, assets, { recursive: true });
await cp(worker, `${output}/worker.js`);

console.info("Static edge worker assembled in .open-next.");

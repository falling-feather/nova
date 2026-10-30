/* Explicit CC0 runtime sources. Preserve original files and verify provider digests. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  target = path.join(root, "assets", "pbr");
const selected = [
  ["grass_ground", "Charlotte Baglioni", ["Diffuse", "nor_gl"]],
];
(async () => {
  fs.mkdirSync(target, { recursive: true });
  const records = [];
  for (const [id, author, channels] of selected) {
    const r = await fetch("https://api.polyhaven.com/files/" + id);
    if (!r.ok) throw Error(id + ": " + r.status);
    const manifest = await r.json();
    for (const channel of channels) {
      const entry = manifest[channel]["1k"].jpg,
        file = id + "-" + channel + ".jpg",
        destination = path.join(target, file);
      let bytes;
      if (fs.existsSync(destination)) bytes = fs.readFileSync(destination);
      else {
        const asset = await fetch(entry.url);
        if (!asset.ok) throw Error(entry.url + ": " + asset.status);
        bytes = Buffer.from(await asset.arrayBuffer());
      }
      const md5 = crypto.createHash("md5").update(bytes).digest("hex");
      if (md5 !== entry.md5) throw Error("Asset digest mismatch: " + file);
      fs.writeFileSync(destination, bytes);
      records.push({
        id,
        channel,
        file: "assets/pbr/" + file,
        author,
        license: "CC0-1.0",
        licenseSource: "https://polyhaven.com/license",
        source: "https://polyhaven.com/a/" + id,
        download: entry.url,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      });
    }
  }
  fs.writeFileSync(
    path.join(target, "sources.json"),
    JSON.stringify(
      { acquired: new Date().toISOString().slice(0, 10), files: records },
      null,
      2,
    ) + "\n",
  );
  console.log("Verified " + records.length + " CC0 material maps.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

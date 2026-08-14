// react-native-calendars pulls in its own nested copies of several packages it shares with the
// rest of the app (react, react-native, scheduler, ...) via a transitive devDependency chain
// unrelated to anything it actually needs at runtime. Having two copies of react/react-native in
// the bundle causes hook-dispatcher mismatches ("Invalid hook call") and, for react-native
// itself, version-mismatched syntax Metro can't parse. Deleting any nested package that's also
// present at the workspace root is the reliable fix — Node/Metro then falls through to the one
// real copy. Safe to run on every install; no-ops if the path isn't there.
const fs = require("fs");
const path = require("path");

const rootNodeModules = path.resolve(__dirname, "..", "node_modules");
const nestedNodeModules = path.join(rootNodeModules, "react-native-calendars", "node_modules");

if (!fs.existsSync(nestedNodeModules)) process.exit(0);

for (const entry of fs.readdirSync(nestedNodeModules)) {
  const nestedPath = path.join(nestedNodeModules, entry);
  const rootPath = path.join(rootNodeModules, entry);
  if (fs.existsSync(rootPath)) {
    fs.rmSync(nestedPath, { recursive: true, force: true });
    console.log(`Removed duplicate nested "${entry}" from react-native-calendars.`);
  }
}

// react-native-calendars pulls in its own nested copy of react-native via a transitive
// devDependency chain (unrelated to anything it actually needs at runtime). That nested copy's
// version doesn't match this project's, and Metro's normal hierarchical module resolution finds
// it first for files inside that package, causing a syntax error at bundle time. Deleting the
// duplicate is the reliable fix — Node/Metro then naturally falls through to the one real copy
// at the workspace root. Safe to run on every install; no-ops if the path isn't there.
const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "..", "node_modules", "react-native-calendars", "node_modules", "react-native");

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log("Removed duplicate nested react-native copy from react-native-calendars.");
}

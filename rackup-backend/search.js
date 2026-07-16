const { execSync } = require('child_process');

const query = process.argv[2] || '';
try {
  const result = execSync(g --json -C 2 "", { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.log("No results or error:", e.message);
}

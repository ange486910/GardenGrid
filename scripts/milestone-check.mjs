import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const CODE = /\.(js|mjs|cjs|sql|css|html)$/;
const root = git(['rev-list', '--max-parents=0', 'HEAD']);
const tags = git(['tag', '--list', 'm*'])
  .split(/\r?\n/)
  .filter(Boolean)
  .sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));

function stats(from, to) {
  const output = git(['diff', '--numstat', `${from}..${to}`]);
  let churn = 0;
  let files = 0;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [added, removed, path] = line.split('\t');
    if (!path || !CODE.test(path)) continue;
    churn += (added === '-' ? 0 : Number(added)) + (removed === '-' ? 0 : Number(removed));
    files += 1;
  }
  return { churn, files };
}

if (tags.length === 0) {
  console.log(JSON.stringify({ status: 'pending', message: 'no milestone tags yet' }, null, 2));
  process.exit(0);
}

const milestones = tags.map((tag, index) => {
  const from = index === 0 ? root : tags[index - 1];
  const result = stats(from, tag);
  return { tag, from, to: tag, ...result, meetsFloor: result.churn >= 1500 && result.files >= 10 };
});
const afterLast = stats(tags[tags.length - 1], 'HEAD');
const problems = [];
if (tags.length < 6) problems.push(`expected at least 6 milestones, found ${tags.length}`);
for (const milestone of milestones) {
  if (!milestone.meetsFloor) problems.push(`${milestone.tag} changes ${milestone.churn} code lines across ${milestone.files} files`);
}
if (afterLast.churn > 0) problems.push(`source changes after ${tags[tags.length - 1]}: ${afterLast.churn} lines`);

console.log(JSON.stringify({ status: problems.length === 0 ? 'ok' : 'failed', milestones, afterLast, problems }, null, 2));
if (problems.length > 0) process.exit(1);

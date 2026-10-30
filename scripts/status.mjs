import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const CODE = /\.(js|mjs|cjs|sql|css|html)$/;
const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
const codeFiles = tracked.filter((file) => CODE.test(file));
let loc = 0;
for (const file of codeFiles) loc += readFileSync(file, 'utf8').split(/\r?\n/).length;
const commits = Number(git(['rev-list', '--count', 'HEAD']));
const tags = git(['tag', '--list', 'm*']).split(/\r?\n/).filter(Boolean).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
const root = git(['rev-list', '--max-parents=0', 'HEAD']);

function stats(from, to) {
  const out = git(['diff', '--numstat', `${from}..${to}`]);
  let churn = 0;
  let files = 0;
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [added, removed, path] = line.split('\t');
    if (!path || !CODE.test(path)) continue;
    churn += (added === '-' ? 0 : Number(added)) + (removed === '-' ? 0 : Number(removed));
    files += 1;
  }
  return { churn, files };
}

const milestones = tags.map((tag, index) => {
  const from = index === 0 ? root : tags[index - 1];
  const stat = stats(from, tag);
  return { tag, from, to: tag, ...stat, meetsFloor: stat.churn >= 1500 && stat.files >= 10 };
});
const targets = { commits: 30, codeFiles: 100, codeLines: 10500, milestones: 7 };
const undersized = milestones.filter((milestone) => !milestone.meetsFloor);
const complete = commits >= targets.commits && codeFiles.length >= targets.codeFiles && loc >= targets.codeLines && tags.length >= targets.milestones && undersized.length === 0;
console.log(JSON.stringify({
  status: complete ? 'complete' : 'in-progress',
  commits, codeFiles: codeFiles.length, codeLines: loc, milestones,
  targets,
  remaining: {
    commits: Math.max(0, targets.commits - commits),
    codeFiles: Math.max(0, targets.codeFiles - codeFiles.length),
    codeLines: Math.max(0, targets.codeLines - loc),
    milestones: Math.max(0, targets.milestones - tags.length)
  },
  undersizedMilestones: undersized.map((milestone) => milestone.tag)
}, null, 2));
if (undersized.length > 0) process.exit(1);


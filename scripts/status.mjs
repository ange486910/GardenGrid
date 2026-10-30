import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const CODE = /\.(js|mjs|cjs|sql|css|html)$/;
const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
const codeFiles = tracked.filter((file) => CODE.test(file));
let loc = 0;
for (const file of codeFiles) {
  const { readFileSync } = await import('node:fs');
  loc += readFileSync(file, 'utf8').split(/\r?\n/).length;
}
const commits = Number(git(['rev-list', '--count', 'HEAD']));
const tags = git(['tag', '--list', 'm*']).split(/\r?\n/).filter(Boolean);
const targets = { commits: 30, codeFiles: 100, codeLines: 9000, milestones: 6 };
const status = {
  status: commits >= targets.commits && codeFiles.length >= targets.codeFiles && loc >= targets.codeLines && tags.length >= targets.milestones ? 'complete' : 'in-progress',
  commits,
  codeFiles: codeFiles.length,
  codeLines: loc,
  milestones: tags,
  targets,
  remaining: {
    commits: Math.max(0, targets.commits - commits),
    codeFiles: Math.max(0, targets.codeFiles - codeFiles.length),
    codeLines: Math.max(0, targets.codeLines - loc),
    milestones: Math.max(0, targets.milestones - tags.length)
  }
};
console.log(JSON.stringify(status, null, 2));

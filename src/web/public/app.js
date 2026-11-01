import { mountGardenWorkspace } from './garden-workspace.js';

const root = document.querySelector('[data-workspace="garden"]');
if (root) {
  mountGardenWorkspace(root).then((workspace) => workspace.refresh()).catch((error) => {
    const status = root.querySelector('[data-role="status"]');
    if (status) status.textContent = error.message;
  });
}

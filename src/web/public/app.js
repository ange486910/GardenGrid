import { mountGardenWorkspace } from './garden-workspace.js';
import { setGardenConnection } from './garden-accessibility.js';

const root = document.querySelector('[data-workspace="garden"]');
if (root) {
  setGardenConnection(root, navigator.onLine);
  window.addEventListener('online', () => setGardenConnection(root, true));
  window.addEventListener('offline', () => setGardenConnection(root, false));
  mountGardenWorkspace(root).then((workspace) => workspace.refresh()).catch((error) => {
    const status = root.querySelector('[data-role="status"]');
    if (status) status.textContent = error.message;
  });
}

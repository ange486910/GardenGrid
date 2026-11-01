export function gardenQuantity(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 1_000_000 ? number : null;
}

export function gardenFormValue(form, name) {
  return form?.querySelector(`[name="${name}"]`)?.value ?? '';
}

export function setGardenFormBusy(form, busy) {
  if (!form) return;
  for (const control of form.querySelectorAll('input, select, button')) control.disabled = busy;
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
}

export function createGardenSubmissionGuard() {
  let active = false;
  return async function run(task) {
    if (active) return false;
    active = true;
    try { await task(); return true; } finally { active = false; }
  };
}

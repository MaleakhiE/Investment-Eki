import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('OBJ-104: budget status conveyed without color alone', () => {
  it('exposes the progress bar as an accessible progressbar with a stateful label', () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow=');
    expect(source).toContain('aria-valuemin={0}');
    expect(source).toContain('aria-valuemax={100}');
    // The label must name the state beyond color (over budget / nearing limit).
    expect(source).toContain("aria-label={`Budget usage for ${budget.category}");
    expect(source).toContain("over budget' : budget.percentage >= 80 ? ', nearing limit'");
  });

  it('labels remaining/over status with text alongside color', () => {
    // Visible word "Remaining"/"Over" already carried the state; ensure an
    // aria-label summarizes the state so it is not conveyed by color alone.
    expect(source).toContain('aria-label={budget.remaining > 0');
    expect(source).toContain('Still within budget, remaining');
    expect(source).toContain('Over budget by');
  });
});

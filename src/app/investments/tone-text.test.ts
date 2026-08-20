import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/investments/page.tsx'), 'utf8');

describe('OBJ-104: investment gain/loss tone conveyed without color alone', () => {
  it('maps each tone to a textual state word', () => {
    expect(source).toContain("function toneWord(tone: 'neutral' | 'positive' | 'negative'): string");
    expect(source).toContain("if (tone === 'positive') return 'Untung';");
    expect(source).toContain("if (tone === 'negative') return 'Rugi';");
    expect(source).toContain("return 'Netral';");
  });

  it('renders the textual tone word for every investment-return display', () => {
    // Gold summary card
    expect(source).toContain('${toneWord(goldReturn.tone)}:');
    // Mutual fund summary card
    expect(source).toContain('${toneWord(mfReturn.tone)}:');
    // Gain/loss preview
    expect(source).toContain('${toneWord(previewPresentation.tone)}:');
  });
});

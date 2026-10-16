import { describe, expect, it } from 'vitest';
import { BridgeUnitSchema } from '@jab/contracts';
import { bridgePrerequisites, bridgeUnits } from './content.js';
describe('Java bridge static curriculum', () => {
  it('provides exactly J1—J8, complete validated predictions and links', () => {
    expect(bridgeUnits.map(u => u.id)).toEqual(['J1','J2','J3','J4','J5','J6','J7','J8']);
    for (const unit of bridgeUnits) {
      expect(BridgeUnitSchema.parse(unit)).toEqual(unit);
      for (const problem of unit.relatedProblems) expect(bridgePrerequisites[problem]).toContain(unit.id);
    }
    expect(Object.keys(bridgePrerequisites)).toHaveLength(19);
  });
  it('keeps object/variable, pass-by-value and Unicode caveats explicit', () => {
    expect(bridgeUnits[2]!.explanation).toContain('参数始终按值传递');
    expect(bridgeUnits[3]!.explanation).toContain('不总是完整 Unicode 字符');
    expect(bridgeUnits[5]!.explanation).toContain('不自动删除或回收');
    expect(bridgeUnits[7]!.explanation).toContain('静态检查');
  });
});

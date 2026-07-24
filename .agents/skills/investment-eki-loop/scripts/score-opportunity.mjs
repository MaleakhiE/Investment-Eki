#!/usr/bin/env node

const names = [
  'userValue',
  'correctness',
  'security',
  'uxImpact',
  'architecturalFit',
  'testability',
  'deliveryConfidence',
  'maintenanceScore',
  'dependencyScore',
];

const values = process.argv.slice(2).map(Number);

if (values.length !== names.length || values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
  console.error(`Usage: node score-opportunity.mjs ${names.join(' ')}`);
  console.error('Provide exactly nine integer scores from 1 to 5.');
  process.exit(1);
}

const [
  userValue,
  correctness,
  security,
  uxImpact,
  architecturalFit,
  testability,
  deliveryConfidence,
  maintenanceScore,
  dependencyScore,
] = values;

const priority =
  userValue * 3 +
  correctness * 3 +
  security * 3 +
  uxImpact * 2 +
  architecturalFit * 2 +
  testability * 2 +
  deliveryConfidence * 2 +
  maintenanceScore +
  dependencyScore;

console.log(JSON.stringify({ priority, maximum: 95 }, null, 2));

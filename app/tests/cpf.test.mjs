import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCPF, isValidCPF, normalizeCPF } from '../src/utils/cpf.mjs';

test('CPF accepts check digits with or without formatting', () => {
  assert.equal(isValidCPF('123.456.789-09'), true);
  assert.equal(isValidCPF('98765432100'), true);
  assert.equal(normalizeCPF('123.456.789-09'), '12345678909');
});
test('CPF rejects incomplete, repeated and altered check digits', () => {
  for (const digit of '0123456789') assert.equal(isValidCPF(digit.repeat(11)), false);
  for (const invalid of ['', null, '123456789', '123456789090', '12345678900', '98765432101']) assert.equal(isValidCPF(invalid), false);
});
test('CPF mask supports progressive typing, deletion and paste', () => {
  for (const [value, expected] of [['', ''], [null, ''], ['1','1'], ['1234','123.4'], ['1234567','123.456.7'], ['12345678909','123.456.789-09'], ['123.456.789-09','123.456.789-09'], ['123456789090','123.456.789-09']]) assert.equal(formatCPF(value), expected);
});

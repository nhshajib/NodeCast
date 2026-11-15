import test from 'node:test';
import assert from 'node:assert/strict';
import { getTransition, setTransition, resetTransition, subscribeTransitions } from '../src/transitionConfig.ts';

test('root tabs switch immediately while drill-in screens slide', () => {
  for (const route of ['home', 'watch', 'saved', 'you', 'player', '']) assert.equal(getTransition(route), 'none');
  for (const route of ['details', 'series', 'players', 'backup', 'privacy', 'home-ip']) assert.equal(getTransition(route), 'slide');
  assert.equal(getTransition('future-details-screen'), 'slide');
});
test('a runtime route override is isolated, observable, idempotent and reversible', () => {
  let calls = 0;
  const unsubscribe = subscribeTransitions(() => { calls++; });
  try {
    setTransition('details', 'none');
    assert.equal(getTransition('details'), 'none');
    assert.equal(getTransition('series'), 'slide');
    assert.equal(calls, 1);
    setTransition('details', 'none');
    assert.equal(calls, 1);
    resetTransition('details');
    assert.equal(getTransition('details'), 'slide');
    assert.equal(calls, 2);
    resetTransition('details');
    assert.equal(calls, 2);
  } finally { unsubscribe(); resetTransition('details'); }
});
test('unsubscribed screens are not notified and tabs can opt into slide', () => {
  let calls = 0;
  const unsubscribe = subscribeTransitions(() => { calls++; });
  unsubscribe();
  try { setTransition('watch', 'slide'); assert.equal(getTransition('watch'), 'slide'); assert.equal(calls, 0); }
  finally { resetTransition('watch'); }
});
test('invalid configuration does not mutate a screen or notify consumers', () => {
  let calls = 0;
  const unsubscribe = subscribeTransitions(() => { calls++; });
  try {
    assert.throws(() => setTransition('details', 'flip'), /Supported transitions/);
    assert.throws(() => setTransition('  ', 'slide'), /screen name/);
    assert.equal(getTransition('details'), 'slide');
    assert.equal(calls, 0);
  } finally { unsubscribe(); }
});
test('inherited object keys are treated as route names, not configuration values', () => {
  assert.equal(getTransition('constructor'), 'slide');
  try { setTransition('__proto__', 'none'); assert.equal(getTransition('__proto__'), 'none'); }
  finally { resetTransition('__proto__'); }
});

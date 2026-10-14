import test from 'node:test';
import assert from 'node:assert/strict';
import {allowsPreviewHost} from '../lib/preview-access.mjs';
test('local mode allows loopback only on the actual port',()=>{
  assert.equal(allowsPreviewHost('127.0.0.1:4173',4173),true);
  assert.equal(allowsPreviewHost('localhost:4173',4173),true);
  assert.equal(allowsPreviewHost('localhost:9999',4173),false);
  assert.equal(allowsPreviewHost('192.168.0.100:4173',4173),false);
});
test('LAN mode accepts this computer addresses and rejects unrelated hosts',()=>{
  const addresses=['192.168.0.100'];
  assert.equal(allowsPreviewHost('192.168.0.100:4173',4173,addresses),true);
  assert.equal(allowsPreviewHost('192.168.0.101:4173',4173,addresses),false);
  assert.equal(allowsPreviewHost('attacker.example:4173',4173,addresses),false);
  assert.equal(allowsPreviewHost('attacker@localhost:4173',4173,addresses),false);
});

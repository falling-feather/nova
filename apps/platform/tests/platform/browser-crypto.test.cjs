const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const contract=require('../../../../shared/linkage/storage-contract.js');
test('HTTP LAN UUID fallback uses supplied secure bytes with UUIDv4 version and variant bits',()=>{
 let used=0;const value=contract.randomUUID({getRandomValues(bytes){used++;bytes.fill(255);return bytes;}});
 assert.equal(value,'ffffffff-ffff-4fff-bfff-ffffffffffff');assert.equal(used,1);
 assert.throws(()=>contract.randomUUID({getRandomValues(){throw Error('random unavailable');}}),/random unavailable/);
});
test('HTTP browser installs the UUID operation before the personal client loads, preserving native implementations',()=>{
 const source=fs.readFileSync(require.resolve('../../../../shared/linkage/storage-contract.js'),'utf8');
 const crypto={getRandomValues(bytes){bytes.fill(0);return bytes;}};const window={crypto};
 vm.runInNewContext(source,{window,Uint8Array});assert.equal(window.crypto.randomUUID(),'00000000-0000-4000-8000-000000000000');
 const native=()=> 'native';const nativeWindow={crypto:{randomUUID:native}};vm.runInNewContext(source,{window:nativeWindow,Uint8Array});assert.equal(nativeWindow.crypto.randomUUID,native);
});
test('bundled CommonJS wrappers initialize UUID before chapter seed modules evaluate',()=>{
 const source=fs.readFileSync(require.resolve('../../../../shared/linkage/storage-contract.js'),'utf8');
 const window={crypto:{getRandomValues(bytes){bytes.fill(2);return bytes;}}},module={exports:{}};
 vm.runInNewContext(source,{window,module,Uint8Array});assert.match(window.crypto.randomUUID(),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.equal(typeof module.exports.randomUUID,'function');
});

const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
test('browser SHA-256 matches native digests for empty data, padding boundaries and subarray views',async()=>{
 const {sha256Hex}=await import('../../../../shared/linkage/digest.mts');
 for(const size of [0,3,55,56,63,64,65,1024,65536]){
  const all=Uint8Array.from({length:size+12},(_,i)=>(i*17+31)%256),bytes=all.subarray(6,size+6);
  assert.equal(sha256Hex(bytes),createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(sha256Hex(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

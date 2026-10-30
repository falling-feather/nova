const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PlatformStore}=require('../../server/store.cjs');
const parent=path.resolve(__dirname,'../../.work');fs.mkdirSync(parent,{recursive:true});
const folder=fs.mkdtempSync(path.join(parent,'capacity-')),file=path.join(folder,'records.sqlite');
(async()=>{let time=1000000;const store=new PlatformStore(file,{now:()=>time});
try{
const {user}=await store.register({username:'capacity_probe',displayName:'容量采样',password:'temporary-test-password'});
const media='x'.repeat(1024*1024);
for(let i=0;i<40;i++){store.save(user.id,3,i,'capacity-operation-'+String(i).padStart(3,'0'),{records:{native:JSON.stringify({versions:['v1','v2'],evidence:['failure'],media,draft:i})},summary:null,artifacts:{}});time+=1000;}
const points=store.history(user.id,3),checkpointBytes=store.db.prepare('SELECT coalesce(sum(length(CAST(payload AS BLOB))),0) AS bytes FROM history').get().bytes;
assert.equal(points.length,1);assert.deepEqual(JSON.parse(store.load(user.id,3).payload.records.native).versions,['v1','v2']);store.close();
const result={autosaves:40,payloadMiB:1,recoveryPoints:points.length,recoveryMiB:Math.round(checkpointBytes/1048576*100)/100,databaseMiB:Math.round(fs.statSync(file).size/1048576*100)/100,checkpointLimits:{perChapterCount:3,intervalMinutes:5,perChapterMiB:16,perUserMiB:32},nativeVersionsPreserved:true};
fs.writeFileSync(path.join(parent,'capacity-summary.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{store.close();assert.equal(path.dirname(folder),parent);fs.rmSync(folder,{recursive:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

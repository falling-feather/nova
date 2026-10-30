const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../courses/source/app.js'),'utf8');
const registration=source.match(/media\.addEventListener\('change',[^\n]+/)[0];
function systemChange(embedded,choice,matches){
 let handler,updates=0;
 const context={embedded,reduced:true,safeRead:()=>choice,applyMotion:()=>updates++,media:{addEventListener(type,fn){assert.equal(type,'change');handler=fn;}}};
 vm.runInNewContext(registration,context);handler({matches});return {reduced:context.reduced,updates};
}
test('embedded atlas cannot override the host’s explicit reduced-motion preference on a system change',()=>{
 assert.deepEqual(systemChange(true,null,false),{reduced:true,updates:0});
});
test('standalone atlas follows the system only when no explicit preference is stored',()=>{
 assert.deepEqual(systemChange(false,null,false),{reduced:false,updates:1});
 assert.deepEqual(systemChange(false,'true',false),{reduced:true,updates:0});
});

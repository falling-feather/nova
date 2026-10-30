const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const viteFile=process.env.NOVA_VITE_MODULE||require.resolve('vite');
  const {build}=await import(pathToFileURL(viteFile).href);
  const source=path.resolve(__dirname,'../source');
  await build({configFile:false,root:source,publicDir:false,logLevel:'warn',build:{
    target:'es2022',outDir:path.join(source,'generated'),emptyOutDir:false,cssCodeSplit:false,sourcemap:false,
    lib:{entry:path.join(source,'backgrounds/index.js'),name:'NovaBackgrounds',formats:['iife'],fileName:()=> 'backgrounds.bundle.js'}
  }});
  console.log('Built local background renderer bundle.');
})().catch(error=>{console.error(error);process.exitCode=1;});

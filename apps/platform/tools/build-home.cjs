// Node equivalent of the original homepage embedder; sources and assets stay authoritative.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../source'),out=process.argv[2]?path.resolve(process.argv[2]):path.resolve(root,'../NOVA.html');
const mime=file=>({'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file).toLowerCase()]||'application/octet-stream';
const data=file=>'data:'+mime(file)+';base64,'+fs.readFileSync(file).toString('base64');
const media={};
for(const name of fs.readdirSync(path.join(root,'assets-rebuilt')).sort())if(name.endsWith('.webp'))media[path.parse(name).name]=data(path.join(root,'assets-rebuilt',name));
for(const name of fs.readdirSync(path.join(root,'assets-backgrounds')).sort())if(/\.(png|webp)$/i.test(name))media['bg-'+path.parse(name).name]=data(path.join(root,'assets-backgrounds',name));
const layers=JSON.parse(fs.readFileSync(path.join(root,'assets-rebuilt/layers.json'),'utf8'));
fs.mkdirSync(path.join(root,'generated'),{recursive:true});
fs.writeFileSync(path.join(root,'generated/media.js'),'window.NOVA_MEDIA='+JSON.stringify(media).replaceAll('<','\\u003c')+';\nwindow.NOVA_LAYERS='+JSON.stringify(layers).replaceAll('<','\\u003c')+';\n','utf8');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('data-course-href="../courses/index.html"','data-course-href="courses/index.html"');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_m,file)=>'<style>\n'+fs.readFileSync(path.join(root,file),'utf8')+'\n</style>');
html=html.replace(/<script defer src="([^"]+)"><\/script>/g,(_m,file)=>'<script>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
html=html.replace(/src="(assets-rebuilt\/[^"]+)"/g,(_m,file)=>'src="'+data(path.join(root,file))+'"');
if(/(?:src|href)="(?:https?:)?\/\//.test(html)||/<script[^>]+src=/.test(html))throw Error('Homepage contains an unbundled dependency');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html,'utf8');console.log('Built homepage with Node: '+fs.statSync(out).size+' bytes.');

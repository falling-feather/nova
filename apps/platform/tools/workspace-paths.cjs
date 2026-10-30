const path=require('node:path');
function within(root,file){const relative=path.relative(root,file);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
module.exports={within};

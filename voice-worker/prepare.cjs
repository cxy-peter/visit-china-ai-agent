const fs=require('node:fs');
fs.writeFileSync('dist-worker/package.json',JSON.stringify({type:'module',private:true}));

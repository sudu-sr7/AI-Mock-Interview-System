function mb(v){return Math.round(v/1024/1024*100)/100}
function fmt(mu){return Object.fromEntries(Object.entries(mu).map(([k,v])=>[k,mb(v)+'MB']))}
console.log('pid', process.pid);
console.log('before', fmt(process.memoryUsage()));
// allocate some objects
let a = [];
for(let i=0;i<1e6;i++) a.push({i});
console.log('after alloc', fmt(process.memoryUsage()));
// drop references
a = null;
if (global.gc) {
  global.gc();
  console.log('after gc', fmt(process.memoryUsage()));
} else {
  console.log('global.gc() unavailable — run with --expose-gc');
}
console.log('done');

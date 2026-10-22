'use strict';
const fs=require('fs'),path=require('path');
const {finalize}=require('../../../scripts/native_stage_flow.cjs');
const dir=path.resolve(process.argv[2]||process.cwd());
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const result=finalize(read('board.json'),read('design.json'),read('coords.json'),read('converted.json'));
for(const[name,value]of Object.entries({'board.openapi.json':result.raw,'semantic-map.json':result.semanticMap,'native-check.json':result.report,'native-geometry.json':result.geometry}))fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2));
console.log(JSON.stringify(result.report));

import { compile, compileFromFile } from 'json-schema-to-typescript'
import * as fs from "fs";
import { Dirent } from "fs"
import * as jsonfile from "jsonfile"
import {argv} from "yargs"

const output = argv["output"] as string;
const input = argv["input"] as string;

async function scanFolder (input:string):Promise<void> { 
  let files = fs.readdirSync(input, {withFileTypes:true});
  for(let file of files) {
    if (file.isDirectory()) {
      continue;
    }
    if(false == file.name.toLowerCase().endsWith(".json")) {
      continue;
    }
    var fullFilePath = `${input}/${file.name}`;
    console.info(fullFilePath);
    await processFile(fullFilePath);
  }
  for(let file of files) {
    if (file.isFile()) {
      continue;
    }
    var fullFilePath = `${input}/${file.name}`;
    await scanFolder(fullFilePath);
  } 
}
async function processFile (file:string):Promise<void> {
  const index = file.lastIndexOf("/");
  var workdir = "";
  var outdir = output;
  if(index>=0) {
    workdir = file.substr(0, index);
    outdir = output + "/" + workdir.substr(input.length);
  }
  let schema = jsonfile.readFileSync(file);
  var imports = await createImports(schema, file);
  var script = await compile(schema, 'MySchema', {
    cwd: workdir,
    bannerComment : imports,
    declareExternallyReferenced : false,
    style: {
      useTabs : true
    }
  });
  const filename = schema.title;
  fs.mkdirSync(outdir, { recursive: true });
  fs.writeFileSync( `${outdir}/${filename}.ts`,script);
}

function getClassName(refFile:string, schemaFile:string):string {
  const index = schemaFile.lastIndexOf("/");
  var workdir = schemaFile.substr(0, index);
  let schema = jsonfile.readFileSync(`${workdir}/${refFile}`);
  return schema.title;
}
async function createImports (schema:any, schemaFile:string):Promise<string> {
  var imports = "";
  var importedFiles:any = {};
  for(var prop in schema.properties) {
    var p = schema.properties[prop];
    if(p.items!==undefined) {
      p = p.items;
    }
    if(p.$ref===undefined) {
      continue;
    }
    if(p.$ref.startsWith("#")) {
      continue;
    }
    if(importedFiles[p.$ref] !== undefined) {
      continue;
    }

    const index = p.$ref.lastIndexOf("/");
    var workdir = p.$ref.substr(0, index);
    if(workdir=="") {
      workdir=".";
    }

    var className = getClassName(p.$ref, schemaFile);
    imports +=`import {${className}} from "${workdir}/${className}";\r\n`;
    importedFiles[p.$ref] = true;
  }
  return imports;
}


scanFolder(input);
import { compile } from 'json-schema-to-typescript'
import * as fs from "fs";
import * as jsonfile from "jsonfile"
import {argv} from "yargs"
import * as camelCase from 'camelcase';

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
  const tsFilename = camelCase(schema.title, {pascalCase: true});
  var script = await compile(schema, tsFilename, {
    cwd: workdir,
    bannerComment: "/* eslint-disable prettier/prettier */\n/* tslint:disable */\n/* Generated, DO NOT MODIFY BY HAND */ \n",
    style: {
      useTabs : true
    }
  });
  
  fs.mkdirSync(outdir, { recursive: true });
  fs.writeFileSync( `${outdir}/${tsFilename}.ts`,script);
}

scanFolder(input);
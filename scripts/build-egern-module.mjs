import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localParameters} from '../src/wk3/parameters.mjs';
import {groups} from '../src/wk3/routes.mjs';
import {release} from './build-wk3-modules.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const localScriptGroups = groups.map(g=>({
 type: `http_${g.stage}`, name: `WeatherKit.api.${g.name}`,
 match: g.pattern.replace('^https?:','^https:').replaceAll('\\/', '/'),
 body: Boolean(g.body), binary: Boolean(g.binary), file: g.stage,
}));
export function renderLocalModule({version} = {}){
 const template=fs.readFileSync(path.join(root,'template/egern.wk3.handlebars'),'utf8');
 const q=JSON.stringify;
 const compat=Object.fromEntries(localParameters.map(p=>[p.key,p.value]));
 const schema=Object.fromEntries(localParameters.map(p=>[p.key,{name:p.name,description:p.description,default_value:p.value,...(p.boolean?{options:['true','false']}:p.options?{options:p.options}:{})}]));
 const description=localParameters.map(p=>`${p.key}: ${p.name}\n  ${p.description}`).join('\n');
 // JSON objects are valid YAML. Quote individual substitution values using
 // YAML single quotes: literal double quotes in array syntax remain safe.
 let env='    env:\n';for(const p of localParameters)env+=`      ${p.key}: '{{{${p.key}}}}'\n`;
 if(version && !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw Error('Specify an explicit release version');
 const base=version ? release(version) : 'https://gist.githubusercontent.com/patrickyanxxxxx/9125b747b26480a0c9c37ae1c446c39f/raw';
 const scriptName=g=>version ? `wk3-egern-${g.file}.bundle.js` : `weatherkit-local-${g.file}.js?v=upstream-groups-1`;
 const scripts=localScriptGroups.map(g=>`- ${g.type}:\n    name: ${g.name}\n${env}    match: '${g.match}'\n    script_url: ${base}/${scriptName(g)}\n    timeout: 30\n    body_required: ${g.body}\n    binary_body: ${g.binary}\n${g.body?'    max_size: 2097152\n':''}    update_interval: 86400\n`).join('');
 return template.replace('__WK3_COMPAT_ARGUMENTS__',()=>q(compat)).replace('__WK3_ARGUMENT_DESCRIPTION__',()=>q(description)).replace('__WK3_ENV_SCHEMA__',()=>q(schema)).replace('__WK3_SCRIPTINGS__',()=>scripts.trimEnd());
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dest=process.argv[2]||path.join(root,'modules/iRingo.WeatherKit.WK3.yaml');fs.mkdirSync(path.dirname(dest),{recursive:true});const text=renderLocalModule();fs.writeFileSync(dest,text);console.log(dest,Buffer.byteLength(text),'bytes',localParameters.length,'parameters');
}

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localParameters} from '../src/egern/entry/parameters.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const localScriptGroups = [
 { type:'http_response', name:'WeatherKit.api.availability.response', match:'^https://weatherkit\\.apple\\.com/api/v[12]/availability/', body:true, binary:false, file:'response' },
 { type:'http_request', name:'WeatherKit.api.airQualityScale.request', match:'^https://weatherkit\\.apple\\.com/api/v[12]/airQualityScale/', body:false, binary:false, file:'request' },
 { type:'http_request', name:'WeatherKit.api.weatherAlerts.html.request', match:'^https://weatherkit\\.apple\\.com/api/v[12]/weatherAlerts\\?(?:[^#]*&)?ids=[a-zA-Z0-9][a-zA-Z0-9_-]*-[0-9]{9}(?:&|$)', body:false, binary:false, file:'request' },
 { type:'http_request', name:'WeatherKit.api.weatherAlerts.api.request', match:'^https://weatherkit\\.apple\\.com/api/v[12]/weatherAlerts\\?(?:[^#]*&)?ids=(?:wk3_[^&#]*|-?[0-9]+(?:\\.[0-9]+)?,-?[0-9]+(?:\\.[0-9]+)?)(?:&|$)', body:false, binary:false, file:'request' },
 { type:'http_response', name:'WeatherKit.api.weather.response', match:'^https://weatherkit\\.apple\\.com/api/v[23]/weather/', body:true, binary:true, file:'response' },
];
export function renderLocalModule(){
 const template=fs.readFileSync(path.join(root,'template/egern.wk3.handlebars'),'utf8');
 const q=JSON.stringify;
 const compat=Object.fromEntries(localParameters.map(p=>[p.key,p.value]));
 const schema=Object.fromEntries(localParameters.map(p=>[p.key,{name:p.name,description:p.description,default_value:p.value,...(p.boolean?{options:['true','false']}:p.options?{options:p.options}:{})}]));
 const description=localParameters.map(p=>`${p.key}: ${p.name}\n  默认 ${p.value||'留空'}；${p.description}`).join('\n');
 // JSON objects are valid YAML. Quote individual substitution values using
 // YAML single quotes: literal double quotes in array syntax remain safe.
 let env='    env:\n';for(const p of localParameters)env+=`      ${p.key}: '{{{${p.key}}}}'\n`;
 const base='https://gist.githubusercontent.com/patrickyanxxxxx/9125b747b26480a0c9c37ae1c446c39f/raw';
 const scripts=localScriptGroups.map(g=>`- ${g.type}:\n    name: ${g.name}\n${env}    match: '${g.match}'\n    script_url: ${base}/weatherkit-local-${g.file}.js?v=upstream-groups-1\n    timeout: 30\n    body_required: ${g.body}\n    binary_body: ${g.binary}\n${g.body?'    max_size: 2097152\n':''}    update_interval: 86400\n`).join('');
 return template.replace('__WK3_COMPAT_ARGUMENTS__',()=>q(compat)).replace('__WK3_ARGUMENT_DESCRIPTION__',()=>q(description)).replace('__WK3_ENV_SCHEMA__',()=>q(schema)).replace('__WK3_SCRIPTINGS__',()=>scripts.trimEnd());
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dest=process.argv[2]||path.join(root,'modules/iRingo.WeatherKit.WK3.yaml');fs.mkdirSync(path.dirname(dest),{recursive:true});const text=renderLocalModule();fs.writeFileSync(dest,text);console.log(dest,Buffer.byteLength(text),'bytes',localParameters.length,'parameters');
}

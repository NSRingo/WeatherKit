import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Builder,ByteBuffer} from 'flatbuffers';
import {decodeWK3DataSet,encodeAirQuality} from '../../src/wk3/class/WeatherKit3.mjs';
import AirQuality from '../../src/wk3/class/AirQuality.mjs';
import {Response as processResponse} from '../../src/wk3/process/Response.mjs';
import {buildEgern} from '../../scripts/build-egern.mjs';
import {configuration} from '../../src/wk3/entry/index.mjs';
import {localParameters} from '../../src/wk3/parameters.mjs';
const dir=process.env.WK3_TEST_BUNDLE_DIR;
const built=dir ? null : await buildEgern({minify:false});
const load=async stage=>{const code=dir ? await readFile(`${dir}/egern/wk3-egern-${stage}.bundle.js`,'utf8') : built[stage].code;return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;};
const request=await load('request'),response=await load('response');
const env={...Object.fromEntries(localParameters.map(p=>[p.key,p.value])),LogLevel:'OFF'};
const pollutants=[[9,25],[11,50],[8,100],[6,25],[10,40],[12,800]].map(([pollutantType,amount])=>({pollutantType,amount,units:2}));
function fixture(scale){const b=new Builder();const a=encodeAirQuality(b,{metadata:{providerName:'Apple',sourceType:2},scale,index:18,categoryIndex:2,isSignificant:false,primaryPollutant:9,previousDayComparison:3,pollutants});const mark=b.createString('keep all weather and alerts');b.startObject(1);b.addFieldOffset(0,mark,0);const other=b.endObject();b.startObject(18);b.addFieldOffset(0,a,0);for(const slot of [1,5,9,17])b.addFieldOffset(slot,other,0);b.finish(b.endObject());return b.asUint8Array();}
const url='https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=airQuality';
const context=raw=>({env,request:{url,headers:{}},response:new Response(raw,{headers:{'content-type':'application/vnd.apple.flatbuffer'}}),http:{get(){assert.fail('No script-side fetch for existing AQ');}}});
test('actual request bundle follows upstream version stripping, without fetching or synthesizing EAQI',async()=>{
 for(const version of ['v1','v2'])for(const language of ['zh-Hans','zh-Hant','en'])for(const name of ['EU.EAQI.2414','EU.EAQI.2604','EU.EAQI']){
  const original=`https://weatherkit.apple.com/api/${version}/airQualityScale/${language}/${name}?keep=yes`;const headers=new Headers({'authorization':'synthetic-test-only','if-none-match':'synthetic-etag'});
  const result=await request({env,request:{url:original,headers},http:{get(){assert.fail('must use native Apple request');}},respond(){assert.fail('must not replace native Apple scale with local color stops');}});
  assert.equal(result.url,`https://weatherkit.apple.com/api/${version}/airQualityScale/${language}/EU.EAQI?keep=yes`);assert.equal(result.headers,headers);
  assert.equal(headers.get('authorization'),'synthetic-test-only');assert.equal(headers.get('if-none-match'),null);
 }
});
test('upstream algorithm outputs EU.EAQI without altering calculated index',()=>{const symbolic=pollutants.map((p,i)=>({...p,pollutantType:['PM2_5','PM10','OZONE','NO2','SO2','CO'][i],units:'MICROGRAMS_PER_CUBIC_METER'}));const result=AirQuality.Pollutants2AQI({metadata:{providerName:'Apple'},pollutants:symbolic},{},{algorithm:'EU_EAQI'});assert.equal(result.scale,'EU.EAQI');assert.equal(result.index,22);assert.equal(result.categoryIndex,3);});
test('actual weather bundle changes existing EAQI resource identity, not AQ values or other original bytes',async()=>{
 for(const scale of ['EU.EAQI.2414','EU.EAQI.2604']){const raw=fixture(scale),snapshot=raw.slice();const before=decodeWK3DataSet(raw);const out=(await response(context(raw))).body;const after=decodeWK3DataSet(out);assert.deepEqual({...after,scale:before.scale},before);assert.equal(after.scale,'EU.EAQI');assert.deepEqual(raw,snapshot);
  const bb=new ByteBuffer(raw),root=bb.readUint32(0),aq=bb.__indirect(root+bb.__offset(root,4)),field=aq+bb.__offset(aq,18);
  for(let i=0;i<raw.length;i++)if(i<field||i>=field+4)assert.equal(out[i],raw[i]);
 }
 const raw=fixture('EU.EAQI');assert.deepEqual((await response(context(raw))).body,raw);
});
test('non-EAQI native data and existing settings are left alone',async()=>{const raw=fixture('EPA_NowCast.2604');const out=(await response(context(raw))).body;assert.deepEqual(out,raw);assert.equal(configuration({env}).Settings.AirQuality.Calculate.Algorithm,'EU_EAQI');});

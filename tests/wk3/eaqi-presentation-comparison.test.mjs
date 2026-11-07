import test from 'node:test';
import assert from 'node:assert/strict';
import {Builder} from 'flatbuffers';
import Scale from '../../src/wk3/class/AirQualityScale.mjs';
import {encodeAirQuality,decodeWK3DataSet} from '../../src/wk3/class/WeatherKit3.mjs';
import {Response as processResponse} from '../../src/wk3/process/Response.mjs';
import {configuration} from '../../src/wk3/entry/index.mjs';
import {localParameters} from '../../src/wk3/parameters.mjs';
const pollutants=[[9,25],[11,50],[8,100],[6,25],[10,40],[12,800]].map(([pollutantType,amount])=>({pollutantType,amount,units:2}));
function root(comparison=0){const b=new Builder();const aq=encodeAirQuality(b,{metadata:{providerName:'Apple',sourceType:2},scale:'HJ6332012.2604',index:70,categoryIndex:2,isSignificant:false,primaryPollutant:9,previousDayComparison:comparison,pollutants});b.startObject(1);b.addFieldOffset(0,aq,0);b.finish(b.endObject());return b.asUint8Array();}
const source=(index,categoryIndex)=>({metadata:{providerName:'Synthetic Caiyun',sourceType:'MODELED'},scale:'EPA_NowCast.2414',index,categoryIndex});
async function run({comparison=0,force=false,today=source(81,2),yesterday=source(125,3),failure=false}={}){const env=Object.fromEntries(localParameters.map(p=>[p.key,p.value]));const {Settings}=configuration({env:{...env,'AirQuality.Current.Index.Provider':'Calculate','AirQuality.Calculate.Algorithm':'EU_EAQI','AirQuality.Comparison.Yesterday.IndexProvider':'ColorfulCloudsUS','AirQuality.Comparison.ReplaceWhenCurrentChange':String(force)}});const calls=[];
 const input=root(comparison);const result=await processResponse({url:'https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=airQuality',headers:{}},{status:200,headers:{'content-type':'application/vnd.apple.flatbuffer'},body:input},{Settings,Configs:{},enviroments:{colorfulClouds:{CurrentAirQuality:async usa=>{calls.push('today');assert.equal(usa,true);if(failure)throw new Error('offline');return today;},YesterdayAirQuality:async usa=>{calls.push('yesterday');assert.equal(usa,true);return yesterday;}}}});return {aq:decodeWK3DataSet(result.body),calls};}
test('EAQI local scale uses EU naming, categorical display and continuous interpolation',()=>{
 const a=JSON.parse(Scale.buildScale('zh-Hans','EU.EAQI.2414').body);assert.equal(a.longDisplayName,'欧盟 (EAQI)');assert.equal(a.displayName,'欧盟空气质量指数');assert.equal(a.aqi.numerical,false);assert.deepEqual(a.aqi.range,[0,60]);assert.equal(a.aqi.categories.length,6);assert.equal(a.aqi.gradient.stops.length,121);assert.equal(a.aqi.gradient.stops[0].location,0);assert.equal(a.aqi.gradient.stops.at(-1).location,60);
 for(let i=1;i<a.aqi.gradient.stops.length;i++){const previous=a.aqi.gradient.stops[i-1],next=a.aqi.gradient.stops[i];assert.equal(next.location-previous.location,0.5);for(const offset of [1,3,5])assert.ok(Math.abs(parseInt(next.color.slice(offset,offset+2),16)-parseInt(previous.color.slice(offset,offset+2),16))<=11);}
 assert.equal(JSON.parse(Scale.buildScale('zh-Hant','EU.EAQI.2414').body).longDisplayName,'歐盟 (EAQI)');
 assert.equal(JSON.parse(Scale.buildScale('zh-Hans','EPA_NowCast.2604').body).aqi.numerical,true);
});
test('EAQI default yesterday choice compares Caiyun own current/past pair, not EAQI vs US',async()=>{
 for(const [index,categoryIndex,expected]of [[125,3,4],[81,2,3],[20,1,2]]){const r=await run({yesterday:source(index,categoryIndex)});assert.equal(r.aq.scale,'EU.EAQI');assert.equal(r.aq.index,22);assert.equal(r.aq.previousDayComparison,expected);assert.deepEqual(r.calls,['today','yesterday']);assert.ok(r.aq.metadata.providerName.includes('对比昨日：彩云天气（美标）'));}
});
test('valid original comparison and disabled refresh retain their value without requests',async()=>{const r=await run({comparison:3});assert.equal(r.aq.previousDayComparison,3);assert.deepEqual(r.calls,[]);});
test('forced refresh uses selected source; source failure leaves EAQI valid and comparison unknown',async()=>{const refreshed=await run({comparison:3,force:true});assert.equal(refreshed.aq.previousDayComparison,4);assert.deepEqual(refreshed.calls,['today','yesterday']);const fail=await run({failure:true});assert.equal(fail.aq.index,22);assert.equal(fail.aq.scale,'EU.EAQI');assert.equal(fail.aq.previousDayComparison,0);});

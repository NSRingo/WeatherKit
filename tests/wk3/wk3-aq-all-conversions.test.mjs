import test from 'node:test';
import assert from 'node:assert/strict';
import { Builder, ByteBuffer } from 'flatbuffers';
import AirQuality from '../../src/wk3/class/AirQuality.mjs';
import { encodeAirQuality, decodeWK3DataSet } from '../../src/wk3/class/WeatherKit3.mjs';
import { Response as processResponse } from '../../src/wk3/process/Response.mjs';
import buildSettings from '../../src/wk3/function/buildSettings.mjs';
import database from '../../src/wk3/function/database.mjs';
import QWeather from '../../src/wk3/class/QWeather.mjs';
import { merge } from '../../src/wk3/utils/object.mjs';
const algorithms=['UBA','EU_EAQI','WAQI_InstantCast_US','WAQI_InstantCast_CN','WAQI_InstantCast_CN_25_DRAFT','CA_AQHI','HK_AQHI','AQHI_Multi_CN','AQHI_Multi_CN_HK','CN_DEATH_AQHI','CN_DEATH_HK_AQHI'];
const pollutants=[['PM2_5',25],['PM10',50],['OZONE',100],['NO2',25],['SO2',40],['CO',800]].map(([pollutantType,amount])=>({pollutantType,amount,units:'MICROGRAMS_PER_CUBIC_METER'}));
const source=()=>({metadata:{providerName:'Synthetic',sourceType:'MODELED'},index:70,categoryIndex:2,isSignificant:false,scale:'HJ6332012.2604',primaryPollutant:'PM2_5',pollutants:structuredClone(pollutants)});
const apple=()=>({metadata:{providerName:'Apple',sourceType:2},index:70,categoryIndex:2,isSignificant:false,scale:'HJ6332012.2604',primaryPollutant:9,pollutants:pollutants.map((p,i)=>({...p,pollutantType:[9,11,8,6,10,12][i],units:2})),previousDayComparison:3});
function root(aq) {const b=new Builder(); const offset=aq?encodeAirQuality(b,aq):0;const marker=b.createString('other-weather-preserved');b.startObject(1);b.addFieldOffset(0,marker,0);const child=b.endObject();b.startObject(18);if(offset)b.addFieldOffset(0,offset,0);for(const slot of [1,4,9,17])b.addFieldOffset(slot,child,0);b.finish(b.endObject());return b.asUint8Array();}
function target(bytes,slot){const bb=new ByteBuffer(bytes),r=bb.readUint32(0);return bb.__indirect(r+bb.__offset(r,4+2*slot));}
async function patch({algorithm='UBA',missing=false,provider='Calculate',pollutantProvider='ColorfulClouds',overrides={},input,fail=false,preFetched={},sources={}}={}){
 const settings=buildSettings(database,merge({}, {AirQuality:{Current:{Index:{Provider:provider,Replace:['HJ6332012']},Pollutants:{Provider:pollutantProvider,Units:{Replace:[],Mode:'Scale'}}},Calculate:{Algorithm:algorithm,AllowOverRange:true},Comparison:{Yesterday:{IndexProvider:'WeatherKit'}}}},overrides)).Settings;
 const bytes=input??root(missing?undefined:apple()),calls=[];
 const get=async label=>{calls.push(label);if(fail)throw new Error('offline');return source();};
 const response=await processResponse({url:'https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=airQuality',headers:{}},{status:200,headers:{'content-type':'application/vnd.apple.flatbuffer'},body:bytes},{Settings:settings,Configs:{},enviroments:{parameters:{country:'CN',latitude:31,longitude:121},colorfulClouds:{CurrentAirQuality:()=>get('ColorfulClouds')},qWeather:{CurrentAirQuality:()=>get('QWeather')},...sources},preFetched});
 return {bytes,out:response.body,aq:decodeWK3DataSet(response.body),calls,settings};
}
for(const algorithm of algorithms)for(const missing of [false,true])test(`${algorithm}: ${missing?'missing AQ injection':'cross-standard replacement'} retains full AQ and other products`,async()=>{
 const r=await patch({algorithm,missing});const expected=AirQuality.Pollutants2AQI(source(),r.settings);
 assert.ok(r.aq,algorithm);assert.equal(r.aq.index,expected.index);assert.equal(r.aq.categoryIndex,expected.categoryIndex);
 assert.equal(AirQuality.GetNameFromScale(r.aq.scale),AirQuality.GetNameFromScale(expected.scale));assert.equal(r.calls.length,missing?1:0);
 assert.ok(r.aq.metadata.providerName.includes('iRingo'));assert.equal(r.aq.pollutants.length,expected.pollutants.length);
 const shift=target(r.out,1)-target(r.bytes,1);for(const slot of [4,9,17])assert.equal(target(r.out,slot)-target(r.bytes,slot),shift);
 if(missing)assert.deepEqual(r.out.slice(shift,shift+r.bytes.length),r.bytes);
});
test('all algorithms can calculate from original Apple symbolic-mapped concentrations without provider calls',async()=>{
 for(const algorithm of algorithms){const r=await patch({algorithm,pollutantProvider:'WeatherKit'});assert.equal(r.calls.length,0);const e=AirQuality.Pollutants2AQI(source(),r.settings);assert.equal(r.aq.index,e.index,algorithm);assert.equal(AirQuality.GetNameFromScale(r.aq.scale),AirQuality.GetNameFromScale(e.scale),algorithm);}
});
test('all direct CN/US providers can fill missing AQ and cross standards',async()=>{
 for(const provider of ['ColorfulCloudsCN','QWeather'])for(const missing of [false,true]){const r=await patch({provider,missing,pollutantProvider:provider==='QWeather'?'QWeather':'ColorfulClouds'});assert.equal(r.aq.index,70);assert.equal(r.aq.scale,'HJ6332012.2604');assert.equal(r.calls.length,1);}
});
test('explicit disabled targets, None and source failures preserve the complete response',async()=>{
 for(const missing of [false,true]){
  for(const overrides of [{AirQuality:{Current:{Index:{Replace:'[]'}}}},{AirQuality:{Calculate:{Algorithm:'None'}}}]){const r=await patch({missing,overrides});assert.deepEqual(r.out,r.bytes);assert.equal(r.calls.length,0);}
  const r=await patch({missing,fail:true});
  if(missing)assert.deepEqual(r.out,r.bytes);else {assert.equal(r.calls.length,0);assert.equal(r.aq.scale,'UBA.2414');}
 }
});
test('explicit pollution unit modes transform existing AQ independently of index calculation',async()=>{
 for(const mode of ['Scale','ugm3','EU_ppb','US_ppb','Force_ugm3','Force_EU_ppb','Force_US_ppb']){
 const r=await patch({provider:'WeatherKit',overrides:{AirQuality:{Current:{Pollutants:{Units:{Replace:['HJ6332012'],Mode:mode}}}}}});
 assert.equal(r.aq.index,70);assert.equal(r.aq.previousDayComparison,3);assert.equal(r.calls.length,0);
 if(mode.startsWith('Force_')&&mode.endsWith('ppb')){assert.equal(r.aq.pollutants.find(p=>p.pollutantType===8).units,1);assert.ok(r.aq.pollutants.find(p=>p.pollutantType===8).amount<100);}
 }
});

test('all menu origin standards can be replaced by each supported algorithm',async()=>{
 const standards=['HJ6332012.2604','EPA_NowCast.2604','UBA.2414','EU.EAQI.2414','CA.AQHI','HK.AQHI','CN.AQHI','IE.AQIH.2414','AT.AQI.2414','BE.BelAQI.2414','FR.ATMO.2414','KR.CAI.2414','CZ.AQI.2414','NL.LKI.2414','ICARS.2414','CH.KBI.2414','ES.MITECO.2414','SG.NEA.2414','NAQI.2414','DAQI.2414'];
 for(const standard of standards)for(const algorithm of algorithms){
  const original={...apple(),scale:standard};const r=await patch({algorithm,input:root(original),overrides:{AirQuality:{Current:{Index:{Replace:[AirQuality.GetNameFromScale(standard)]}}}}});
  const e=AirQuality.Pollutants2AQI(source(),r.settings);assert.equal(r.aq.index,e.index,`${standard}->${algorithm}`);assert.equal(AirQuality.GetNameFromScale(r.aq.scale),AirQuality.GetNameFromScale(e.scale));
 }
});
test('calculated yesterday requires real same-source concentrations and uses the selected algorithm',async()=>{
 for(const algorithm of algorithms){
  const today=source(),yesterday=source();yesterday.pollutants.forEach(p=>p.amount*=2);
  const r=await patch({algorithm,pollutantProvider:'QWeather',preFetched:{locationsGrid:[]},overrides:{AirQuality:{Comparison:{Yesterday:{IndexProvider:'Calculate',PollutantsProvider:'QWeather'}}}}});
  // No usable historical endpoint in this harness: failure is isolated from current AQ.
  assert.equal(r.aq.previousDayComparison,0);assert.equal(r.aq.index,AirQuality.Pollutants2AQI(today,r.settings).index);
 }
});
test('zero AQI and within-wire overrange results are not blocked by the US-only 500 cap',async()=>{
 for(const algorithm of algorithms){
  const zero=source();zero.pollutants.forEach(p=>p.amount=0);
  const r=await patch({algorithm,missing:true,preFetched:{pollutants:Promise.resolve(zero)}});assert.ok(r.aq);assert.equal(r.aq.index,AirQuality.Pollutants2AQI(zero,r.settings).index);
 }
 const high=source();high.pollutants.forEach(p=>p.amount=1000);
 const r=await patch({algorithm:'WAQI_InstantCast_US',missing:true,preFetched:{pollutants:Promise.resolve(high)}});
 assert.ok(r.aq.index>500);assert.ok(r.aq.index<=32767);
});

test('same-source QWeather yesterday concentrations are recalculated for every algorithm',async()=>{
 const saved=QWeather.GetLocationInfo;QWeather.GetLocationInfo=()=>({locationID:'synthetic'});
 try{for(const algorithm of algorithms){
 const previous=source();previous.pollutants.forEach(p=>p.amount*=3);let yesterdayCalls=0;
 const r=await patch({algorithm,missing:true,pollutantProvider:'QWeather',preFetched:{locationsGrid:[]},overrides:{AirQuality:{Comparison:{Yesterday:{IndexProvider:'Calculate',PollutantsProvider:'QWeather'}}}},sources:{qWeather:{latitude:31,longitude:121,CurrentAirQuality:async()=>source(),YesterdayAirQuality:async()=>{yesterdayCalls++;return previous;}}}});
 const current=AirQuality.Pollutants2AQI(source(),r.settings),past=AirQuality.Pollutants2AQI(previous,r.settings);
 assert.equal(r.aq.previousDayComparison,current.categoryIndex<past.categoryIndex?4:current.categoryIndex>past.categoryIndex?2:3,algorithm);assert.equal(yesterdayCalls,1);
 }}finally{QWeather.GetLocationInfo=saved;}
});
test('all calculated standards respect every explicit output unit mode with a complete pollutant list',async()=>{
 for(const algorithm of algorithms)for(const mode of ['None','Scale','ugm3','EU_ppb','US_ppb','Force_ugm3','Force_EU_ppb','Force_US_ppb']){
 const result=AirQuality.Pollutants2AQI(source(),{AirQuality:{Calculate:{Algorithm:algorithm}}});
 const name=AirQuality.GetNameFromScale(result.scale);
 const r=await patch({algorithm,overrides:{AirQuality:{Current:{Pollutants:{Units:{Replace:[name],Mode:mode}}}}}});
 assert.equal(r.aq.index,result.index,`${algorithm}/${mode}`);assert.equal(r.aq.pollutants.length,6);
 if(mode==='Force_ugm3'||mode==='None')assert.ok(r.aq.pollutants.every(p=>p.units===2),`${algorithm}/${mode}`);
 if(mode==='Force_US_ppb'||mode==='Force_EU_ppb')assert.equal(r.aq.pollutants.find(p=>p.pollutantType===8).units,1,`${algorithm}/${mode}`);
 }
});

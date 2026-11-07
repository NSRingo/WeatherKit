import test from 'node:test';
import assert from 'node:assert/strict';
import {Builder,ByteBuffer} from 'flatbuffers';
import {Response as processResponse} from '../../src/wk3/process/Response.mjs';
import {encodeAirQuality,decodeWK3DataSet} from '../../src/wk3/class/WeatherKit3.mjs';
import AirQuality from '../../src/wk3/class/AirQuality.mjs';
import buildSettings from '../../src/wk3/function/buildSettings.mjs';
import database from '../../src/wk3/function/database.mjs';
const regions=[['TW',25.033,121.565],['CN',25.033,121.565],['MO',22.1987,113.5439],['CN',22.1987,113.5439]];
const pollutants=[['PM2_5',25,9],['PM10',50,11],['OZONE',100,8],['NO2',25,6],['SO2',40,10],['CO',800,12]];
const aq={metadata:{providerName:'Apple',sourceType:2},scale:'HJ6332012.2604',index:70,categoryIndex:2,isSignificant:false,primaryPollutant:9,previousDayComparison:3,pollutants:pollutants.map(([,amount,pollutantType])=>({amount,pollutantType,units:2}))};
const source={metadata:{providerName:'Synthetic source',sourceType:'MODELED'},scale:'HJ6332012.2604',index:20,categoryIndex:1,isSignificant:false,primaryPollutant:'PM2_5',pollutants:pollutants.map(([pollutantType,amount])=>({pollutantType,amount:amount*2,units:'MICROGRAMS_PER_CUBIC_METER'}))};
function root(existing=true){const b=new Builder(),a=existing?encodeAirQuality(b,aq):0,text=b.createString('weather/minutes/alerts-preserved');b.startObject(1);b.addFieldOffset(0,text,0);const child=b.endObject();b.startObject(18);if(a)b.addFieldOffset(0,a,0);for(const i of [1,5,9,17])b.addFieldOffset(i,child,0);b.finish(b.endObject());return b.asUint8Array();}
function marker(bytes,i){const b=new ByteBuffer(bytes),r=b.readUint32(0),t=b.__indirect(r+b.__offset(r,4+i*2));return b.__string(t+b.__offset(t,4));}
async function run(region,{existing=true,algorithm='UBA',targets=['HJ6332012'],datasets=['airQuality','forecastNextHour','weatherAlerts'],sourceFailure=false}={}){
 const [country,lat,lon]=region,bytes=root(existing),Settings=buildSettings(database,{Weather:{Replace:'[]'},DataSets:datasets,AirQuality:{Current:{Index:{Provider:'Calculate',Replace:targets},Pollutants:{Provider:'QWeather'}},Calculate:{Algorithm:algorithm},Comparison:{Yesterday:{IndexProvider:'WeatherKit'}}}}).Settings;
 let calls=0;const output=await processResponse({url:`https://weatherkit.apple.com/api/v3/weather/zh-Hant/${lat}/${lon}?country=${country}&dataSets=airQuality,forecastNextHour,weatherAlerts`,headers:{}},{status:200,headers:{'content-type':'application/vnd.apple.flatbuffer'},body:bytes},{Settings,Configs:{},enviroments:{qWeather:{CurrentAirQuality:async()=>{calls++;if(sourceFailure)throw new Error('offline');return source;}},colorfulClouds:{Minutely:()=>assert.fail('must not fetch minutes')}}});
 for(const i of [1,5,9,17])assert.equal(marker(output.body,i),marker(bytes,i));return {bytes,out:output.body,aq:decodeWK3DataSet(output.body),calls,Settings};
}
test('upstream AQ path processes Taipei/Macao without weather region overrides and keeps existing pollutants',async()=>{
 for(const region of regions){const r=await run(region);assert.equal(r.calls,0);assert.equal(r.aq.scale,'UBA.2414');const expected=AirQuality.Pollutants2AQI({metadata:{providerName:'Apple'},pollutants:pollutants.map(([pollutantType,amount])=>({pollutantType,amount,units:'MICROGRAMS_PER_CUBIC_METER'}))},r.Settings);assert.equal(r.aq.index,expected.index);}
});
test('missing regional AQ uses configured provider, no country remapping',async()=>{
 for(const region of regions){const r=await run(region,{existing:false});assert.equal(r.calls,1);assert.equal(r.aq.scale,'UBA.2414');assert.equal(r.aq.index,AirQuality.Pollutants2AQI(source,r.Settings).index);}
});
test('all eleven algorithms run on original Taipei/Macao Apple pollutants without provider requests',async()=>{
 const algorithms=['UBA','EU_EAQI','WAQI_InstantCast_US','WAQI_InstantCast_CN','WAQI_InstantCast_CN_25_DRAFT','CA_AQHI','HK_AQHI','AQHI_Multi_CN','AQHI_Multi_CN_HK','CN_DEATH_AQHI','CN_DEATH_HK_AQHI'];
 for(const region of [regions[0],regions[2]])for(const algorithm of algorithms){const r=await run(region,{algorithm});assert.equal(r.calls,0);assert.notDeepEqual(r.out,r.bytes);}
});
test('AQ disabled, algorithm None, unmatched index targets and provider failure preserve original bytes',async()=>{
 for(const region of [regions[0],regions[2]]){
  for(const options of [{algorithm:'None'},{targets:['EPA_NowCast']},{targets:[]},{datasets:['currentWeather']},{existing:false,sourceFailure:true}]){const r=await run(region,options);assert.deepEqual(r.out,r.bytes);}
 }
});

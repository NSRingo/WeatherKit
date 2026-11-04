import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {configuration}from '../../src/egern/entry/index.mjs';import {localParameters}from '../../src/egern/entry/parameters.mjs';import {renderLocalModule,localScriptGroups}from '../../scripts/build-egern-module.mjs';import {buildEgern}from '../../scripts/build-egern.mjs';
const defaults=()=>Object.fromEntries(localParameters.map(p=>[p.key,p.value]));
const value=(o,path)=>path.split('.').reduce((a,k)=>a?.[k],o);
test('all original restored keys reach Settings with current US/minute/yesterday defaults',()=>{
 const {Settings:s}=configuration({env:defaults()});assert.equal(s.AirQuality.Current.Index.Provider,'ColorfulCloudsUS');assert.equal(s.AirQuality.Comparison.Yesterday.IndexProvider,'ColorfulCloudsUS');assert.equal(s.NextHour.Provider,'ColorfulClouds');assert.equal(s.WeatherAlerts.Provider,'QWeatherWeb');assert.deepEqual(s.Weather.Replace,['CN']);assert.deepEqual(s.AirQuality.Current.Index.Replace,['HJ6332012']);assert.deepEqual(s.AirQuality.Current.Pollutants.Units.Replace,[]);assert.equal(s.Weather.ReplaceDaily,false);assert.equal(s.Weather.ReplaceHourly,false);assert.equal(s.AirQuality.Calculate.Algorithm,'WAQI_InstantCast_US');assert.equal(s.API.QWeather.Host,'devapi.qweather.com');assert.equal(s.API.QWeather.Token,null);
 for(const p of localParameters){if(p.key==='HTTP_TIMEOUT_MS')continue;assert.notEqual(value(s,p.key),undefined,p.key);}
});
test('dotted edits override JSON defaults and list values do not turn into nested arrays',()=>{
 const s=configuration({env:{SETTINGS:JSON.stringify({AirQuality:{Current:{Index:{Provider:'ColorfulCloudsUS'}}}}),DataSets:'airQuality, forecastNextHour','Weather.Replace':'CN,HK','AirQuality.Current.Index.Provider':'ColorfulCloudsCN','AirQuality.Current.Index.Replace':'["HJ6332012","EPA_NowCast"]','AirQuality.Current.Pollutants.Units.Replace':'EPA_NowCast,UBA','Weather.ReplaceDaily':'true'}}).Settings;
 assert.deepEqual(s.DataSets,['airQuality','forecastNextHour']);assert.deepEqual(s.Weather.Replace,['CN','HK']);assert.deepEqual(s.AirQuality.Current.Index.Replace,['HJ6332012','EPA_NowCast']);assert.deepEqual(s.AirQuality.Current.Pollutants.Units.Replace,['EPA_NowCast','UBA']);assert.equal(s.AirQuality.Current.Index.Provider,'ColorfulCloudsCN');assert.equal(s.Weather.ReplaceDaily,true);
});
test('explicit empty lists clear selections while malformed lists fail before processing',()=>{
 const s=configuration({env:{...defaults(),DataSets:'[]','Weather.Replace':'[]','AirQuality.Current.Index.Replace':'[]'}}).Settings;assert.deepEqual(s.DataSets,[]);assert.deepEqual(s.Weather.Replace,[]);assert.deepEqual(s.AirQuality.Current.Index.Replace,[]);
 assert.throws(()=>configuration({env:{DataSets:'[1]'}}),/Invalid list/);assert.throws(()=>configuration({env:{DataSets:'['}}));
});
test('WeatherKit alert source disables both request and response alert handling dataset',()=>{
 const s=configuration({env:{...defaults(),'WeatherAlerts.Provider':'WeatherKit'}}).Settings;assert.ok(!s.DataSets.includes('weatherAlerts'));assert.ok(s.DataSets.includes('forecastNextHour'));
});
test('API numeric strings and comma values survive without coercion or accidental disclosure',()=>{
 const s=configuration({env:{...defaults(),'API.ColorfulClouds.Token':'001234','API.QWeather.Token':'example,synthetic','API.QWeather.Host':''}}).Settings;assert.equal(s.API.ColorfulClouds.Token,'001234');assert.equal(s.API.QWeather.Token,'example,synthetic');assert.equal(s.API.QWeather.Host,'devapi.qweather.com');
});
test('template declares every placeholder and binds identical parameters to both scripts',()=>{
 const m=renderLocalModule();const line=prefix=>JSON.parse(m.split('\n').find(s=>s.startsWith(prefix)).slice(prefix.length));const args=line('compat_arguments: '),schema=line('env_schema: ');assert.equal(Object.keys(args).length,localParameters.length);assert.deepEqual(Object.keys(args),Object.keys(schema));const refs=[...m.matchAll(/\{\{\{([^}]+)\}\}\}/g)].map(x=>x[1]);for(const p of localParameters){assert.equal(refs.filter(x=>x===p.key).length,localScriptGroups.length);assert.equal(args[p.key],p.value);assert.equal(schema[p.key].default_value,p.value);}
 assert.ok(!m.includes('url_rewrites:')&&!m.includes('vercel.app'));assert.match(m,/binary_body: true/);assert.match(m,/hostnames:\n    includes:/);
});
test('actual built script obeys DataSets=[] and LogLevel OFF, preserving binary bytes with no network',async()=>{
 const {response}=await buildEgern();let logs=0,network=0;const host=vm.createContext({URL,TextEncoder,TextDecoder,atob,btoa,console:Object.fromEntries(['log','info','warn','error','debug'].map(k=>[k,()=>logs++]))});const handler=vm.runInContext('('+response.code.replace('export default ','')+')',host);const bytes=new Uint8Array([255,255,255,255]);const out=await handler({env:{...defaults(),DataSets:'[]',LogLevel:'OFF'},request:{url:'https://weatherkit.apple.com/api/v3/weather/en/31/121?country=CN&dataSets=airQuality',headers:{}},response:new Response(bytes,{headers:{'content-type':'application/vnd.apple.flatbuffer'}}),http:{get(){network++;throw Error('unexpected network')}}});assert.deepEqual(Array.from(out.body),Array.from(bytes));assert.equal(network,0);assert.equal(logs,0);
});

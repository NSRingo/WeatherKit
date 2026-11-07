import test from 'node:test';
import assert from 'node:assert/strict';
import {handleResponse} from '../src/wk3/entry/response.mjs';
import {Response as processResponse} from '../src/wk3/process/Response.mjs';
import buildSettings from '../src/wk3/function/buildSettings.mjs';
import database from '../src/wk3/function/database.mjs';

for (const version of ['v1','v2']) {
 test(`${version} availability preserves Apple capabilities and request language`,async()=>{
  const url=`https://weatherkit.apple.com/api/${version}/availability/zh-Hans-SG/41.797/123.429?country=CN`;
  const capabilities=['currentWeather','uvIndex','appleFutureLocalizedProduct'];
  const request={url,method:'GET',headers:{'Accept-Language':'zh-Hans-SG'}};
  const reply=await handleResponse({env:{},request,response:new Response(JSON.stringify(capabilities),{headers:{'content-type':'application/json','content-language':'zh-Hans-SG'}})});
  const out=JSON.parse(reply.body);
  for(const capability of capabilities)assert.ok(out.includes(capability),capability);
  assert.equal(out.filter(x=>x==='currentWeather').length,1);
  assert.ok(out.includes('airQuality'));
  assert.equal(reply.headers.get('content-language'),'zh-Hans-SG');
  assert.equal(request.url,url);
  assert.equal(request.headers['Accept-Language'],'zh-Hans-SG');
  const {Settings,Configs}=buildSettings(database);
  const processed=await processResponse(request,{status:200,headers:{'content-type':'application/json'},body:JSON.stringify(capabilities)},{Settings,Configs});
  for(const capability of capabilities)assert.ok(JSON.parse(processed.body).includes(capability),`direct core ${capability}`);
 });
}
for(const value of [{status:503,body:'{"error":"暂时不可用"}',type:'application/json'},{status:200,body:'{"language":"zh-Hans","capabilities":["uvIndex"]}',type:'application/json'},{status:200,body:'not JSON',type:'application/json'},{status:200,body:'<html>原始响应</html>',type:'text/html'}]){
 test(`availability preserves unrecognized response ${value.status}/${value.type}/${value.body}`,async()=>{
  const reply=await handleResponse({env:{},request:{url:'https://weatherkit.apple.com/api/v2/availability/zh-Hans/31/121',headers:{}},response:new Response(value.body,{status:value.status,headers:{'content-type':value.type,'content-language':'zh-Hans'}})});
  assert.equal(reply.status,value.status);
  assert.equal(reply.body,value.body);
  assert.equal(reply.headers.get('content-type'),value.type);
  assert.equal(reply.headers.get('content-language'),'zh-Hans');
 });
}

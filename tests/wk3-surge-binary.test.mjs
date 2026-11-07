import assert from 'node:assert/strict';
import test from 'node:test';
import { runPlatform } from '../src/platform/wk3-adapter.mjs';

const bytes = new Uint8Array([0,1,127,128,195,255]);
for (const stage of ['request','response']) test(`Surge ${stage}: binary body is a native Uint8Array with exact view bounds`, async () => {
    for (const body of [bytes, bytes.buffer, new Uint8Array([99,...bytes,99]).subarray(1,-1)]) {
        let output;
        await runPlatform(async () => ({ status:200, headers:{'Content-Type':'application/vnd.apple.flatbuffer'}, body }), stage, {
            $request:{url:'https://weatherkit.apple.com/api/v3/weather/zh/31/121'},
            $response:{status:200,headers:{},body:bytes},
            $done:value=>{ output=stage==='request'?value.response:value; },
        }, 'surge');
        assert.ok(output.body instanceof Uint8Array, 'Surge binary-body-mode must receive native bytes, not UTF-8 text');
        assert.deepEqual([...output.body],[...bytes]);
    }
});
test('Surge text responses remain strings', async () => {
    let result;
    await runPlatform(async()=>({status:200,headers:{},body:'天气测试'}),'response',{$response:{},$done:value=>{result=value;}},'surge');
    assert.equal(result.body,'天气测试');
});

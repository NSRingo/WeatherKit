import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localParameters } from '../src/egern/entry/parameters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parameters = localParameters;
export const platforms = { surge: 'sgmodule', loon: 'lpx', stash: 'stoverride', quantumultx: 'snippet' };
export const release = version => `https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v${version}`;
export const groups = [
    { name: 'availability.response', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/availability\/`, stage: 'response', body: true },
    { name: 'airQualityScale.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/airQualityScale\/`, stage: 'request' },
    { name: 'weatherAlerts.html.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/weatherAlerts\?(?:[^#]*&)?ids=(?!wk3_)[a-zA-Z0-9][a-zA-Z0-9_-]*-[0-9]{9}(?:&|$)`, stage: 'request', echo: true },
    { name: 'weatherAlerts.api.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/weatherAlerts\?(?:[^#]*&)?ids=(?:wk3_[^&#]*|-?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?)(?:&|$)`, stage: 'request', echo: true },
    { name: 'weather.response', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[23]\/weather\/`, stage: 'response', body: true, binary: true },
];
const label = group => `WeatherKit.api.${group.name}`;
const script = (group, platform) => `wk3-${platform}-${group.stage}.bundle.js`;
const url = (group, version, platform) => `${release(version)}/${script(group, platform)}`;
const surgeArgument = parameters.map(({ key }) => `${key}="{{{${key}}}}"`).join('&');
const loonArgument = `[${parameters.map(({ key }) => `{${key}}`).join(',')}]`;
const expand = (text, replacements) => {
    for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(`__WK3_${key}__`, value);
    if (/__WK3_[A-Z_]+__/.test(text)) throw new Error('Unrendered WK3 template placeholder');
    return text;
};
const defaults = parameters.map(({ key, value }) => `${key}:${JSON.stringify(value)}`).join(',');
const description = parameters.map(({ key, name, description: desc }) => `${key}: ${name}；${desc}`.replaceAll('\n', ' ')).join('\\n');
const loonArguments = parameters.map(({ key, value, boolean, options, name, description: desc }) => {
    const kind = boolean ? `switch,${value}` : options ? `select,${[value, ...options.filter(v => v !== value)].map(v => JSON.stringify(v)).join(',')}` : `input,${JSON.stringify(value)}`;
    return `${key} = ${kind},tag=${name},desc=${desc.replaceAll(/[\r\n,]/g, '，')}`;
}).join('\n');
const quoteYaml = text => `'${text.replaceAll("'", "''")}'`;
const stashArgument = quoteYaml(JSON.stringify(Object.fromEntries(parameters.map(({ key, value }) => [key, value]))));

export function renderWK3Module(platform, version) {
    if (!Object.hasOwn(platforms, platform)) throw new Error(`Unsupported platform: ${platform}`);
    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Specify an explicit release version, e.g. 3.3.2');
    const template = fs.readFileSync(path.join(root, `template/wk3.${platform}.handlebars`), 'utf8');
    const rows = groups.map(group => {
        const tag = label(group), target = url(group, version, platform);
        if (platform === 'surge') return `${tag} = type=http-${group.stage}, pattern=${group.pattern.includes('(?:') ? `"${group.pattern}"` : group.pattern}${group.body ? ', requires-body=1' : ''}${group.binary ? ', binary-body-mode=1' : ''}, engine=webview, script-path=${target}, argument=${surgeArgument}`;
        if (platform === 'loon') return `http-${group.stage} ${group.pattern}${group.body ? ' requires-body=1,' : ''}${group.binary ? ' binary-body-mode=1,' : ''} script-path=${target}, tag=${tag}, argument=${loonArgument}`;
        if (platform === 'stash') return `    - match: ${quoteYaml(group.pattern)}\n      name: ${tag}\n      type: ${group.stage}${group.body ? '\n      require-body: true' : ''}${group.binary ? '\n      binary-mode: true' : ''}\n      argument: ${stashArgument}`;
        const action = group.echo ? 'script-echo-response' : group.stage === 'request' ? 'script-request-header' : 'script-response-body';
        return `# ${tag}${group.binary ? ' (binary response requires device validation)' : ''}\n${group.pattern} url ${action} ${target}`;
    }).join('\n');
    const providers = groups.map(group => `  ${label(group)}:\n    url: ${url(group, version, platform)}\n    interval: 86400`).join('\n');
    return expand(template, { VERSION: version, SCRIPTS: rows, PROVIDERS: providers, ARGUMENTS: platform === 'loon' ? loonArguments : defaults, ARGUMENT_DESC: description });
}

export function buildWK3Modules({ outdir, version } = {}) {
    if (!outdir) throw new Error('Specify --outdir to avoid changing existing modules');
    const outputs = {};
    for (const [platform, extension] of Object.entries(platforms)) {
        const file = path.join(outdir, `iRingo.WeatherKit.WK3.${extension}`);
        const text = renderWK3Module(platform, version);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        outputs[platform] = file;
    }
    return outputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const readFlag = name => { const index = process.argv.indexOf(name); return index === -1 ? undefined : process.argv[index + 1]; };
    const outputs = buildWK3Modules({ outdir: readFlag('--outdir'), version: readFlag('--version') });
    for (const [platform, file] of Object.entries(outputs)) console.log(`${platform}: ${file}`);
}

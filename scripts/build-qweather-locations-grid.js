import fs from 'fs';
import https from 'https';

const CSV_URL =
  'https://raw.githubusercontent.com/qwd/LocationList/refs/heads/master/China-City-List-latest.csv';

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('utf8'));
      });
    }).on('error', reject);
  });
}

// Code by Claude
// 解析CSV文件
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const locations = [];

  // 跳过版本行和表头
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',');

    if (values.length >= 14) {
      const location = {
        id: values[0],
        nameEN: values[1],
        nameZH: values[2],
        iso: values[3],
        countryEN: values[4],
        countryZH: values[5],
        provinceEN: values[6],
        provinceZH: values[7],
        cityEN: values[8],
        cityZH: values[9],
        timezone: values[10],
        lat: parseFloat(values[11]),
        lng: parseFloat(values[12]),
        adCode: values[13]
      };

      // 只添加有效的数据
      if (!isNaN(location.lat) && !isNaN(location.lng)) {
        locations.push(location);
      }
    }
  }

  return locations;
}

// 格式8: 坐标网格索引（用于快速范围查询）
function toGridIndex(locations, gridSize = 1.0) {
  const grid = {};
    
  locations.forEach(loc => {
    const gridX = Math.floor(loc.lng / gridSize);
    const gridY = Math.floor(loc.lat / gridSize);
    const key = `${gridX},${gridY}`;
      
    if (!grid[key]) {
      grid[key] = [];
    }
      
    grid[key].push({
      id: loc.id,
      name: loc.nameZH,
      province: loc.provinceZH,
      lat: loc.lat,
      lng: loc.lng
    });
  });
    
  return JSON.stringify({
    gridSize,
    grid
  }, null, 2);
}

async function main() {
  const csv = await fetchCSV(CSV_URL);
  const locations = parseCSV(csv);
  const json = toGridIndex(locations);

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/qweather-locations-grid.json', json);

  console.log(`✔ Generated ${locations.length} locations`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

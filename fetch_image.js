const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'upload.wikimedia.org',
  path: '/wikipedia/commons/c/c0/Official_Photograph_of_Prime_Minister_Narendra_Modi_Portrait.png',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  }
};

https.get(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to get image, status code: ${res.statusCode}`);
    return;
  }
  const file = fs.createWriteStream('public/pm_portrait.png');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download Completed');
  });
}).on('error', (err) => {
  console.error('Error: ', err.message);
});

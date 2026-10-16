const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.join(__dirname, '..', 'reference_assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = [
  'assets/index-DqBlaRbU.js',
  'assets/vendor-DkhU0ZIO.js',
  'assets/supabase-BEdK-fR0.js',
  'assets/icons-CDnT5i3q.js',
  'assets/router-X2WDcobo.js',
  'assets/AdminLogin-XxZ9FpgX.js',
  'assets/langStore-CtxOvkI2.js',
  'assets/Dashboard-Dr5ZzWkg.js',
  'assets/invoicePdf-qr1W4lBz.js',
  'assets/phone-C6JXfnn8.js',
  'assets/Pos-DwBFftDW.js',
  'assets/barcode-CHCvhfwT.js',
  'assets/charts-UpbGWgZV.js',
  'assets/index-BNQZ2c5P.css', // let's check index css if any
  'manifest.webmanifest',
  'index.html'
];

async function download(rel) {
  const url = `https://one-clothing.vercel.app/${rel}`;
  const dest = path.join(outDir, rel.replace(/\//g, '_'));
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const stream = fs.createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close();
          console.log(`Saved: ${rel}`);
          resolve(true);
        });
      } else {
        console.log(`Failed ${res.statusCode}: ${rel}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`Error ${rel}: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  for (const f of files) {
    await download(f);
  }
}

main();

import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import { generateAllIcons } from './generateIcons';

async function buildExtension() {
  console.log('=== Building ChainShield Sentinel Manifest V3 Browser Extension ===\n');

  const rootDir = process.cwd();
  const extDir = path.resolve(rootDir, 'extension');
  const distDir = path.resolve(extDir, 'dist');
  const iconsDir = path.resolve(extDir, 'icons');
  const popupDir = path.resolve(extDir, 'popup');
  const optionsDir = path.resolve(extDir, 'options');

  // 1. Ensure target directories
  [distDir, iconsDir, popupDir, optionsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 2. Generate icons if missing
  if (!fs.existsSync(path.join(iconsDir, 'icon128.png'))) {
    console.log('[1/4] Generating extension icons...');
    generateAllIcons(iconsDir);
  } else {
    console.log('[1/4] Extension icons verified in extension/icons/');
  }

  // 3. Copy HTML and CSS to their runtime locations
  console.log('[2/4] Syncing popup and options assets...');
  fs.copyFileSync(
    path.join(extDir, 'src', 'popup', 'popup.html'),
    path.join(popupDir, 'popup.html')
  );
  fs.copyFileSync(
    path.join(extDir, 'src', 'popup', 'popup.css'),
    path.join(popupDir, 'popup.css')
  );
  fs.copyFileSync(
    path.join(extDir, 'src', 'options', 'options.html'),
    path.join(optionsDir, 'options.html')
  );
  fs.copyFileSync(
    path.join(extDir, 'src', 'options', 'options.css'),
    path.join(optionsDir, 'options.css')
  );

  // 4. Bundle TypeScript modules via esbuild
  console.log('[3/4] Compiling TypeScript extension modules with esbuild...');

  const buildConfigs = [
    {
      entryPoints: [path.join(extDir, 'src', 'background', 'serviceWorker.ts')],
      outfile: path.join(distDir, 'background.js'),
      format: 'iife' as const,
      globalName: 'ChainShieldBackground',
      platform: 'browser' as const,
    },
    {
      entryPoints: [path.join(extDir, 'src', 'content', 'contentScript.ts')],
      outfile: path.join(distDir, 'contentScript.js'),
      format: 'iife' as const,
      globalName: 'ChainShieldContent',
      platform: 'browser' as const,
    },
    {
      entryPoints: [path.join(extDir, 'src', 'content', 'inpage.ts')],
      outfile: path.join(distDir, 'inpage.js'),
      format: 'iife' as const,
      platform: 'browser' as const,
    },
    {
      entryPoints: [path.join(extDir, 'src', 'popup', 'popup.ts')],
      outfile: path.join(distDir, 'popup.js'),
      format: 'iife' as const,
      platform: 'browser' as const,
    },
    {
      entryPoints: [path.join(extDir, 'src', 'options', 'options.ts')],
      outfile: path.join(distDir, 'options.js'),
      format: 'iife' as const,
      platform: 'browser' as const,
    },
  ];

  for (const config of buildConfigs) {
    const entryName = path.basename(config.entryPoints[0]);
    const outName = path.basename(config.outfile);
    await esbuild.build({
      ...config,
      bundle: true,
      target: ['chrome110', 'edge110'],
      sourcemap: 'inline',
      minify: false,
    });
    const size = fs.statSync(config.outfile).size;
    console.log(`  ✓ ${entryName} -> dist/${outName} (${Math.round(size / 1024)} KB)`);
  }

  // 5. Verify manifest.json
  console.log('[4/4] Validating manifest.json...');
  const manifestPath = path.join(extDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json missing in extension directory!');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.manifest_version !== 3) {
    throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
  }
  console.log(`  ✓ Manifest V3 validated: "${manifest.name}" v${manifest.version}`);

  console.log('\n========================================================================');
  console.log('✓ ChainShield Sentinel Browser Extension successfully built!');
  console.log(`  Unpacked Extension Directory: ${extDir}`);
  console.log('========================================================================\n');
  console.log('Installation Instructions for Edge & Chrome:');
  console.log('1. Open your browser and navigate to:');
  console.log('   - Edge:   edge://extensions');
  console.log('   - Chrome: chrome://extensions');
  console.log('2. Enable "Developer mode" toggle (top-right or bottom-left).');
  console.log('3. Click "Load unpacked".');
  console.log(`4. Select the directory: ${extDir}`);
  console.log('5. The ChainShield Sentinel shield icon will appear in your browser toolbar!\n');
}

buildExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

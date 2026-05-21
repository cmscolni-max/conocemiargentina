import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1A2D"/>
      <stop offset="52%" stop-color="#103455"/>
      <stop offset="100%" stop-color="#1A6B6A"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD66B"/>
      <stop offset="100%" stop-color="#FFB347"/>
    </linearGradient>
    <linearGradient id="peak" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5F8FF"/>
      <stop offset="100%" stop-color="#B5C9DF"/>
    </linearGradient>
    <linearGradient id="ridge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1A2D46"/>
      <stop offset="100%" stop-color="#0A1628"/>
    </linearGradient>
    <linearGradient id="path" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9AF2C4"/>
      <stop offset="100%" stop-color="#5CD19E"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1024" height="1024" rx="230" fill="url(#bg)"/>

  <circle cx="735" cy="245" r="82" fill="url(#sun)" opacity="0.95"/>

  <path d="M130 710 L375 430 L520 615 L665 465 L910 710 Z" fill="url(#ridge)"/>
  <path d="M280 710 L470 495 L605 645 L742 520 L890 710 Z" fill="#13263D" opacity="0.9"/>

  <path d="M330 486 L375 430 L417 486 Z" fill="url(#peak)"/>
  <path d="M621 516 L665 465 L705 516 Z" fill="url(#peak)"/>

  <path d="M510 730 C505 648 560 595 615 545 C560 590 515 645 510 730 Z" fill="url(#path)"/>
  <path d="M515 730 C520 665 560 615 610 570" stroke="#D5FFEA" stroke-width="18" stroke-linecap="round" opacity="0.8"/>

  <circle cx="512" cy="760" r="24" fill="#D5FFEA"/>

  <g transform="translate(190 165)">
    <circle cx="96" cy="96" r="82" fill="none" stroke="#D8E5F5" stroke-width="16" opacity="0.85"/>
    <path d="M96 28 L120 96 L96 164 L72 96 Z" fill="#F76F4A"/>
    <path d="M96 48 L112 96 L96 144 L80 96 Z" fill="#FFE8A3"/>
  </g>
</svg>`;

const output = sharp(Buffer.from(iconSvg));

const androidMap = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

for (const [folder, size] of androidMap) {
  const dir = path.join(root, 'android/app/src/main/res', folder);
  await fs.mkdir(dir, { recursive: true });
  await output.clone().resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
  await output.clone().resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  await output.clone().resize(size, size).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

const iosIconPath = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
await output.clone().resize(1024, 1024).png().toFile(iosIconPath);

console.log('App icons generated successfully.');

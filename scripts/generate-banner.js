const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '../banner-config.json');
const OUTPUT_PATH = path.join(__dirname, '../assets/main-banner.svg');

function fetchIcon(slug) {
  return new Promise((resolve) => {
    const url = `https://api.iconify.design/${slug.replace(':', '/')}.svg`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('<svg')) {
          resolve(data);
        } else {
          console.warn(`[Warning] Could not fetch icon: ${slug}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.warn(`[Error] Failed to fetch ${slug}:`, err.message);
      resolve(null);
    });
  });
}

async function main() {
  console.log('🔄 Reading banner configuration from banner-config.json...');
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  console.log(`📦 Found ${config.meteors.length} meteors. Fetching icon SVGs from Iconify...`);
  const iconsMap = {};
  for (const m of config.meteors) {
    const svgCode = await fetchIcon(m.iconSlug);
    if (svgCode) {
      iconsMap[m.iconSlug] = svgCode;
    }
  }

  // Load avatar base64
  const avatarFullPath = path.join(__dirname, '..', config.avatarPath);
  let avatarB64 = '';
  if (fs.existsSync(avatarFullPath)) {
    avatarB64 = fs.readFileSync(avatarFullPath).toString('base64');
  } else {
    console.warn(`[Warning] Avatar image not found at ${avatarFullPath}`);
  }

  // Build trail gradients
  let gradients = '';
  config.meteors.forEach((m, idx) => {
    gradients += `
        <linearGradient id="trail-${idx}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${m.color}" stop-opacity="0"/>
            <stop offset="100%" stop-color="${m.color}" stop-opacity="1"/>
        </linearGradient>`;
  });

  // Build meteors
  let meteorsSvg = '';
  config.meteors.forEach((m, idx) => {
    const startX = m.startX;
    const endX1 = startX + 116.986;
    const startX2 = startX + 12.941;
    const endX2 = startX + 129.927;
    const imgStartX = startX - 3.059;
    const imgEndX = startX + 113.927;
    const delay = m.delay || 0;

    const iconSvg = iconsMap[m.iconSlug];
    let iconElement = '';
    if (iconSvg) {
      const innerContent = iconSvg
        .replace(/<\?xml[^>]*\?>/gi, '')
        .replace(/<svg[^>]*>/gi, '')
        .replace(/<\/svg>/gi, '');

      const vbMatch = iconSvg.match(/viewBox="([^"]+)"/i);
      const vb = vbMatch ? vbMatch[1] : '0 0 256 256';

      iconElement = `<svg x="${imgStartX}" y="-17.70" width="32" height="32" viewBox="${vb}">
                    <animate attributeName="x" values="${imgStartX};${imgEndX}" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                    <animate attributeName="y" values="-17.70;418.89" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                    ${innerContent}
                </svg>`;
    }

    meteorsSvg += `
            <!-- Meteor ${m.iconSlug} -->
            <g filter="url(#meteorGlow)" visibility="hidden">
                <line x1="${startX}" y1="-50" x2="${startX2}" y2="-1.70" stroke="url(#trail-${idx})" stroke-width="2" stroke-linecap="round">
                    <animate attributeName="x1" values="${startX};${endX1}" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                    <animate attributeName="y1" values="-50;386.60" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                    <animate attributeName="x2" values="${startX2};${endX2}" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                    <animate attributeName="y2" values="-1.70;434.89" dur="10s" repeatCount="indefinite" begin="${delay}s"/>
                </line>
                ${iconElement}
                <set attributeName="visibility" to="visible" begin="${delay}s"/>
            </g>`;
  });

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 1441 302"
     width="1441"
     height="302"
     style="background:${config.backgroundColor || '#262c36'}">

    <defs>
        <!-- Glow -->
        <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <!-- Stronger glow for meteors -->
        <filter id="meteorGlow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <!-- Gradient for waves -->
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${config.waveColorStart || '#0abaf5'}"/>
            <stop offset="50%" stop-color="${config.waveColorMid || '#23fbec'}"/>
            <stop offset="100%" stop-color="${config.waveColorEnd || '#0af5e5'}"/>
        </linearGradient>

        <!-- Gradient for glowing circle -->
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${config.glowColorStart || '#680af5'}"/>
            <stop offset="50%" stop-color="${config.glowColorMid || '#f59e0b'}"/>
            <stop offset="100%" stop-color="${config.glowColorEnd || '#f59e0b'}"/>
        </linearGradient>

        <!-- Meteor trail gradients -->
        ${gradients}

        <!-- Circle clip for avatar -->
        <clipPath id="avatarClip">
            <circle cx="720.5" cy="151" r="45"/>
        </clipPath>
    </defs>

    <!-- Background waves -->
    <path d="M0 151 Q180 121 360 151 T721 151 T1081 151 T1441 151"
          fill="none"
          stroke="url(#waveGrad)"
          stroke-width="2"
          opacity="0.5">
        <animate attributeName="d"
                 dur="6s"
                 repeatCount="indefinite"
                 values="
             M0 151 Q180 121 360 151 T721 151 T1081 151 T1441 151;
             M0 151 Q180 181 360 151 T721 151 T1081 151 T1441 151;
             M0 151 Q180 121 360 151 T721 151 T1081 151 T1441 151"/>
    </path>

    <!-- ========== METEOR LOGOS ========== -->
    ${meteorsSvg}

    <!-- ========== CENTER AVATAR ========== -->
    <g>
        <circle cx="720.5" cy="151" r="51" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,4" opacity="0.8">
            <animateTransform attributeName="transform" type="rotate" from="0 720.5 151" to="360 720.5 151" dur="15s" repeatCount="indefinite"/>
        </circle>
        <circle cx="720.5" cy="151" r="47" fill="none" stroke="url(#glowGrad)" stroke-width="3" filter="url(#glow)" />
        <image href="data:image/png;base64,${avatarB64}" x="675.5" y="106" width="90" height="90" clip-path="url(#avatarClip)" />
    </g>
</svg>`;

  fs.writeFileSync(OUTPUT_PATH, fullSvg, 'utf8');
  console.log(`✨ Successfully generated banner to ${OUTPUT_PATH}!`);
}

main().catch(err => {
  console.error('❌ Error generating banner:', err);
  process.exit(1);
});

const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const srcFile = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789056220195.img';
const outDir = path.join(__dirname, '..', 'public', 'sounds');

console.log('Source exists:', fs.existsSync(srcFile), 'Size:', fs.statSync(srcFile).size);

// Clean, high-clarity mastering filter:
// - highpass=f=75: cuts out sub-bass room rumble/wind noise
// - equalizer=f=3200:t=q:w=1.2:g=3.0: enhances speech presence & clarity
// - equalizer=f=8000:t=q:w=1.5:g=1.5: adds top-end air and crisp definition
// - loudnorm=I=-13:TP=-0.2:LRA=6: optimal loud & clear broadcast normalization
const clarityFilter = 'highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=3.0,equalizer=f=8000:t=q:w=1.5:g=1.5,loudnorm=I=-13:TP=-0.2:LRA=6';

// Direct dry filter for sounds that just need pure loud cut (e.g. gunshot)
const gunshotFilter = 'highpass=f=40,volume=2.2';

const cuts = [
  {
    file: 'gunshot.wav',
    title: 'Gunshot',
    ss: '4.80',
    to: '6.40',
    af: gunshotFilter
  },
  {
    file: 'borat_very_nice.wav',
    title: 'Borat - Very Nice!',
    ss: '67.40',
    to: '69.40',
    af: clarityFilter
  },
  {
    file: 'another_one.wav',
    title: 'DJ Khaled - Another One!',
    ss: '76.40',
    to: '79.20',
    af: clarityFilter
  },
  {
    file: 'surprise_motherfucker.wav',
    title: 'Surprise Motherfucker',
    ss: '43.20',
    to: '46.60',
    af: clarityFilter
  },
  {
    file: 'say_goodbye.wav',
    title: 'Say Goodbye',
    ss: '69.80',
    to: '72.60',
    af: clarityFilter
  },
  {
    file: 'what_the_fuck_is_that.wav',
    title: 'What The Fuck Is That?',
    ss: '81.50',
    to: '84.80',
    af: clarityFilter
  },
  {
    file: 'run.wav',
    title: 'Run!',
    ss: '89.40',
    to: '91.80',
    af: clarityFilter
  },
  {
    file: 'oh_my_god.wav',
    title: 'Oh My God',
    ss: '16.80',
    to: '19.40',
    af: clarityFilter
  },
  {
    file: 'i_can_smell_you.wav',
    title: 'I Can Smell You',
    ss: '30.80',
    to: '33.80',
    af: clarityFilter
  },
  {
    file: 'why_are_you_gay.wav',
    title: 'Why Are You Gay?',
    ss: '2.40',
    to: '4.60',
    af: clarityFilter
  },
  {
    file: 'scared_right_now.wav',
    title: "I'm So Fucking Scared Right Now",
    ss: '63.20',
    to: '66.80',
    af: clarityFilter
  }
];

cuts.forEach(c => {
  const dest = path.join(outDir, c.file);
  const dur = (parseFloat(c.to) - parseFloat(c.ss)).toFixed(2);
  const res = spawnSync(ffmpeg, [
    '-y',
    '-ss', c.ss,
    '-to', c.to,
    '-i', srcFile,
    '-af', c.af,
    '-ar', '44100',
    dest
  ]);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`[CLEAR] ${c.file} -> ${c.title} (${dur}s, ${fs.statSync(dest).size} bytes)`);
  } else {
    console.error(`[ERR] Failed ${c.file}:`, res.stderr?.toString()?.slice(-200));
  }
});

// Alias for startup sound
fs.copyFileSync(path.join(outDir, 'surprise_motherfucker.wav'), path.join(outDir, 'hello_motherfucker.wav'));
console.log('Updated hello_motherfucker.wav from new upload');

const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');

// THIS IS THE SECOND AUDIO MESSAGE: uploaded_media_1789054567834.img (Clean, no reverb!)
const secondAudioMessage = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054567834.img';

console.log('Using source:', secondAudioMessage, 'Exists:', fs.existsSync(secondAudioMessage));

const cuts = [
  {
    file: 'surprise_motherfucker.wav',
    title: 'Surprise / Hello Muthafucka (On App Open)',
    ss: '5.20',
    to: '7.60'
  },
  {
    file: 'today_was_a_good_day.wav',
    title: 'Today was a good day (On Check Done)',
    ss: '25.45',
    to: '27.70'
  },
  {
    file: 'borat_very_nice.wav',
    title: 'Borat - Very Nice!',
    ss: '16.65',
    to: '17.75'
  },
  {
    file: 'another_one.wav',
    title: 'DJ Khaled - Another One',
    ss: '22.80',
    to: '23.95'
  },
  {
    file: 'how_about_no.wav',
    title: 'How About No',
    ss: '10.45',
    to: '11.80'
  },
  {
    file: 'oh_my_god.wav',
    title: 'Oh My God',
    ss: '12.85',
    to: '14.80'
  },
  {
    file: 'say_goodbye.wav',
    title: 'Say Goodbye',
    ss: '19.45',
    to: '20.60'
  },
  {
    file: 'i_can_smell_you.wav',
    title: 'I Can Smell You',
    ss: '0.65',
    to: '3.15'
  }
];

cuts.forEach(c => {
  const dest = path.join(soundsDir, c.file);
  const dur = (parseFloat(c.to) - parseFloat(c.ss)).toFixed(2);
  // Pure direct dry cut - NO REVERB, NO FILTER, completely raw and original
  const res = spawnSync(ffmpeg, [
    '-y',
    '-ss', c.ss,
    '-to', c.to,
    '-i', secondAudioMessage,
    '-ar', '44100',
    dest
  ]);
  console.log(`Extracted from 2nd message: ${c.file} (${dur}s, ${fs.statSync(dest).size} bytes)`);
});

// Create hello_motherfucker.wav from the exact same cut
fs.copyFileSync(path.join(soundsDir, 'surprise_motherfucker.wav'), path.join(soundsDir, 'hello_motherfucker.wav'));
console.log('Created hello_motherfucker.wav from 2nd message');

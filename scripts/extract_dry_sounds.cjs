const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'public', 'sounds');

// File 2 (From second message: uploaded_media_1789054470270.img)
const file2 = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054470270.img';
// File 3 (Latest message with Borat: uploaded_media_1789054567834.img)
const file3 = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054567834.img';

/**
 * 100% DRY, zero reverb, immediate attack, pure original recording!
 * Volume normalized without any echo or room reflection.
 */
const dryFilter = (duration) => {
  const fadeOutStart = Math.max(0.05, duration - 0.03).toFixed(2);
  return `afade=t=in:ss=0:d=0.005,afade=t=out:st=${fadeOutStart}:d=0.03,volume=1.8`;
};

const sounds = [
  // Sounds from the 2nd message recording:
  {
    src: file2,
    ss: '0.70',
    to: '2.85',
    file: 'say_goodbye.wav',
    title: 'Say Goodbye'
  },
  {
    src: file2,
    ss: '3.00',
    to: '3.95',
    file: 'bye_bye.wav',
    title: 'Bye Bye'
  },
  {
    src: file2,
    ss: '5.05',
    to: '5.75',
    file: 'another_one.wav',
    title: 'DJ Khaled - Another One'
  },
  {
    src: file2,
    ss: '7.35',
    to: '8.25',
    file: 'today_was_a_good_day.wav',
    title: 'Today Was a Good Day'
  },
  {
    src: file2,
    ss: '9.35',
    to: '10.95',
    file: 'how_about_no.wav',
    title: 'How About No'
  },
  {
    src: file2,
    ss: '12.25',
    to: '13.40',
    file: 'damn.wav',
    title: 'Damn'
  },
  {
    src: file2,
    ss: '15.35',
    to: '17.05',
    file: 'i_can_smell_you.wav',
    title: 'I Can Smell You'
  },
  {
    src: file2,
    ss: '18.55',
    to: '22.50',
    file: 'surprise_motherfucker.wav',
    title: 'Surprise Motherfucker'
  },
  // Borat from File 3 (zero reverb, dry direct cut):
  {
    src: file3,
    ss: '16.70',
    to: '17.80',
    file: 'borat_very_nice.wav',
    title: 'Borat - Very Nice!'
  }
];

sounds.forEach(s => {
  const dest = path.join(outDir, s.file);
  const dur = (parseFloat(s.to) - parseFloat(s.ss)).toFixed(2);
  const filter = dryFilter(parseFloat(dur));

  spawnSync(ffmpeg, [
    '-y',
    '-ss', s.ss,
    '-to', s.to,
    '-i', s.src,
    '-af', filter,
    '-ar', '44100',
    dest
  ]);
  console.log(`Extracted DRY: ${s.file} (${dur}s, ${fs.statSync(dest).size} bytes)`);
});

// Copy alias for hello_motherfucker.wav (used on app open)
fs.copyFileSync(path.join(outDir, 'surprise_motherfucker.wav'), path.join(outDir, 'hello_motherfucker.wav'));
console.log('Updated hello_motherfucker.wav');

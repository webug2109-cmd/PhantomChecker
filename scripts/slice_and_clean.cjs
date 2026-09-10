const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Slicing parameters for uploaded_media_1789054567834.img (The 35s Voicemod soundboard)
const srcSoundboard = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054567834.img';
const srcShort = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054416825.img';

/**
 * Filter chain for maximum crispness and presence:
 * 1. highpass=f=75 : eliminate sub-bass rumble / hum
 * 2. equalizer=f=3200:t=q:w=1.2:g=3.5 : vocal clarity and presence
 * 3. equalizer=f=8000:t=q:w=1.5:g=2.0 : air and crisp brightness
 * 4. silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.01:detection=peak : instantaneous onset
 * 5. areverse, silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.01:detection=peak, areverse : tight clean tail with zero trailing hum
 * 6. loudnorm=I=-14:TP=-0.5:LRA=7 : broadcast-grade loudness normalization
 */
const audioFilters = 'highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=3.5,equalizer=f=8000:t=q:w=1.5:g=2.0,loudnorm=I=-13:TP=-0.3:LRA=6';

const clips = [
  // From 35s Soundboard
  { file: srcSoundboard, ss: '16.4', to: '18.0', name: 'borat_very_nice.wav', label: 'Borat - Very Nice!' },
  { file: srcSoundboard, ss: '22.6', to: '24.2', name: 'another_one_voicemod.wav', label: 'DJ Khaled - Another One' },
  { file: srcSoundboard, ss: '5.2', to: '7.8', name: 'surprise_motherfucker.wav', label: 'Surprise Motherfucker' },
  { file: srcSoundboard, ss: '10.3', to: '12.0', name: 'how_about_no.wav', label: 'How About No' },
  { file: srcSoundboard, ss: '12.7', to: '15.0', name: 'oh_my_god.wav', label: 'Oh My God' },
  { file: srcSoundboard, ss: '19.3', to: '20.8', name: 'say_goodbye.wav', label: 'Say Goodbye' },
  { file: srcSoundboard, ss: '25.3', to: '28.0', name: 'today_was_a_good_day.wav', label: 'Today Was a Good Day' },
  { file: srcSoundboard, ss: '0.6', to: '3.3', name: 'i_can_smell_you.wav', label: 'I Can Smell You' },

  // From Short upload 1
  { file: srcShort, ss: '0.7', to: '3.5', name: 'short_clip_1.wav', label: 'Short Clip 1' },
  { file: srcShort, ss: '6.8', to: '7.6', name: 'short_clip_2.wav', label: 'Short Clip 2' },
  { file: srcShort, ss: '7.7', to: '8.3', name: 'short_clip_3.wav', label: 'Short Clip 3' },
  { file: srcShort, ss: '9.6', to: '10.3', name: 'short_clip_4.wav', label: 'Short Clip 4' }
];

clips.forEach(clip => {
  const dest = path.join(outDir, clip.name);
  const args = [
    '-y',
    '-ss', clip.ss,
    '-to', clip.to,
    '-i', clip.file,
    '-af', audioFilters,
    '-ar', '44100',
    dest
  ];
  const res = spawnSync(ffmpeg, args);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`[OK] Created ${clip.name} (${fs.statSync(dest).size} bytes) - ${clip.label}`);
  } else {
    console.error(`[ERR] Failed ${clip.name}:`, res.stderr?.toString()?.slice(-200));
  }
});

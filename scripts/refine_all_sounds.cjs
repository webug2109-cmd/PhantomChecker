const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
const masterWebm = path.join(soundsDir, 'user_soundboard_master.webm');

// Exact start/end offsets manually calibrated against the waveform
const soundDefinitions = [
  {
    file: 'borat_very_nice.wav',
    title: 'Borat - Very Nice!',
    ss: '16.65',
    to: '17.95'
  },
  {
    file: 'another_one.wav',
    title: 'DJ Khaled - Another One',
    ss: '22.85',
    to: '23.95'
  },
  {
    file: 'surprise_motherfucker.wav',
    title: 'Surprise Motherfucker',
    ss: '5.20',
    to: '7.60'
  },
  {
    file: 'how_about_no.wav',
    title: 'How About No',
    ss: '10.50',
    to: '11.85'
  },
  {
    file: 'oh_my_god.wav',
    title: 'Oh My God',
    ss: '12.95',
    to: '14.85'
  },
  {
    file: 'say_goodbye.wav',
    title: 'Say Goodbye',
    ss: '19.50',
    to: '20.60'
  },
  {
    file: 'today_was_a_good_day.wav',
    title: 'Today Was a Good Day',
    ss: '25.50',
    to: '27.75'
  },
  {
    file: 'i_can_smell_you.wav',
    title: 'I Can Smell You',
    ss: '0.65',
    to: '3.20'
  }
];

// Clean filter: remove lead-in silence with peak threshold, highpass 80Hz, presence boost, normalize to -0.1 dB
const filterStr = 'highpass=f=80,equalizer=f=3400:t=q:w=1.2:g=3.5,equalizer=f=8500:t=q:w=1.4:g=2.0,afade=t=in:ss=0:d=0.01,afade=t=out:st=1000:d=0.04,loudnorm=I=-12:TP=-0.1:LRA=5';

soundDefinitions.forEach(sd => {
  const dest = path.join(soundsDir, sd.file);
  const dur = (parseFloat(sd.to) - parseFloat(sd.ss)).toFixed(2);
  const fadeOutStart = (dur - 0.05).toFixed(2);
  const customFilter = `highpass=f=80,equalizer=f=3400:t=q:w=1.2:g=3.5,equalizer=f=8500:t=q:w=1.4:g=2.0,afade=t=in:ss=0:d=0.008,afade=t=out:st=${fadeOutStart}:d=0.05,loudnorm=I=-12:TP=-0.1:LRA=5`;

  spawnSync(ffmpeg, [
    '-y',
    '-ss', sd.ss,
    '-to', sd.to,
    '-i', masterWebm,
    '-af', customFilter,
    '-ar', '44100',
    dest
  ]);
  console.log(`[REFINED] ${sd.file} -> ${sd.title} (${dur}s, ${fs.statSync(dest).size} bytes)`);
});

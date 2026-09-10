const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const destMp3 = path.join(__dirname, '..', 'public', 'sounds', 'yes_zaddy_raw.mp3');
const destWav = path.join(__dirname, '..', 'public', 'sounds', 'yes_zaddy.wav');

// Try Google TTS API
const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=Yes%20Zaddy&tl=en&client=tw-ob';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream(destMp3);
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('Downloaded TTS MP3 successfully, size:', fs.statSync(destMp3).size);
        // Process with ffmpeg to make it crisp and punchy
        spawnSync(ffmpeg, [
          '-y', '-i', destMp3,
          '-af', 'highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=4,loudnorm=I=-13:TP=-0.5:LRA=6',
          '-ar', '44100',
          destWav
        ]);
        console.log('Processed to crisp WAV:', destWav, 'size:', fs.statSync(destWav).size);
      });
    });
  } else {
    console.error('TTS fetch failed with code:', res.statusCode);
  }
}).on('error', (err) => console.error('Error fetching TTS:', err.message));

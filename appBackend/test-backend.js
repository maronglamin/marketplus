const { spawn } = require('child_process');

console.log('Starting backend test...');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

let output = '';

backend.stdout.on('data', (data) => {
  output += data.toString();
  console.log('Backend output:', data.toString());
});

backend.stderr.on('data', (data) => {
  output += data.toString();
  console.error('Backend error:', data.toString());
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  if (code === 0) {
    console.log('✅ Backend started successfully');
  } else {
    console.log('❌ Backend failed to start');
    console.log('Full output:', output);
  }
});

// Kill the process after 10 seconds
setTimeout(() => {
  backend.kill();
  console.log('Test completed');
}, 10000); 
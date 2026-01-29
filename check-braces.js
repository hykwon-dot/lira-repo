
const fs = require('fs');

const content = fs.readFileSync('src/app/api/register/route.ts', 'utf8');

let open = 0;
let stack = [];

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      open++;
      stack.push({ line: i + 1, char: j + 1 });
    } else if (char === '}') {
      open--;
      stack.pop();
    }
  }
}

console.log('Open braces:', open);
if (open > 0) {
  console.log('Last unclosed braces:', stack.slice(-3));
} else if (open < 0) {
  console.log('Too many closing braces');
} else {
  console.log('Braces are balanced');
}

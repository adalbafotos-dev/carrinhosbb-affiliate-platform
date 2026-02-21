const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

css = css.replace(/linear-gradient[\s\S]*? center\/cover no-repeat;/g, 'url("/Guias práticos para passeios, carro e rotina com bebê.webp") center/cover no-repeat;');
// Also removing the fallback encoding version if it matches
css = css.replace(/url\("\/Guias prÃ¡ticos para passeios, carro e rotina com bebÃª\.webp"\) center\/cover no-repeat;/g, 'url("/Guias práticos para passeios, carro e rotina com bebê.webp") center/cover no-repeat;');
css = css.replace(/filter: brightness\(0\.9\) contrast\(1\.1\);/g, '');

fs.writeFileSync('app/globals.css', css, 'utf8');
console.log('Removed');

// Gera módulos ESM a partir das regras testadas do backend Node.
const fs = require('node:fs');
const path = require('node:path');
const inputs = ['domain/purchase', 'domain/conversation', 'application/handle-message', 'infrastructure/meta', 'http/handler'];
const output = path.join(__dirname, '../supabase/functions/whatsapp/shared');
for (const name of inputs) {
  let source = fs.readFileSync(path.join(__dirname, '../src', name + '.cjs'), 'utf8');
  source = source.replace(/const (\{[^\n]+\}|\w+) = require\('([^']+)'\);/g, (_, names, location) => {
    const target = location.startsWith('.') ? path.posix.basename(location).replace('.cjs', '.mjs') : location;
    return `import ${names.startsWith('{') ? names : '* as ' + names} from '${location.startsWith('.') ? './' : ''}${target}';`;
  }).replace(/module\.exports = (\{[^\n]+\});/g, 'export $1;');
  fs.mkdirSync(output, { recursive: true });
  if (source.includes('Buffer')) source = "import { Buffer } from 'node:buffer';\n" + source;
  fs.writeFileSync(path.join(output, path.basename(name) + '.mjs'), '// Gerado por npm run build:edge; edite src.\n' + source);
}

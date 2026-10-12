const fs = require('node:fs/promises');
const path = require('node:path');
class MemoryStore {
  constructor(data = { contacts: {} }) { this.data = data; this.tail = Promise.resolve(); }
  transaction(work) {
    const pending = this.tail.then(async () => {
      const draft = structuredClone(this.data);
      const result = await work(draft);
      await this.persist(draft);
      this.data = draft;
      return result;
    });
    this.tail = pending.catch(() => {});
    return pending;
  }
  async persist(data) { this.data = structuredClone(data); }
}
class FileStore extends MemoryStore {
  static async open(filename) {
    let data = { contacts: {} };
    try { data = JSON.parse(await fs.readFile(filename, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!data.contacts || typeof data.contacts !== 'object') throw Error('Invalid state file');
    const store = new FileStore(data); store.filename = filename; return store;
  }
  async persist(data) {
    await fs.mkdir(path.dirname(this.filename), { recursive: true, mode: 0o700 });
    const temporary = this.filename + '.tmp';
    await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(temporary, this.filename);
    this.data = structuredClone(data);
  }
}
module.exports = { MemoryStore, FileStore };

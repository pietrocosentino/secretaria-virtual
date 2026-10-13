export class SupabaseStore {
  constructor({ url, key, fetchImpl = fetch }) {
    if (!url || !key) throw Error('Missing database configuration');
    Object.assign(this, { url: url.replace(/\/$/, ''), key, fetchImpl });
  }
  async rpc(name, args) {
    const response = await this.fetchImpl(`${this.url}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw Error('Database operation failed');
    return response.json();
  }
  async transaction(work) {
    // Cada requisição recebe seu próprio store; o banco serializa instâncias Edge.
    const token = crypto.randomUUID();
    const data = await this.rpc('secretaria_acquire', { p_token: token });
    if (!data) throw Error('Pilot busy; provider should retry');
    this.token = token;
    try {
      const result = await work(data);
      await this.persist(data);
      return result;
    } finally {
      this.token = undefined;
      await this.rpc('secretaria_release', { p_token: token });
    }
  }
  async persist(data) {
    if (!this.token) throw Error('No active database lease');
    if (!await this.rpc('secretaria_save', { p_token: this.token, p_data: data })) throw Error('Database lease expired');
  }
}


import { createClient } from 'redis';

module.exports = async function (req, res) {
  const client = createClient({ url: process.env.REDIS_URL });
  
  try {
    await client.connect();

    if (req.method === 'GET') {
      const ids = await client.sMembers('children:index');
      const enfants = [];
      for (const id of ids) {
        const json = await client.get(`child:${id}`);
        if (json) enfants.push(JSON.parse(json));
      }
      res.status(200).json({ ok: true,  enfants });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      let id = body.id || String(Date.now());
      body.id = id;
      await client.set(`child:${id}`, JSON.stringify(body));
      await client.sAdd('children:index', id);
      res.status(200).json({ ok: true, id });
      return;
    }

    res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Erreur API enfants:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur serveur' });
  } finally {
    try { await client.quit(); } catch {}
  }
};

import { createClient } from 'redis';

export default async function handler(req, res) {
  const client = createClient({ url: process.env.REDIS_URL });
  
  try {
    await client.connect();

    if (req.method === 'GET') {
      const { childId, date } = req.query;
      if (!childId || !date) {
        res.status(400).json({ ok: false, error: 'childId et date sont requis' });
        return;
      }
      const key = `day:${childId}:${date}`;
      const json = await client.get(key);
      res.status(200).json({ ok: true,  json ? JSON.parse(json) : null });
      return;
    }

    if (req.method === 'POST') {
      const { childId, date, events } = req.body || {};
      if (!childId || !date) {
        res.status(400).json({ ok: false, error: 'childId et date sont requis' });
        return;
      }
      const key = `day:${childId}:${date}`;
      await client.set(
        key,
        JSON.stringify({ childId, date, events: events || {}, updatedAt: new Date().toISOString() })
      );
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Erreur API day:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur serveur' });
  } finally {
    try { await client.quit(); } catch {}
  }
}

import { createClient } from 'redis';

export default async function handler(req, res) {
  const client = createClient({ url: process.env.REDIS_URL });
  
  try {
    await client.connect();

    if (req.method === 'GET') {
      const ids = await client.sMembers('children:index');
      console.log('IDs dans children:index:', ids);
      
      const enfants = [];
      for (const id of ids) {
        const json = await client.get(`child:${id}`);
        if (json) {
          try {
            enfants.push(JSON.parse(json));
          } catch (e) {
            console.error(`Erreur parsing child:${id}`, e);
          }
        }
      }
      
      console.log('Enfants trouvés:', enfants.length);
      await client.quit();
      
      // ✅ CORRIGÉ : renvoie "data" au lieu de "enfants"
      res.status(200).json({ ok: true,  enfants });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      let id = body.id || String(Date.now());
      body.id = id;
      
      await client.set(`child:${id}`, JSON.stringify(body));
      await client.sAdd('children:index', id);
      
      console.log(`Enfant ajouté: child:${id}`);
      
      await client.quit();
      res.status(200).json({ ok: true, id });
      return;
    }

    await client.quit();
    res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Erreur API enfants:', error);
    try { await client.quit(); } catch {}
    res.status(500).json({ ok: false, error: error.message || 'Erreur serveur' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Cheia API nu este configurată pe server.' });
  }

  const { nivel, obiectiv, zile, echipament, gen, restrictii } = req.body || {};

  if (!nivel || !obiectiv || !zile) {
    return res.status(400).json({ error: 'Completează nivel, obiectiv și zile.' });
  }

  const numarZile = parseInt(zile) || 3;

  // Generăm exact zilele specificate, nicio zi în plus
  const zileNume = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
  const zilePlan = zileNume.slice(0, numarZile).join(', ');

  const genText = gen === 'Masculin' ? 'bărbat' : gen === 'Feminin' ? 'femeie' : 'persoană';

  const focusFeminin = obiectiv === 'Tonifiere' || obiectiv === 'Slăbit'
    ? 'Pune accent pe exerciții pentru zona inferioară (fese, coapse), core și cardio moderat. Evită exerciții care cresc excesiv masa musculară la spate și umeri.'
    : '';

  const focusMasculin = obiectiv === 'Masă musculară' || obiectiv === 'Forță'
    ? 'Pune accent pe exerciții compuse grele (genuflexiuni, împins, tracțiuni). Volum mare pe piept, spate, umeri și picioare.'
    : '';

  const focusGen = gen === 'Feminin' ? focusFeminin : gen === 'Masculin' ? focusMasculin : '';

  const prompt = `Ești antrenor personal expert. Creează un plan de antrenament CONCIS și UȘOR DE ÎNȚELES în română pentru o ${genText}.

DATE:
- Gen: ${gen || 'nespecificat'}
- Nivel: ${nivel}
- Obiectiv: ${obiectiv}
- Zile de antrenament: ${numarZile} zile (${zilePlan})
- Echipament: ${echipament || 'sală completă'}
- Restricții: ${restrictii || 'niciuna'}

REGULI STRICTE:
1. Creează EXACT ${numarZile} zile de antrenament — nu mai mult, nu mai puțin
2. Fiecare zi: maxim 5 exerciții, scrise simplu (ex: "Flotări 3x12")
3. Fără explicații lungi — doar ce trebuie să facă
4. ${focusGen}
5. La final: 3 sfaturi de nutriție scurte (1 propoziție fiecare)
6. Disclaimer scurt: "⚠️ Consultă un medic înainte de a începe."

FORMAT:
🎯 OBIECTIV: [obiectiv în 1 propoziție]

📅 ZIUA 1 — [Luni / grupă musculară]
• Exercițiu 1 — seturi x repetări
• Exercițiu 2 — seturi x repetări
[etc]

[repetă pentru toate cele ${numarZile} zile]

🥗 NUTRIȚIE:
• Sfat 1
• Sfat 2  
• Sfat 3

⚠️ Consultă un medic înainte de a începe orice program de exerciții.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Eroare la generare. Încearcă din nou.'
      });
    }

    const text = data.content?.map((b) => b.text || '').join('\n') || '';

    if (!text) {
      return res.status(500).json({ error: 'Nu am primit răspuns. Încearcă din nou.' });
    }

    return res.status(200).json({ plan: text });

  } catch (error) {
    return res.status(500).json({ error: 'Eroare server. Încearcă din nou.' });
  }
}

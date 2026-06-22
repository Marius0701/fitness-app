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
  const zileNume = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
  const zilePlan = zileNume.slice(0, numarZile);
  const genText = gen === 'Masculin' ? 'bărbat' : gen === 'Feminin' ? 'femeie' : 'persoană';

  const focusFeminin = (obiectiv === 'Tonifiere' || obiectiv === 'Slăbit')
    ? 'Pune accent pe exerciții pentru zona inferioară (fese, coapse), core și cardio moderat.'
    : '';
  const focusMasculin = (obiectiv === 'Masă musculară' || obiectiv === 'Forță')
    ? 'Pune accent pe exerciții compuse grele: genuflexiuni, împins, tracțiuni, îndreptări.'
    : '';
  const focusGen = gen === 'Feminin' ? focusFeminin : gen === 'Masculin' ? focusMasculin : '';

  const prompt = `Ești antrenor personal expert. Creează un plan de antrenament pentru o ${genText}.

DATE:
- Gen: ${gen || 'nespecificat'}
- Nivel: ${nivel}
- Obiectiv: ${obiectiv}
- Zile: ${numarZile} (${zilePlan.join(', ')})
- Echipament: ${echipament || 'sală completă'}
- Restricții: ${restrictii || 'niciuna'}
${focusGen ? '- Focus: ' + focusGen : ''}

INSTRUCȚIUNI CRITICE:
1. Returnează DOAR un obiect JSON valid, fără text în afara JSON-ului, fără markdown, fără backticks
2. Creează EXACT ${numarZile} zile
3. Fiecare zi are EXACT 5 exerciții
4. Numele exercițiilor în română, scurte (max 3 cuvinte)
5. youtube_search: termenul de căutare în engleză pentru YouTube (ex: "how to do squat properly")

JSON STRUCTURE:
{
  "obiectiv": "descriere scurtă a obiectivului în 1 propoziție",
  "zile": [
    {
      "zi": "Luni",
      "grupa": "Fese & Coapse",
      "exercitii": [
        {
          "nume": "Genuflexiuni",
          "seturi": 4,
          "repetari": "15",
          "youtube_search": "how to do squat properly for beginners"
        }
      ]
    }
  ],
  "nutritie": ["sfat 1", "sfat 2", "sfat 3"]
}`;

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Eroare la generare. Încearcă din nou.'
      });
    }

    let text = data.content?.map((b) => b.text || '').join('\n') || '';

    // Curățăm orice markdown dacă există
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let planData;
    try {
      planData = JSON.parse(text);
    } catch (e) {
      // Dacă JSON-ul nu e valid, returnăm textul brut ca fallback
      return res.status(200).json({ plan: text, format: 'text' });
    }

    return res.status(200).json({ plan: planData, format: 'json' });

  } catch (error) {
    return res.status(500).json({ error: 'Eroare server. Încearcă din nou.' });
  }
}

export default async function handler(req, res) {
  // Permite doar cereri de tip POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă. Folosește POST.' });
  }

  // Cheia API e citită din variabila de mediu - NU e niciodată expusă în browser
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Cheia API nu este configurată pe server. Verifică Environment Variables în Vercel.'
    });
  }

  const { nivel, obiectiv, zile, echipament, varsta, gen, restrictii } = req.body || {};

  // Validare de bază
  if (!nivel || !obiectiv || !zile) {
    return res.status(400).json({
      error: 'Lipsesc date obligatorii: nivel, obiectiv și zile sunt necesare.'
    });
  }

  const prompt = `Ești un antrenor personal expert. Creează un plan de antrenament săptămânal detaliat și profesionist în română, bazat pe următoarele date:

- Gen: ${gen || 'nespecificat'}
- Vârstă: ${varsta || 'nespecificată'}
- Nivel: ${nivel}
- Obiectiv principal: ${obiectiv}
- Zile disponibile/săptămână: ${zile}
- Echipament disponibil: ${echipament || 'nu a specificat'}
- Restricții / probleme medicale: ${restrictii || 'niciuna'}

Planul trebuie să conțină:
1. O scurtă introducere personalizată (2-3 propoziții)
2. Structura săptămânală (zi cu zi) cu exercițiile, seturile, repetările și pauzele recomandate
3. Sfaturi de nutriție (3-4 puncte esențiale)
4. Sfaturi de recuperare
5. Un mesaj motivațional final

IMPORTANT: Acest plan are caracter informativ general și nu înlocuiește sfatul unui medic sau kinetoterapeut. Menționează acest lucru pe scurt la final dacă utilizatorul a specificat restricții medicale.

Formatează frumos cu structuri clare.`;

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Eroare API Anthropic:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Eroare la generarea planului. Încearcă din nou.'
      });
    }

    const text = data.content?.map((block) => block.text || '').join('\n') || '';

    if (!text) {
      return res.status(500).json({ error: 'Nu am primit niciun text generat. Încearcă din nou.' });
    }

    return res.status(200).json({ plan: text });

  } catch (error) {
    console.error('Eroare server:', error);
    return res.status(500).json({
      error: 'A apărut o eroare neașteptată pe server. Încearcă din nou în câteva momente.'
    });
  }
}

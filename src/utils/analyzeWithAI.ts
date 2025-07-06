import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export interface ExtendedNode {
  id?: string;
  label: string;
  type: string;
  title?: string | null;
  content: string;
  att_goal?: string | null;
  att_method?: string | null;
  att_background?: string | null;
  att_future?: string | null;
  att_gaps?: string | null;
  att_url?: string | null;
}

export const analyzeWithAI = async (text: string): Promise<ExtendedNode[]> => {
  const prompt = `
Berikut adalah isi artikel ilmiah:

"${text}"

Buat **satu** ringkasan artikel ilmiah dalam format JSON dengan struktur:
{
  "label": "Ringkasan Artikel",
  "type": "article",
  "content": "Rangkuman umum dari isi artikel",
  "att_goal": "Tujuan dari penelitian ini",
  "att_method": "Metodologi yang digunakan",
  "att_background": "Latar belakang penelitian",
  "att_future": "Arahan penelitian masa depan",
  "att_gaps": "Kekurangan atau gap dari penelitian",
  "att_url": "Biarkan kosong atau null"
}

Pastikan semua field terisi (jika tidak ada tulis string kosong).
Berikan hanya **JSON murni** tanpa teks tambahan atau blok kode.
  `;

  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!textOutput) throw new Error('Empty response from AI model');

    // Bersihkan blok markdown jika ada
    const cleanedOutput = textOutput
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log("🧠 Raw Gemini output:\n", textOutput);
    console.log("🧹 Cleaned JSON:\n", cleanedOutput);

    const parsed: ExtendedNode = JSON.parse(cleanedOutput);

    if (!parsed.label || !parsed.type || !parsed.content) {
      throw new Error('Missing required fields in AI response');
    }

    return [parsed];
  } catch (error: any) {
    console.error('❌ Error parsing Gemini output:', error.message || error);
    return [];
  }
};


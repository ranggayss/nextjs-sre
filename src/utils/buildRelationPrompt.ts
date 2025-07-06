interface Node {
  id: string;
  label: string;
  title: string | null;
  att_goal: string | null;
  att_method: string | null;
  att_background: string | null;
  att_future: string | null;
  att_gaps: string | null;
  att_url: string | null;
}

export function buildRelationPrompt(nodes: Node[]): string {
  let prompt = `Anda adalah asisten AI yang bertugas menganalisis hubungan semantik antar artikel ilmiah berdasarkan isi kontennya.\n`;
  prompt += `Semua konten di bawah ini ditulis dalam **Bahasa Indonesia**. Fokus pada kemiripan makna, bukan sekadar kemiripan kata.\n`;
  prompt += `Setiap artikel memiliki atribut berikut:\n- Judul\n- Tujuan\n- Metodologi\n- Latar Belakang\n- Arahan Penelitian Masa Depan\n- Gap/Kekurangan Penelitian\n\n`;

  prompt += `Tugas Anda adalah menganalisis kemungkinan **hubungan semantik** antar artikel. Jenis hubungan tersebut meliputi:\n`;
  prompt += `- same_background: artikel memiliki latar belakang atau konteks yang serupa\n`;
  prompt += `- extended_method: artikel B mengembangkan atau membangun dari metode artikel A\n`;
  prompt += `- shares_goal: artikel memiliki tujuan yang sama atau saling melengkapi\n`;
  prompt += `- follows_future_work: artikel mengikuti atau mewujudkan arahan masa depan dari artikel lain\n`;
  prompt += `- addresses_same_gap: kedua artikel mencoba mengatasi kekurangan atau gap penelitian yang sama\n\n`;

  nodes.forEach((node, idx) => {
    prompt += `Artikel ${idx + 1} (ID: ${node.id}, Judul : "${node.title}"):\n`;
    prompt += `- Judul: ${node.title}\n`;
    prompt += `- Tujuan: ${node.att_goal}\n`;
    prompt += `- Metodologi: ${node.att_method}\n`;
    prompt += `- Latar Belakang: ${node.att_background}\n`;
    prompt += `- Arahan Masa Depan: ${node.att_future}\n`;
    prompt += `- Gap/Kekurangan: ${node.att_gaps}\n`;
    prompt += `- URL: ${node.att_url}\n\n`;
  });

  prompt += `Sekarang kembalikan sebuah array JSON yang berisi relasi ("edges") antar artikel.\n`;
  prompt += `Format setiap elemen:\n\n`;
  prompt += `[\n`;
  prompt += `  {\n`;
  prompt += `    "from": <id_artikel_sumber>,\n`;
  prompt += `    "to": <id_artikel_tujuan>,\n`;
  prompt += `    "relation": "<jenis_relasi>",\n`;
  prompt += `    "label": "<deskripsi singkat dalam Bahasa Indonesia>"\n`;
  prompt += `  }\n`;
  prompt += `]\n\n`;
  prompt += `Jika tidak ada relasi, cukup kembalikan array kosong [] tanpa penjelasan tambahan.\n`;

  prompt += `Tolong **bungkus jawaban JSON dalam blok kode seperti berikut**:\n\n`;
  prompt += "```json\n";
  prompt += "[ ... ]\n";
  prompt += "```\n";

  /*
  */
 prompt += `Gunakan **judul artikel** (bukan hanya ID atau "Artikel 1") dalam deskripsi relasi. \n`;
 prompt += `Contoh label yang baik:\n`;
 prompt += `- "Artikel 'Analisis Usability Aplikasi XYZ' menggunakan metode yang disederhanakan dari artikel 'Studi SEM-PLS pada Aplikasi XYZ'"\n\n`;
  // Debug (optional)
  // console.log("🧠 Prompt dikirim ke AI:\n", prompt);

  return prompt;
}

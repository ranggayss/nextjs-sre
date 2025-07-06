"use server";

// import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type SignUpPayload = {
  fullName: string;
  sid: string;
  email: string;
  group: string;
  password: string;
};

export async function signIn({
  email,
  password
}: SignUpPayload){
  
  const supabase = await createServerSupabaseClient();

  const { data: authData, error} = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authData.user){
    redirect('/home-a')
  }

}

export async function signUp({
    fullName,
    sid,
    email,
    group,
    password,
}: SignUpPayload) {
  console.log('fullname', fullName, 'sid', sid);

  const supabase = await createServerSupabaseClient();
 
  // Sign up ke Supabase Auth
  const { data:authData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  await prisma.user.create({
    data: {
      id: authData.user?.id || '',
      email,
      name: fullName,
      role: 'USER',
      group,
      password: '',
      nim: sid,
    }
  })

  /*
  if (error) {
    alert(error.message); // tampilkan pesan error
    console.error("Auth error:", error.message);
    return;
  }

  const userId = data.user?.id;
  */

  // Simpan data tambahan ke tabel `user`
//   const { error: insertError } = await supabase.from("User").insert([
//     {
//       id: userId,
//         email,
//         name: fullName,
//         nim: sid,
//         group,
//         role: group === "A" ? "group-a" : "group-b",
//         password,
//         updateAt: new Date().toISOString(), // Wajib jika NOT NULL
//     },
//   ]);

//   if (insertError) {
//     console.error("Insert DB error:", insertError.message);
//     throw new Error("Failed to save additional user data.");
//   }

  // Redirect ke halaman home sesuai grup
  if (group === "A") {
    redirect("../home-a");
  } else {
    redirect("../home-b");
  }
}
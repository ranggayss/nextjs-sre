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

  //T1
  if (error) {
    console.error("SignUp error:", error.message);
    throw new Error("Failed to register");
  }

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

  if (group === "A") {
    redirect("../home-a");
  } else {
    redirect("../home-b");
  }
}
"use client";

import {
  Box,
  Button,
  Group,
  Image,
  PasswordInput,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
  Divider,
} from "@mantine/core";
import React, { useState } from "react";
import NextImage from "next/image";

// Import gambar
import logoImage from "../imageCollection/LogoSRE_Fix.png";
import backgroundImage from "../imageCollection/login-background.png";
import illustrationImage from "../imageCollection/signin-illustration.png";

import { signUp } from "../actions";
// import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    sid: "",
    email: "",
    group: "",
    password: "",
    confirmPassword: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp({
      fullName: form.fullName,
      sid: form.sid,
      email: form.email,
      group: form.group,
      password: form.password,
    });

  }

  return (
    <Box
      style={{
        height: "100vh",
        backgroundImage: `url(${backgroundImage.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        style={{
          width: "90%",
          maxWidth: 1100,
          height: "85vh",
          display: "flex",
          boxShadow: "0 0 20px rgba(0,0,0,0.2)",
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        {/* Panel Kiri - Ilustrasi dan Logo */}
        <Box
          style={{
            width: "45%",
            backgroundColor: "#0057b7",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "white",
          }}
        >
          <Image
            component={NextImage}
            src={logoImage}
            alt="My-SRE Logo"
            width={170}
            height={50}
            fit="contain"
            style={{ alignSelf: "flex-start" }}
          />

          <Box style={{ textAlign: "center" }}>
            <Image
              component={NextImage}
              src={illustrationImage}
              alt="Illustration"
              width={350}
              height={350}
              fit="contain"
              style={{ margin: "0 auto" }}
            />
          </Box>

          <Text size="xs" style={{ textAlign: "center" }}>
            Knowledge Visualization Platform © 2025
          </Text>
        </Box>

        {/* Panel Kanan - Form */}
        <Box
          style={{
            width: "55%",
            paddingTop: "32px",
            paddingBottom: "32px",
            paddingInline: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          <Title order={1} mb={0} fw={700}>
            Sign Up
          </Title>
          <Text mb="sm" c="dimmed">
            Enter your information to create an account
          </Text>

          <form onSubmit={handleSignUp}
          style={{ flexGrow: 1 }}
          >
            <Stack gap={6}>
              <Text fw={600}>Full Name</Text>
              <TextInput
                placeholder="Enter your full name here..."
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.currentTarget.value })
                }
              />

              <Text fw={600}>SID or NIM</Text>
              <TextInput
                placeholder="Enter your student id or NIM here..."
                value={form.sid}
                onChange={(e) =>
                  setForm({ ...form, sid: e.currentTarget.value })
                }
              />

              <Text fw={600}>Email</Text>
              <TextInput
                placeholder="Enter your email here..."
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.currentTarget.value })
                }
              />

              <Text fw={600}>Group</Text>
              <Radio.Group
                value={form.group}
                onChange={(value) => setForm({ ...form, group: value })}
              >
                <Group>
                  <Radio value="A" label="Group A" />
                  <Radio value="B" label="Group B" />
                </Group>
              </Radio.Group>

              <Text fw={600}>Password</Text>
              <PasswordInput
                placeholder="Enter your password here..."
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.currentTarget.value })
                }
              />

              <Button fullWidth mt="xs" color="blue" type="submit">
                Register
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
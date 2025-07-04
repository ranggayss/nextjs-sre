"use client";

import {
  Box,
  Button,
  Checkbox,
  Group,
  Image,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import NextImage from "next/image";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

// Gambar
import logoImage from "../imageCollection/LogoSRE_Fix.png";
import backgroundImage from "../imageCollection/login-background.png";
import illustrationImage from "../imageCollection/login-illustration.png";

import { signIn } from "../actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
      e.preventDefault();
      await signIn({
        fullName: '',
        sid: '',
        group: '',
        email: email,
        password: password,
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
        {/* Panel Kiri - Form Login */}
        <Box
          style={{
            width: "55%",
            backgroundColor: "white",
            padding: "48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box style={{ textAlign: "center", marginBottom: 24 }}>
            <Title order={1} fw={800} c="dark" mb={4}>
              SIGN IN
            </Title>
            <Text c="dimmed" size="sm">
              Enter your email below to login to your account
            </Text>
          </Box>

          <form>
            <Stack>
              <Text fw={600}>Email</Text>
              <TextInput
                placeholder="Enter your email here..."
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <Text fw={600}>Password</Text>
              <PasswordInput
                placeholder="Enter your password here..."
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                visible={showPassword}
                onVisibilityChange={setShowPassword}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? <IconEyeOff /> : <IconEye />
                }
              />

              <Group justify="space-between" mt="xs">
                <Checkbox
                  label="Remember me"
                  checked={remember}
                  onChange={(e) => setRemember(e.currentTarget.checked)}
                />
                <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
                  Forgot your password?
                </Text>
              </Group>

              <Button fullWidth mt="md" size="md" color="blue" radius="md" onClick={(e) => handleSignIn(e)}>
                Sign In
              </Button>
            </Stack>
          </form>
        </Box>

        {/* Panel Kanan - Ilustrasi */}
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
            width={160}
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
      </Box>
    </Box>
  );
}
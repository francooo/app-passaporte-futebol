import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { loginSchema } from "@shared/schemas";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/button";
import { Divider, FormMessage, TextLink } from "@/components/form-bits";
import { TextField } from "@/components/text-field";
import { useAuth } from "@/lib/auth-context";
import { useFormSubmit } from "@/lib/use-form-submit";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const form = useFormSubmit(loginSchema, signIn);

  return (
    <AuthShell title="Seu próximo carimbo começa aqui">
      <View style={styles.form}>
        <TextField
          label="E-mail"
          icon="email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={form.error("email")}
        />
        <TextField
          label="Senha"
          icon="lock"
          password
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
          error={form.error("password")}
          onSubmitEditing={() => form.submit({ email, password })}
        />
        <TextLink href="/recuperar-senha" align="right">
          Esqueci minha senha
        </TextLink>
        <FormMessage message={form.message} />
        <Button loading={form.pending} onPress={() => form.submit({ email, password })}>
          {form.pending ? "Entrando…" : "Entrar"}
        </Button>
        <Divider />
        <TextLink href="/cadastro">Criar conta</TextLink>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({ form: { gap: 16 } });

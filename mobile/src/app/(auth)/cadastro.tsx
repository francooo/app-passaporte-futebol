import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { signupSchema } from "@shared/schemas";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/button";
import { Divider, FormMessage, TextLink } from "@/components/form-bits";
import { TextField } from "@/components/text-field";
import { useAuth } from "@/lib/auth-context";
import { useFormSubmit } from "@/lib/use-form-submit";

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const set = (key: keyof typeof values) => (text: string) => setValues((v) => ({ ...v, [key]: text }));
  const form = useFormSubmit(signupSchema, signUp);

  return (
    <AuthShell title="Comece sua coleção de carimbos">
      <View style={styles.form}>
        <TextField label="Nome" icon="profile" value={values.name} onChangeText={set("name")} autoComplete="name" textContentType="name" error={form.error("name")} />
        <TextField
          label="E-mail"
          icon="email"
          value={values.email}
          onChangeText={set("email")}
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
          value={values.password}
          onChangeText={set("password")}
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Mínimo de 8 caracteres."
          error={form.error("password")}
        />
        <TextField
          label="Confirmar senha"
          icon="lock"
          password
          value={values.confirm}
          onChangeText={set("confirm")}
          autoComplete="new-password"
          textContentType="newPassword"
          error={form.error("confirm")}
          onSubmitEditing={() => form.submit(values)}
        />
        <FormMessage message={form.message} />
        <Button loading={form.pending} onPress={() => form.submit(values)}>
          {form.pending ? "Criando…" : "Criar conta"}
        </Button>
        <Divider />
        <TextLink href="/login">Já tenho conta — Entrar</TextLink>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({ form: { gap: 16 } });

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { recoverSchema } from "@shared/schemas";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/button";
import { Divider, FormMessage, TextLink } from "@/components/form-bits";
import { TextField } from "@/components/text-field";
import { useAuth } from "@/lib/auth-context";
import { useFormSubmit } from "@/lib/use-form-submit";
import { type } from "@/theme";

export default function RecuperarSenhaScreen() {
  const { recover } = useAuth();
  const [email, setEmail] = useState("");
  const form = useFormSubmit(recoverSchema, recover);

  return (
    <AuthShell title="Vamos recuperar seu acesso">
      <View style={styles.form}>
        <Text style={[type.suave, styles.intro]}>
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </Text>
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
          onSubmitEditing={() => form.submit({ email })}
        />
        <FormMessage message={form.message} />
        <Button loading={form.pending} onPress={() => form.submit({ email })}>
          {form.pending ? "Enviando…" : "Enviar link"}
        </Button>
        <Divider />
        <TextLink href="/login">Voltar para o login</TextLink>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({ form: { gap: 16 }, intro: { textAlign: "center", fontSize: 15 } });

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Select } from '@/components/select';
import { Button, Card, ErrorLine, Field, ScreenTitle, TextButton, ui } from '@/components/ui';
import { Colors, Font } from '@/constants/theme';
import { apiFetch, errorMessage, fieldError } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { LinkSection } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/**
 * Suggest a link (the website's /links/submit): section, name, URL, description. It is
 * saved pending and appears once staff approve it. A member perk, like on the website.
 */
export default function SubmitLink() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { token, user } = useSession();
  const sections = useApi<{ data: LinkSection[] }>('/link-sections');
  const preset = sections.data?.data.find((s) => s.slug === section)?.id ?? null;
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const chosen = sectionId ?? preset;
  const allowed = user?.canSubmitLinks !== false;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/links', {
        method: 'POST',
        body: { sectionId: chosen, name: name.trim(), url: url.trim(), description: description.trim() },
        token,
      });
      setSubmitted(true);
      setName('');
      setUrl('');
      setDescription('');
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  }

  return (
    <Chrome>
      <ScreenTitle title="Submit a link" />
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        {submitted ? (
          <Card style={styles.done}>
            <Text style={styles.doneTitle}>Thanks. Your link is in.</Text>
            <Text style={ui.muted}>It will appear in the directory once staff approve it.</Text>
            <TextButton label="Submit another" onPress={() => setSubmitted(false)} />
          </Card>
        ) : !allowed ? (
          <Card>
            <Text style={ui.body}>Submitting links is for LightPainters members.</Text>
          </Card>
        ) : (
          <>
            <Text style={ui.muted}>Suggest a tutorial, tool maker, resource or store. Staff review every link.</Text>
            <Select
              label="Section"
              value={chosen}
              options={(sections.data?.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              onChange={setSectionId}
            />
            <Field label="Name" value={name} onChangeText={setName} maxLength={200} error={fieldError(error, 'name')} />
            <Field
              label="URL"
              value={url}
              onChangeText={setUrl}
              placeholder="https://"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              maxLength={255}
              error={fieldError(error, 'url')}
            />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={5000}
              error={fieldError(error, 'description')}
            />
            <ErrorLine error={error && !fieldError(error, 'name') && !fieldError(error, 'url') ? errorMessage(error) : null} />
            <Button label="Submit link" onPress={submit} busy={busy} disabled={!chosen || !name.trim() || !url.trim()} />
          </>
        )}
      </ScrollView>
    </Chrome>
  );
}

const styles = StyleSheet.create({
  done: { gap: 8 },
  doneTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
});

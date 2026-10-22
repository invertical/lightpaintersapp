import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Button, Card, ErrorLine, Field, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage, fieldError } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Org } from '@/lib/types';

/** Lower-case words joined by hyphens, as the website suggests an org's address. The server has the last word. */
function slugify(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Start an organization (the website's /groups/new): name, address, description, website,
 * and whether joining needs approval. A member perk. Running it (logo, members, events)
 * is the org's dashboard, a web page for now.
 */
export default function NewOrg() {
  const { token, user } = useSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const address = slugEdited ? slug : slugify(name);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Org }>('/groups', {
        method: 'POST',
        body: {
          name: name.trim(),
          slug: address || undefined,
          description: description.trim() || null,
          url: url.trim() || null,
          requiresApproval,
        },
        token,
      });
      router.replace({ pathname: '/orgs/[slug]', params: { slug: res.data.slug } });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  if (user?.canCreateOrgs === false) {
    return (
      <Chrome>
        <ScreenTitle title="Add an organization" />
        <View style={ui.page}>
          <Card>
            <Text style={ui.body}>Starting an organization is for LightPainters members.</Text>
          </Card>
        </View>
      </Chrome>
    );
  }

  const named = ['name', 'slug', 'description', 'url'].some((k) => fieldError(error, k));

  return (
    <Chrome>
      <ScreenTitle title="Add an organization" />
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Text style={ui.muted}>A group, collective or community of light painters. You can add a logo and invite people next.</Text>
        <Field label="Name" value={name} onChangeText={setName} maxLength={255} error={fieldError(error, 'name')} />
        <Field
          label="Address"
          value={address}
          onChangeText={(v) => {
            setSlugEdited(true);
            setSlug(v.toLowerCase().trim());
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={60}
          hint={`lightpainters.com/groups/${address || 'your-group'}`}
          error={fieldError(error, 'slug')}
        />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={20000}
          error={fieldError(error, 'description')}
        />
        <Field
          label="Website (optional)"
          value={url}
          onChangeText={setUrl}
          placeholder="https://"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={255}
          error={fieldError(error, 'url')}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Approve new members</Text>
            <Text style={ui.muted}>Off: anyone can join. On: you approve each request.</Text>
          </View>
          <Switch
            value={requiresApproval}
            onValueChange={setRequiresApproval}
            trackColor={{ true: Colors.gold, false: Colors.cardRaised }}
            accessibilityLabel="Approve new members"
          />
        </View>
        <ErrorLine error={error && !named ? errorMessage(error) : null} />
        <Button label="Create organization" onPress={create} busy={busy} disabled={!name.trim()} />
      </ScrollView>
    </Chrome>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { color: Colors.foreground, fontSize: Font.base, fontWeight: '600' },
});

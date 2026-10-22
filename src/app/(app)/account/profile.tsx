import { Image } from 'expo-image';
import { Check, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Select } from '@/components/select';
import { TagPicker } from '@/components/tag-picker';
import { Button, ErrorLine, ErrorState, Field, IconButton, Label, Loading, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage, fieldError, type Page } from '@/lib/api';
import { pictureUrl } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Country, MyProfile, Picture, State } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const SECTIONS = ['About', 'Location', 'Links', 'Username'] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Manage profile: the website's /account/profile, /location, /links and /username,
 * behind one header. Each section saves on its own.
 */
export default function ManageProfile() {
  const [section, setSection] = useState<Section>('About');
  const profile = useApi<{ data: MyProfile }>('/me/profile');

  return (
    <Chrome>
      <ScreenTitle title="Manage profile" />
      <View style={styles.tabs} accessibilityRole="tablist">
        {SECTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: s === section }}
            onPress={() => setSection(s)}
            style={[styles.tab, s === section && styles.tabOn]}>
            <Text style={[styles.tabText, s === section && styles.tabTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      {profile.error ? (
        <ErrorState error={profile.error} onRetry={profile.reload} />
      ) : !profile.data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
          {section === 'About' ? (
            <About profile={profile.data.data} onSaved={(p) => profile.setData({ data: p })} />
          ) : section === 'Location' ? (
            <Location profile={profile.data.data} onSaved={(p) => profile.setData({ data: p })} />
          ) : section === 'Links' ? (
            <Links />
          ) : (
            <Username profile={profile.data.data} onSaved={(p) => profile.setData({ data: p })} />
          )}
        </ScrollView>
      )}
    </Chrome>
  );
}

/** PATCH /me/profile with only what this section changed; the answer is the whole profile. */
function useSave(onSaved: (p: MyProfile) => void) {
  const { token, refreshUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const save = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch<{ data: MyProfile }>('/me/profile', { method: 'PATCH', body, token });
      onSaved(res.data);
      setSaved(true);
      refreshUser().catch(() => {});
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  };
  return { busy, error, saved, save };
}

function Saved({ show }: { show: boolean }) {
  return show ? <Text style={styles.saved}>Saved.</Text> : null;
}

function About({ profile, onSaved }: { profile: MyProfile; onSaved: (p: MyProfile) => void }) {
  const { user } = useSession();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [otherName, setOtherName] = useState(profile.otherName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [pictureId, setPictureId] = useState<number | null>(profile.pictureId);
  const [tags, setTags] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(Object.entries(profile.tags).map(([slug, rows]) => [slug, rows.map((r) => r.tag.name)]))
  );
  const pictures = useApi<Page<Picture>>(user ? `/pictures?userId=${user.id}&perPage=60` : null);
  const types = useApi<{ data: { slug: string; name: string }[] }>('/tag-types');
  const { busy, error, saved, save } = useSave(onSaved);

  return (
    <>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="First name" value={firstName} onChangeText={setFirstName} maxLength={45} error={fieldError(error, 'firstName')} />
        </View>
        <View style={styles.half}>
          <Field label="Last name" value={lastName} onChangeText={setLastName} maxLength={45} error={fieldError(error, 'lastName')} />
        </View>
      </View>
      <Field
        label="Other name (optional)"
        value={otherName}
        onChangeText={setOtherName}
        maxLength={100}
        hint="An artist name or studio, shown under your name."
        error={fieldError(error, 'otherName')}
      />
      <Field label="About you" value={bio} onChangeText={setBio} multiline maxLength={10000} error={fieldError(error, 'bio')} />

      <Label>Profile picture</Label>
      <Text style={ui.muted}>Pick one of your pictures. Add pictures in Manage gallery.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pictures}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: pictureId === null }}
          onPress={() => setPictureId(null)}
          style={[styles.pick, styles.pickNone, pictureId === null && styles.pickOn]}>
          <Text style={ui.muted}>Initials</Text>
        </Pressable>
        {(pictures.data?.data ?? []).map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: pictureId === p.id }}
            accessibilityLabel={p.title ?? `Picture ${p.id}`}
            onPress={() => setPictureId(p.id)}
            style={[styles.pick, pictureId === p.id && styles.pickOn]}>
            <Image source={{ uri: pictureUrl(p, 72) ?? undefined }} style={styles.pickImage} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>

      {Object.keys(tags).map((slug) => (
        <TagPicker
          key={slug}
          type={slug}
          label={types.data?.data.find((t) => t.slug === slug)?.name ?? slug}
          value={tags[slug]}
          onChange={(names) => setTags((t) => ({ ...t, [slug]: names }))}
        />
      ))}

      <ErrorLine error={error ? errorMessage(error) : null} />
      <Saved show={saved} />
      <Button
        label="Save"
        busy={busy}
        onPress={() =>
          save({ firstName: firstName.trim(), lastName: lastName.trim(), otherName: otherName.trim() || null, bio, pictureId, tags })
        }
      />
    </>
  );
}

function Location({ profile, onSaved }: { profile: MyProfile; onSaved: (p: MyProfile) => void }) {
  const [countryId, setCountryId] = useState<number | null>(profile.countryId);
  const [stateId, setStateId] = useState<number | null>(profile.stateId);
  const [city, setCity] = useState(profile.city ?? '');
  const countries = useApi<{ data: Country[] }>('/countries');
  const country = countries.data?.data.find((c) => c.id === countryId);
  const states = useApi<{ data: State[] }>(country?.hasStates ? `/countries/${country.id}/states` : null);
  const { busy, error, saved, save } = useSave(onSaved);

  return (
    <>
      <Text style={ui.muted}>Your location puts you on the artist map and in country searches.</Text>
      <Select
        label="Country"
        value={countryId}
        options={(countries.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        onChange={(id) => {
          setCountryId(id);
          setStateId(null);
        }}
        placeholder="Choose a country"
      />
      {country?.hasStates ? (
        <Select
          label={country.stateLabel}
          value={stateId}
          options={(states.data?.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          onChange={setStateId}
          placeholder={`Choose a ${country.stateLabel.toLowerCase()}`}
        />
      ) : null}
      <Field label="City" value={city} onChangeText={setCity} maxLength={100} error={fieldError(error, 'city')} />
      <ErrorLine error={error ? errorMessage(error) : null} />
      <Saved show={saved} />
      <Button label="Save location" busy={busy} onPress={() => save({ countryId, stateId, city: city.trim() || null })} />
    </>
  );
}

/** `value` is what the person typed (a handle, say); `url` is where it resolves. */
type MyLink = { id: number; typeId: number | null; type: string; value: string; url: string };
type LinkType = { id: number; name: string; instructions?: string | null };

/**
 * /me/links: add, edit and remove, up to 20. Listed in the website's order (by type);
 * there is no custom order.
 */
function Links() {
  const { token } = useSession();
  const links = useApi<{ data: MyLink[]; meta?: { types?: LinkType[] } }>('/me/links');
  const types = links.data?.meta?.types ?? [];
  const [typeId, setTypeId] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState<{ id: number; typeId: number | null; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const items = links.data?.data ?? [];

  async function call(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await links.reload();
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  }

  const add = () =>
    call(async () => {
      await apiFetch('/me/links', { method: 'POST', body: { typeId, url: url.trim() }, token });
      setUrl('');
    });

  const saveEdit = () =>
    editing &&
    call(async () => {
      await apiFetch(`/me/links/${editing.id}`, { method: 'PATCH', body: { typeId: editing.typeId, url: editing.url.trim() }, token });
      setEditing(null);
    });

  const remove = (id: number) => call(() => apiFetch(`/me/links/${id}`, { method: 'DELETE', token }));

  if (links.error) return <ErrorState error={links.error} onRetry={links.reload} />;
  if (!links.data) return <Loading />;

  const typeOptions = types.map((t) => ({ value: t.id, label: t.name }));
  const instructions = (id: number | null) => types.find((t) => t.id === id)?.instructions ?? undefined;

  return (
    <>
      <Text style={ui.muted}>Your website and social accounts, shown on your profile.</Text>
      {items.map((link) =>
        editing?.id === link.id ? (
          <View key={link.id} style={styles.linkEdit}>
            <Select label="Type" value={editing.typeId} options={typeOptions} onChange={(v) => setEditing({ ...editing, typeId: v })} />
            <Field
              label="Address"
              value={editing.url}
              onChangeText={(v) => setEditing({ ...editing, url: v })}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint={instructions(editing.typeId)}
              error={fieldError(error, 'url')}
            />
            <View style={styles.row}>
              <Button label="Save" icon={Check} size="sm" onPress={saveEdit} busy={busy} />
              <Button label="Cancel" size="sm" variant="secondary" onPress={() => setEditing(null)} />
            </View>
          </View>
        ) : (
          <View key={link.id} style={styles.link}>
            <View style={styles.linkText}>
              <Text style={styles.linkType}>{link.type}</Text>
              <Text style={ui.muted} numberOfLines={1}>
                {link.url}
              </Text>
            </View>
            <IconButton
              icon={Pencil}
              label="Edit link"
              size={18}
              color={Colors.muted}
              onPress={() => setEditing({ id: link.id, typeId: link.typeId, url: link.value })}
            />
            <IconButton icon={Trash2} label="Remove link" size={18} color={Colors.danger} onPress={() => remove(link.id)} />
          </View>
        )
      )}

      {items.length < 20 ? (
        <View style={styles.linkEdit}>
          <Label>Add a link</Label>
          {typeOptions.length > 0 ? <Select label="Type" value={typeId} options={typeOptions} onChange={setTypeId} /> : null}
          <Field
            label="Address"
            value={url}
            onChangeText={setUrl}
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint={instructions(typeId)}
            error={editing ? undefined : fieldError(error, 'url')}
          />
          <Button label="Add link" size="sm" onPress={add} busy={busy} disabled={!url.trim()} />
        </View>
      ) : null}
      <ErrorLine error={error && !fieldError(error, 'url') ? errorMessage(error) : null} />
    </>
  );
}

function Username({ profile, onSaved }: { profile: MyProfile; onSaved: (p: MyProfile) => void }) {
  const [username, setUsername] = useState(profile.username);
  const { busy, error, saved, save } = useSave(onSaved);

  return (
    <>
      <Text style={ui.muted}>{`Your profile is at lightpainters.com/${profile.username}. Changing it changes that address.`}</Text>
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={45}
        error={fieldError(error, 'username')}
      />
      <ErrorLine error={error && !fieldError(error, 'username') ? errorMessage(error) : null} />
      <Saved show={saved} />
      <Button label="Change username" busy={busy} disabled={username.trim() === profile.username} onPress={() => save({ username: username.trim() })} />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Colors.gold },
  tabText: { color: Colors.muted, fontSize: Font.sm, fontWeight: '600' },
  tabTextOn: { color: Colors.gold },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  saved: { color: Colors.success, textAlign: 'center', fontSize: Font.sm },
  pictures: { gap: Spacing.sm },
  pick: { borderRadius: Radius.md, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  pickNone: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  pickOn: { borderColor: Colors.gold },
  pickImage: { width: 72, height: 72 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
  },
  linkText: { flex: 1, paddingVertical: Spacing.sm },
  linkType: { color: Colors.foreground, fontWeight: '700', fontSize: Font.sm },
  linkEdit: { gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md },
});
